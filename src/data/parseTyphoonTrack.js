// parseTyphoonTrack.js — 解析台风路径数据（支持 CMA Best Track / CSV）
const fs = require('fs')
const path = require('path')

/**
 * 台风等级（按风速 m/s，参考 CMA 热带气旋等级）
 */
function getTyphoonLevel(windSpeed) {
  if (windSpeed >= 51) return 'SuperTY' // 超强台风 ≥51 m/s
  if (windSpeed >= 41) return 'STY' // 强台风 41–50 m/s
  if (windSpeed >= 33) return 'TY' // 台风 33–40 m/s
  if (windSpeed >= 25) return 'STS' // 强热带风暴 25–32 m/s
  if (windSpeed >= 18) return 'TS' // 热带风暴 18–24 m/s
  if (windSpeed >= 11) return 'TD' // 热带低压 11–17 m/s
  return 'LOW' // 低压 <11 m/s
}

/**
 * @param {string} timeStr YYYYMMDDHH，如 2023082706
 * @returns {string} ISO，如 2023-08-27T06:00
 */
function formatTime(timeStr) {
  const year = timeStr.substring(0, 4)
  const month = timeStr.substring(4, 6)
  const day = timeStr.substring(6, 8)
  const hour = timeStr.substring(8, 10)
  return `${year}-${month}-${day}T${hour}:00`
}

/**
 * @param {string} csvTime YYYY-MM-DD HH:mm:ss(.fraction)
 * @returns {string} YYYY-MM-DDTHH:mm
 */
function normalizeCsvTime(csvTime) {
  if (!csvTime) return ''
  const [datePart, timePart = '00:00:00'] = csvTime.trim().split(/\s+/)
  const [hour = '00', minute = '00'] = timePart.split(':')
  return `${datePart}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`
}

/**
 * 解析 CMA Best Track
 * @param {string} filePath 原始文本路径
 * @returns {Array} 轨迹点
 */
function parseBestTrack(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.trim().split('\n')

  // 第一行为 header，需跳过
  const header = lines[0].trim().split(/\s+/)
  const totalPoints = parseInt(header[2], 10)
  const intervalHours = parseInt(header[6], 10)

  console.log(`台风名称: ${header[7]}`)
  console.log(`路径点数: ${totalPoints}`)
  console.log(`时间间隔: ${intervalHours} 小时`)
  console.log(`修订日期: ${header[8]}\n`)

  const trackPoints = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const parts = line.split(/\s+/)
    /**
     * [0] 时间 YYYYMMDDHH
     * [1] 强度等级码 0–7
     * [2] 纬度 ×10
     * [3] 经度 ×10
     * [4] 中心气压 hPa
     * [5] 近中心最大风速 m/s
     */
    const timeStr = parts[0]
    const intensityCode = parseInt(parts[1], 10)
    const latTimes10 = parseInt(parts[2], 10)
    const lngTimes10 = parseInt(parts[3], 10)
    const pressure = parseInt(parts[4], 10)
    const windSpeed = parseInt(parts[5], 10)

    const lat = latTimes10 / 10.0
    const lng = lngTimes10 / 10.0
    const time = formatTime(timeStr)
    const level = getTyphoonLevel(windSpeed)

    let description = ''
    if (i === 1) {
      description = '台风海上初始观测位置'
    } else if (intensityCode === 5) {
      description = '台风强度达到峰值'
    } else if (intensityCode === 4) {
      description = '强台风阶段'
    } else if (intensityCode === 3) {
      description = '台风强度'
    } else if (intensityCode === 2) {
      description = '热带风暴'
    } else if (intensityCode === 1) {
      description = '热带低压'
    } else {
      description = '低压系统'
    }

    trackPoints.push({
      time,
      lat,
      lng,
      level,
      pressure,
      windSpeed,
      description,
      intensityCode
    })
  }

  if (trackPoints.length > 0) {
    console.log(`成功解析 ${trackPoints.length} 个轨迹点`)
    console.log(`时间范围: ${trackPoints[0].time} → ${trackPoints[trackPoints.length - 1].time}`)
    console.log(
      `空间范围: Lat ${Math.min(...trackPoints.map((p) => p.lat)).toFixed(1)}°–${Math.max(
        ...trackPoints.map((p) => p.lat)
      ).toFixed(1)}°, Lng ${Math.min(...trackPoints.map((p) => p.lng)).toFixed(1)}°–${Math.max(
        ...trackPoints.map((p) => p.lng)
      ).toFixed(1)}°`
    )
    console.log(`最大风速: ${Math.max(...trackPoints.map((p) => p.windSpeed))} m/s`)
    console.log(`最低气压: ${Math.min(...trackPoints.map((p) => p.pressure))} hPa\n`)
  }

  return trackPoints
}

/**
 * 解析 CSV 轨迹
 * @param {string} filePath
 * @returns {Array}
 */
function parseCsvTrack(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.trim().split('\n')

  if (lines.length <= 1) {
    return []
  }

  const header = lines[0].trim().toLowerCase()
  if (!header.includes('lat') || !header.includes('lon') || !header.includes('time')) {
    throw new Error('CSV 表头缺少必要字段: lat, lon, time')
  }

  const trackPoints = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const parts = line.split(',')
    if (parts.length < 3) continue

    const lat = parseFloat(parts[0])
    const lng = parseFloat(parts[1])
    const time = normalizeCsvTime(parts[2])
    const name = (parts[3] || '').trim()
    const windRaw = (parts[4] || '').trim()
    const windSpeed = Number.isFinite(Number(windRaw)) ? Number(windRaw) : 0
    const level = getTyphoonLevel(windSpeed)

    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !time) {
      continue
    }

    trackPoints.push({
      time,
      lat,
      lng,
      name,
      level,
      pressure: null,
      windSpeed,
      description: `${name || '热带气旋'}轨迹点`,
      intensityCode: null
    })
  }

  console.log(`成功解析 ${trackPoints.length} 个轨迹点`)
  if (trackPoints.length > 0) {
    console.log(`时间范围: ${trackPoints[0].time} → ${trackPoints[trackPoints.length - 1].time}`)
    console.log(
      `空间范围: Lat ${Math.min(...trackPoints.map((p) => p.lat)).toFixed(1)}°–${Math.max(
        ...trackPoints.map((p) => p.lat)
      ).toFixed(1)}°, Lng ${Math.min(...trackPoints.map((p) => p.lng)).toFixed(1)}°–${Math.max(
        ...trackPoints.map((p) => p.lng)
      ).toFixed(1)}°`
    )
    console.log(`最大风速: ${Math.max(...trackPoints.map((p) => p.windSpeed))} m/s\n`)
  }

  return trackPoints
}

/**
 * 自动识别格式并解析
 * @param {string} filePath
 * @returns {Array}
 */
function parseTrackFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8').trim()
  const firstLine = content.split('\n')[0].trim().toLowerCase()

  if (firstLine.includes('lat') && firstLine.includes('lon') && firstLine.includes('time') && firstLine.includes(',')) {
    console.log('检测到 CSV 轨迹格式\n')
    return parseCsvTrack(filePath)
  }

  console.log('检测到 CMA Best Track 格式\n')
  return parseBestTrack(filePath)
}

/**
 * 从 raw/danas.txt 生成 typhoonTrack.js（在 leaflet-index 下执行: node src/data/parseTyphoonTrack.js）
 * 注意：当前仓库内 danas.txt 为示例 CMA 文本（可能与 2025 新闻线不一致）。
 * 若要与新闻事件对齐的演示路径，请改用: node scripts/rebuild_track_from_news.mjs
 */
function generateTrackFile() {
  const inputPath = path.join(__dirname, 'raw', 'danas.txt')
  const outputPath = path.join(__dirname, 'typhoonTrack.js')

  console.log('=== 开始解析台风路径数据 ===\n')

  const trackPoints = parseTrackFile(inputPath)
  const trackName = trackPoints.find((point) => point.name)?.name || '台风'

  const code = `// src/data/typhoonTrack.js — ${trackName} 路径点（按时间排序）
// 数据来源: src/data/raw/danas.txt
// 解析日期: ${new Date().toISOString().split('T')[0]}
// 总轨迹点: ${trackPoints.length} 个

export const typhoonTrack = ${JSON.stringify(trackPoints, null, 2)};
`

  fs.writeFileSync(outputPath, code, 'utf-8')

  console.log(`已生成: ${outputPath}`)
  console.log('\n=== 解析完成 ===')
}

if (require.main === module) {
  generateTrackFile()
}

module.exports = {
  parseBestTrack,
  parseCsvTrack,
  parseTrackFile,
  getTyphoonLevel,
  formatTime,
  normalizeCsvTime
}
