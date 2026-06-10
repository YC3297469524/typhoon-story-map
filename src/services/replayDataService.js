import { typhoonTrack as staticTrack } from '@/data/typhoonTrack'
import { typhoonEvents as staticEvents } from '@/data/typhoonEvents'
import { alertLogs as staticAlertLogs } from '@/data/alertLogs'
import { disasterStats as staticDisasterStats } from '@/data/disasterStats'
import { sourceCredibilityMap as staticSourceCredibilityMap } from '@/data/sourceCredibility'
import { rainfallFrames as staticRainfallFrames } from '@/data/rainfallFrames'
import { rainfallGridCells as staticRainfallGridCells } from '@/data/rainfallGridCells'
import { nightLightCells as staticNightLightCells } from '@/data/nightLightCells'

function sortByTime(items) {
  return (items || [])
    .slice()
    .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
}

function buildGridMeta(cells, valueField, unit) {
  const ordered = sortByTime(cells)
  if (ordered.length === 0) {
    return {
      rowCount: 0,
      timeSliceCount: 0,
      minTime: null,
      maxTime: null,
      bounds: [[0, 0], [0, 0]],
      valueRange: {
        min: 0,
        max: 0,
        unit
      }
    }
  }

  const latValues = ordered.map((item) => Number(item.lat)).filter((value) => Number.isFinite(value))
  const lngValues = ordered.map((item) => Number(item.lng)).filter((value) => Number.isFinite(value))
  const valueValues = ordered.map((item) => Number(item[valueField])).filter((value) => Number.isFinite(value))

  const safeLatValues = latValues.length > 0 ? latValues : [0]
  const safeLngValues = lngValues.length > 0 ? lngValues : [0]
  const safeValueValues = valueValues.length > 0 ? valueValues : [0]

  return {
    rowCount: ordered.length,
    timeSliceCount: new Set(ordered.map((item) => item.time)).size,
    minTime: ordered[0].time,
    maxTime: ordered[ordered.length - 1].time,
    bounds: [
      [Math.min(...safeLatValues), Math.min(...safeLngValues)],
      [Math.max(...safeLatValues), Math.max(...safeLngValues)]
    ],
    valueRange: {
      min: Math.min(...safeValueValues),
      max: Math.max(...safeValueValues),
      unit
    }
  }
}

function buildStaticBundle(dataSource = 'static-fallback', fetchedTrack = null, fetchedEvents = null) {
  const rainfallGridCells = sortByTime(staticRainfallGridCells)
  const nightLightCells = sortByTime(staticNightLightCells)

  return {
    typhoonTrack: sortByTime(fetchedTrack || staticTrack),
    typhoonEvents: sortByTime(fetchedEvents || staticEvents),
    alertLogs: sortByTime(staticAlertLogs),
    disasterStats: sortByTime(staticDisasterStats),
    sourceCredibilityMap: { ...staticSourceCredibilityMap },
    rainfallFrames: sortByTime(staticRainfallFrames),
    rainfallGridCells,
    nightLightCells,
    rainfallGridMeta: buildGridMeta(rainfallGridCells, 'value', 'mm/h'),
    nightLightMeta: buildGridMeta(nightLightCells, 'intensity', 'nW/cm^2/sr'),
    dataSource
  }
}

export async function loadReplayBundle() {
  return buildStaticBundle('static-fallback')
}
