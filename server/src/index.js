import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import cors from 'cors'
import express from 'express'
import initSqlJs from 'sql.js'

import { typhoonTrack } from '../../src/data/typhoonTrack.js'
import { typhoonEvents } from '../../src/data/typhoonEvents.js'
import { alertLogs } from '../../src/data/alertLogs.js'
import { disasterStats } from '../../src/data/disasterStats.js'
import { sourceCredibilityMap } from '../../src/data/sourceCredibility.js'
import { rainfallFrames } from '../../src/data/rainfallFrames.js'
import { rainfallGridCells } from '../../src/data/rainfallGridCells.js'
import { nightLightCells } from '../../src/data/nightLightCells.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PORT = Number(process.env.PORT || 3100)

function resolveDbPath(rawPath) {
  if (!rawPath) {
    return path.resolve(__dirname, '..', 'data', 'replay.db')
  }

  // Convert accidental Windows backslashes to a stable form before resolving.
  const normalized = String(rawPath).replace(/\\/g, '/')
  return path.resolve(normalized)
}

const DB_PATH = resolveDbPath(process.env.DB_PATH)

function ensureDirectory(filePath) {
  const directory = path.dirname(filePath)
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true })
  }
}

function sortByTime(items) {
  return (items || [])
    .slice()
    .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
}

class SqliteStore {
  constructor(db, persistPath) {
    this.db = db
    this.persistPath = persistPath
  }

  run(sql, params = []) {
    this.db.run(sql, params)
  }

  all(sql, params = []) {
    const statement = this.db.prepare(sql)

    try {
      if (Array.isArray(params) && params.length > 0) {
        statement.bind(params)
      }

      const rows = []
      while (statement.step()) {
        rows.push(statement.getAsObject())
      }
      return rows
    } finally {
      statement.free()
    }
  }

  get(sql, params = []) {
    const rows = this.all(sql, params)
    return rows[0] || null
  }

  persist() {
    const buffer = Buffer.from(this.db.export())
    fs.writeFileSync(this.persistPath, buffer)
  }

  close() {
    this.db.close()
  }
}

function parseJsonField(value, fallbackValue) {
  if (!value) return fallbackValue

  try {
    return JSON.parse(value)
  } catch {
    return fallbackValue
  }
}

function toFiniteNumber(value, fallbackValue = null) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallbackValue
}

function buildBoundsFilter(query = {}) {
  const clauses = []
  const params = []

  const minLat = toFiniteNumber(query.minLat)
  const maxLat = toFiniteNumber(query.maxLat)
  const minLng = toFiniteNumber(query.minLng)
  const maxLng = toFiniteNumber(query.maxLng)

  if (minLat !== null) {
    clauses.push('lat >= ?')
    params.push(minLat)
  }
  if (maxLat !== null) {
    clauses.push('lat <= ?')
    params.push(maxLat)
  }
  if (minLng !== null) {
    clauses.push('lng >= ?')
    params.push(minLng)
  }
  if (maxLng !== null) {
    clauses.push('lng <= ?')
    params.push(maxLng)
  }

  const where = clauses.length > 0 ? ` AND ${clauses.join(' AND ')}` : ''
  return { where, params }
}

function parseLimit(rawLimit, fallback = 800, max = 5000) {
  const parsed = toFiniteNumber(rawLimit)
  if (parsed === null) return fallback
  return Math.min(max, Math.max(1, Math.floor(parsed)))
}

function resolveSliceTime(store, tableName, requestedTime) {
  if (requestedTime) {
    const scoped = store.get(
      `SELECT time FROM ${tableName} WHERE time <= ? ORDER BY time DESC LIMIT 1`,
      [requestedTime]
    )
    if (scoped?.time) {
      return scoped.time
    }
  }

  const latest = store.get(`SELECT time FROM ${tableName} ORDER BY time DESC LIMIT 1`)
  return latest?.time || null
}

function buildGridMeta(store, tableName, valueColumn, unit) {
  const row = store.get(`
    SELECT
      COUNT(1) AS rowCount,
      COUNT(DISTINCT time) AS timeSliceCount,
      MIN(time) AS minTime,
      MAX(time) AS maxTime,
      MIN(lat) AS minLat,
      MAX(lat) AS maxLat,
      MIN(lng) AS minLng,
      MAX(lng) AS maxLng,
      MIN(${valueColumn}) AS minValue,
      MAX(${valueColumn}) AS maxValue
    FROM ${tableName}
  `)

  return {
    rowCount: Number(row?.rowCount || 0),
    timeSliceCount: Number(row?.timeSliceCount || 0),
    minTime: row?.minTime || null,
    maxTime: row?.maxTime || null,
    bounds: [
      [toFiniteNumber(row?.minLat, 0), toFiniteNumber(row?.minLng, 0)],
      [toFiniteNumber(row?.maxLat, 0), toFiniteNumber(row?.maxLng, 0)]
    ],
    valueRange: {
      min: toFiniteNumber(row?.minValue, 0),
      max: toFiniteNumber(row?.maxValue, 0),
      unit
    }
  }
}

function initializeSchema(store) {
  const schemaStatements = [
    `CREATE TABLE IF NOT EXISTS typhoon_track (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      time TEXT NOT NULL UNIQUE,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      name TEXT,
      level TEXT,
      pressure REAL,
      wind_speed REAL,
      description TEXT,
      intensity_code TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS typhoon_events (
      id INTEGER PRIMARY KEY,
      time TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      type TEXT NOT NULL,
      impact_radius REAL,
      source TEXT,
      details_json TEXT,
      affected_areas_json TEXT,
      rescue_teams_json TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS alert_logs (
      id TEXT PRIMARY KEY,
      time TEXT NOT NULL,
      level TEXT,
      issuing_agency TEXT,
      response_delay_minutes REAL,
      action TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS disaster_stats (
      time TEXT PRIMARY KEY,
      impacted_cities INTEGER,
      transferred_people INTEGER,
      suspension_count INTEGER,
      casualties INTEGER,
      estimated_loss REAL
    )`,
    `CREATE TABLE IF NOT EXISTS source_credibility (
      source TEXT PRIMARY KEY,
      level TEXT,
      score REAL,
      label TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS rainfall_frames (
      id TEXT PRIMARY KEY,
      time TEXT NOT NULL,
      image_url TEXT NOT NULL,
      bounds_json TEXT NOT NULL,
      title TEXT,
      source TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS rainfall_grid_cells (
      id TEXT PRIMARY KEY,
      time TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      value_mm_h REAL NOT NULL,
      level TEXT,
      source TEXT,
      grid_size REAL
    )`,
    `CREATE TABLE IF NOT EXISTS night_light_cells (
      id TEXT PRIMARY KEY,
      time TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      intensity REAL NOT NULL,
      delta REAL,
      source TEXT,
      grid_size REAL
    )`,
    'CREATE INDEX IF NOT EXISTS idx_typhoon_track_time ON typhoon_track (time)',
    'CREATE INDEX IF NOT EXISTS idx_typhoon_events_time ON typhoon_events (time)',
    'CREATE INDEX IF NOT EXISTS idx_rainfall_frames_time ON rainfall_frames (time)',
    'CREATE INDEX IF NOT EXISTS idx_rainfall_grid_time ON rainfall_grid_cells (time)',
    'CREATE INDEX IF NOT EXISTS idx_rainfall_grid_geo ON rainfall_grid_cells (lat, lng)',
    'CREATE INDEX IF NOT EXISTS idx_night_light_time ON night_light_cells (time)',
    'CREATE INDEX IF NOT EXISTS idx_night_light_geo ON night_light_cells (lat, lng)'
  ]

  schemaStatements.forEach((statement) => {
    store.run(statement)
  })
}

function seedTableIfEmpty(store, tableName, seedFn) {
  const count = Number(store.get(`SELECT COUNT(1) AS count FROM ${tableName}`)?.count || 0)
  if (count > 0) {
    return false
  }
  seedFn()
  return true
}

function seedDatabase(store) {
  let wroteData = false

  wroteData = seedTableIfEmpty(store, 'typhoon_track', () => {
    for (const point of sortByTime(typhoonTrack)) {
      store.run(`
        INSERT INTO typhoon_track (
          time, lat, lng, name, level, pressure, wind_speed, description, intensity_code
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        point.time,
        Number(point.lat),
        Number(point.lng),
        point.name || null,
        point.level || null,
        Number.isFinite(Number(point.pressure)) ? Number(point.pressure) : null,
        Number.isFinite(Number(point.windSpeed)) ? Number(point.windSpeed) : null,
        point.description || null,
        point.intensityCode || null
      ])
    }
  }) || wroteData

  wroteData = seedTableIfEmpty(store, 'typhoon_events', () => {
    for (const event of sortByTime(typhoonEvents)) {
      store.run(`
        INSERT INTO typhoon_events (
          id, time, lat, lng, title, content, type, impact_radius, source,
          details_json, affected_areas_json, rescue_teams_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        Number(event.id),
        event.time,
        Number(event.lat),
        Number(event.lng),
        event.title,
        event.content,
        event.type,
        Number.isFinite(Number(event.impactRadius)) ? Number(event.impactRadius) : null,
        event.source || null,
        JSON.stringify(event.details || []),
        JSON.stringify(event.affectedAreas || []),
        JSON.stringify(event.rescueTeams || [])
      ])
    }
  }) || wroteData

  wroteData = seedTableIfEmpty(store, 'alert_logs', () => {
    for (const log of sortByTime(alertLogs)) {
      store.run(`
        INSERT INTO alert_logs (
          id, time, level, issuing_agency, response_delay_minutes, action
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [
        log.id,
        log.time,
        log.level || null,
        log.issuingAgency || null,
        Number.isFinite(Number(log.responseDelayMinutes)) ? Number(log.responseDelayMinutes) : null,
        log.action || null
      ])
    }
  }) || wroteData

  wroteData = seedTableIfEmpty(store, 'disaster_stats', () => {
    for (const item of sortByTime(disasterStats)) {
      store.run(`
        INSERT INTO disaster_stats (
          time, impacted_cities, transferred_people, suspension_count, casualties, estimated_loss
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [
        item.time,
        Number(item.impactedCities || 0),
        Number(item.transferredPeople || 0),
        Number(item.suspensionCount || 0),
        Number(item.casualties || 0),
        Number(item.estimatedLoss || 0)
      ])
    }
  }) || wroteData

  wroteData = seedTableIfEmpty(store, 'source_credibility', () => {
    for (const [source, meta] of Object.entries(sourceCredibilityMap || {})) {
      store.run(`
        INSERT INTO source_credibility (source, level, score, label)
        VALUES (?, ?, ?, ?)
      `, [
        source,
        meta.level || null,
        Number.isFinite(Number(meta.score)) ? Number(meta.score) : null,
        meta.label || null
      ])
    }
  }) || wroteData

  wroteData = seedTableIfEmpty(store, 'rainfall_frames', () => {
    for (const frame of sortByTime(rainfallFrames)) {
      store.run(`
        INSERT INTO rainfall_frames (id, time, image_url, bounds_json, title, source)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        frame.id,
        frame.time,
        frame.imageUrl,
        JSON.stringify(frame.bounds || []),
        frame.title || null,
        frame.source || null
      ])
    }
  }) || wroteData

  wroteData = seedTableIfEmpty(store, 'rainfall_grid_cells', () => {
    for (const cell of sortByTime(rainfallGridCells)) {
      store.run(`
        INSERT INTO rainfall_grid_cells (
          id, time, lat, lng, value_mm_h, level, source, grid_size
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        cell.id,
        cell.time,
        Number(cell.lat),
        Number(cell.lng),
        Number(cell.value || 0),
        cell.level || null,
        cell.source || null,
        Number.isFinite(Number(cell.gridSize)) ? Number(cell.gridSize) : null
      ])
    }
  }) || wroteData

  wroteData = seedTableIfEmpty(store, 'night_light_cells', () => {
    for (const cell of sortByTime(nightLightCells)) {
      store.run(`
        INSERT INTO night_light_cells (
          id, time, lat, lng, intensity, delta, source, grid_size
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        cell.id,
        cell.time,
        Number(cell.lat),
        Number(cell.lng),
        Number(cell.intensity || 0),
        Number.isFinite(Number(cell.delta)) ? Number(cell.delta) : null,
        cell.source || null,
        Number.isFinite(Number(cell.gridSize)) ? Number(cell.gridSize) : null
      ])
    }
  }) || wroteData

  if (wroteData) {
    store.persist()
  }
}

function buildEventsFilter(query) {
  const clauses = []
  const params = []

  if (query.from) {
    clauses.push('time >= ?')
    params.push(query.from)
  }
  if (query.to) {
    clauses.push('time <= ?')
    params.push(query.to)
  }
  if (query.type) {
    clauses.push('type = ?')
    params.push(query.type)
  }
  if (query.source) {
    clauses.push('source = ?')
    params.push(query.source)
  }
  if (query.keyword) {
    clauses.push('(title LIKE ? OR content LIKE ?)')
    params.push(`%${query.keyword}%`, `%${query.keyword}%`)
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''
  return { where, params }
}

function mapEventRow(row) {
  return {
    id: row.id,
    time: row.time,
    lat: row.lat,
    lng: row.lng,
    title: row.title,
    content: row.content,
    type: row.type,
    impactRadius: row.impactRadius,
    source: row.source,
    details: parseJsonField(row.details_json, []),
    affectedAreas: parseJsonField(row.affected_areas_json, []),
    rescueTeams: parseJsonField(row.rescue_teams_json, [])
  }
}

function mapRainfallGridRow(row) {
  return {
    id: row.id,
    time: row.time,
    lat: toFiniteNumber(row.lat, 0),
    lng: toFiniteNumber(row.lng, 0),
    value: toFiniteNumber(row.value, 0),
    level: row.level,
    source: row.source,
    gridSize: toFiniteNumber(row.gridSize, 0.5)
  }
}

function mapNightLightRow(row) {
  return {
    id: row.id,
    time: row.time,
    lat: toFiniteNumber(row.lat, 0),
    lng: toFiniteNumber(row.lng, 0),
    intensity: toFiniteNumber(row.intensity, 0),
    delta: toFiniteNumber(row.delta, 0),
    source: row.source,
    gridSize: toFiniteNumber(row.gridSize, 0.6)
  }
}

function safeHandler(handler) {
  return (request, response) => {
    try {
      handler(request, response)
    } catch (error) {
      response.status(500).json({
        error: 'server_error',
        message: error.message
      })
    }
  }
}

async function createServer() {
  ensureDirectory(DB_PATH)

  const SQL = await initSqlJs({
    locateFile: (file) => path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', file)
  })

  const persistedFileExists = fs.existsSync(DB_PATH) && fs.statSync(DB_PATH).size > 0
  const database = persistedFileExists
    ? new SQL.Database(fs.readFileSync(DB_PATH))
    : new SQL.Database()

  const store = new SqliteStore(database, DB_PATH)

  initializeSchema(store)
  seedDatabase(store)

  const app = express()
  app.use(cors())
  app.use(express.json())

  app.get('/api/health', safeHandler((_request, response) => {
    const eventCount = Number(store.get('SELECT COUNT(1) AS count FROM typhoon_events')?.count || 0)
    const rainfallGridCount = Number(store.get('SELECT COUNT(1) AS count FROM rainfall_grid_cells')?.count || 0)
    const nightLightCount = Number(store.get('SELECT COUNT(1) AS count FROM night_light_cells')?.count || 0)

    response.json({
      ok: true,
      dbPath: DB_PATH,
      eventCount,
      rainfallGridCount,
      nightLightCount
    })
  }))

  app.get('/api/replay/track', safeHandler((request, response) => {
    const { from, to } = request.query
    const clauses = []
    const params = []

    if (from) {
      clauses.push('time >= ?')
      params.push(from)
    }
    if (to) {
      clauses.push('time <= ?')
      params.push(to)
    }

    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''
    const rows = store.all(`
      SELECT time, lat, lng, name, level, pressure,
             wind_speed AS windSpeed, description, intensity_code AS intensityCode
      FROM typhoon_track
      ${where}
      ORDER BY time ASC
    `, params)

    response.json(rows)
  }))

  app.get('/api/replay/events', safeHandler((request, response) => {
    const { where, params } = buildEventsFilter(request.query)

    const rows = store.all(`
      SELECT id, time, lat, lng, title, content, type,
             impact_radius AS impactRadius, source,
             details_json, affected_areas_json, rescue_teams_json
      FROM typhoon_events
      ${where}
      ORDER BY time ASC
    `, params)

    response.json(rows.map(mapEventRow))
  }))

  app.get('/api/replay/alert-logs', safeHandler((_request, response) => {
    const rows = store.all(`
      SELECT id, time, level, issuing_agency AS issuingAgency,
             response_delay_minutes AS responseDelayMinutes,
             action
      FROM alert_logs
      ORDER BY time ASC
    `)
    response.json(rows)
  }))

  app.get('/api/replay/disaster-stats', safeHandler((_request, response) => {
    const rows = store.all(`
      SELECT time,
             impacted_cities AS impactedCities,
             transferred_people AS transferredPeople,
             suspension_count AS suspensionCount,
             casualties,
             estimated_loss AS estimatedLoss
      FROM disaster_stats
      ORDER BY time ASC
    `)
    response.json(rows)
  }))

  app.get('/api/replay/source-credibility', safeHandler((_request, response) => {
    const rows = store.all(`
      SELECT source, level, score, label
      FROM source_credibility
      ORDER BY score DESC
    `)

    const sourceMap = rows.reduce((accumulator, item) => {
      accumulator[item.source] = {
        level: item.level,
        score: item.score,
        label: item.label
      }
      return accumulator
    }, {})

    response.json(sourceMap)
  }))

  app.get('/api/replay/rainfall-frames', safeHandler((_request, response) => {
    const rows = store.all(`
      SELECT id, time, image_url AS imageUrl, bounds_json, title, source
      FROM rainfall_frames
      ORDER BY time ASC
    `)

    response.json(rows.map((row) => ({
      id: row.id,
      time: row.time,
      imageUrl: row.imageUrl,
      bounds: parseJsonField(row.bounds_json, []),
      title: row.title,
      source: row.source
    })))
  }))

  app.get('/api/replay/rainfall-grid', safeHandler((request, response) => {
    const sliceTime = resolveSliceTime(store, 'rainfall_grid_cells', request.query.time)
    if (!sliceTime) {
      response.json({
        time: null,
        unit: 'mm/h',
        cells: [],
        legend: [],
        dataSource: 'api'
      })
      return
    }

    const { where, params } = buildBoundsFilter(request.query)
    const limit = parseLimit(request.query.limit, 1200)
    const rows = store.all(`
      SELECT id, time, lat, lng,
             value_mm_h AS value,
             level,
             source,
             grid_size AS gridSize
      FROM rainfall_grid_cells
      WHERE time = ?${where}
      ORDER BY value_mm_h DESC
      LIMIT ?
    `, [sliceTime, ...params, limit])

    response.json({
      time: sliceTime,
      unit: 'mm/h',
      cells: rows.map(mapRainfallGridRow),
      legend: [
        { min: 0, max: 10, label: '小雨' },
        { min: 10, max: 25, label: '中雨' },
        { min: 25, max: 50, label: '大雨' },
        { min: 50, max: 80, label: '暴雨' },
        { min: 80, max: null, label: '大暴雨及以上' }
      ],
      dataSource: 'api'
    })
  }))

  app.get('/api/replay/night-light-grid', safeHandler((request, response) => {
    const sliceTime = resolveSliceTime(store, 'night_light_cells', request.query.time)
    if (!sliceTime) {
      response.json({
        time: null,
        unit: 'nW/cm^2/sr',
        cells: [],
        dataSource: 'api'
      })
      return
    }

    const { where, params } = buildBoundsFilter(request.query)
    const limit = parseLimit(request.query.limit, 1200)
    const rows = store.all(`
      SELECT id, time, lat, lng,
             intensity,
             delta,
             source,
             grid_size AS gridSize
      FROM night_light_cells
      WHERE time = ?${where}
      ORDER BY ABS(delta) DESC
      LIMIT ?
    `, [sliceTime, ...params, limit])

    response.json({
      time: sliceTime,
      unit: 'nW/cm^2/sr',
      cells: rows.map(mapNightLightRow),
      dataSource: 'api'
    })
  }))

  app.get('/api/replay/bundle', safeHandler((_request, response) => {
    const trackRows = store.all(`
      SELECT time, lat, lng, name, level, pressure,
             wind_speed AS windSpeed, description, intensity_code AS intensityCode
      FROM typhoon_track
      ORDER BY time ASC
    `)

    const eventRows = store.all(`
      SELECT id, time, lat, lng, title, content, type,
             impact_radius AS impactRadius, source,
             details_json, affected_areas_json, rescue_teams_json
      FROM typhoon_events
      ORDER BY time ASC
    `)

    const alertRows = store.all(`
      SELECT id, time, level, issuing_agency AS issuingAgency,
             response_delay_minutes AS responseDelayMinutes,
             action
      FROM alert_logs
      ORDER BY time ASC
    `)

    const statsRows = store.all(`
      SELECT time,
             impacted_cities AS impactedCities,
             transferred_people AS transferredPeople,
             suspension_count AS suspensionCount,
             casualties,
             estimated_loss AS estimatedLoss
      FROM disaster_stats
      ORDER BY time ASC
    `)

    const sourceRows = store.all(`
      SELECT source, level, score, label
      FROM source_credibility
      ORDER BY score DESC
    `)

    const frameRows = store.all(`
      SELECT id, time, image_url AS imageUrl, bounds_json, title, source
      FROM rainfall_frames
      ORDER BY time ASC
    `)

    const rainfallGridRows = store.all(`
      SELECT id, time, lat, lng,
             value_mm_h AS value,
             level,
             source,
             grid_size AS gridSize
      FROM rainfall_grid_cells
      ORDER BY time ASC, value_mm_h DESC
    `)

    const nightLightRows = store.all(`
      SELECT id, time, lat, lng,
             intensity,
             delta,
             source,
             grid_size AS gridSize
      FROM night_light_cells
      ORDER BY time ASC, ABS(delta) DESC
    `)

    const sourceMap = sourceRows.reduce((accumulator, item) => {
      accumulator[item.source] = {
        level: item.level,
        score: item.score,
        label: item.label
      }
      return accumulator
    }, {})

    response.json({
      typhoonTrack: trackRows,
      typhoonEvents: eventRows.map(mapEventRow),
      alertLogs: alertRows,
      disasterStats: statsRows,
      sourceCredibilityMap: sourceMap,
      rainfallFrames: frameRows.map((row) => ({
        id: row.id,
        time: row.time,
        imageUrl: row.imageUrl,
        bounds: parseJsonField(row.bounds_json, []),
        title: row.title,
        source: row.source
      })),
      rainfallGridCells: rainfallGridRows.map(mapRainfallGridRow),
      nightLightCells: nightLightRows.map(mapNightLightRow),
      rainfallGridMeta: buildGridMeta(store, 'rainfall_grid_cells', 'value_mm_h', 'mm/h'),
      nightLightMeta: buildGridMeta(store, 'night_light_cells', 'intensity', 'nW/cm^2/sr'),
      dataSource: 'api'
    })
  }))

  // Tiles proxy: forwards tile requests to Tianditu using a server-side key.
  // Usage: /api/tiles/:layer/:z/:x/:y
  // layer examples: vec_w, cva_w
  app.get('/api/tiles/:layer/:z/:x/:y', safeHandler(async (req, res) => {
    const { layer, z, x, y } = req.params
    const serverKey = process.env.TIANDITU_KEY || process.env.SERVER_TIANDITU_KEY || process.env.VUE_APP_TIANDITU_KEY || ''
    if (!serverKey) {
      return res.status(500).json({ error: 'missing_tianditu_key', message: 'Server tile key not configured' })
    }

    const subdomains = ['0','1','2','3','4','5','6','7']
    const idx = Math.abs((Number(z) || 0) + (Number(x) || 0) + (Number(y) || 0)) % subdomains.length
    const s = subdomains[idx]

    const upstream = `https://t${s}.tianditu.gov.cn/DataServer?T=${encodeURIComponent(layer)}&x=${encodeURIComponent(x)}&y=${encodeURIComponent(y)}&l=${encodeURIComponent(z)}&tk=${encodeURIComponent(serverKey)}`

    try {
      const upstreamResp = await fetch(upstream)
      if (!upstreamResp.ok) {
        res.status(upstreamResp.status)
        return res.send(await upstreamResp.text())
      }

      const contentType = upstreamResp.headers.get('content-type') || 'application/octet-stream'
      res.setHeader('Content-Type', contentType)
      res.setHeader('Cache-Control', 'public, max-age=300')

      const arrayBuffer = await upstreamResp.arrayBuffer()
      res.send(Buffer.from(arrayBuffer))
    } catch (err) {
      res.status(502).json({ error: 'upstream_error', message: String(err) })
    }
  }))

  app.use((_request, response) => {
    response.status(404).json({
      error: 'not_found'
    })
  })

  const server = app.listen(PORT, () => {
    process.stdout.write(`replay-api listening on http://localhost:${PORT}\n`)
  })

  const shutdown = () => {
    server.close(() => {
      store.close()
      process.exit(0)
    })
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

createServer().catch((error) => {
  process.stderr.write(`server_start_failed: ${error.message}\n`)
  process.exit(1)
})
