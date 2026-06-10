// 历史回放夜光格网数据（MVP）
// intensity 单位: nW/cm^2/sr，delta 单位: %（相对基准变化）
export const nightLightCells = [
  { id: 'light-grid-1', time: '2025-07-06T12:00', lat: 23.5, lng: 119.9, intensity: 42.5, delta: -4.2, gridSize: 0.6, source: '历史夜光格网样例' },
  { id: 'light-grid-2', time: '2025-07-06T12:00', lat: 24.1, lng: 120.5, intensity: 51.1, delta: -6.8, gridSize: 0.6, source: '历史夜光格网样例' },
  { id: 'light-grid-3', time: '2025-07-06T12:00', lat: 24.8, lng: 121.0, intensity: 63.4, delta: -2.5, gridSize: 0.6, source: '历史夜光格网样例' },
  { id: 'light-grid-4', time: '2025-07-06T12:00', lat: 25.4, lng: 121.5, intensity: 58.2, delta: -8.6, gridSize: 0.6, source: '历史夜光格网样例' },
  { id: 'light-grid-5', time: '2025-07-06T12:00', lat: 26.1, lng: 121.9, intensity: 46.7, delta: -5.3, gridSize: 0.6, source: '历史夜光格网样例' },

  { id: 'light-grid-6', time: '2025-07-07T12:00', lat: 24.0, lng: 120.2, intensity: 38.6, delta: -18.4, gridSize: 0.6, source: '历史夜光格网样例' },
  { id: 'light-grid-7', time: '2025-07-07T12:00', lat: 24.6, lng: 120.7, intensity: 34.9, delta: -26.9, gridSize: 0.6, source: '历史夜光格网样例' },
  { id: 'light-grid-8', time: '2025-07-07T12:00', lat: 25.1, lng: 121.1, intensity: 41.2, delta: -23.7, gridSize: 0.6, source: '历史夜光格网样例' },
  { id: 'light-grid-9', time: '2025-07-07T12:00', lat: 25.7, lng: 121.6, intensity: 39.8, delta: -19.1, gridSize: 0.6, source: '历史夜光格网样例' },
  { id: 'light-grid-10', time: '2025-07-07T12:00', lat: 26.4, lng: 122.0, intensity: 44.5, delta: -12.4, gridSize: 0.6, source: '历史夜光格网样例' },

  { id: 'light-grid-11', time: '2025-07-08T18:00', lat: 25.6, lng: 120.8, intensity: 47.2, delta: -10.1, gridSize: 0.6, source: '历史夜光格网样例' },
  { id: 'light-grid-12', time: '2025-07-08T18:00', lat: 26.0, lng: 121.2, intensity: 50.6, delta: -8.8, gridSize: 0.6, source: '历史夜光格网样例' },
  { id: 'light-grid-13', time: '2025-07-08T18:00', lat: 26.5, lng: 121.6, intensity: 53.8, delta: -6.2, gridSize: 0.6, source: '历史夜光格网样例' },
  { id: 'light-grid-14', time: '2025-07-08T18:00', lat: 27.0, lng: 121.9, intensity: 56.4, delta: -4.1, gridSize: 0.6, source: '历史夜光格网样例' },
  { id: 'light-grid-15', time: '2025-07-08T18:00', lat: 27.4, lng: 122.3, intensity: 59.9, delta: -2.7, gridSize: 0.6, source: '历史夜光格网样例' }
]

// 夜光判读区中心点（与 ERA5/IMERG region 名称一一对应）
export const nightLightRegionCenters = {
  ShanghaiCore: { lat: 31.25, lng: 121.5 },
  YangtzeDeltaWide: { lat: 31.4, lng: 120.4 },
  TyphoonTrackMatch: { lat: 25.75, lng: 119.75 }
}
