/**
 * 根据 typhoonEvents.js 中新闻锚点线性插值生成 2025 丹娜丝演示轨迹（毕设用近似路径）
 * 运行: node scripts/rebuild_track_from_news.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const anchors = [
  { time: '2025-07-03T00:00', lat: 17.8, lng: 132.0 },
  { time: '2025-07-04T00:00', lat: 19.2, lng: 119.6 },
  { time: '2025-07-04T12:00', lat: 22.3193, lng: 114.1694 },
  { time: '2025-07-05T03:00', lat: 22.3, lng: 115.8 },
  { time: '2025-07-05T09:00', lat: 23.7, lng: 120.8 },
  { time: '2025-07-05T21:00', lat: 24.5, lng: 118.8 },
  { time: '2025-07-06T12:00', lat: 22.8, lng: 119.1 },
  { time: '2025-07-06T18:00', lat: 24.8, lng: 120.2 },
  { time: '2025-07-07T00:00', lat: 23.45, lng: 120.15 },
  { time: '2025-07-07T06:00', lat: 27.2, lng: 121.4 },
  { time: '2025-07-07T09:00', lat: 23.8, lng: 120.9 },
  { time: '2025-07-07T18:00', lat: 25.0, lng: 121.5 },
  { time: '2025-07-08T09:00', lat: 27.6, lng: 121.1 },
  { time: '2025-07-08T12:00', lat: 27.8, lng: 121.0 },
  { time: '2025-07-08T15:00', lat: 27.9, lng: 120.9 },
  { time: '2025-07-08T21:00', lat: 27.85, lng: 121.15 },
  { time: '2025-07-09T09:00', lat: 26.8, lng: 119.0 },
  { time: '2025-07-11T00:00', lat: 26.0, lng: 118.2 }
]

function getTyphoonLevel(windSpeed) {
  if (windSpeed >= 51) return 'SuperTY'
  if (windSpeed >= 41) return 'STY'
  if (windSpeed >= 33) return 'TY'
  if (windSpeed >= 25) return 'STS'
  if (windSpeed >= 18) return 'TS'
  if (windSpeed >= 11) return 'TD'
  return 'LOW'
}

/** 按本地时区解析 YYYY-MM-DDTHH:mm（与新闻数据字符串一致） */
function parseLocal(t) {
  const [d, tPart] = t.split('T')
  const [y, mo, da] = d.split('-').map(Number)
  const [h, mi = 0] = tPart.split(':').map(Number)
  return new Date(y, mo - 1, da, h, mi, 0, 0).getTime()
}

function formatLocal(ms) {
  const d = new Date(ms)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function lerp(a, b, t) {
  return a + (b - a) * t
}

/** 沿锚点折线按弧长比例取点 */
function pointAlongAnchors(fraction) {
  const f = Math.max(0, Math.min(1, fraction))
  const segLens = []
  let total = 0
  for (let i = 1; i < anchors.length; i++) {
    const dt = parseLocal(anchors[i].time) - parseLocal(anchors[i - 1].time)
    const dlat = anchors[i].lat - anchors[i - 1].lat
    const dlng = anchors[i].lng - anchors[i - 1].lng
    const len = Math.hypot(dlat, dlng) + Math.abs(dt) / 1e11
    segLens.push(len)
    total += len
  }
  let target = f * total
  for (let i = 0; i < segLens.length; i++) {
    if (target <= segLens[i] || i === segLens.length - 1) {
      const t = segLens[i] > 0 ? Math.min(1, target / segLens[i]) : 0
      const a = anchors[i]
      const b = anchors[i + 1]
      const timeMs = lerp(parseLocal(a.time), parseLocal(b.time), t)
      return {
        time: formatLocal(timeMs),
        lat: lerp(a.lat, b.lat, t),
        lng: lerp(a.lng, b.lng, t)
      }
    }
    target -= segLens[i]
  }
  const last = anchors[anchors.length - 1]
  return { time: last.time, lat: last.lat, lng: last.lng }
}

const N = 33
const t0 = parseLocal(anchors[0].time)
const t1 = parseLocal(anchors[anchors.length - 1].time)

const track = []
for (let i = 0; i < N; i++) {
  const frac = N <= 1 ? 0 : i / (N - 1)
  const timeMs = lerp(t0, t1, frac)
  const { lat, lng } = pointAlongAnchors(frac)
  // 演示用风速曲线：先升后降
  const phase = frac
  const windSpeed = Math.round(
    14 + 34 * Math.sin(phase * Math.PI) * Math.exp(-0.35 * Math.abs(phase - 0.55))
  )
  const pressure = Math.round(1005 - windSpeed * 1.15)
  const level = getTyphoonLevel(windSpeed)
  track.push({
    time: formatLocal(timeMs),
    lat: Math.round(lat * 1000) / 1000,
    lng: Math.round(lng * 1000) / 1000,
    level,
    pressure,
    windSpeed,
    description: i === 0 ? '台风海上初始观测位置' : `路径点 ${i + 1}`,
    intensityCode: windSpeed >= 33 ? 3 : windSpeed >= 25 ? 2 : 1,
    moveSpeed: 18 + Math.round(8 * Math.sin(frac * Math.PI * 2)),
    moveDirection: frac < 0.5 ? '西北' : '北偏西'
  })
}

const outPath = path.join(root, 'src', 'data', 'typhoonTrack.js')
const body = `// src/data/typhoonTrack.js — 丹娜丝（2504）演示路径（与 2025 新闻时间线对齐的近似插值）
// 说明：由 scripts/rebuild_track_from_news.mjs 根据新闻锚点生成，用于毕设可视化；非官方逐小时 Best Track。
// 生成日期: ${new Date().toISOString().slice(0, 10)}

export const typhoonTrack = ${JSON.stringify(track, null, 2)};
`

fs.writeFileSync(outPath, body, 'utf-8')
console.log('Wrote', outPath, 'points:', track.length)
