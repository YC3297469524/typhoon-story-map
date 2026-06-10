/**
 * 从 NOAA IBTrACS 西太平洋 CSV 中提取指定 SID 的轨迹，生成 src/data/typhoonTrack.js
 * 使用 CMA 列（CMA_LAT / CMA_LON / CMA_WIND / CMA_PRES）作为「中央气象台路径」近似来源。
 *
 * 用法（在 leaflet-index 目录）:
 *   node scripts/import_ibtracs_wp_track.mjs
 *
 * 可选环境变量:
 *   IBTRACS_WP_CSV_URL — CSV 地址（默认 NOAA v04r01 WP list）
 *   IBTRACS_SID — 风暴 SID（默认 2025185N20119 = 2025 丹娜丝 WP）
 *
 * 网络失败时：请用浏览器下载 CSV 后执行
 *   node scripts/import_ibtracs_wp_track.mjs path/to/your.csv
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import readline from 'node:readline'
import { createReadStream } from 'node:fs'
import https from 'node:https'
import http from 'node:http'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const DEFAULT_CSV_URL =
  'https://www.ncei.noaa.gov/data/international-best-track-archive-for-climate-stewardship-ibtracs/v04r01/access/csv/ibtracs.WP.list.v04r01.csv'
const SID = process.env.IBTRACS_SID || '2025185N20119'

function getTyphoonLevel(windSpeed) {
  const w = Number(windSpeed)
  if (!Number.isFinite(w) || w <= 0) return 'LOW'
  if (w >= 51) return 'SuperTY'
  if (w >= 41) return 'STY'
  if (w >= 33) return 'TY'
  if (w >= 25) return 'STS'
  if (w >= 18) return 'TS'
  if (w >= 11) return 'TD'
  return 'LOW'
}

function parseCsvLine(line) {
  const out = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
      continue
    }
    if (!inQuotes && ch === ',') {
      out.push(cur)
      cur = ''
      continue
    }
    cur += ch
  }
  out.push(cur)
  return out
}

function isoToLocalField(iso) {
  if (!iso || !String(iso).trim()) return ''
  const s = String(iso).trim().replace(' ', 'T')
  if (s.length >= 16) return s.slice(0, 16)
  return s
}

function downloadToFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http
    const f = fs.createWriteStream(destPath)
    lib
      .get(url, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          const loc = res.headers.location
          f.close()
          fs.unlinkSync(destPath)
          if (!loc) return reject(new Error('Redirect without location'))
          return resolve(downloadToFile(loc, destPath))
        }
        if (res.statusCode !== 200) {
          f.close()
          try {
            fs.unlinkSync(destPath)
          } catch (_) {}
          return reject(new Error(`HTTP ${res.statusCode}`))
        }
        res.pipe(f)
        f.on('finish', () => f.close(() => resolve()))
      })
      .on('error', (err) => {
        try {
          f.close()
          fs.unlinkSync(destPath)
        } catch (_) {}
        reject(err)
      })
  })
}

async function extractFromCsvFile(csvPath) {
  const rl = readline.createInterface({ input: createReadStream(csvPath, { encoding: 'utf8' }), crlfDelay: Infinity })
  let header = null
  let idxSid = -1
  let idxIso = -1
  let idxCmaLat = -1
  let idxCmaLon = -1
  let idxCmaWind = -1
  let idxCmaPres = -1

  const rows = []

  for await (const line of rl) {
    if (!header) {
      header = parseCsvLine(line).map((h) => h.trim())
      idxSid = header.indexOf('SID')
      idxIso = header.indexOf('ISO_TIME')
      idxCmaLat = header.indexOf('CMA_LAT')
      idxCmaLon = header.indexOf('CMA_LON')
      idxCmaWind = header.indexOf('CMA_WIND')
      idxCmaPres = header.indexOf('CMA_PRES')
      if (idxSid < 0 || idxIso < 0) throw new Error('CSV 缺少 SID 或 ISO_TIME 列')
      continue
    }
    if (!line.trim()) continue
    const cols = parseCsvLine(line)
    if (cols[idxSid] !== SID) continue

    const iso = cols[idxIso]
    const lat = parseFloat(cols[idxCmaLat])
    const lng = parseFloat(cols[idxCmaLon])
    const wind = parseFloat(cols[idxCmaWind])
    const pres = parseFloat(cols[idxCmaPres])

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
    if (!iso || !String(iso).trim()) continue

    rows.push({
      time: isoToLocalField(iso),
      lat: Math.round(lat * 1000) / 1000,
      lng: Math.round(lng * 1000) / 1000,
      windSpeed: Number.isFinite(wind) && wind > 0 ? Math.round(wind) : 0,
      pressure: Number.isFinite(pres) && pres > 0 ? Math.round(pres) : null
    })
  }

  rows.sort((a, b) => new Date(a.time.replace('T', ' ')) - new Date(b.time.replace('T', ' ')))

  const track = rows.map((r, i) => {
    const windSpeed = r.windSpeed || 0
    const pressure = r.pressure
    return {
      time: r.time,
      lat: r.lat,
      lng: r.lng,
      level: getTyphoonLevel(windSpeed),
      pressure: pressure == null ? null : pressure,
      windSpeed,
      description: i === 0 ? '台风海上初始观测位置' : `IBTrACS/CMA 记录点 ${i + 1}`,
      intensityCode: windSpeed >= 33 ? 3 : windSpeed >= 25 ? 2 : 1
    }
  })

  return track
}

async function main() {
  const argPath = process.argv[2]
  let csvPath = argPath

  if (!csvPath) {
    const tmp = path.join(__dirname, '_ibtracs_wp_download.csv')
    const url = process.env.IBTRACS_WP_CSV_URL || DEFAULT_CSV_URL
    console.log('Downloading', url)
    try {
      await downloadToFile(url, tmp)
      csvPath = tmp
      console.log('Saved to', tmp)
    } catch (e) {
      console.error('Download failed:', e.message)
      console.error(
        '请手动下载 IBTrACS 西太平洋 CSV 到本机，然后执行:\n  node scripts/import_ibtracs_wp_track.mjs <csv文件路径>'
      )
      process.exit(1)
    }
  }

  const track = await extractFromCsvFile(csvPath)
  if (track.length === 0) {
    console.error('未找到 SID=', SID, '的有效 CMA 经纬度行。可设置 IBTRACS_SID 重试。')
    process.exit(1)
  }

  const outPath = path.join(root, 'src', 'data', 'typhoonTrack.js')
  const header = `// src/data/typhoonTrack.js — 丹娜丝（2504）路径
// 数据来源: NOAA IBTrACS v04r01（西太平洋列表），字段 CMA_LAT/CMA_LON/CMA_WIND/CMA_PRES；SID=${SID}
// 生成方式: node scripts/import_ibtracs_wp_track.mjs
// 生成日期: ${new Date().toISOString().slice(0, 10)}
// 说明: 与中央气象台台风网接口导出应为同一套观测链路的国际归档；若你本地台风网 JSON 更细，可用其覆盖本文件。

export const typhoonTrack = ${JSON.stringify(track, null, 2)};
`

  fs.writeFileSync(outPath, header, 'utf-8')
  console.log('Wrote', outPath, 'points:', track.length)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
