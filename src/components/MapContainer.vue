<template>
  <div class="map-container" :class="{ 'narrative-basemap': basemapMode === 'narrative' }">
    <div class="map-canvas" ref="mapCanvas">
      <!-- 地图将在这里渲染 -->
    </div>
    <div v-if="nightLightsFocused" class="night-focus-mask"></div>

    <div class="right-ui-layer">
      <aside v-if="showNarrativePanel" class="narrative-panel">
        <div class="narrative-card">
          <div class="narrative-title">台风信息</div>
          <div class="narrative-subtitle">路径、风场与官方实况</div>

          <div class="basemap-switcher">
            <span class="basemap-label">底图切换</span>
            <button
              type="button"
              class="basemap-dot"
              :class="{ active: basemapMode === 'standard' }"
              title="标准"
              @click="setBasemapMode('standard')"
            >
              标
            </button>
            <button
              type="button"
              class="basemap-dot"
              :class="{ active: basemapMode === 'narrative' }"
              title="叙事"
              @click="setBasemapMode('narrative')"
            >
              叙
            </button>
          </div>

          <div class="typhoon-level-legend">
            <div class="legend-title">台风等级</div>
            <div class="legend-items">
              <div class="legend-item"><span class="legend-dot" style="background: #7f1d1d;"></span><span class="legend-text">超强台风</span></div>
              <div class="legend-item"><span class="legend-dot" style="background: #b91c1c;"></span><span class="legend-text">强台风</span></div>
              <div class="legend-item"><span class="legend-dot" style="background: #ef4444;"></span><span class="legend-text">台风</span></div>
              <div class="legend-item"><span class="legend-dot" style="background: #f97316;"></span><span class="legend-text">强热带风暴</span></div>
              <div class="legend-item"><span class="legend-dot" style="background: #f59e0b;"></span><span class="legend-text">热带风暴</span></div>
              <div class="legend-item"><span class="legend-dot" style="background: #facc15;"></span><span class="legend-text">热带低压</span></div>
              <div class="legend-item"><span class="legend-dot" style="background: #60a5fa;"></span><span class="legend-text">低压</span></div>
            </div>
          </div>

          <div class="module-block" v-if="narrativeSubmodules.status">
            <button type="button" class="module-header" @click="toggleModule('status')">
              <span>台风实况</span>
              <span v-if="narrativeActiveModule === 'status'">↑</span>
              <span v-else>↓</span>
            </button>
            <div v-if="narrativeActiveModule === 'status'" class="module-content">
              <div class="narrative-kv"><span>路径进度</span><strong>{{ currentTrackProgress }}</strong></div>
              <div class="narrative-kv"><span>当前位置</span><strong>{{ currentCenterDisplay }}</strong></div>
              <div class="narrative-kv"><span>累计路径</span><strong>{{ traveledDistanceDisplay }}</strong></div>
              <div class="narrative-kv"><span>官方移向</span><strong>{{ officialMoveDirectionDisplay }}</strong></div>
              <div class="narrative-kv"><span>官方移速</span><strong>{{ officialMoveSpeedDisplay }}</strong></div>
              <div class="narrative-kv"><span>风圈摘要</span><strong>{{ windRadiiSummaryDisplay }}</strong></div>
            </div>
          </div>

          <div class="module-block" v-if="narrativeSubmodules.track">
            <button type="button" class="module-header" @click="toggleModule('track')">
              <span>路径轨迹</span>
              <span v-if="narrativeActiveModule === 'track'">↑</span>
              <span v-else>↓</span>
            </button>
            <div v-if="narrativeActiveModule === 'track'" class="module-content">
              <div class="narrative-kv"><span>轨迹点数</span><strong>{{ typhoonTrack.length }} 个</strong></div>
              <div class="narrative-kv"><span>起点时间</span><strong>{{ typhoonTrack[0] ? formatMiniTime(typhoonTrack[0].time) : '--' }}</strong></div>
              <div class="narrative-kv"><span>终点时间</span><strong>{{ typhoonTrack[typhoonTrack.length - 1] ? formatMiniTime(typhoonTrack[typhoonTrack.length - 1].time) : '--' }}</strong></div>
              <div class="narrative-kv"><span>最大风速</span><strong>{{ maxWindSpeedDisplay }}</strong></div>
              <div class="narrative-kv"><span>最小气压</span><strong>{{ minPressureDisplay }}</strong></div>
            </div>
          </div>

          <div class="module-block" v-if="narrativeSubmodules.chart">
            <button type="button" class="module-header" @click="toggleModule('chart')">
              <span>强度曲线</span>
              <span v-if="narrativeActiveModule === 'chart'">↑</span>
              <span v-else>↓</span>
            </button>
            <div v-if="narrativeActiveModule === 'chart'" class="module-content">
              <TrackWindPressureMini :typhoon-track="typhoonTrack" :current-time="currentTime" />
            </div>
          </div>
        </div>
      </aside>

      <div v-if="showImpactPanel && showDiagnosticPanels" class="side-panel-container">
        <aside class="situation-panel">
          <div class="panel-header">
            <div class="panel-title">影响分析</div>
          </div>

          <div class="module-block">
            <div class="section-title">地图图层</div>
            <div class="panel-toggles">
              <label class="risk-toggle">
                <input
                  type="checkbox"
                  :checked="isTyphoonPathVisible"
                  @change="handleTyphoonPathToggle"
                >
                <span>台风轨迹</span>
              </label>
              <label class="risk-toggle">
                <input
                  type="checkbox"
                  :checked="enableTrackAnimation"
                  :disabled="!isTyphoonPathVisible"
                  @change="handleEnableTrackAnimation"
                >
                <span>轨迹动画</span>
              </label>
              <label class="risk-toggle">
                <input
                  type="checkbox"
                  :checked="isNewsRouteVisible"
                  @change="handleNewsRouteToggle"
                >
                <span>新闻事件虚线层</span>
              </label>
              <label class="risk-toggle">
                <input
                  type="checkbox"
                  :checked="isNewsEventPointsVisible"
                  @change="handleNewsEventPointsToggle"
                >
                <span>新闻事件点</span>
              </label>
            </div>
          </div>

          <div class="module-block" v-if="impactSubmodules.disaster">
            <button type="button" class="module-header" @click="toggleModule('disaster')">
              <span>灾害统计</span>
              <span v-if="activeModule === 'disaster'">↑</span>
              <span v-else>↓</span>
            </button>
            <div v-if="activeModule === 'disaster'" class="module-content">
              <div class="panel-grid">
                <div class="panel-item">
                  <div class="item-label">受影响区域</div>
                  <div class="item-value">{{ reviewStats.impactedCities }} 市县</div>
                </div>
                <div class="panel-item">
                  <div class="item-label">转移人数</div>
                  <div class="item-value">{{ reviewStats.transferredPeople.toLocaleString('zh-CN') }} 人</div>
                </div>
                <div class="panel-item">
                  <div class="item-label">停课停工</div>
                  <div class="item-value">{{ reviewStats.suspensionCount }} 处</div>
                </div>
                <div class="panel-item">
                  <div class="item-label">伤亡统计</div>
                  <div class="item-value">{{ reviewStats.casualties }} 人</div>
                </div>
                <div class="panel-item full-width">
                  <div class="item-label">估算损失</div>
                  <div class="item-value">{{ estimatedLossDisplay }}</div>
                </div>
              </div>
            </div>
          </div>

          <div class="module-block" v-if="impactSubmodules.nightlight">
            <button type="button" class="module-header" @click="toggleModule('nightlight')">
              <span>夜光影像</span>
              <span v-if="activeModule === 'nightlight'">↑</span>
              <span v-else>↓</span>
            </button>
            <div v-if="activeModule === 'nightlight'" class="module-content">
              <div class="panel-toggles">
                <label class="risk-toggle">
                  <input
                    type="checkbox"
                    :checked="showRiskSurface"
                    @change="handleRiskSurfaceToggle"
                  >
                  <span>风险面图层</span>
                </label>
                <label class="risk-toggle">
                  <input
                    type="checkbox"
                    :checked="isNightLightsVisible"
                    @change="handleNightLightsImpactToggle"
                  >
                  <span>夜光影响层</span>
                </label>
                <label class="risk-toggle">
                  <input
                    type="checkbox"
                    :checked="lightFollowTimeline"
                    @change="handleLightFollowTimelineToggle"
                  >
                  <span>随时间轴</span>
                </label>
                <label class="risk-toggle">
                  <input
                    type="checkbox"
                    :checked="isNightQualityVisible"
                    @change="handleNightQualityImpactToggle"
                  >
                  <span>质量/云掩膜解释层</span>
                </label>
                <label class="risk-toggle">
                  <input
                    type="checkbox"
                    :checked="isEra5CloudVisible"
                    @change="handleEra5CloudToggle"
                  >
                  <span>ERA5 云量层</span>
                </label>
                <label class="day-select-row" style="margin-top: 8px; max-width: 260px;">
                  <span>ERA5 日期</span>
                  <select :value="selectedEra5Date || ''" @change="selectEra5Date($event.target.value)">
                    <option v-for="day in era5AvailableDates" :key="`era5-day-${day}`" :value="day">
                      {{ day }}
                    </option>
                  </select>
                </label>
                <label class="risk-toggle">
                  <input
                    type="checkbox"
                    :checked="isImergRainVisible"
                    @change="handleImergRainToggle"
                  >
                  <span>IMERG 高分辨率降雨层</span>
                </label>
                <label class="day-select-row" style="margin-top: 8px; max-width: 260px;">
                  <span>IMERG 日期</span>
                  <select :value="selectedImergDate || ''" @change="selectImergDate($event.target.value)">
                    <option v-for="day in imergAvailableDates" :key="`imerg-day-${day}`" :value="day">
                      {{ day }}
                    </option>
                  </select>
                </label>
                <label class="risk-toggle">
                  <input
                    type="checkbox"
                    :checked="isNightObservabilityVisible"
                    @change="handleNightObservabilityToggle"
                  >
                  <span>夜光可判读层</span>
                </label>
              </div>
              <div class="phase-tabs">
                <button
                  type="button"
                  class="phase-chip"
                  :class="{ active: lightPhase === 'pre' }"
                  @click="setLightPhase('pre')"
                >
                  灾前
                </button>
                <button
                  type="button"
                  class="phase-chip"
                  :class="{ active: lightPhase === 'during' }"
                  @click="setLightPhase('during')"
                >
                  灾中
                </button>
                <button
                  type="button"
                  class="phase-chip"
                  :class="{ active: lightPhase === 'post' }"
                  @click="setLightPhase('post')"
                >
                  灾后
                </button>
              </div>
              <div class="day-picks" v-if="currentPhaseLightDays.length > 0">
                <button
                  v-for="day in currentPhaseLightDays"
                  :key="`phase-day-${day}`"
                  type="button"
                  class="day-chip"
                  :class="{ active: selectedLightDate === day }"
                  @click="selectLightDate(day)"
                >
                  {{ day }}
                </button>
              </div>
              <div class="phase-note">原始批次 69 景；按日聚合可回放 {{ lightAvailableDates.length }} 天。</div>
              <label class="day-select-row">
                <span>全量日期</span>
                <select :value="selectedLightDate" @change="selectLightDate($event.target.value)">
                  <option v-for="day in lightAvailableDates" :key="`all-day-${day}`" :value="day">
                    {{ day }}
                  </option>
                </select>
              </label>
              <div class="section-note">当前阶段：{{ lightPhaseLabel }}，当前日期：{{ selectedLightDate || '未选择' }}。</div>
              <div class="section-note">夜光层用于表达受灾后灯光强度变化趋势，可在三阶段中选择重点日期对比。</div>
              <div class="section-note">质量解释：有效像元 {{ lightQualitySummary.validPercent }}，疑似受质量影响 {{ lightQualitySummary.degradedPercent }}，云/雪标记 {{ lightQualitySummary.cloudOrSnowPercent }}。</div>
              <div class="section-note">像元状态：低亮但有数据 {{ lightQualitySummary.noLightPercent }}，缺测/无数据 {{ lightQualitySummary.noDataPercent }}。</div>
            </div>
          </div>

          <div class="module-block" v-if="impactSubmodules.risk">
            <button type="button" class="module-header" @click="toggleModule('risk')">
              <span>风险等级</span>
              <span v-if="activeModule === 'risk'">↑</span>
              <span v-else>↓</span>
            </button>
            <div v-if="activeModule === 'risk'" class="module-content">
              <div class="panel-item full-width">
                <div class="item-label">综合风险等级</div>
                <div class="item-value" :class="riskLevelClass">{{ riskLevelText }} · {{ riskScore }} 分</div>
                <div class="risk-score-bar" aria-hidden="true">
                  <div class="risk-score-fill" :style="{ width: `${Math.min(100, Math.max(0, riskScore))}%` }" />
                </div>
              </div>
              <div class="section-title">风险图例</div>
              <div class="risk-legend">
                <div class="risk-chip"><span class="risk-dot risk-dot-high"></span>高风险</div>
                <div class="risk-chip"><span class="risk-dot risk-dot-medium"></span>中风险</div>
                <div class="risk-chip"><span class="risk-dot risk-dot-low"></span>低风险</div>
              </div>
              <div class="section-note">总分依据近12小时事件影响范围、事件类型和受灾严重程度综合计算。</div>
              <div class="section-note">{{ riskScoreDescription }}</div>
            </div>
          </div>
        </aside>

        <aside class="situation-panel news-panel">
          <div class="panel-header">
            <div class="panel-title">新闻事件</div>
          </div>

          <div class="module-block">
            <button type="button" class="module-header" @click="togglePanelModule('news', 'stats')">
              <span>快速统计</span>
              <span v-if="newsPanelModules.stats">↑</span>
              <span v-else>↓</span>
            </button>
            <div v-if="newsPanelModules.stats" class="module-content">
              <div class="panel-grid">
                <div class="panel-item">
                  <div class="item-label">当前时刻新闻</div>
                  <div class="item-value">{{ activeNewsCount }} 条</div>
                </div>
                <div class="panel-item">
                  <div class="item-label">可信来源数</div>
                  <div class="item-value">{{ sourceCredibilityRows.length }} 个</div>
                </div>
              </div>
            </div>
          </div>

          <div class="module-block">
            <button type="button" class="module-header" @click="togglePanelModule('news', 'activeEvents')">
              <span>当前激活事件</span>
              <span v-if="newsPanelModules.activeEvents">↑</span>
              <span v-else>↓</span>
            </button>
            <div v-if="newsPanelModules.activeEvents" class="module-content">
              <div v-if="displayActiveEvents.length > 0" class="event-list">
                <div v-for="event in displayActiveEvents" :key="`active-${event.id || event.time}`" class="event-item">
                  <div class="event-item-title">{{ event.title || event.type || '事件' }}</div>
                  <div class="event-item-meta">{{ formatMiniTime(event.time) }} · {{ event.source || '待核验' }}</div>
                </div>
              </div>
              <div v-else class="section-note">当前时刻暂无激活事件。</div>
            </div>
          </div>

          <div class="module-block">
            <button type="button" class="module-header" @click="togglePanelModule('news', 'alertLogs')">
              <span>预警与响应日志</span>
              <span v-if="newsPanelModules.alertLogs">↑</span>
              <span v-else>↓</span>
            </button>
            <div v-if="newsPanelModules.alertLogs" class="module-content">
              <div class="log-table-wrapper">
                <table class="log-table">
                  <thead>
                    <tr>
                      <th>时间</th>
                      <th>预警</th>
                      <th>响应</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="log in displayAlertLogs" :key="log.id">
                      <td>{{ formatMiniTime(log.time) }}</td>
                      <td>{{ log.level }}</td>
                      <td>{{ formatResponseDuration(log.responseDelayMinutes) }}</td>
                    </tr>
                    <tr v-if="displayAlertLogs.length === 0">
                      <td colspan="3" class="table-empty">当前时刻暂无日志</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div class="module-block">
            <button type="button" class="module-header" @click="togglePanelModule('news', 'credibility')">
              <span>来源可信度表</span>
              <span v-if="newsPanelModules.credibility">↑</span>
              <span v-else>↓</span>
            </button>
            <div v-if="newsPanelModules.credibility" class="module-content">
              <div class="log-table-wrapper">
                <table class="log-table">
                  <thead>
                    <tr>
                      <th>来源</th>
                      <th>级别</th>
                      <th>条数</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="row in sourceCredibilityRows" :key="`source-${row.source}`">
                      <td>{{ row.source }}</td>
                      <td>{{ row.label }}</td>
                      <td>{{ row.count }}</td>
                    </tr>
                    <tr v-if="sourceCredibilityRows.length === 0">
                      <td colspan="3" class="table-empty">暂无来源统计</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  </div>
</template>

<script>
import L from 'leaflet'
import 'leaflet.heat'
import 'leaflet/dist/leaflet.css'
import { buildPublicAssetPath } from '@/utils/publicAssetPath'
import { nightLightRegionCenters } from '@/data/nightLightCells'
import TrackWindPressureMini from './TrackWindPressureMini.vue'

const IS_DEV = process.env.NODE_ENV === 'development'

export default {
  name: 'MapContainer',
  components: {
    TrackWindPressureMini
  },
  props: {
    typhoonTrack: {
      type: Array,
      default: () => []
    },
    typhoonEvents: {
      type: Array,
      default: () => []
    },
    currentTime: {
      type: String,
      default: ''
    },
    nearestEvent: {
      type: Object,
      default: null
    },
    activeEvents: {
      type: Array,
      default: () => []
    },
    timelineIndex: {
      type: Number,
      default: 0
    },
    highlightedEventId: {
      type: Number,
      default: null
    },
    reviewStats: {
      type: Object,
      default: () => ({
        impactedCities: 0,
        transferredPeople: 0,
        suspensionCount: 0,
        casualties: 0,
        estimatedLoss: 0
      })
    },
    alertLogs: {
      type: Array,
      default: () => []
    },
    sourceCredibilityMap: {
      type: Object,
      default: () => ({})
    },
    showNarrativePanel: {
      type: Boolean,
      default: true
    },
    showImpactPanel: {
      type: Boolean,
      default: true
    },
    narrativeSubmodules: {
      type: Object,
      default: () => ({
        status: true,
        track: true,
        chart: true
      })
    },
    narrativeActiveModule: {
      type: String,
      default: 'status'
    },
    impactSubmodules: {
      type: Object,
      default: () => ({
        disaster: true,
        nightlight: true,
        risk: true
      })
    },
    cinematicScene: {
      type: Object,
      default: null
    },
    cinematicMode: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      map: null,
      pathPolyline: null,
      typhoonPathLayer: null,
      nightLightLayer: null,
      nightQualityLayer: null,
      nightImageOverlay: null,
      era5ImageOverlay: null,
      imergImageOverlay: null,
      era5CloudLayer: null,
      imergRainLayer: null,
      nightObservabilityLayer: null,
      layerControl: null,
      lightsRenderer: null,
      darkBaseLayer: null,
      tiandituVecLayer: null,
      tiandituDarkVecLayer: null,
      tiandituLabelLayer: null,
      rawLightRows: [],
      rawQualityRows: [],
      era5AlignmentRows: [],
      era5DailyGridByDay: {},
      imergDailyByDay: {},
      nightLayersByDate: {},
      qualityLayersByDate: {},
      nightLightMetadata: null,
      nightImageMetadataByDate: {},
      nightLightAssetVersion: '',
      preferNightImageOverlay: true,
      lightQualityStats: {
        total: 0,
        valid: 0,
        degraded: 0,
        cloudOrSnow: 0,
        noLight: 0,
        noData: 0
      },
      lightPhase: 'during',
      selectedLightDate: '',
      selectedEra5Date: '',
      selectedImergDate: '',
      lightFollowTimeline: false,
      basemapMode: 'narrative',
      nightLightsFocused: false,
      narrativeStage: 'city',
      activeModule: 'live',
      // 新闻事件面板子模块
      newsPanelModules: {
        stats: true,        // 当前时刻新闻统计
        activeEvents: true, // 当前激活事件
        alertLogs: false,   // 预警与响应日志
        credibility: false  // 来源可信度表
      },
      // 台风影响面板子模块
      impactPanelModules: {
        toggles: true,      // 面板切换开关
        nightLight: false,  // 夜光影响
        riskStats: true,    // 风险统计
        legend: false       // 风险图例
      },
      showDiagnosticPanels: true,
      isTyphoonPathVisible: true,
      enableTrackAnimation: true,
      isNewsRouteVisible: true,
      isNewsEventPointsVisible: true,
      isNightLightsVisible: false,
      isNightQualityVisible: false,
      isEra5CloudVisible: false,
      isImergRainVisible: false,
      isNightObservabilityVisible: false,
      eventMarkers: [],
      allMarkers: [],
      rescueFlowTimers: [],
      eventTypeColorMap: {
        formation: '#4D96FF',
        warning: '#FFA500',
        alert: '#FF0000',
        approaching: '#FF6B6B',
        landfall: '#DC143C',
        disaster: '#8B0000',
        weakening: '#FFD700',
        dissipate: '#90EE90',
        assessment: '#87CEEB',
        reconstruction: '#98D8C8'
      },
      // === DEBUG 模式配置 ===
      debugMode: {
        enabled: false,
        showReferencePoint: true,     // 显示台北 101 参考点
        showTyphoonPath: true,         // 显示台风轨迹
        showEventMarkers: true,        // 显示事件点
        showImpactRadius: true,        // 显示影响范围圆
        projectEventsToTrack: true     // 将事件投影到轨迹点
      },
      selectedCoordinate: null
      ,
      showRiskSurface: true,
      // === IndexedDB 缓存 ===
      indexedDBName: 'nightlights_cache_db',
      indexedDBVersion: 1,
      indexedDBStoreName: 'nightlights_data',
      indexedDB: null,
      nightLightRequestSeq: 0,
      nightLightOverlaySyncLock: false
    }
  },
  computed: {
    lightImageAvailableDates() {
      const entries = Object.values(this.nightImageMetadataByDate || {})
      return Array.from(new Set(
        entries
          .map((entry) => String(entry?.date || '').trim())
          .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date) && String(this.getNightImageEntry(date)?.image || '').length > 0)
      )).sort()
    },
    lightAvailableDates() {
      const imageDates = this.lightImageAvailableDates
      if (this.preferNightImageOverlay && imageDates.length > 0) {
        return imageDates
      }

      const times = this.nightLightMetadata?.times
      if (!Array.isArray(times)) return []

      return Array.from(new Set(
        times
          .map((time) => String(time || '').split('T')[0])
          .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date))
      )).sort()
    },
    era5AvailableDates() {
      return this.getEra5AvailableDays().map((day) => `${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6, 8)}`)
    },
    imergAvailableDates() {
      return this.getImergAvailableDays().map((day) => `${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6, 8)}`)
    },
    lightAnchorDate() {
      const landfall = (this.typhoonEvents || [])
        .filter((event) => event?.type === 'landfall' && event?.time)
        .map((event) => String(event.time).split('T')[0])
        .sort()

      if (landfall.length > 0) {
        return landfall[0]
      }

      const dates = this.lightAvailableDates
      if (dates.length === 0) return ''
      return dates[Math.floor(dates.length / 2)]
    },
    lightPhaseDays() {
      const dates = this.lightAvailableDates
      const anchor = this.lightAnchorDate
      if (dates.length === 0 || !anchor) {
        return { pre: [], during: [], post: [] }
      }

      const anchorValue = new Date(`${anchor}T00:00:00`).getTime()
      const dayMs = 24 * 60 * 60 * 1000
      const toValue = (day) => new Date(`${day}T00:00:00`).getTime()

      const pre = dates.filter((day) => toValue(day) < anchorValue).slice(-3)

      let during = dates
        .filter((day) => Math.abs(toValue(day) - anchorValue) <= 2 * dayMs)
        .slice(0, 3)

      if (during.length < 2) {
        const fill = dates
          .slice()
          .sort((a, b) => Math.abs(toValue(a) - anchorValue) - Math.abs(toValue(b) - anchorValue))
          .filter((day) => !during.includes(day))
          .slice(0, 3 - during.length)
        during = [...during, ...fill].sort()
      }

      const post = dates.filter((day) => toValue(day) > anchorValue).slice(0, 3)

      return {
        pre: pre.length > 0 ? pre : dates.slice(0, Math.min(3, dates.length)),
        during,
        post: post.length > 0 ? post : dates.slice(-Math.min(3, dates.length))
      }
    },
    currentPhaseLightDays() {
      return this.lightPhaseDays[this.lightPhase] || []
    },
    lightPhaseLabel() {
      if (this.lightPhase === 'pre') return '灾前'
      if (this.lightPhase === 'during') return '灾中'
      if (this.lightPhase === 'post') return '灾后'
      return '--'
    },
    lightQualitySummary() {
      const stats = this.lightQualityStats || {}
      const total = Number(stats.total || 0)
      if (!Number.isFinite(total) || total <= 0) {
        return {
          validPercent: '--',
          degradedPercent: '--',
          cloudOrSnowPercent: '--',
          noLightPercent: '--',
          noDataPercent: '--'
        }
      }

      const toPercent = (value) => `${((Number(value || 0) / total) * 100).toFixed(1)}%`
      return {
        validPercent: toPercent(stats.valid),
        degradedPercent: toPercent(stats.degraded),
        cloudOrSnowPercent: toPercent(stats.cloudOrSnow),
        noLightPercent: toPercent(stats.noLight),
        noDataPercent: toPercent(stats.noData)
      }
    },
    currentTrackPoint() {
      if (!this.typhoonTrack || this.typhoonTrack.length === 0 || !this.currentTime) return null
      const currentTimeValue = new Date(this.currentTime).getTime()
      const points = this.typhoonTrack.filter((point) => new Date(point.time).getTime() <= currentTimeValue)
      return points.length > 0 ? points[points.length - 1] : null
    },
    currentCenterDisplay() {
      if (!this.currentTrackPoint) return '--'
      return `${this.currentTrackPoint.lat.toFixed(2)}N, ${this.currentTrackPoint.lng.toFixed(2)}E`
    },
    currentTrackProgress() {
      if (!this.typhoonTrack || this.typhoonTrack.length === 0 || !this.currentTrackPoint) return '--'
      const currentIndex = this.typhoonTrack.findIndex((point) => point.time === this.currentTrackPoint.time)
      if (currentIndex < 0) return '--'
      return `${currentIndex + 1}/${this.typhoonTrack.length}`
    },
    officialMoveDirectionDisplay() {
      const dir = String(this.currentTrackPoint?.moveDirection || '').trim()
      return dir || '--'
    },
    officialMoveSpeedDisplay() {
      const speed = Number(this.currentTrackPoint?.moveSpeed)
      if (!Number.isFinite(speed) || speed < 0) return '--'
      return `${speed.toFixed(1)} km/h`
    },
    bulletinDisplay() {
      const bulletin = this.currentTrackPoint?.bulletin
      if (!Array.isArray(bulletin) || bulletin.length < 2) return '--'
      return String(bulletin[1] || '--')
    },
    forecastLeadDisplay() {
      const forecast = this.getForecastPoints(this.currentTrackPoint?.forecast)
      if (forecast.length === 0) return '无'
      const leads = forecast.map((item) => `${item.leadHours}h`).join(' / ')
      return `${forecast.length} 点 (${leads})`
    },
    windRadiiSummaryDisplay() {
      return this.formatWindRadiiSummary(this.currentTrackPoint?.windRadii)
    },
    maxWindSpeedDisplay() {
      if (!this.typhoonTrack || this.typhoonTrack.length === 0) return '--'
      const speeds = this.typhoonTrack.map(p => p.windSpeed).filter(v => Number.isFinite(v))
      if (speeds.length === 0) return '--'
      const max = Math.max(...speeds)
      return `${max.toFixed(1)} m/s`
    },
    minPressureDisplay() {
      if (!this.typhoonTrack || this.typhoonTrack.length === 0) return '--'
      const pressures = this.typhoonTrack.map(p => p.pressure).filter(v => Number.isFinite(v))
      if (pressures.length === 0) return '--'
      const min = Math.min(...pressures)
      return `${Math.round(min)} hPa`
    },
    activeNewsCount() {
      return Array.isArray(this.activeEvents) ? this.activeEvents.length : 0
    },
    displayActiveEvents() {
      if (!Array.isArray(this.activeEvents) || this.activeEvents.length === 0) return []
      return this.activeEvents
        .slice()
        .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
        .slice(0, 6)
    },
    traveledDistanceDisplay() {
      if (!this.typhoonTrack || this.typhoonTrack.length < 2 || !this.currentTime) return '--'
      const currentTimeValue = new Date(this.currentTime).getTime()
      const points = this.typhoonTrack.filter((point) => new Date(point.time).getTime() <= currentTimeValue)
      if (points.length < 2) return '0 km'

      let distance = 0
      for (let i = 1; i < points.length; i += 1) {
        distance += this.getDistanceKm(points[i - 1], points[i])
      }
      return `${Math.round(distance)} km`
    },
    riskScore() {
      return this.calculateRiskScore()
    },
    riskLevelText() {
      const score = this.riskScore
      if (score >= 80) return '高风险'
      if (score >= 50) return '中风险'
      if (score >= 20) return '低风险'
      return '平稳'
    },
    riskLevelClass() {
      const score = this.riskScore
      if (score >= 80) return 'risk-high'
      if (score >= 50) return 'risk-medium'
      if (score >= 20) return 'risk-low'
      return 'risk-stable'
    },
    riskScoreDescription() {
      const score = this.riskScore
      if (score >= 80) return '风险高位运行，建议优先关注登陆区和强降雨叠加区。'
      if (score >= 50) return '风险处于中位，建议持续关注预警升级和局地次生灾害。'
      if (score >= 20) return '风险较低但仍存在局地扰动，建议保持滚动监测。'
      return '整体态势平稳。'
    },
    estimatedLossDisplay() {
      const amount = Number(this.reviewStats.estimatedLoss)
      if (!Number.isFinite(amount) || amount <= 0) return '--'
      return `${amount.toLocaleString('zh-CN')} 万元`
    },
    displayAlertLogs() {
      return Array.isArray(this.alertLogs) ? this.alertLogs.slice(-6) : []
    },
    sourceCredibilityRows() {
      if (!Array.isArray(this.typhoonEvents) || this.typhoonEvents.length === 0 || !this.currentTime) return []
      const currentTimeValue = new Date(this.currentTime).getTime()
      const counter = new Map()

      this.typhoonEvents
        .filter((event) => new Date(event.time).getTime() <= currentTimeValue)
        .forEach((event) => {
          const previous = counter.get(event.source) || 0
          counter.set(event.source, previous + 1)
        })

      return Array.from(counter.entries())
        .map(([source, count]) => ({
          source,
          count,
          label: this.sourceCredibilityMap[source]?.label || '待核验'
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
    }
  },
  mounted() {
    this.initIndexedDB()
    this.initMap()
  },
  beforeDestroy() {
    this.clearRescueFlowTimers()
    if (this.map) {
      this.map.off('overlayadd', this.handleOverlayAdd)
      this.map.off('overlayremove', this.handleOverlayRemove)
      this.map.off('click', this.handleMapClick)
      this.map.remove()
    }
    this.layerControl = null
    this.typhoonPathLayer = null
    this.nightLightLayer = null
    this.nightQualityLayer = null
    this.removeNightImageOverlay()
    this.removeEra5ImageOverlay()
    this.removeImergImageOverlay()
    this.era5CloudLayer = null
    this.imergRainLayer = null
    this.nightObservabilityLayer = null
    // === 清缓存 ===
    this.nightLayersByDate = {}
    this.qualityLayersByDate = {}
    if (this.indexedDB) {
      this.indexedDB.close()
    }
    this.map = null
  },
  watch: {
    currentTime() {
      this.updateVisualization()
      // 更新灯光显示（支持时间轴灯光切换）
      if (this.nightLightMetadata && this.lightFollowTimeline) {
        this.updateNightLightForCurrentTime()
      }
    },
    typhoonEvents: {
      handler() {
        this.updateVisualization()
      },
      deep: true
    },
    highlightedEventId() {
      this.updateVisualization()
    },
    nearestEvent(newEvent) {
      // 仅在无可用轨迹点时回退到事件中心，避免与时间轴跟随冲突
      if (newEvent && this.map && !this.currentTrackPoint) {
        this.map.flyTo([newEvent.lat, newEvent.lng], 6, {
          duration: 1.2
        })
      }
    },
        currentTrackPoint() {
      // 禁用自动跟踪：地图保持在当前视图，不跟随台风位置自动移动
      // if (this.cinematicMode) return
      // this.syncMapToCurrentTrackPoint(newTrackPoint)
    },
    cinematicScene: {
      handler(nextScene) {
        this.applyCinematicScene(nextScene)
      },
      deep: false
    },
    cinematicMode(isEnabled) {
      if (isEnabled && this.cinematicScene) {
        this.applyCinematicScene(this.cinematicScene)
      }
    }
  },
  methods: {
    animateNightLightOpacity(targetOpacity = 0.86, duration = 520) {
      if (!this.nightLightLayer) return

      const styleLayers = []
      this.nightLightLayer.eachLayer((layer) => {
        if (layer && typeof layer.setStyle === 'function') {
          styleLayers.push(layer)
        }
      })

      if (styleLayers.length === 0) return

      const startOpacities = styleLayers.map((layer) => Number(layer.options?.fillOpacity || 0))
      const clampedTarget = Math.max(0, Math.min(1, Number(targetOpacity)))
      const startTs = Date.now()

      const step = () => {
        const elapsed = Date.now() - startTs
        const progress = Math.max(0, Math.min(1, elapsed / duration))
        const eased = 1 - Math.pow(1 - progress, 3)

        styleLayers.forEach((layer, index) => {
          const from = startOpacities[index]
          const current = from + (clampedTarget - from) * eased
          layer.setStyle({ fillOpacity: current })
        })

        if (progress < 1) {
          requestAnimationFrame(step)
        }
      }

      requestAnimationFrame(step)
    },
    applyCinematicScene(scene) {
      if (!scene || !this.map) return

      if (scene.phase && scene.phase !== this.lightPhase) {
        this.lightPhase = scene.phase
      }

      if (scene.stage && scene.stage !== this.narrativeStage) {
        this.narrativeStage = scene.stage
        this.applyNarrativeStage()
      }

      // 章节夜光更新只依赖夜光图层本身，不再和底图模式绑定。
      if (scene.nightLights && this.nightLightLayer) {
        this.isNightLightsVisible = true
        this.nightLightsFocused = true

        if (!this.map.hasLayer(this.nightLightLayer)) {
          this.nightLightLayer.addTo(this.map)
        }

        if (this.selectedLightDate) {
          this.selectLightDate(this.selectedLightDate)
        } else {
          this.initializeLightScenario()
        }
      }

      // 禁用章节切换相机跳转，避免时间轴边界时视图突然中心/缩放变化。

      this.updateVisualization()

      if (scene.nightLights && this.nightLightLayer) {
        this.$nextTick(() => {
          this.animateNightLightOpacity(scene.nightLightOpacity || 0.86)
        })
      }
    },
    handleMapClick(event) {
      if (!event || !event.latlng) return

      this.selectedCoordinate = {
        lat: event.latlng.lat,
        lng: event.latlng.lng
      }
    },
    formatCoordinate(value) {
      return Number(value).toFixed(6)
    },
    handleRiskSurfaceToggle(event) {
      this.showRiskSurface = Boolean(event.target.checked)
      this.updateVisualization()
    },
    handleTyphoonPathToggle(event) {
      this.isTyphoonPathVisible = Boolean(event.target.checked)
      this.updateVisualization()

      if (this.isTyphoonPathVisible) {
        this.renderTyphoonPath()
      }
    },
    handleNewsRouteToggle(event) {
      this.isNewsRouteVisible = Boolean(event.target.checked)
      this.updateVisualization()
    },
    handleNewsEventPointsToggle(event) {
      this.isNewsEventPointsVisible = Boolean(event.target.checked)
      this.updateVisualization()
    },
    handleEnableTrackAnimation(event) {
      this.enableTrackAnimation = Boolean(event.target.checked)
      if (this.isTyphoonPathVisible) {
        this.renderTyphoonPath()
      }
    },
    handleNightLightsImpactToggle(event) {
      if (!this.map || !this.nightLightLayer) return

      const enabled = Boolean(event.target.checked)
      this.isNightLightsVisible = enabled
      this.syncNightLightWithBasemap(enabled)
    },
    handleNightQualityImpactToggle(event) {
      if (!this.map || !this.nightQualityLayer) return

      const enabled = Boolean(event.target.checked)
      this.isNightQualityVisible = enabled

      if (enabled) {
        if (!this.map.hasLayer(this.nightQualityLayer)) {
          this.nightQualityLayer.addTo(this.map)
        }
        this.renderNightQuality()
      } else if (this.map.hasLayer(this.nightQualityLayer)) {
        this.map.removeLayer(this.nightQualityLayer)
      }
    },
    handleEra5CloudToggle(event) {
      if (!this.map) return

      const enabled = Boolean(event.target.checked)
      this.isEra5CloudVisible = enabled

      if (enabled && !this.selectedEra5Date) {
        const fallbackDay = this.getEra5AvailableDays()[0]
        if (fallbackDay) {
          this.selectedEra5Date = `${fallbackDay.slice(0, 4)}-${fallbackDay.slice(4, 6)}-${fallbackDay.slice(6, 8)}`
        }
      }

      if (enabled) {
        this.renderEra5CloudLayer()
      } else {
        this.removeEra5ImageOverlay()
      }
    },
    handleImergRainToggle(event) {
      if (!this.map) return

      const enabled = Boolean(event.target.checked)
      this.isImergRainVisible = enabled

      if (enabled && !this.selectedImergDate) {
        const fallbackDay = this.getImergAvailableDays()[0]
        if (fallbackDay) {
          this.selectedImergDate = `${fallbackDay.slice(0, 4)}-${fallbackDay.slice(4, 6)}-${fallbackDay.slice(6, 8)}`
        }
      }

      if (enabled) {
        this.renderImergRainLayer()
      } else {
        this.removeImergImageOverlay()
      }
    },
    handleNightObservabilityToggle(event) {
      if (!this.map || !this.nightObservabilityLayer) return

      const enabled = Boolean(event.target.checked)
      this.isNightObservabilityVisible = enabled

      if (enabled) {
        if (!this.map.hasLayer(this.nightObservabilityLayer)) {
          this.nightObservabilityLayer.addTo(this.map)
        }
        this.renderNightObservabilityLayer()
      } else if (this.map.hasLayer(this.nightObservabilityLayer)) {
        this.map.removeLayer(this.nightObservabilityLayer)
      }
    },
    selectEra5Date(dateStr) {
      if (!dateStr) return
      this.selectedEra5Date = String(dateStr)
      if (this.isEra5CloudVisible) {
        this.renderEra5CloudLayer()
      }
      this.renderMeteoEvidenceLayers()
    },
    selectImergDate(dateStr) {
      if (!dateStr) return
      this.selectedImergDate = String(dateStr)
      if (this.isImergRainVisible) {
        this.renderImergRainLayer()
      }
      this.renderMeteoEvidenceLayers()
    },
    toDayKey(dateStr) {
      return String(dateStr || '').replace(/-/g, '')
    },
    getAlignmentRowsBySelectedDay() {
      const day = this.toDayKey(this.selectedLightDate)
      if (!day || !Array.isArray(this.era5AlignmentRows)) return []
      return this.era5AlignmentRows.filter((row) => String(row?.day || '') === day)
    },
    getEra5AvailableDays() {
      return Object.keys(this.era5DailyGridByDay || {})
        .map((day) => String(day || '').trim())
        .filter((day) => /^\d{8}$/.test(day))
        .sort()
    },
    getImergAvailableDays() {
      return Object.keys(this.imergDailyByDay || {})
        .map((day) => String(day || '').trim())
        .filter((day) => /^\d{8}$/.test(day))
        .sort()
    },
    getGridCellsBySelectedDay() {
      const day = this.toDayKey(this.selectedEra5Date || this.selectedLightDate)
      if (!day) return []
      const rows = this.era5DailyGridByDay?.[day]
      return Array.isArray(rows) ? rows : []
    },
    getCloudLayerStyle(value) {
      const cloud = Number(value)
      if (!Number.isFinite(cloud)) return null
      return this.getEra5CloudStyle(cloud, null)
    },
    getNearestTrackDistanceKm(lat, lng) {
      if (!Array.isArray(this.typhoonTrack) || this.typhoonTrack.length === 0) return null

      const target = { lat: Number(lat), lng: Number(lng) }
      if (!Number.isFinite(target.lat) || !Number.isFinite(target.lng)) return null

      let minDistance = Infinity
      this.typhoonTrack.forEach((point) => {
        const pointLat = Number(point?.lat)
        const pointLng = Number(point?.lng)
        if (!Number.isFinite(pointLat) || !Number.isFinite(pointLng)) return

        const distance = this.getDistanceKm({ lat: pointLat, lng: pointLng }, target)
        if (distance < minDistance) {
          minDistance = distance
        }
      })

      return Number.isFinite(minDistance) ? minDistance : null
    },
    getEra5CloudStyle(cloud, trackDistanceKm = null) {
      const value = this.clamp(Number(cloud), 0, 1)
      const nearTrack = Number.isFinite(trackDistanceKm) && trackDistanceKm <= 140
      const midTrack = Number.isFinite(trackDistanceKm) && trackDistanceKm > 140 && trackDistanceKm <= 280

      const bands = nearTrack
        ? [
            { max: 0.04, color: '#eff6ff', opacity: 0.06 },
            { max: 0.08, color: '#dbeafe', opacity: 0.08 },
            { max: 0.12, color: '#bfdbfe', opacity: 0.10 },
            { max: 0.18, color: '#93c5fd', opacity: 0.13 },
            { max: 0.24, color: '#60a5fa', opacity: 0.17 },
            { max: 0.30, color: '#3b82f6', opacity: 0.21 },
            { max: 0.38, color: '#2563eb', opacity: 0.26 },
            { max: 0.46, color: '#1d4ed8', opacity: 0.31 },
            { max: 0.54, color: '#1e40af', opacity: 0.37 },
            { max: 0.62, color: '#1d4ed8', opacity: 0.43 },
            { max: 0.70, color: '#2563eb', opacity: 0.49 },
            { max: 0.78, color: '#0ea5e9', opacity: 0.54 },
            { max: 0.86, color: '#0284c7', opacity: 0.60 },
            { max: 0.92, color: '#0369a1', opacity: 0.66 },
            { max: 0.97, color: '#075985', opacity: 0.72 },
            { max: 1.01, color: '#0c4a6e', opacity: 0.78 }
          ]
        : midTrack
          ? [
              { max: 0.08, color: '#eff6ff', opacity: 0.05 },
              { max: 0.16, color: '#dbeafe', opacity: 0.08 },
              { max: 0.24, color: '#bfdbfe', opacity: 0.11 },
              { max: 0.34, color: '#93c5fd', opacity: 0.15 },
              { max: 0.46, color: '#60a5fa', opacity: 0.20 },
              { max: 0.58, color: '#3b82f6', opacity: 0.26 },
              { max: 0.72, color: '#2563eb', opacity: 0.33 },
              { max: 0.86, color: '#1d4ed8', opacity: 0.41 },
              { max: 1.01, color: '#0c4a6e', opacity: 0.50 }
            ]
          : [
              { max: 0.08, color: '#eff6ff', opacity: 0.05 },
              { max: 0.16, color: '#dbeafe', opacity: 0.08 },
              { max: 0.24, color: '#bfdbfe', opacity: 0.11 },
              { max: 0.34, color: '#93c5fd', opacity: 0.15 },
              { max: 0.46, color: '#60a5fa', opacity: 0.20 },
              { max: 0.58, color: '#3b82f6', opacity: 0.26 },
              { max: 0.72, color: '#2563eb', opacity: 0.33 },
              { max: 0.86, color: '#1d4ed8', opacity: 0.41 },
              { max: 1.01, color: '#0c4a6e', opacity: 0.50 }
            ]

      const band = bands.find((item) => value < item.max) || bands[bands.length - 1]
      const smooth = value * value * (3 - 2 * value)
      const opacity = this.clamp(band.opacity * (0.86 + smooth * 0.46), 0.03, 0.82)
      return { color: band.color, opacity }
    },
    getEra5RenderConfig(zoom) {
      const level = Number(zoom) || 0
      if (level <= 5) {
        return { density: 6, minCloud: 0.28, radius: 0.62 }
      }
      if (level <= 7) {
        return { density: 8, minCloud: 0.22, radius: 0.58 }
      }
      return { density: 10, minCloud: 0.18, radius: 0.54 }
    },
    buildEra5CloudField(cells) {
      const validCells = Array.isArray(cells)
        ? cells
            .map((cell) => ({
              latMin: Number(cell?.latMin),
              latMax: Number(cell?.latMax),
              lonMin: Number(cell?.lonMin),
              lonMax: Number(cell?.lonMax),
              cloud: Number(cell?.cloud)
            }))
            .filter((cell) => [cell.latMin, cell.latMax, cell.lonMin, cell.lonMax, cell.cloud].every(Number.isFinite))
        : []

      const latCenters = [...new Set(validCells.map((cell) => Number(((cell.latMin + cell.latMax) / 2).toFixed(6))))].sort((a, b) => a - b)
      const lonCenters = [...new Set(validCells.map((cell) => Number(((cell.lonMin + cell.lonMax) / 2).toFixed(6))))].sort((a, b) => a - b)

      if (latCenters.length === 0 || lonCenters.length === 0) return null

      const latIndexMap = new Map(latCenters.map((value, index) => [value, index]))
      const lonIndexMap = new Map(lonCenters.map((value, index) => [value, index]))
      const matrix = Array.from({ length: latCenters.length }, () => Array(lonCenters.length).fill(null))

      validCells.forEach((cell) => {
        const latCenter = Number(((cell.latMin + cell.latMax) / 2).toFixed(6))
        const lonCenter = Number(((cell.lonMin + cell.lonMax) / 2).toFixed(6))
        const latIndex = latIndexMap.get(latCenter)
        const lonIndex = lonIndexMap.get(lonCenter)
        if (Number.isInteger(latIndex) && Number.isInteger(lonIndex)) {
          matrix[latIndex][lonIndex] = cell.cloud
        }
      })

      return {
        latCenters,
        lonCenters,
        matrix
      }
    },
    findBoundingAxisInfo(values, value) {
      const axis = Array.isArray(values) ? values : []
      const target = Number(value)
      if (!Number.isFinite(target) || axis.length === 0) return null
      if (axis.length === 1) return { lowIndex: 0, highIndex: 0, ratio: 0 }

      if (target <= axis[0]) return { lowIndex: 0, highIndex: 0, ratio: 0 }
      if (target >= axis[axis.length - 1]) return { lowIndex: axis.length - 1, highIndex: axis.length - 1, ratio: 0 }

      for (let index = 0; index < axis.length - 1; index += 1) {
        const low = axis[index]
        const high = axis[index + 1]
        if (target >= low && target <= high) {
          const span = high - low
          return {
            lowIndex: index,
            highIndex: index + 1,
            ratio: span === 0 ? 0 : (target - low) / span
          }
        }
      }

      return null
    },
    sampleEra5CloudValue(field, lat, lon) {
      if (!field || !Array.isArray(field.latCenters) || !Array.isArray(field.lonCenters)) return null

      const latInfo = this.findBoundingAxisInfo(field.latCenters, lat)
      const lonInfo = this.findBoundingAxisInfo(field.lonCenters, lon)
      if (!latInfo || !lonInfo) return null

      const q11 = field.matrix?.[latInfo.lowIndex]?.[lonInfo.lowIndex]
      const q12 = field.matrix?.[latInfo.lowIndex]?.[lonInfo.highIndex]
      const q21 = field.matrix?.[latInfo.highIndex]?.[lonInfo.lowIndex]
      const q22 = field.matrix?.[latInfo.highIndex]?.[lonInfo.highIndex]

      const samples = [q11, q12, q21, q22].filter((value) => Number.isFinite(Number(value)))
      if (samples.length === 0) return null

      if (latInfo.lowIndex === latInfo.highIndex && lonInfo.lowIndex === lonInfo.highIndex) {
        return Number(q11)
      }

      const top = Number.isFinite(Number(q11)) && Number.isFinite(Number(q12))
        ? Number(q11) + (Number(q12) - Number(q11)) * lonInfo.ratio
        : Number(samples[0])
      const bottom = Number.isFinite(Number(q21)) && Number.isFinite(Number(q22))
        ? Number(q21) + (Number(q22) - Number(q21)) * lonInfo.ratio
        : top
      const interpolated = top + (bottom - top) * latInfo.ratio

      return Number.isFinite(interpolated) ? interpolated : Number(samples[0])
    },
    getRainLayerStyle(value) {
      const mm = Number(value)
      if (!Number.isFinite(mm)) return null
      if (mm >= 60) return { color: '#14532d', opacity: 0.6 }
      if (mm >= 40) return { color: '#166534', opacity: 0.52 }
      if (mm >= 25) return { color: '#15803d', opacity: 0.45 }
      if (mm >= 15) return { color: '#16a34a', opacity: 0.38 }
      if (mm >= 8) return { color: '#22c55e', opacity: 0.3 }
      if (mm >= 3) return { color: '#4ade80', opacity: 0.22 }
      return { color: '#86efac', opacity: 0.14 }
    },
    getViridisGradient() {
      return {
        0.05: '#440154',
        0.2: '#3b528b',
        0.4: '#21918c',
        0.6: '#5ec962',
        0.85: '#fde725'
      }
    },
    getSpectralGradient() {
      return {
        0.08: '#5e4fa2',
        0.22: '#3288bd',
        0.36: '#66c2a5',
        0.5: '#abdda4',
        0.64: '#e6f598',
        0.78: '#fdae61',
        0.9: '#f46d43',
        1.0: '#9e0142'
      }
    },
    normalizeByQuantile(value, values, lowPct, highPct, gamma = 1) {
      const v = Number(value)
      if (!Number.isFinite(v) || !Array.isArray(values) || values.length === 0) return null

      const low = this.percentile(values, lowPct)
      const high = this.percentile(values, highPct)
      if (!Number.isFinite(low) || !Number.isFinite(high) || high <= low) return 0.5

      const linear = this.clamp((v - low) / (high - low), 0, 1)
      return this.clamp(Math.pow(linear, gamma), 0, 1)
    },
    getRegionCenter(region) {
      const center = nightLightRegionCenters?.[region]
      if (!center) return null

      const lat = Number(center.lat)
      const lng = Number(center.lng)
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
      return [lat, lng]
    },
    getObservabilityLayerStyle(isReadable) {
      if (isReadable) {
        return { color: '#22c55e', radius: 12, opacity: 0.24 }
      }
      return { color: '#9ca3af', radius: 12, opacity: 0.2 }
    },
    renderEra5CloudLayer() {
      if (!this.map) return
      this.removeEra5ImageOverlay()
      if (!this.isEra5CloudVisible) return

      let cells = this.getGridCellsBySelectedDay()
      if (!Array.isArray(cells) || cells.length === 0) {
        const fallbackDay = this.getEra5AvailableDays()[0]
        if (fallbackDay) {
          cells = Array.isArray(this.era5DailyGridByDay?.[fallbackDay]) ? this.era5DailyGridByDay[fallbackDay] : []
          if (!this.selectedEra5Date) {
            this.selectedEra5Date = `${fallbackDay.slice(0, 4)}-${fallbackDay.slice(4, 6)}-${fallbackDay.slice(6, 8)}`
          }
        }
      }

      const axes = this.getEra5GridAxes(cells)
      const bounds = this.getEra5GridBounds(cells)
      const field = this.buildEra5CloudField(cells)
      if (!axes || !bounds || !field) return

      const { latCenters, lonCenters } = axes
      const zoom = this.map.getZoom ? this.map.getZoom() : 5
      const { minCloud } = this.getEra5RenderConfig(zoom)
      const threshold = Math.max(0.02, minCloud * 0.25)
      const lonCount = Math.max(1, lonCenters.length)
      const latCount = Math.max(1, latCenters.length)
      const pixelsPerCell = 14

      const canvas = document.createElement('canvas')
      canvas.width = lonCount * pixelsPerCell
      canvas.height = latCount * pixelsPerCell

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      const latMinBound = Number(bounds?.[0]?.[0])
      const lonMinBound = Number(bounds?.[0]?.[1])
      const latMaxBound = Number(bounds?.[1]?.[0])
      const lonMaxBound = Number(bounds?.[1]?.[1])
      if (![latMinBound, lonMinBound, latMaxBound, lonMaxBound].every(Number.isFinite)) return

      const width = canvas.width
      const height = canvas.height
      const imageData = ctx.createImageData(width, height)
      const buffer = imageData.data

      const colorStops = [
        { t: 0.0, r: 239, g: 246, b: 255 },
        { t: 0.2, r: 191, g: 219, b: 254 },
        { t: 0.4, r: 96, g: 165, b: 250 },
        { t: 0.6, r: 59, g: 130, b: 246 },
        { t: 0.8, r: 29, g: 78, b: 216 },
        { t: 1.0, r: 12, g: 74, b: 110 }
      ]

      const sampleColor = (value) => {
        const t = this.clamp(value, 0, 1)
        for (let i = 0; i < colorStops.length - 1; i += 1) {
          const a = colorStops[i]
          const b = colorStops[i + 1]
          if (t >= a.t && t <= b.t) {
            const p = (t - a.t) / (b.t - a.t || 1)
            return {
              r: Math.round(a.r + (b.r - a.r) * p),
              g: Math.round(a.g + (b.g - a.g) * p),
              b: Math.round(a.b + (b.b - a.b) * p)
            }
          }
        }
        const last = colorStops[colorStops.length - 1]
        return { r: last.r, g: last.g, b: last.b }
      }

      const latSpan = latMaxBound - latMinBound
      const lonSpan = lonMaxBound - lonMinBound
      if (latSpan <= 0 || lonSpan <= 0) return

      for (let y = 0; y < height; y += 1) {
        const sampleLat = latMaxBound - ((y + 0.5) / height) * latSpan
        for (let x = 0; x < width; x += 1) {
          const sampleLng = lonMinBound + ((x + 0.5) / width) * lonSpan
          const sampleCloud = this.sampleEra5CloudValue(field, sampleLat, sampleLng)
          if (!Number.isFinite(sampleCloud) || sampleCloud < threshold) {
            continue
          }

          const normalized = this.clamp((sampleCloud - threshold) / (1 - threshold), 0, 1)
          const smooth = normalized * normalized * (3 - 2 * normalized)
          const color = sampleColor(smooth)
          const alpha = this.clamp(0.05 + smooth * 0.74, 0.05, 0.82)

          const offset = (y * width + x) * 4
          buffer[offset] = color.r
          buffer[offset + 1] = color.g
          buffer[offset + 2] = color.b
          buffer[offset + 3] = Math.round(alpha * 255)
        }
      }

      ctx.putImageData(imageData, 0, 0)

      const imageUrl = canvas.toDataURL('image/png')
      this.era5ImageOverlay = L.imageOverlay(imageUrl, bounds, {
        pane: 'overlayPane',
        opacity: this.basemapMode === 'narrative' ? 0.93 : 0.88,
        interactive: false,
        crossOrigin: false
      })
      this.era5ImageOverlay.addTo(this.map)
      // 强制使用平滑渲染，避免被某些环境以最近邻缩放显示为像素化
      try {
        const imgEl = this.era5ImageOverlay.getElement && this.era5ImageOverlay.getElement()
        if (imgEl && imgEl.style) {
          imgEl.style.imageRendering = 'auto'
          imgEl.style.width = '100%'
          imgEl.style.height = '100%'
        }
      } catch (e) {
        // ignore
      }
      this.bringTyphoonPathToFront()
    },
    getImergPointsBySelectedDay() {
      const day = this.toDayKey(this.selectedImergDate || this.selectedLightDate)
      if (!day) return []

      const dayData = this.imergDailyByDay?.[day]
      if (!dayData || typeof dayData !== 'object') return []

      const preferredRegion = dayData.TyphoonTrackMatch || dayData.YangtzeDeltaWide || dayData.ShanghaiCore
      const points = preferredRegion?.points
      return Array.isArray(points) ? points : []
    },
    buildImergRainField(points) {
      const validPoints = Array.isArray(points)
        ? points
            .map((point) => ({
              lat: Number(point?.lat),
              lon: Number(point?.lon),
              rain: Number(point?.rain_mm)
            }))
            .filter((point) => [point.lat, point.lon, point.rain].every(Number.isFinite))
        : []

      if (validPoints.length === 0) return null

      const latCenters = [...new Set(validPoints.map((point) => Number(point.lat.toFixed(6))))].sort((a, b) => a - b)
      const lonCenters = [...new Set(validPoints.map((point) => Number(point.lon.toFixed(6))))].sort((a, b) => a - b)
      if (latCenters.length === 0 || lonCenters.length === 0) return null

      const latIndexMap = new Map(latCenters.map((value, index) => [value, index]))
      const lonIndexMap = new Map(lonCenters.map((value, index) => [value, index]))
      const matrix = Array.from({ length: latCenters.length }, () => Array(lonCenters.length).fill(null))

      validPoints.forEach((point) => {
        const latIndex = latIndexMap.get(Number(point.lat.toFixed(6)))
        const lonIndex = lonIndexMap.get(Number(point.lon.toFixed(6)))
        if (Number.isInteger(latIndex) && Number.isInteger(lonIndex)) {
          matrix[latIndex][lonIndex] = point.rain
        }
      })

      const estimateStep = (axis) => {
        if (!Array.isArray(axis) || axis.length < 2) return 0.1
        const diffs = []
        for (let i = 1; i < axis.length; i += 1) {
          const diff = axis[i] - axis[i - 1]
          if (Number.isFinite(diff) && diff > 0) diffs.push(diff)
        }
        if (diffs.length === 0) return 0.1
        diffs.sort((a, b) => a - b)
        return diffs[Math.floor(diffs.length / 2)]
      }

      const latStep = estimateStep(latCenters)
      const lonStep = estimateStep(lonCenters)
      const bounds = [
        [latCenters[0] - (latStep / 2), lonCenters[0] - (lonStep / 2)],
        [latCenters[latCenters.length - 1] + (latStep / 2), lonCenters[lonCenters.length - 1] + (lonStep / 2)]
      ]

      return {
        latCenters,
        lonCenters,
        matrix,
        bounds
      }
    },
    removeImergImageOverlay() {
      if (this.map && this.imergImageOverlay && this.map.hasLayer(this.imergImageOverlay)) {
        this.map.removeLayer(this.imergImageOverlay)
      }
      this.imergImageOverlay = null
    },
    renderImergRainLayer() {
      if (!this.map) return
      this.removeImergImageOverlay()
      if (!this.isImergRainVisible) return

      const points = this.getImergPointsBySelectedDay()
      const rainValues = points
        .map((point) => Number(point.rain_mm))
        .filter((value) => Number.isFinite(value) && value > 0)

      if (rainValues.length === 0) return

      const field = this.buildImergRainField(points)
      if (!field || !Array.isArray(field.bounds)) return

      const widthCells = Math.max(1, field.lonCenters.length)
      const heightCells = Math.max(1, field.latCenters.length)
      const pixelsPerCell = 14

      const canvas = document.createElement('canvas')
      canvas.width = widthCells * pixelsPerCell
      canvas.height = heightCells * pixelsPerCell
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const latMinBound = Number(field.bounds?.[0]?.[0])
      const lonMinBound = Number(field.bounds?.[0]?.[1])
      const latMaxBound = Number(field.bounds?.[1]?.[0])
      const lonMaxBound = Number(field.bounds?.[1]?.[1])
      if (![latMinBound, lonMinBound, latMaxBound, lonMaxBound].every(Number.isFinite)) return

      const qLow = this.percentile(rainValues, 15)
      const qHigh = this.percentile(rainValues, 98)
      const low = Number.isFinite(qLow) ? qLow : Math.min(...rainValues)
      const high = Number.isFinite(qHigh) && qHigh > low ? qHigh : Math.max(...rainValues)
      if (!Number.isFinite(low) || !Number.isFinite(high) || high <= low) return

      const imageData = ctx.createImageData(canvas.width, canvas.height)
      const buffer = imageData.data
      const latSpan = latMaxBound - latMinBound
      const lonSpan = lonMaxBound - lonMinBound
      if (latSpan <= 0 || lonSpan <= 0) return

      const colorStops = [
        { t: 0.0, r: 239, g: 246, b: 255 },
        { t: 0.2, r: 191, g: 219, b: 254 },
        { t: 0.4, r: 96, g: 165, b: 250 },
        { t: 0.6, r: 59, g: 130, b: 246 },
        { t: 0.8, r: 29, g: 78, b: 216 },
        { t: 1.0, r: 12, g: 74, b: 110 }
      ]

      const sampleColor = (value) => {
        const t = this.clamp(value, 0, 1)
        for (let i = 0; i < colorStops.length - 1; i += 1) {
          const a = colorStops[i]
          const b = colorStops[i + 1]
          if (t >= a.t && t <= b.t) {
            const p = (t - a.t) / (b.t - a.t || 1)
            return {
              r: Math.round(a.r + (b.r - a.r) * p),
              g: Math.round(a.g + (b.g - a.g) * p),
              b: Math.round(a.b + (b.b - a.b) * p)
            }
          }
        }
        const last = colorStops[colorStops.length - 1]
        return { r: last.r, g: last.g, b: last.b }
      }

      for (let y = 0; y < canvas.height; y += 1) {
        const sampleLat = latMaxBound - ((y + 0.5) / canvas.height) * latSpan
        for (let x = 0; x < canvas.width; x += 1) {
          const sampleLng = lonMinBound + ((x + 0.5) / canvas.width) * lonSpan
          const sampleRain = this.sampleEra5CloudValue(field, sampleLat, sampleLng)
          if (!Number.isFinite(sampleRain) || sampleRain <= low) continue

          const normalized = this.clamp((sampleRain - low) / (high - low), 0, 1)
          const smooth = normalized * normalized * (3 - 2 * normalized)
          const color = sampleColor(smooth)
          const alpha = this.clamp(0.05 + smooth * 0.77, 0.05, 0.86)
          const offset = (y * canvas.width + x) * 4
          buffer[offset] = color.r
          buffer[offset + 1] = color.g
          buffer[offset + 2] = color.b
          buffer[offset + 3] = Math.round(alpha * 255)
        }
      }

      ctx.putImageData(imageData, 0, 0)

      this.imergImageOverlay = L.imageOverlay(canvas.toDataURL('image/png'), field.bounds, {
        pane: 'overlayPane',
        opacity: this.basemapMode === 'narrative' ? 0.93 : 0.88,
        interactive: false,
        crossOrigin: false
      })
      this.imergImageOverlay.addTo(this.map)
      try {
        const imgEl = this.imergImageOverlay.getElement && this.imergImageOverlay.getElement()
        if (imgEl && imgEl.style) {
          imgEl.style.imageRendering = 'auto'
          imgEl.style.width = '100%'
          imgEl.style.height = '100%'
        }
      } catch (e) {
        // ignore
      }
      this.bringTyphoonPathToFront()
    },
    renderNightObservabilityLayer(evidenceRows = []) {
      if (!this.map || !this.nightObservabilityLayer) return
      this.nightObservabilityLayer.clearLayers()
      if (!this.isNightObservabilityVisible) return

      const rows = Array.isArray(evidenceRows) && evidenceRows.length > 0
        ? evidenceRows
        : this.getAlignmentRowsBySelectedDay()

      rows.forEach((row) => {
        const center = this.getRegionCenter(row.region)
        const style = this.getObservabilityLayerStyle(Boolean(row.isReadable))
        if (!center || !style) return

        L.circle(center, {
          radius: style.radius * 3200,
          color: style.color,
          weight: 1,
          opacity: 0.58,
          fillColor: style.color,
          fillOpacity: style.opacity,
          interactive: false
        }).addTo(this.nightObservabilityLayer)
      })
    },
    renderMeteoEvidenceLayers() {
      this.renderEra5CloudLayer()
      this.renderImergRainLayer()

      const alignmentRows = this.getAlignmentRowsBySelectedDay()
      const day = this.toDayKey(this.selectedLightDate)
      const imergDayData = this.imergDailyByDay?.[day] || {}

      const mainstreamMean = Number(
        imergDayData?.TyphoonTrackMatch?.mean
        ?? imergDayData?.YangtzeDeltaWide?.mean
        ?? imergDayData?.ShanghaiCore?.mean
      )

      const evidenceRows = alignmentRows.map((row) => {
        const cloudRatio = Number(row?.era5_cloud_mean)
        const cloudPercent = Number.isFinite(cloudRatio)
          ? (cloudRatio <= 1 ? cloudRatio * 100 : cloudRatio)
          : NaN

        const regionRainMean = Number(imergDayData?.[row?.region]?.mean)
        const rainMm = Number.isFinite(regionRainMean) ? regionRainMean : mainstreamMean

        return {
          ...row,
          cloudPercent,
          rainMm,
          isReadable: Number.isFinite(cloudPercent)
            && Number.isFinite(rainMm)
            && cloudPercent < 20
            && rainMm < 5
        }
      })

      this.renderNightObservabilityLayer(evidenceRows)
    },
    async loadEra5AlignmentData() {
      try {
        const response = await fetch(buildPublicAssetPath('leaflet-index', 'meteo/era5/era5_nightlight_alignment.json'))
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        const rows = await response.json()
        this.era5AlignmentRows = Array.isArray(rows) ? rows : []
        this.renderMeteoEvidenceLayers()
      } catch (error) {
        console.warn('无法加载 ERA5 对齐数据', error)
      }
    },
    async loadEra5DailyGridData() {
      try {
        const response = await fetch(buildPublicAssetPath('leaflet-index', 'meteo/era5/era5_daily_grids.json'))
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        const payload = await response.json()
        this.era5DailyGridByDay = payload?.days && typeof payload.days === 'object'
          ? payload.days
          : {}
        if (!this.selectedEra5Date) {
          const fallbackDay = this.getEra5AvailableDays()[0]
          if (fallbackDay) {
            this.selectedEra5Date = `${fallbackDay.slice(0, 4)}-${fallbackDay.slice(4, 6)}-${fallbackDay.slice(6, 8)}`
          }
        }
        this.renderMeteoEvidenceLayers()
      } catch (error) {
        console.warn('无法加载 ERA5 网格数据', error)
      }
    },
    async loadImergDailyData() {
      try {
        const response = await fetch(buildPublicAssetPath('leaflet-index', 'meteo/imerg/imerg_daily_summary.json'))
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        const payload = await response.json()
        this.imergDailyByDay = payload?.days && typeof payload.days === 'object'
          ? payload.days
          : {}
        if (!this.selectedImergDate) {
          const fallbackDay = this.getImergAvailableDays()[0]
          if (fallbackDay) {
            this.selectedImergDate = `${fallbackDay.slice(0, 4)}-${fallbackDay.slice(4, 6)}-${fallbackDay.slice(6, 8)}`
          }
        }
        this.renderMeteoEvidenceLayers()
      } catch (error) {
        console.warn('无法加载 IMERG 日降雨数据', error)
      }
    },
    initializeLightScenario() {
      const days = this.currentPhaseLightDays
      const fallback = this.lightAvailableDates[0] || ''
      const target = days[0] || fallback
      if (!target) return
      this.selectLightDate(target)
    },
    setLightPhase(phase) {
      if (!['pre', 'during', 'post'].includes(phase)) return
      this.lightPhase = phase

      const phaseDays = this.currentPhaseLightDays
      if (phaseDays.length > 0) {
        this.selectLightDate(phaseDays[0])
      }
    },
    selectLightDate(dateStr) {
      if (!dateStr) return
      this.applyNightLightDate(dateStr, { followTimeline: false })
    },
    applyNightLightDate(dateStr, options = {}) {
      if (!dateStr) return

      if (options.followTimeline === true) {
        this.lightFollowTimeline = true
      } else if (options.followTimeline === false) {
        this.lightFollowTimeline = false
      }

      if (this.preferNightImageOverlay && this.showNightImageOverlay(dateStr)) {
        this.selectedLightDate = dateStr
        this.renderMeteoEvidenceLayers()
        if (this.isNightQualityVisible) {
          this.preloadNightDateData(dateStr)
        }
        return
      }

      // 内存已缓存的日期，直接切换图层，避免重复 fetch 导致切换卡顿或失败
      const cachedNightLayer = this.nightLayersByDate[dateStr]
      const cachedQualityLayer = this.qualityLayersByDate[dateStr]
      if (cachedNightLayer && this.nightLightLayer) {
        this.selectedLightDate = dateStr
        this.nightLightLayer.clearLayers()
        cachedNightLayer.eachLayer((layer) => layer.addTo(this.nightLightLayer))

        if (this.nightQualityLayer && this.isNightQualityVisible) {
          this.nightQualityLayer.clearLayers()
          if (cachedQualityLayer) {
            cachedQualityLayer.eachLayer((layer) => layer.addTo(this.nightQualityLayer))
          }
        }

        this.renderMeteoEvidenceLayers()
        return
      }

      const previousDate = this.selectedLightDate
      const requestSeq = ++this.nightLightRequestSeq

      this.loadDailyNightLights(dateStr).then((data) => {
        if (requestSeq !== this.nightLightRequestSeq) return
        if (!Array.isArray(data) || data.length === 0) {
          if (previousDate && previousDate !== dateStr) {
            this.selectedLightDate = previousDate
          }
          return
        }

        this.selectedLightDate = dateStr

        this.rawLightRows = data.map((item) => [item.lat, item.lon, item.intensity, item.pixelStatus])
        this.rawQualityRows = data.map((item) => ({
          lat: item.lat,
          lon: item.lon,
          mandatoryQuality: item.mandatoryQuality,
          cloudMaskQuality: item.cloudMaskQuality,
          snowFlag: item.snowFlag,
          pixelStatus: item.pixelStatus
        }))
        this.updateLightQualityStats(data)

        // === 缓存方案：检查缓存，不存在则建层并缓存 ===
        let nightLayer = this.nightLayersByDate[dateStr]
        if (!nightLayer) {
          nightLayer = this.buildNightLightLayer(dateStr)
          if (nightLayer) {
            this.nightLayersByDate[dateStr] = nightLayer
          }
        }

        // 切换夜光层
        if (this.nightLightLayer && nightLayer) {
          this.nightLightLayer.clearLayers()
          nightLayer.eachLayer(layer => layer.addTo(this.nightLightLayer))
        }

        // 处理质量层
        let qualityLayer = this.qualityLayersByDate[dateStr]
        if (!qualityLayer) {
          qualityLayer = this.buildNightQualityLayer(dateStr)
          if (qualityLayer) {
            this.qualityLayersByDate[dateStr] = qualityLayer
          }
        }

        if (this.nightQualityLayer && qualityLayer && this.isNightQualityVisible) {
          this.nightQualityLayer.clearLayers()
          qualityLayer.eachLayer(layer => layer.addTo(this.nightQualityLayer))
        }

        this.renderMeteoEvidenceLayers()
      }).catch((error) => {
        if (requestSeq !== this.nightLightRequestSeq) return
        console.warn(`切换夜光日期失败: ${dateStr}`, error)
        if (previousDate && previousDate !== dateStr) {
          this.selectedLightDate = previousDate
        }
      })
    },
  
      handleLightFollowTimelineToggle(event) {
        const enabled = Boolean(event.target.checked)
        this.lightFollowTimeline = enabled
        if (enabled) {
          this.updateNightLightForCurrentTime()
        }
      },
    decodeMandatoryQuality(value) {
      const parsed = Number(value)
      if (!Number.isFinite(parsed)) return null
      return parsed
    },
    isCloudMaskFlagged(value) {
      const parsed = Number(value)
      if (!Number.isFinite(parsed)) return false
      // QF_Cloud_Mask 位解码：低2位作为云置信度(0-3)，仅高置信(3)标记为云
      const cloudConfidence = parsed & 0b11
      return cloudConfidence === 3
    },
    isSnowFlagged(value) {
      const parsed = Number(value)
      if (!Number.isFinite(parsed)) return false
      return parsed !== 0
    },
    getNightImageEntry(dateStr) {
      return this.nightImageMetadataByDate?.[dateStr] || null
    },
    getNightImageBounds(entry) {
      if (!entry || !Array.isArray(entry.bounds) || entry.bounds.length !== 2) return null

      const southwest = entry.bounds[0]
      const northeast = entry.bounds[1]
      if (!Array.isArray(southwest) || !Array.isArray(northeast) || southwest.length < 2 || northeast.length < 2) {
        return null
      }

      const swLat = Number(southwest[0])
      const swLng = Number(southwest[1])
      const neLat = Number(northeast[0])
      const neLng = Number(northeast[1])
      if (!Number.isFinite(swLat) || !Number.isFinite(swLng) || !Number.isFinite(neLat) || !Number.isFinite(neLng)) {
        return null
      }

      return [
        [swLat, swLng],
        [neLat, neLng]
      ]
    },
    buildNightlightAssetUrl(assetPath) {
      if (!assetPath) return ''

      const version = String(this.nightLightAssetVersion || '').trim()
      const url = buildPublicAssetPath(assetPath)
      if (!version) return url

      const separator = url.includes('?') ? '&' : '?'
      return `${url}${separator}v=${encodeURIComponent(version)}`
    },
    removeNightImageOverlay() {
      if (this.map && this.nightImageOverlay && this.map.hasLayer(this.nightImageOverlay)) {
        this.map.removeLayer(this.nightImageOverlay)
      }
      this.nightImageOverlay = null
    },
    showNightImageOverlay(dateStr) {
      if (!this.map || !this.isNightLightsVisible || !dateStr) return false

      const entry = this.getNightImageEntry(dateStr)
      if (!entry || !Array.isArray(entry.bounds) || entry.bounds.length !== 2 || !entry.image) {
        return false
      }

      const imageUrl = this.buildNightlightAssetUrl(entry.image)
      let bounds = this.getNightImageBounds(entry)
      if (!bounds) {
        // 如果单条 entry 的 bounds 不可用或异常，回退到全局 data metadata 提供的 bounds（快速验证用）
        if (this.nightLightMetadata && Array.isArray(this.nightLightMetadata.bounds) && this.nightLightMetadata.bounds.length === 2) {
          const sw = this.nightLightMetadata.bounds[0]
          const ne = this.nightLightMetadata.bounds[1]
          bounds = [[Number(sw[0]), Number(sw[1])], [Number(ne[0]), Number(ne[1])]]
          console.warn('夜光图片条目 bounds 不可用，使用全局 metadata.bounds 回退:', bounds)
        } else {
          return false
        }
      }

      this.removeNightImageOverlay()
      // 强制使用全局 metadata.bounds 作为图片叠加的参考框（避免单图条目差异导致混乱）
      if (this.nightLightMetadata && Array.isArray(this.nightLightMetadata.bounds) && this.nightLightMetadata.bounds.length === 2) {
        const gsw = this.nightLightMetadata.bounds[0]
        const gne = this.nightLightMetadata.bounds[1]
        bounds = [[Number(gsw[0]), Number(gsw[1])], [Number(gne[0]), Number(gne[1])]]
      }

      this.nightImageOverlay = L.imageOverlay(imageUrl, bounds, {
        pane: 'overlayPane',
        opacity: this.nightLightsFocused ? 0.95 : 0.85,
        interactive: false,
        crossOrigin: false
      })
      this.nightImageOverlay.addTo(this.map)
      // 图片叠加为权威显示，移除基于点的夜光图层以避免两层混叠
      if (this.nightLightLayer && this.map.hasLayer(this.nightLightLayer)) {
        this.nightLightOverlaySyncLock = true
        this.map.removeLayer(this.nightLightLayer)
        this.nightLightOverlaySyncLock = false
      }
      this.bringTyphoonPathToFront()
      return true
    },
    removeEra5ImageOverlay() {
      if (this.map && this.era5ImageOverlay && this.map.hasLayer(this.era5ImageOverlay)) {
        this.map.removeLayer(this.era5ImageOverlay)
      }
      this.era5ImageOverlay = null
    },
    getEra5GridBounds(cells) {
      if (!Array.isArray(cells) || cells.length === 0) return null

      let latMin = Infinity
      let latMax = -Infinity
      let lonMin = Infinity
      let lonMax = -Infinity

      cells.forEach((cell) => {
        const cellLatMin = Number(cell?.latMin)
        const cellLatMax = Number(cell?.latMax)
        const cellLonMin = Number(cell?.lonMin)
        const cellLonMax = Number(cell?.lonMax)
        if (![cellLatMin, cellLatMax, cellLonMin, cellLonMax].every(Number.isFinite)) return

        latMin = Math.min(latMin, cellLatMin)
        latMax = Math.max(latMax, cellLatMax)
        lonMin = Math.min(lonMin, cellLonMin)
        lonMax = Math.max(lonMax, cellLonMax)
      })

      if (![latMin, latMax, lonMin, lonMax].every(Number.isFinite)) return null
      return [[latMin, lonMin], [latMax, lonMax]]
    },
    getEra5GridAxes(cells) {
      if (!Array.isArray(cells) || cells.length === 0) return null

      const latCenters = [...new Set(cells.map((cell) => Number(((Number(cell?.latMin) + Number(cell?.latMax)) / 2).toFixed(6))))]
        .filter(Number.isFinite)
        .sort((a, b) => a - b)
      const lonCenters = [...new Set(cells.map((cell) => Number(((Number(cell?.lonMin) + Number(cell?.lonMax)) / 2).toFixed(6))))]
        .filter(Number.isFinite)
        .sort((a, b) => a - b)

      if (latCenters.length === 0 || lonCenters.length === 0) return null
      return { latCenters, lonCenters }
    },
    preloadNightDateData(dateStr) {
      if (!dateStr) return
      if (this.nightLayersByDate[dateStr] && this.qualityLayersByDate[dateStr]) return

      this.loadDailyNightLights(dateStr).then((data) => {
        if (!Array.isArray(data) || data.length === 0) return

        this.rawLightRows = data.map((item) => [item.lat, item.lon, item.intensity, item.pixelStatus])
        this.rawQualityRows = data.map((item) => ({
          lat: item.lat,
          lon: item.lon,
          mandatoryQuality: item.mandatoryQuality,
          cloudMaskQuality: item.cloudMaskQuality,
          snowFlag: item.snowFlag,
          pixelStatus: item.pixelStatus
        }))
        if (this.selectedLightDate === dateStr) {
          this.updateLightQualityStats(data)
        }

        if (!this.nightLayersByDate[dateStr]) {
          const nightLayer = this.buildNightLightLayer(dateStr)
          if (nightLayer) this.nightLayersByDate[dateStr] = nightLayer
        }
        if (!this.qualityLayersByDate[dateStr]) {
          const qualityLayer = this.buildNightQualityLayer(dateStr)
          if (qualityLayer) this.qualityLayersByDate[dateStr] = qualityLayer
        }
      }).catch((error) => {
        console.warn(`后台预加载夜光数据失败: ${dateStr}`, error)
      })
    },
    updateLightQualityStats(data) {
      if (!Array.isArray(data) || data.length === 0) {
        this.lightQualityStats = {
          total: 0,
          valid: 0,
          degraded: 0,
          cloudOrSnow: 0,
          noLight: 0,
          noData: 0
        }
        return
      }

      let valid = 0
      let degraded = 0
      let cloudOrSnow = 0
      let noLight = 0
      let noData = 0

      data.forEach((item) => {
        const status = String(item?.pixelStatus || '').toUpperCase()
        const intensity = Number(item?.intensity)
        const mandatory = this.decodeMandatoryQuality(item?.mandatoryQuality)
        const cloud = this.isCloudMaskFlagged(item?.cloudMaskQuality)
        const snow = this.isSnowFlagged(item?.snowFlag)

        const resolvedStatus = status || (Number.isFinite(intensity) ? 'LIGHT' : 'NO_DATA')

        if (resolvedStatus === 'NO_DATA') noData += 1
        if (resolvedStatus === 'NO_LIGHT') noLight += 1

        if (resolvedStatus !== 'NO_DATA' && mandatory === 0) {
          valid += 1
        } else if (resolvedStatus !== 'NO_DATA' && mandatory !== null) {
          degraded += 1
        }

        if (cloud || snow) {
          cloudOrSnow += 1
        }
      })

      this.lightQualityStats = {
        total: data.length,
        valid,
        degraded,
        cloudOrSnow,
        noLight,
        noData
      }
    },
    formatMiniTime(time) {
      return new Date(time).toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    },
    formatPercent(value) {
      const parsed = Number(value)
      if (!Number.isFinite(parsed)) return '--'
      const prefix = parsed > 0 ? '+' : ''
      return `${prefix}${parsed.toFixed(1)}%`
    },
    formatResponseDuration(minutes) {
      const value = Number(minutes)
      if (!Number.isFinite(value) || value < 0) return '--'
      if (value < 60) return `${value} 分钟`
      return `${(value / 60).toFixed(1)} 小时`
    },
    syncMapToCurrentTrackPoint(trackPoint, options = {}) {
      if (!trackPoint || !this.map) return

      const lat = Number(trackPoint.lat)
      const lng = Number(trackPoint.lng)
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return

      const { animate = true, duration = 0.5 } = options
      this.map.panTo([lat, lng], {
        animate,
        duration
      })
    },
    getDistanceKm(from, to) {
      const toRadians = (deg) => (deg * Math.PI) / 180
      const earthRadiusKm = 6371
      const dLat = toRadians(to.lat - from.lat)
      const dLng = toRadians(to.lng - from.lng)
      const lat1 = toRadians(from.lat)
      const lat2 = toRadians(to.lat)

      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
        + Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      return earthRadiusKm * c
    },
    calculateRiskScore() {
      if (!this.typhoonEvents || this.typhoonEvents.length === 0 || !this.currentTime) return 0
      const currentTimeValue = new Date(this.currentTime).getTime()
      const recentEvents = this.typhoonEvents.filter((event) => {
        const eventTime = new Date(event.time).getTime()
        const hoursDiff = (currentTimeValue - eventTime) / (1000 * 60 * 60)
        return hoursDiff >= 0 && hoursDiff <= 12
      })

      let score = 0
      recentEvents.forEach((event) => {
        score += Math.min(35, Math.floor((event.impactRadius || 0) / 5000))
        if (event.type === 'landfall' || event.type === 'disaster') score += 25
        if (event.type === 'warning' || event.type === 'alert') score += 15

        if (event.affectedAreas && event.affectedAreas.length > 0) {
          event.affectedAreas.forEach((area) => {
            if (area.severity === '极严重') score += 20
            else if (area.severity === '严重') score += 15
            else if (area.severity === '中等') score += 8
            else if (area.severity === '轻微') score += 3
          })
        }
      })

      return Math.min(100, score)
    },
    getRiskColorByEvent(event) {
      const severeArea = (event.affectedAreas || []).some((area) => area.severity === '严重' || area.severity === '极严重')
      if (event.type === 'landfall' || event.type === 'disaster' || severeArea) {
        return '#ff3b30'
      }
      if (event.type === 'warning' || event.type === 'alert') {
        return '#ff9500'
      }
      return '#34c759'
    },
    drawRiskSurfaceLayer(filteredEvents) {
      if (!this.map || !this.showRiskSurface || !filteredEvents || filteredEvents.length === 0) return

      const currentTimeValue = new Date(this.currentTime).getTime()
      const riskEvents = filteredEvents.filter((event) => {
        const eventTime = new Date(event.time).getTime()
        const hoursDiff = (currentTimeValue - eventTime) / (1000 * 60 * 60)
        return hoursDiff >= 0 && hoursDiff <= 12
      })

      riskEvents.forEach((event) => {
        const color = this.getRiskColorByEvent(event)
        const center = [event.lat, event.lng]
        const radius = Math.max(30000, event.impactRadius || 80000)

        const coreLayer = L.circle(center, {
          radius: radius * 0.45,
          color,
          weight: 0,
          fillColor: color,
          fillOpacity: 0.22,
          interactive: false
        }).addTo(this.map)

        const outerLayer = L.circle(center, {
          radius,
          color,
          weight: 1,
          opacity: 0.35,
          fillColor: color,
          fillOpacity: 0.08,
          dashArray: '4, 6',
          interactive: false
        }).addTo(this.map)

        this.allMarkers.push(coreLayer)
        this.allMarkers.push(outerLayer)
      })
    },
    getNightLightColor(val) {
      const parsed = Number(val)
      if (!Number.isFinite(parsed)) return null
      if (parsed < 25) return '#7A431D'
      if (parsed < 60) return '#D2691E'
      if (parsed < 120) return '#FF8C00'
      if (parsed < 200) return '#FFD700'
      if (parsed < 280) return '#FFFACD'
      return '#FFFFFF'
    },
    getNightLightDiffColor(delta) {
      const parsed = Number(delta)
      if (!Number.isFinite(parsed)) return '#ef4444'
      if (parsed <= -90) return '#7f1d1d'
      if (parsed <= -45) return '#b91c1c'
      if (parsed <= -20) return '#ef4444'
      if (parsed <= -8) return '#f87171'
      if (parsed < 0) return '#fecaca'
      return '#fde68a'
    },
    clamp(value, min, max) {
      return Math.min(max, Math.max(min, value))
    },
    percentile(values, percentileValue) {
      if (!Array.isArray(values) || values.length === 0) return 0
      const sorted = values.slice().sort((a, b) => a - b)
      const index = (sorted.length - 1) * this.clamp(percentileValue, 0, 100) / 100
      const lower = Math.floor(index)
      const upper = Math.ceil(index)
      if (lower === upper) return sorted[lower]
      const weight = index - lower
      return sorted[lower] * (1 - weight) + sorted[upper] * weight
    },
    hexToRgb(hex) {
      const normalized = String(hex || '').replace('#', '')
      if (normalized.length !== 6) return { r: 0, g: 0, b: 0 }
      const value = parseInt(normalized, 16)
      return {
        r: (value >> 16) & 255,
        g: (value >> 8) & 255,
        b: value & 255
      }
    },
    rgbToHex({ r, g, b }) {
      const toHex = (component) => this.clamp(Math.round(component), 0, 255).toString(16).padStart(2, '0')
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`
    },
    mixColors(fromHex, toHex, t) {
      const start = this.hexToRgb(fromHex)
      const end = this.hexToRgb(toHex)
      const progress = this.clamp(t, 0, 1)
      return this.rgbToHex({
        r: start.r + (end.r - start.r) * progress,
        g: start.g + (end.g - start.g) * progress,
        b: start.b + (end.b - start.b) * progress
      })
    },
    sampleGradientColor(stops, value) {
      if (!Array.isArray(stops) || stops.length === 0) return null
      if (stops.length === 1) return stops[0].color

      const clamped = this.clamp(Number(value) || 0, 0, 1)
      let left = stops[0]
      let right = stops[stops.length - 1]

      for (let index = 0; index < stops.length - 1; index += 1) {
        const current = stops[index]
        const next = stops[index + 1]
        if (clamped >= current.stop && clamped <= next.stop) {
          left = current
          right = next
          break
        }
      }

      const segmentLength = Math.max(right.stop - left.stop, 1e-6)
      const segmentProgress = (clamped - left.stop) / segmentLength
      return this.mixColors(left.color, right.color, segmentProgress)
    },
    getNightLightRenderStats(values) {
      return {
        p05: this.percentile(values, 5),
        p25: this.percentile(values, 25),
        median: this.percentile(values, 50),
        p75: this.percentile(values, 75),
        p95: this.percentile(values, 95)
      }
    },
    getNightLightGridSize(zoom) {
      const level = Number(zoom) || 0
      if (level <= 5) return 20
      if (level <= 6) return 16
      if (level <= 7) return 13
      if (level <= 8) return 10
      if (level <= 10) return 7
      if (level <= 12) return 5
      return 4
    },
    getNightLightMarkerRadius(zoom, normalized, count) {
      const level = Number(zoom) || 0
      const densityBoost = Math.min(1.25, Math.log2((count || 1) + 1) * 0.22)
      const zoomBoost = Math.max(0.75, Math.min(1.2, (level - 3) / 8.5))
      return this.clamp((0.55 + normalized * 1.75 + densityBoost) * zoomBoost, 0.55, 3.1)
    },
    isPointInBounds(point, bounds) {
      if (!bounds || !point) return false
      const lat = Number(point.lat)
      const lng = Number(point.lng)
      return Number.isFinite(lat) && Number.isFinite(lng) && bounds.contains([lat, lng])
    },
    getNightLightVisiblePoints(points) {
      if (!this.map || !Array.isArray(points)) return []
      const bounds = this.map.getBounds ? this.map.getBounds().pad(0.18) : null
      if (!bounds) return points
      return points.filter((point) => this.isPointInBounds(point, bounds))
    },
    aggregateNightLightBuckets(points, zoom) {
      const gridSize = this.getNightLightGridSize(zoom)
      const buckets = new Map()

      points.forEach((point) => {
        const projected = this.map.project([point.lat, point.lng], zoom)
        const key = `${Math.floor(projected.x / gridSize)}:${Math.floor(projected.y / gridSize)}`
        const existing = buckets.get(key)

        if (!existing) {
          buckets.set(key, {
            lat: point.lat,
            lng: point.lng,
            count: 1,
            sum: point.intensity,
            max: point.intensity,
            maxLat: point.lat,
            maxLng: point.lng
          })
          return
        }

        existing.count += 1
        existing.sum += point.intensity

        if (point.intensity > existing.max) {
          existing.max = point.intensity
          existing.maxLat = point.lat
          existing.maxLng = point.lng
        }

        existing.lat = (existing.lat * (existing.count - 1) + point.lat) / existing.count
        existing.lng = (existing.lng * (existing.count - 1) + point.lng) / existing.count
      })

      return Array.from(buckets.values()).map((bucket) => {
        const average = bucket.sum / bucket.count
        return {
          lat: bucket.lat,
          lng: bucket.lng,
          count: bucket.count,
          average,
          max: bucket.max,
          intensity: bucket.max * 0.7 + average * 0.3
        }
      })
    },
    setNarrativeStage(stage) {
      if (!stage || this.narrativeStage === stage) return
      this.narrativeStage = stage
      this.applyNarrativeStage()
    },
    toggleModule(moduleName) {
      if (['status', 'track', 'chart'].includes(moduleName)) {
        const newModule = this.narrativeActiveModule === moduleName ? '' : moduleName
        this.activeModule = newModule
        this.$emit('setNarrativeActiveModule', newModule)
      } else {
        const newModule = this.activeModule === moduleName ? '' : moduleName
        this.activeModule = newModule
      }
    },
    // 切换面板子模块
    togglePanelModule(panelName, moduleKey) {
      if (panelName === 'news') {
        this.$set(this.newsPanelModules, moduleKey, !this.newsPanelModules[moduleKey])
      } else if (panelName === 'impact') {
        this.$set(this.impactPanelModules, moduleKey, !this.impactPanelModules[moduleKey])
      }
    },
    setBasemapMode(mode) {
      if (!mode) return
      this.basemapMode = mode
      this.applyBasemapTheme(mode)
      if (this.isEra5CloudVisible) {
        this.renderEra5CloudLayer()
      }
      if (this.isImergRainVisible) {
        this.renderImergRainLayer()
      }
    },
    applyBasemapTheme(mode = 'standard') {
      if (!this.map) return

      const useDark = mode === 'narrative'

      // 双底图常驻，通过 pane 显隐切换，避免“黑一下又回白”。
      if (this.tiandituVecLayer && !this.map.hasLayer(this.tiandituVecLayer)) {
        this.tiandituVecLayer.addTo(this.map)
      }
      if (this.tiandituDarkVecLayer && !this.map.hasLayer(this.tiandituDarkVecLayer)) {
        this.tiandituDarkVecLayer.addTo(this.map)
      }

      if (this.tiandituLabelLayer && !this.map.hasLayer(this.tiandituLabelLayer)) {
        this.tiandituLabelLayer.addTo(this.map)
      }

      const lightPane = this.map.getPane('tdt-base-pane')
      const darkPane = this.map.getPane('tdt-dark-base-pane')
      const labelPane = this.map.getPane('tdt-label-pane')

      if (lightPane) {
        lightPane.style.display = useDark ? 'none' : 'block'
      }
      if (darkPane) {
        darkPane.style.display = useDark ? 'block' : 'none'
        darkPane.style.filter = useDark
          ? 'grayscale(1) brightness(0.2) contrast(1.45) saturate(0.25)'
          : 'none'
      }
      if (labelPane) {
        labelPane.style.filter = useDark
          ? 'brightness(1.25) contrast(1.15) saturate(0.85)'
          : 'none'
      }
    },
    syncNightLightWithBasemap(enableNightLayer) {
      if (!this.map || !this.nightLightLayer) return

      this.nightLightsFocused = Boolean(enableNightLayer)

      if (enableNightLayer) {
        if (!this.map.hasLayer(this.nightLightLayer)) {
          this.nightLightLayer.addTo(this.map)
        }
        if (this.isNightQualityVisible && this.nightQualityLayer && !this.map.hasLayer(this.nightQualityLayer)) {
          this.nightQualityLayer.addTo(this.map)
        }

        if (this.selectedLightDate) {
          this.selectLightDate(this.selectedLightDate)
        } else {
          this.initializeLightScenario()
        }
        return
      }

      if (this.map.hasLayer(this.nightLightLayer)) {
        this.nightLightOverlaySyncLock = true
        this.map.removeLayer(this.nightLightLayer)
        this.nightLightOverlaySyncLock = false
      }
      if (this.nightQualityLayer && this.map.hasLayer(this.nightQualityLayer)) {
        this.map.removeLayer(this.nightQualityLayer)
      }
      this.removeNightImageOverlay()
    },
    applyNarrativeStage() {
      if (!this.map) return

      if (this.isNightLightsVisible && this.nightLightLayer) {
        if (!this.map.hasLayer(this.nightLightLayer)) {
          this.nightLightLayer.addTo(this.map)
        }

        if (this.selectedLightDate) {
          this.selectLightDate(this.selectedLightDate)
        } else {
          this.initializeLightScenario()
        }
      }

      // 简化阶段应用：不执行自动相机飞行
      if (this.isTyphoonPathVisible && !this.map.hasLayer(this.typhoonPathLayer)) {
        this.typhoonPathLayer.addTo(this.map)
      }

      this.updateVisualization()
      this.renderNightLights()
      this.renderTyphoonPath()
    },
    renderTyphoonPath() {
      if (!this.map || !this.typhoonPathLayer || !this.isTyphoonPathVisible) return
      if (!this.map.hasLayer(this.typhoonPathLayer)) {
        this.typhoonPathLayer.addTo(this.map)
      }
      this.typhoonPathLayer.clearLayers()
      this.drawTyphoonPath()
      this.bringTyphoonPathToFront()
    },
    handleOverlayAdd(event) {
      if (!event || !event.layer) return

      if (event.layer === this.typhoonPathLayer) {
        this.isTyphoonPathVisible = true
        this.updateVisualization()
      }

      if (event.layer === this.nightLightLayer) {
        this.isNightLightsVisible = true
        this.nightLightsFocused = true
        this.renderNightLights()
      }

      if (event.layer === this.nightQualityLayer) {
        this.isNightQualityVisible = true
        this.renderNightQuality()
      }
    },
    handleOverlayRemove(event) {
      if (!event || !event.layer) return

      if (event.layer === this.typhoonPathLayer) {
        this.isTyphoonPathVisible = false
        if (this.typhoonPathLayer) this.typhoonPathLayer.clearLayers()
      }

      if (event.layer === this.nightLightLayer) {
        if (this.nightLightOverlaySyncLock) {
          return
        }
        this.isNightLightsVisible = false
        this.nightLightsFocused = false
        this.removeNightImageOverlay()
        if (this.nightLightLayer) this.nightLightLayer.clearLayers()
      }

      if (event.layer === this.nightQualityLayer) {
        this.isNightQualityVisible = false
        if (this.nightQualityLayer) this.nightQualityLayer.clearLayers()
      }
    },
    buildNightLightLayer(dateStr) {
      // 建立并缓存某日期的夜光层
      const rows = this.rawLightRows
      if (!Array.isArray(rows) || rows.length === 0) return null

      const layerGroup = L.layerGroup()
      let kept = 0

      rows.forEach((item) => {
        const lat = Number(item?.[0])
        const lng = Number(item?.[1])
        const intensity = Number(item?.[2])
        const status = String(item?.[3] || '').toUpperCase() || (Number.isFinite(intensity) ? 'LIGHT' : 'NO_DATA')

        if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(intensity)) return
        if (status !== 'LIGHT') return

        const color = this.getNightLightColor(intensity)
        if (!color) return

        const fillOpacity = this.nightLightsFocused ? 0.94 : 0.8

        L.circleMarker([lat, lng], {
          renderer: this.lightsRenderer,
          radius: 1.3,
          stroke: false,
          fillColor: color,
          fillOpacity,
          interactive: false
        }).addTo(layerGroup)

        kept += 1
      })

      IS_DEV && console.log(`夜光图层 [${dateStr}] 缓存点数:`, kept)
      return layerGroup
    },

    buildNightQualityLayer(dateStr) {
      // 建立并缓存某日期的质量层
      const qualityRows = this.rawQualityRows
      const lightRows = this.rawLightRows
      if (!Array.isArray(lightRows) || lightRows.length === 0) return null

      const layerGroup = L.layerGroup()
      let kept = 0

      lightRows.forEach((lightItem, index) => {
        const lat = Number(lightItem?.[0])
        const lng = Number(lightItem?.[1])
        const qualityItem = Array.isArray(qualityRows) ? qualityRows[index] : null
        const mandatory = this.decodeMandatoryQuality(qualityItem?.mandatoryQuality)
        const cloudFlagged = this.isCloudMaskFlagged(qualityItem?.cloudMaskQuality)
        const snowFlagged = this.isSnowFlagged(qualityItem?.snowFlag)
        const intensity = Number(lightItem?.[2])
        const status = String(lightItem?.[3] || qualityItem?.pixelStatus || '').toUpperCase() || (Number.isFinite(intensity) ? 'LIGHT' : 'NO_DATA')

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
        let fillColor = null

        if (status === 'NO_DATA') {
          return
        } else if (status === 'NO_LIGHT') {
          return  // 跳过粉色 NO_LIGHT 标记
        } else if (cloudFlagged) {
          fillColor = '#7dd3fc'
        } else if (mandatory !== null && mandatory > 0) {
          fillColor = '#ef4444'
        } else if (snowFlagged) {
          fillColor = '#ef4444'
        } else {
          fillColor = this.getNightLightColor(intensity)
        }

        if (!fillColor) return

        L.circleMarker([lat, lng], {
          renderer: this.lightsRenderer,
          radius: 1.3,
          stroke: false,
          fillColor,
          fillOpacity: this.nightLightsFocused ? 0.94 : 0.8,
          interactive: false
        }).addTo(layerGroup)

        kept += 1
      })

      IS_DEV && console.log(`夜光质量图层 [${dateStr}] 缓存点数:`, kept)
      return layerGroup
    },

    renderNightLights() {
      if (!this.map || !this.nightLightLayer) return

      const dateStr = this.selectedLightDate
      if (!dateStr) return

      if (this.preferNightImageOverlay && this.showNightImageOverlay(dateStr)) {
        return
      }

      this.removeNightImageOverlay()

      const cachedNightLayer = this.nightLayersByDate[dateStr]
      if (!cachedNightLayer) return

      this.nightLightLayer.clearLayers()
      cachedNightLayer.eachLayer((layer) => layer.addTo(this.nightLightLayer))
      this.bringTyphoonPathToFront()
    },
    renderNightQuality() {
      if (!this.map || !this.nightQualityLayer || !this.isNightQualityVisible) return

      const dateStr = this.selectedLightDate
      if (!dateStr) return

      const cachedQualityLayer = this.qualityLayersByDate[dateStr]
      this.nightQualityLayer.clearLayers()
      if (!cachedQualityLayer) return
      cachedQualityLayer.eachLayer((layer) => layer.addTo(this.nightQualityLayer))
    },
    async loadNightLights() {
      if (!this.map || !this.nightLightLayer) return

      try {
        const imageMetadataResponse = await fetch(
          buildPublicAssetPath('leaflet-index', 'radiance_images_metadata.json'),
          { cache: 'no-store' }
        )
        if (imageMetadataResponse.ok) {
          const imageMetadata = await imageMetadataResponse.json()
          this.nightLightAssetVersion = String(imageMetadata?.generatedAt || imageMetadata?.assetVersion || '').trim()
          const entries = Array.isArray(imageMetadata?.entries) ? imageMetadata.entries : []
          this.nightImageMetadataByDate = entries.reduce((acc, entry) => {
            const date = String(entry?.date || '').trim()
            if (!date) return acc
            acc[date] = entry
            return acc
          }, {})
          IS_DEV && console.log('夜光图片元数据加载成功:', Object.keys(this.nightImageMetadataByDate).length)
        }
      } catch (error) {
        console.warn('无法加载夜光图片元数据', error)
      }

      // 先加载元数据，了解可用的时间
      try {
        const metadataResponse = await fetch(
          buildPublicAssetPath('leaflet-index', 'radiance_data_metadata.json'),
          { cache: 'no-store' }
        )
        if (!metadataResponse.ok) {
          console.warn('未找到可用夜光元数据文件: radiance_data_metadata.json')
          return
        }

        this.nightLightMetadata = await metadataResponse.json()
        if (!this.nightLightAssetVersion) {
          this.nightLightAssetVersion = String(this.nightLightMetadata?.generatedAt || this.nightLightMetadata?.assetVersion || '').trim()
        }
        IS_DEV && console.log('夜光元数据加载成功: radiance_data_metadata.json', this.nightLightMetadata)
        this.initializeLightScenario()
      } catch (error) {
        console.warn('无法加载灯光元数据', error)
      }
    },
    initIndexedDB() {
      // 初始化 IndexedDB 数据库
      const request = window.indexedDB.open(this.indexedDBName, this.indexedDBVersion)
      
      request.onerror = () => {
        console.warn('IndexedDB 打开失败')
      }
      
      request.onsuccess = (event) => {
        this.indexedDB = event.target.result
        IS_DEV && console.log('IndexedDB 已初始化')
      }
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result
        if (!db.objectStoreNames.contains(this.indexedDBStoreName)) {
          db.createObjectStore(this.indexedDBStoreName, { keyPath: 'dateStr' })
          IS_DEV && console.log('IndexedDB 对象存储已创建')
        }
      }
    },
    
    async getFromIndexedDB(dateStr) {
      // 从 IndexedDB 读取缓存数据
      if (!this.indexedDB) return null
      
      return new Promise((resolve) => {
        const transaction = this.indexedDB.transaction([this.indexedDBStoreName], 'readonly')
        const store = transaction.objectStore(this.indexedDBStoreName)
        const request = store.get(dateStr)
        
        request.onsuccess = (event) => {
          const result = event.target.result
          if (result && result.data) {
            IS_DEV && console.log(`从 IndexedDB 读取 ${dateStr}: ${result.data.length} 个点（缓存）`)
            resolve(result.data)
          } else {
            resolve(null)
          }
        }
        
        request.onerror = () => {
          console.warn(`从 IndexedDB 读取 ${dateStr} 失败`)
          resolve(null)
        }
      })
    },
    
    async saveToIndexedDB(dateStr, data) {
      // 保存数据到 IndexedDB
      if (!this.indexedDB) return
      
      const transaction = this.indexedDB.transaction([this.indexedDBStoreName], 'readwrite')
      const store = transaction.objectStore(this.indexedDBStoreName)
      store.put({ dateStr, data, timestamp: Date.now() })
      
      transaction.oncomplete = () => {
        IS_DEV && console.log(`已缓存 ${dateStr} 到 IndexedDB`)
      }
      
      transaction.onerror = () => {
        console.warn(`保存 ${dateStr} 到 IndexedDB 失败`)
      }
    },
    
    async loadDailyNightLights(dateStr) {
      /**
       * 按需加载某一天的灯光数据
       * dateStr 格式: '2025-06-30'
       * 优先从 IndexedDB 读取，如果没有则 fetch 并缓存
       */
      if (!dateStr || !this.nightLightMetadata) return null
      
      // 如果总点数为 0，说明没有点数据，直接返回 null，避免 404
      if (this.nightLightMetadata.totalPoints === 0) {
        return null
      }

      // === 先从 IndexedDB 读 ===
      const cachedData = await this.getFromIndexedDB(dateStr)
      if (cachedData) return cachedData

      // === IndexedDB 没有，从网络 fetch ===
      const datePart = dateStr.replace(/-/g, '')
      const candidateFiles = [
        `radiance_data_${datePart}.json`
      ]

      try {
        let data = null

        for (const fileName of candidateFiles) {
          const response = await fetch(buildPublicAssetPath('leaflet-index', fileName))
          if (!response.ok) continue

          const responseData = await response.json()
          if (Array.isArray(responseData) && responseData.length > 0) {
            data = responseData
            IS_DEV && console.log(`加载灯光数据 ${dateStr}: ${data.length} 个点 (${fileName})`)
            break
          }
        }

        if (!Array.isArray(data) || data.length === 0) {
          return null
        }

        // === 保存到 IndexedDB ===
        await this.saveToIndexedDB(dateStr, data)
        
        return data
      } catch (error) {
        console.warn(`无法加载灯光数据 ${dateStr}:`, error)
        return null
      }
    },
    updateNightLightForCurrentTime() {
      const availableDates = this.lightAvailableDates
      if (!Array.isArray(availableDates) || availableDates.length === 0) {
        return
      }

      if (!this.currentTime) {
        return
      }

      // 获取当前时间戳
      const currentTimeValue = new Date(this.currentTime).getTime()

      // 找到最接近的时间点（不超过currentTime）
      const availableTimes = [...availableDates].sort((a, b) =>
        new Date(a).getTime() - new Date(b).getTime()
      )

      let selectedTime = null
      
      // 找到不超过currentTime的最后一个时间
      for (let i = availableTimes.length - 1; i >= 0; i--) {
        const timeValue = new Date(availableTimes[i]).getTime()
        if (timeValue <= currentTimeValue) {
          selectedTime = availableTimes[i]
          break
        }
      }

      // 如果没有找到，使用第一个时间
      if (!selectedTime) {
        selectedTime = availableTimes[0]
      }

      this.applyNightLightDate(selectedTime.split('T')[0], { followTimeline: true })
    },
    bringTyphoonPathToFront() {
      if (!this.typhoonPathLayer) return

      this.typhoonPathLayer.eachLayer((layer) => {
        if (layer instanceof L.Polyline && layer.bringToFront) {
          layer.bringToFront()
        }
      })
    },
    initMap() {
      // 配置 Leaflet 默认图标
      delete L.Icon.Default.prototype._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
        iconUrl: require('leaflet/dist/images/marker-icon.png'),
        shadowUrl: require('leaflet/dist/images/marker-shadow.png')
      })

      // 初始化地图
      this.map = L.map(this.$refs.mapCanvas, {
        center: [27, 125],
        zoom: 4,
        minZoom: 3,
        maxZoom: 12,
        zoomControl: false
      })

      this.map.createPane('tdt-base-pane')
      this.map.getPane('tdt-base-pane').style.zIndex = '200'

      this.map.createPane('tdt-dark-base-pane')
      this.map.getPane('tdt-dark-base-pane').style.zIndex = '200'

      this.map.createPane('tdt-label-pane')
      this.map.getPane('tdt-label-pane').style.zIndex = '450'
      this.map.getPane('tdt-label-pane').style.pointerEvents = 'none'

      this.typhoonPathLayer = L.layerGroup()
      this.nightLightLayer = L.layerGroup()
      this.nightQualityLayer = L.layerGroup()
      this.era5CloudLayer = L.layerGroup()
      this.imergRainLayer = L.layerGroup()
      this.nightObservabilityLayer = L.layerGroup()
      this.lightsRenderer = L.canvas({ padding: 0.4 })

      // 添加天地图底图（矢量）
      const tiandituKey = process.env.VUE_APP_TIANDITU_KEY || ''
      if (!tiandituKey) {
        console.warn('VUE_APP_TIANDITU_KEY 未设置 — 天地图瓦片可能在生产环境不可用。请在构建环境中设置该环境变量。')
      }
      const tiandituSubdomains = ['0', '1', '2', '3', '4', '5', '6', '7']

      const useTileProxy = (String(process.env.VUE_APP_USE_TILE_PROXY || '').toLowerCase() === 'true') || !tiandituKey

      if (useTileProxy) {
        const vecUrl = '/api/tiles/vec_w/{z}/{x}/{y}'
        const labelUrl = '/api/tiles/cva_w/{z}/{x}/{y}'

        this.tiandituVecLayer = L.tileLayer(vecUrl, {
          attribution: '© 天地图 (代理)',
          minZoom: 3,
          maxZoom: 12,
          pane: 'tdt-base-pane'
        })

        this.tiandituDarkVecLayer = L.tileLayer(vecUrl, {
          attribution: '© 天地图 (代理)',
          minZoom: 3,
          maxZoom: 12,
          pane: 'tdt-dark-base-pane'
        })

        this.tiandituLabelLayer = L.tileLayer(labelUrl, {
          minZoom: 3,
          maxZoom: 12,
          pane: 'tdt-label-pane'
        })
      } else {
        this.tiandituVecLayer = L.tileLayer('https://t{s}.tianditu.gov.cn/DataServer?T=vec_w&x={x}&y={y}&l={z}&tk=' + tiandituKey, {
          subdomains: tiandituSubdomains,
          attribution: '© 天地图',
          minZoom: 3,
          maxZoom: 12,
          pane: 'tdt-base-pane'
        })

        this.tiandituDarkVecLayer = L.tileLayer('https://t{s}.tianditu.gov.cn/DataServer?T=vec_w&x={x}&y={y}&l={z}&tk=' + tiandituKey, {
          subdomains: tiandituSubdomains,
          attribution: '© 天地图',
          minZoom: 3,
          maxZoom: 12,
          pane: 'tdt-dark-base-pane'
        })

        this.tiandituLabelLayer = L.tileLayer('https://t{s}.tianditu.gov.cn/DataServer?T=cva_w&x={x}&y={y}&l={z}&tk=' + tiandituKey, {
          subdomains: tiandituSubdomains,
          minZoom: 3,
          maxZoom: 12,
          pane: 'tdt-label-pane'
        })
      }

      this.tiandituVecLayer.addTo(this.map)
      this.tiandituDarkVecLayer.addTo(this.map)
      this.tiandituLabelLayer.addTo(this.map)

      // 默认展示白底，黑底预加载隐藏。
      this.applyBasemapTheme('standard')

      this.darkBaseLayer = this.tiandituDarkVecLayer

      // 保留图层控件（用于回归检查），但通过样式隐藏
      this.layerControl = L.control.layers({
        '天地图底图': this.tiandituVecLayer
      }, {
        'Typhoon Path': this.typhoonPathLayer,
        '夜光图层': this.nightLightLayer,
        '夜光质量/云掩膜解释层': this.nightQualityLayer,
        'ERA5 云量层': this.era5CloudLayer,
        'IMERG 高分辨率降雨层': this.imergRainLayer,
        '夜光可判读层': this.nightObservabilityLayer
      }, {
        collapsed: false
      }).addTo(this.map)

      this.map.on('click', this.handleMapClick)
      this.map.on('overlayadd', this.handleOverlayAdd)
      this.map.on('overlayremove', this.handleOverlayRemove)

      // === DEBUG: 添加台北 101 参考点 (精确空间) ===
      if (this.debugMode.enabled && this.debugMode.showReferencePoint) {
        const taipei101 = L.marker([25.0340, 121.5645], {
          icon: L.divIcon({
            html: `
              <div style="
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                width: 24px;
                height: 24px;
                border-radius: 50%;
                border: 3px solid #FFD700;
                box-shadow: 0 0 12px rgba(255, 215, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
              ">📍</div>
            `,
            iconSize: [24, 24],
            className: 'reference-point'
          })
        }).bindPopup(`
          <div style="font-size: 12px;">
            <strong style="color: #667eea;">🏛️ 参考点：台北 101</strong><br/>
            坐标: [25.0340, 121.5645]<br/>
            <span style="color: #999; font-size: 10px;">空间类型: 精确空间 (Precise)</span>
          </div>
        `).addTo(this.map)
        this.allMarkers.push(taipei101)
      }

      // === DEBUG: 添加调试控制面板 ===
      if (this.debugMode.enabled) {
        const debugControl = L.control({ position: 'topright' })
        debugControl.onAdd = () => {
          const div = L.DomUtil.create('div', 'debug-control')
          div.innerHTML = `
            <div style="
              background: rgba(0, 0, 0, 0.85);
              backdrop-filter: blur(8px);
              padding: 12px;
              border-radius: 8px;
              border: 1px solid rgba(255, 255, 255, 0.2);
              font-size: 11px;
              color: white;
              min-width: 180px;
            ">
              <div style="font-weight: bold; margin-bottom: 8px; color: #FFD700;">🛠️ DEBUG 模式</div>
              <label style="display: flex; align-items: center; margin-bottom: 4px; cursor: pointer;">
                <input type="checkbox" id="debug-path" ${this.debugMode.showTyphoonPath ? 'checked' : ''} style="margin-right: 6px;">
                <span>台风轨迹</span>
              </label>
              <label style="display: flex; align-items: center; margin-bottom: 4px; cursor: pointer;">
                <input type="checkbox" id="debug-events" ${this.debugMode.showEventMarkers ? 'checked' : ''} style="margin-right: 6px;">
                <span>事件标记</span>
              </label>
              <label style="display: flex; align-items: center; margin-bottom: 4px; cursor: pointer;">
                <input type="checkbox" id="debug-impact" ${this.debugMode.showImpactRadius ? 'checked' : ''} style="margin-right: 6px;">
                <span>影响范围</span>
              </label>
              <label style="display: flex; align-items: center; cursor: pointer;">
                <input type="checkbox" id="debug-project" ${this.debugMode.projectEventsToTrack ? 'checked' : ''} style="margin-right: 6px;">
                <span>投影到轨迹</span>
              </label>
            </div>
          `
          
          // 阻止地图事件传播
          L.DomEvent.disableClickPropagation(div)
          L.DomEvent.disableScrollPropagation(div)
          
          // 绑定事件监听
          setTimeout(() => {
            document.getElementById('debug-path')?.addEventListener('change', (e) => {
              this.debugMode.showTyphoonPath = e.target.checked
              this.updateVisualization()
            })
            document.getElementById('debug-events')?.addEventListener('change', (e) => {
              this.debugMode.showEventMarkers = e.target.checked
              this.updateVisualization()
            })
            document.getElementById('debug-impact')?.addEventListener('change', (e) => {
              this.debugMode.showImpactRadius = e.target.checked
              this.updateVisualization()
            })
            document.getElementById('debug-project')?.addEventListener('change', (e) => {
              this.debugMode.projectEventsToTrack = e.target.checked
              this.updateVisualization()
            })
          }, 100)
          
          return div
        }
        debugControl.addTo(this.map)
      }

      // 初始绘制
      this.updateVisualization()
      this.loadNightLights()
      this.loadEra5AlignmentData()
      this.loadEra5DailyGridData()
      this.loadImergDailyData()
      this.$nextTick(() => {
        this.applyNarrativeStage()
        this.syncMapToCurrentTrackPoint(this.currentTrackPoint, { animate: false })
      })
    },
    updateVisualization() {
      this.clearRescueFlowTimers()

      // 清除现有图层
      if (this.typhoonPathLayer) {
        this.typhoonPathLayer.clearLayers()
      }

      if (this.pathPolyline) {
        this.pathPolyline = null
      }

      this.allMarkers.forEach(marker => {
        if (this.map && marker._map) this.map.removeLayer(marker)
      })
      this.allMarkers = []
      this.eventMarkers = []

      // === DEBUG 控制绘制逻辑 ===
      if (this.debugMode.enabled) {
        // 保留参考点
        if (this.debugMode.showReferencePoint) {
          const taipei101 = L.marker([25.0340, 121.5645], {
            icon: L.divIcon({
              html: `
                <div style="
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  width: 24px;
                  height: 24px;
                  border-radius: 50%;
                  border: 3px solid #FFD700;
                  box-shadow: 0 0 12px rgba(255, 215, 0, 0.8);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 12px;
                ">📍</div>
              `,
              iconSize: [24, 24],
              className: 'reference-point'
            })
          }).bindPopup(`
            <div style="font-size: 12px;">
              <strong style="color: #667eea;">🏛️ 参考点：台北 101</strong><br/>
              坐标: [25.0340, 121.5645]<br/>
              <span style="color: #999; font-size: 10px;">空间类型: 精确空间 (Precise)</span>
            </div>
          `).addTo(this.map)
          this.allMarkers.push(taipei101)
        }
        
        if (this.debugMode.showTyphoonPath && this.isTyphoonPathVisible) {
          this.drawTyphoonPath()
        }

        if (this.isNewsRouteVisible) {
          this.drawNewsDrivenOverlays()
        }
      } else {
        // 正常模式：绘制所有
        if (this.isTyphoonPathVisible) {
          this.drawTyphoonPath()
        }

        if (this.isNewsRouteVisible) {
          this.drawNewsDrivenOverlays()
        }
      }

      if (this.isNewsEventPointsVisible) {
        this.drawEventMarkers()
      }

      // 保证台风路径线在夜光图层之上
      this.bringTyphoonPathToFront()
    },
    clearRescueFlowTimers() {
      if (!Array.isArray(this.rescueFlowTimers)) {
        this.rescueFlowTimers = []
        return
      }

      this.rescueFlowTimers.forEach((timerId) => {
        clearInterval(timerId)
      })
      this.rescueFlowTimers = []
    },
    drawNewsDrivenOverlays() {
      if (!this.map || !Array.isArray(this.typhoonEvents) || this.typhoonEvents.length === 0 || !this.currentTime) {
        return
      }

      // 防止旧动画定时器遗留导致重复调度。
      this.clearRescueFlowTimers()

      const currentTimeValue = new Date(this.currentTime).getTime()
      const visibleEvents = this.typhoonEvents
        .filter((event) => new Date(event.time).getTime() <= currentTimeValue)
        .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())

      if (visibleEvents.length === 0) return

      this.drawEventPulseBeacons(visibleEvents)
      if (this.isNewsRouteVisible) {
        this.drawRescueFlowRoutes(visibleEvents)
      }
    },
    drawEventPulseBeacons(events) {
      const currentTimeValue = new Date(this.currentTime).getTime()
      const focusTypes = new Set(['landfall', 'disaster', 'warning', 'alert'])

      events
        .filter((event) => focusTypes.has(event.type))
        .slice(-4)
        .forEach((event) => {
          const eventTimeValue = new Date(event.time).getTime()
          const ageHours = (currentTimeValue - eventTimeValue) / (1000 * 60 * 60)
          if (ageHours > 14) return

          const color = this.eventTypeColorMap[event.type] || '#f97316'
          const radius = Math.max(28000, Number(event.impactRadius || 0) * 0.2)

          const ripple = L.circle([event.lat, event.lng], {
            radius,
            color,
            weight: 1,
            opacity: 0.75,
            fillColor: color,
            fillOpacity: 0.05,
            className: 'event-ripple-circle',
            interactive: false
          }).addTo(this.map)

          this.allMarkers.push(ripple)
        })
    },
    getCommandHubForEvent(event) {
      const lat = Number(event.lat)
      const lng = Number(event.lng)
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return { name: '联合应急指挥', lat: 28.0, lng: 120.7 }
      }

      if (lat >= 25.8 && lng >= 118 && lng <= 122) {
        return { name: '浙江省应急指挥', lat: 30.2741, lng: 120.1551 }
      }
      if (lat >= 24 && lat < 25.8 && lng >= 116.5 && lng <= 120.8) {
        return { name: '福建省应急指挥', lat: 26.0745, lng: 119.2965 }
      }
      if (lat < 24.8 && lng > 119.5) {
        return { name: '台湾应变中心', lat: 25.0375, lng: 121.5637 }
      }

      return { name: '东南沿海联合调度', lat: 27.6, lng: 119.8 }
    },
    getBearingDegrees(from, to) {
      const lat1 = (Number(from.lat) * Math.PI) / 180
      const lat2 = (Number(to.lat) * Math.PI) / 180
      const dLng = ((Number(to.lng) - Number(from.lng)) * Math.PI) / 180
      const y = Math.sin(dLng) * Math.cos(lat2)
      const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
      const brng = (Math.atan2(y, x) * 180) / Math.PI
      return (brng + 360) % 360
    },
    interpolateLatLng(from, to, ratio) {
      return {
        lat: Number(from.lat) + (Number(to.lat) - Number(from.lat)) * ratio,
        lng: Number(from.lng) + (Number(to.lng) - Number(from.lng)) * ratio
      }
    },
    drawRescueFlowRoutes(events) {
      const targetTypes = new Set(['warning', 'alert', 'landfall', 'disaster', 'assessment'])
      const selectedEvents = events
        .filter((event) => targetTypes.has(event.type))
        .slice(-3)

      selectedEvents.forEach((event) => {
        const popupHtml = this.buildNewsDetailPopupHtml(event)
        const commandHub = this.getCommandHubForEvent(event)
        const source = { lat: commandHub.lat, lng: commandHub.lng }
        const target = { lat: Number(event.lat), lng: Number(event.lng) }

        if (!Number.isFinite(target.lat) || !Number.isFinite(target.lng)) return

        const lineColor = event.type === 'landfall' || event.type === 'disaster' ? '#fb7185' : '#60a5fa'

        const routeLine = L.polyline([[source.lat, source.lng], [target.lat, target.lng]], {
          color: lineColor,
          weight: 2.5,
          opacity: 0.85,
          dashArray: '10, 10',
          lineCap: 'round'
        }).addTo(this.map)
        routeLine.bindPopup(popupHtml, {
          className: 'rescue-news-popup',
          maxWidth: 320
        })
        routeLine.on('click', () => {
          this.$emit('select-event', event)
        })
        this.allMarkers.push(routeLine)

        const bearing = this.getBearingDegrees(source, target)
        const arrowHead = L.marker([target.lat, target.lng], {
          icon: L.divIcon({
            className: 'rescue-flow-arrow',
            html: `<div class="rescue-flow-arrow-shape" style="transform: rotate(${bearing}deg); border-left-color: ${lineColor};"></div>`,
            iconSize: [18, 18],
            iconAnchor: [9, 9]
          }),
          interactive: true
        }).addTo(this.map)
        arrowHead.bindPopup(popupHtml, {
          className: 'rescue-news-popup',
          maxWidth: 320
        })
        arrowHead.on('click', () => {
          this.$emit('select-event', event)
        })
        this.allMarkers.push(arrowHead)

        const labelMarker = L.marker([target.lat, target.lng], {
          icon: L.divIcon({
            className: 'rescue-flow-label-wrap',
            html: `<div class="rescue-flow-label">${commandHub.name} → ${event.title}</div>`,
            iconSize: [220, 24],
            iconAnchor: [20, -8]
          }),
          interactive: true
        }).addTo(this.map)
        labelMarker.bindPopup(popupHtml, {
          className: 'rescue-news-popup',
          maxWidth: 320
        })
        labelMarker.on('click', () => {
          this.$emit('select-event', event)
        })
        this.allMarkers.push(labelMarker)

        const movingDots = [0.12, 0.46, 0.78].map((seed) => {
          const p = this.interpolateLatLng(source, target, seed)
          const dot = L.circleMarker([p.lat, p.lng], {
            radius: 3.8,
            color: '#ffffff',
            fillColor: lineColor,
            fillOpacity: 0.95,
            weight: 1.2,
            interactive: false
          }).addTo(this.map)
          this.allMarkers.push(dot)
          return { seed, dot }
        })

        const start = Date.now()
        const timerId = setInterval(() => {
          const elapsed = (Date.now() - start) / 1400
          movingDots.forEach((dotObj) => {
            const ratio = (dotObj.seed + elapsed) % 1
            const p = this.interpolateLatLng(source, target, ratio)
            dotObj.dot.setLatLng([p.lat, p.lng])
          })
        }, 50)

        this.rescueFlowTimers.push(timerId)
      })
    },
    buildNewsDetailPopupHtml(event) {
      const title = event.title || event.summary || '关键新闻事件'
      const timeText = event.time || '时间待确认'
      const bodyText = event.details || event.content || event.summary || '暂无详细描述'
      const sourceText = event.source || '应急管理部门通报'
      const teamText = (event.rescueTeams || [])
        .map((team) => `${team.name}${team.origin ? `(${team.origin})` : ''}`)
        .join('、')

      return `
        <div style="min-width:220px;max-width:320px;line-height:1.5;">
          <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:4px;">${title}</div>
          <div style="font-size:12px;color:#475569;margin-bottom:8px;">${timeText}</div>
          <div style="font-size:12px;color:#1e293b;margin-bottom:8px;">${bodyText}</div>
          ${teamText ? `<div style="font-size:12px;color:#334155;margin-bottom:8px;"><strong>救援力量：</strong>${teamText}</div>` : ''}
          <div style="font-size:11px;color:#64748b;">来源：${sourceText}</div>
        </div>
      `
    },
    drawTyphoonPath() {
      // === 精确空间 (Precise Spatial) ===
      // 台风路径数据来自气象观测，使用精确的经纬度坐标
      // Leaflet 坐标顺序: [lat, lng]
      
      if (!this.typhoonTrack || this.typhoonTrack.length === 0 || !this.map) return

      const pathLayer = this.typhoonPathLayer || this.map

      const currentTimeValue = new Date(this.currentTime).getTime()
      const filteredTrack = this.typhoonTrack.filter(point => {
        const pointTime = new Date(point.time).getTime()
        return pointTime <= currentTimeValue
      })

      if (filteredTrack.length === 0) return

      // ✅ 坐标顺序统一为 [lat, lng]
      const latlngs = filteredTrack.map(point => [point.lat, point.lng])

      if (this.enableTrackAnimation) {
        // ==================== 动画模式 ====================
        // 绘制历史路径和当前路径
        if (latlngs.length > 1) {
          // 历史路径（暗色、低透明度 25%）
          const historyLatlngs = latlngs.slice(0, -1)
          L.polyline(historyLatlngs, {
            color: '#CC5555',
            weight: 3,
            opacity: 0.25,
            dashArray: '5, 5',
            lineCap: 'round'
          }).addTo(pathLayer)

          // 当前路径（亮红色、完全不透明）
          const currentLatlngs = [latlngs[latlngs.length - 2], latlngs[latlngs.length - 1]]
          this.pathPolyline = L.polyline(currentLatlngs, {
            color: '#FF2D55',
            weight: 5,
            opacity: 1,
            dashArray: '',
            lineCap: 'round'
          }).addTo(pathLayer)
        } else if (latlngs.length === 1) {
          this.pathPolyline = L.polyline(latlngs, {
            color: '#FF3B30',
            weight: 4,
            opacity: 1,
            lineCap: 'round'
          }).addTo(pathLayer)
        }

        // 每一个轨迹数据点都渲染一个圆点，颜色按台风等级划分。
        filteredTrack.forEach((point, index) => {
          const color = this.getTyphoonLevelColor(point.level)
          const isCurrentPoint = index === filteredTrack.length - 1
          const radius = isCurrentPoint ? 7 : 4.8
          const windRadiiSummary = this.formatWindRadiiSummary(point.windRadii)
          const forecastSummary = this.formatForecastSummary(point.forecast)
          const bulletinText = Array.isArray(point.bulletin) && point.bulletin.length > 1
            ? String(point.bulletin[1] || '--')
            : '--'

          const marker = L.circleMarker([point.lat, point.lng], {
            radius,
            color,
            fillColor: color,
            fillOpacity: isCurrentPoint ? 0.98 : 0.82,
            weight: isCurrentPoint ? 2 : 1
          }).bindTooltip(`
            <div style="font-size: 12px; line-height: 1.5;">
              <strong>${this.getTyphoonLevelLabel(point.level)} (${point.level || '--'})</strong><br/>
              时间: ${new Date(point.time).toLocaleString()}<br/>
              位置: [${Number(point.lat).toFixed(3)}, ${Number(point.lng).toFixed(3)}]<br/>
              风速: ${Number.isFinite(Number(point.windSpeed)) ? Number(point.windSpeed) + ' m/s' : '--'}<br/>
              气压: ${Number.isFinite(Number(point.pressure)) ? Number(point.pressure) + ' hPa' : '--'}<br/>
              官方移向: ${String(point.moveDirection || '--')}<br/>
              官方移速: ${Number.isFinite(Number(point.moveSpeed)) ? Number(point.moveSpeed).toFixed(1) + ' km/h' : '--'}<br/>
              风圈: ${windRadiiSummary}<br/>
              预报: ${forecastSummary}<br/>
              公报: ${bulletinText}
            </div>
          `, {
            direction: 'top',
            offset: [0, -8],
            className: 'typhoon-track-tooltip'
          }).addTo(pathLayer)

          this.allMarkers.push(marker)

          if (isCurrentPoint) {
            L.circleMarker([point.lat, point.lng], {
              radius: 13,
              color,
              weight: 2,
              opacity: 0.45,
              fillOpacity: 0,
              interactive: false,
              className: 'current-tf-pulse'
            }).addTo(pathLayer)
          }
        })

        const currentPoint = filteredTrack[filteredTrack.length - 1]
        this.drawCurrentWindRadii(currentPoint, pathLayer)
        this.drawForecastTrack(currentPoint, pathLayer)
      } else {
        // ==================== 简单模式（仅显示轨迹线，无动画） ====================
        const simpleTrackColor = '#ff6b6b'
        // 绘制完整的轨迹线（统一样式，无动画特效）
        if (latlngs.length > 1) {
          L.polyline(latlngs, {
            color: simpleTrackColor,
            weight: 3,
            opacity: 0.8,
            dashArray: '',
            lineCap: 'round'
          }).addTo(pathLayer)
        }

        // 绘制每个轨迹点的圆点（统一小点，无脉冲）
        filteredTrack.forEach((point) => {
          const radius = 4
          const windRadiiSummary = this.formatWindRadiiSummary(point.windRadii)
          const forecastSummary = this.formatForecastSummary(point.forecast)
          const bulletinText = Array.isArray(point.bulletin) && point.bulletin.length > 1
            ? String(point.bulletin[1] || '--')
            : '--'

          const marker = L.circleMarker([point.lat, point.lng], {
            radius,
            color: simpleTrackColor,
            fillColor: simpleTrackColor,
            fillOpacity: 0.75,
            weight: 1
          }).bindTooltip(`
            <div style="font-size: 12px; line-height: 1.5;">
              <strong>${this.getTyphoonLevelLabel(point.level)} (${point.level || '--'})</strong><br/>
              时间: ${new Date(point.time).toLocaleString()}<br/>
              位置: [${Number(point.lat).toFixed(3)}, ${Number(point.lng).toFixed(3)}]<br/>
              风速: ${Number.isFinite(Number(point.windSpeed)) ? Number(point.windSpeed) + ' m/s' : '--'}<br/>
              气压: ${Number.isFinite(Number(point.pressure)) ? Number(point.pressure) + ' hPa' : '--'}<br/>
              官方移向: ${String(point.moveDirection || '--')}<br/>
              官方移速: ${Number.isFinite(Number(point.moveSpeed)) ? Number(point.moveSpeed).toFixed(1) + ' km/h' : '--'}<br/>
              风圈: ${windRadiiSummary}<br/>
              预报: ${forecastSummary}<br/>
              公报: ${bulletinText}
            </div>
          `, {
            direction: 'top',
            offset: [0, -8],
            className: 'typhoon-track-tooltip'
          }).addTo(pathLayer)

          this.allMarkers.push(marker)
        })
        
        // 简单模式下不绘制风圈和预报轨迹
      }
    },
    formatWindRadiiSummary(windRadii) {
      if (!Array.isArray(windRadii) || windRadii.length === 0) return '无'

      const parts = windRadii
        .filter((entry) => Array.isArray(entry) && entry.length >= 5)
        .map((entry) => {
          const code = String(entry[0] || '').trim()
          const quadrants = entry.slice(1, 5).map((v) => Number(v)).filter((v) => Number.isFinite(v) && v > 0)
          if (!code || quadrants.length === 0) return ''
          const avg = quadrants.reduce((sum, v) => sum + v, 0) / quadrants.length
          return `${code}≈${Math.round(avg)}km`
        })
        .filter(Boolean)

      return parts.length > 0 ? parts.join(' / ') : '无'
    },
    getForecastPoints(forecastObj) {
      const babj = forecastObj?.BABJ
      if (!Array.isArray(babj)) return []

      return babj
        .map((entry) => {
          if (!Array.isArray(entry) || entry.length < 8) return null
          const leadHours = Number(entry[0])
          const lng = Number(entry[2])
          const lat = Number(entry[3])
          if (!Number.isFinite(leadHours) || !Number.isFinite(lat) || !Number.isFinite(lng)) return null
          return {
            leadHours,
            timeRaw: String(entry[1] || ''),
            lng,
            lat,
            pressure: Number(entry[4]),
            windSpeed: Number(entry[5]),
            source: String(entry[6] || 'BABJ'),
            level: String(entry[7] || 'LOW')
          }
        })
        .filter(Boolean)
        .sort((a, b) => a.leadHours - b.leadHours)
    },
    formatForecastSummary(forecastObj) {
      const points = this.getForecastPoints(forecastObj)
      if (points.length === 0) return '无'
      return points.map((item) => `${item.leadHours}h-${item.level}`).join(' / ')
    },
    drawCurrentWindRadii(trackPoint, layer) {
      if (!trackPoint || !layer || !Array.isArray(trackPoint.windRadii)) return

      const colorByCode = {
        '30KTS': '#f59e0b',
        '50KTS': '#fb7185',
        '64KTS': '#ef4444'
      }

      trackPoint.windRadii
        .filter((entry) => Array.isArray(entry) && entry.length >= 5)
        .forEach((entry) => {
          const code = String(entry[0] || '').trim()
          const values = entry.slice(1, 5).map((v) => Number(v)).filter((v) => Number.isFinite(v) && v > 0)
          if (!code || values.length === 0) return

          const avgRadiusKm = values.reduce((sum, v) => sum + v, 0) / values.length
          const circle = L.circle([trackPoint.lat, trackPoint.lng], {
            radius: avgRadiusKm * 1000,
            color: colorByCode[code] || '#f97316',
            weight: 1,
            opacity: 0.55,
            fillColor: colorByCode[code] || '#f97316',
            fillOpacity: 0.08,
            dashArray: '6, 6',
            interactive: false
          }).addTo(layer)

          this.allMarkers.push(circle)
        })
    },
    drawForecastTrack(trackPoint, layer) {
      if (!trackPoint || !layer) return
      const forecastPoints = this.getForecastPoints(trackPoint.forecast)
      if (forecastPoints.length === 0) return

      const latlngs = [[trackPoint.lat, trackPoint.lng], ...forecastPoints.map((p) => [p.lat, p.lng])]
      const forecastLine = L.polyline(latlngs, {
        color: '#22d3ee',
        weight: 2,
        opacity: 0.85,
        dashArray: '6, 4',
        lineCap: 'round'
      }).addTo(layer)
      this.allMarkers.push(forecastLine)

      forecastPoints.forEach((item) => {
        const color = this.getTyphoonLevelColor(item.level)
        const marker = L.circleMarker([item.lat, item.lng], {
          radius: 4,
          color,
          fillColor: color,
          fillOpacity: 0.9,
          weight: 1
        }).bindPopup(`
          <div style="font-size: 12px; line-height: 1.5;">
            <strong>预报 ${item.leadHours}h</strong><br/>
            级别: ${this.getTyphoonLevelLabel(item.level)} (${item.level})<br/>
            位置: [${item.lat.toFixed(3)}, ${item.lng.toFixed(3)}]<br/>
            风速: ${Number.isFinite(item.windSpeed) ? item.windSpeed + ' m/s' : '--'}<br/>
            气压: ${Number.isFinite(item.pressure) ? item.pressure + ' hPa' : '--'}
          </div>
        `).addTo(layer)

        this.allMarkers.push(marker)
      })
    },
    getTyphoonLevelColor(levelCode) {
      const colorMap = {
        SuperTY: '#7f1d1d',
        STY: '#b91c1c',
        TY: '#ef4444',
        STS: '#f97316',
        TS: '#f59e0b',
        TD: '#facc15',
        LOW: '#60a5fa'
      }
      return colorMap[levelCode] || '#94a3b8'
    },
    getTyphoonLevelLabel(levelCode) {
      const labelMap = {
        SuperTY: '超强台风',
        STY: '强台风',
        TY: '台风',
        STS: '强热带风暴',
        TS: '热带风暴',
        TD: '热带低压',
        LOW: '低压'
      }
      return labelMap[levelCode] || '未分级'
    },
    
    // === 工具方法: 查找最近的轨迹点（按时间） ===
    findNearestTrackPoint(eventTime) {
      if (!this.typhoonTrack || this.typhoonTrack.length === 0) return null

      const exactMatch = this.typhoonTrack.find(trackPoint => trackPoint.time === eventTime)
      if (exactMatch) return exactMatch
      
      const eventTimeValue = new Date(eventTime).getTime()
      let nearestPoint = null
      let minTimeDiff = Infinity
      
      this.typhoonTrack.forEach(trackPoint => {
        const trackTimeValue = new Date(trackPoint.time).getTime()
        const timeDiff = Math.abs(eventTimeValue - trackTimeValue)
        
        if (timeDiff < minTimeDiff) {
          minTimeDiff = timeDiff
          nearestPoint = trackPoint
        }
      })
      
      return nearestPoint
    },
    
    drawEventMarkers() {
      // === 半抽象空间 / 影响空间 (Semi-abstract / Impact Spatial) ===
      // 事件点包含三种空间表达：
      // 1. 半抽象空间：事件中心点（投影到轨迹或使用原始坐标）
      // 2. 影响空间：影响范围圆（基于 impactRadius）
      // 3. 区域级空间：受灾区域、救援队位置（抽象表达，非精确街道坐标）
      
      if (!this.typhoonEvents || this.typhoonEvents.length === 0 || !this.map) return

      const currentTimeValue = new Date(this.currentTime).getTime()
      const filteredEvents = this.typhoonEvents.filter(event => {
        const eventTime = new Date(event.time).getTime()
        return eventTime <= currentTimeValue
      })

      this.drawRiskSurfaceLayer(filteredEvents)

      filteredEvents.forEach(event => {
        const color = this.eventTypeColorMap[event.type] || '#808080'
        
        // === 计算事件显示坐标 ===
        let displayLat = event.lat
        let displayLng = event.lng
        let spatialType = '半抽象空间'
        
        // DEBUG 模式：投影到最近轨迹点
        if (this.debugMode.enabled && this.debugMode.projectEventsToTrack) {
          const nearestTrack = this.findNearestTrackPoint(event.time)
          if (nearestTrack) {
            displayLat = nearestTrack.lat
            displayLng = nearestTrack.lng
            spatialType = '投影到轨迹 (Projected)'
          }
        }
        
        // ✅ 坐标顺序统一验证: [lat, lng]
        const eventLatLng = [displayLat, displayLng]

        // === 影响空间: 影响范围圆 ===
        if (this.debugMode.enabled ? this.debugMode.showImpactRadius : true) {
          const impactRadius = event.impactRadius / 1000
          const circle = L.circle(eventLatLng, {
            radius: impactRadius * 1000,
            color: color,
            weight: 1,
            opacity: 0.3,
            fillColor: color,
            fillOpacity: 0.1,
            interactive: false
          }).addTo(this.map)
          this.allMarkers.push(circle)
        }

        // === 区域级空间: 受灾区域（抽象表达） ===
        if (event.affectedAreas && event.affectedAreas.length > 0) {
          event.affectedAreas.forEach((area, index) => {
            const areaColor = this.getSeverityColor(area.severity)
            
            // 使用极坐标分布，而非随机位置
            const angle = (index / event.affectedAreas.length) * 2 * Math.PI
            const distance = 0.2 // 相对于事件中心的距离（度）
            const areaLat = displayLat + distance * Math.cos(angle)
            const areaLng = displayLng + distance * Math.sin(angle)
            
            // ✅ 坐标顺序: [lat, lng]
            const baseRadius = 9
            const hoverRadius = 11
            const areaMarker = L.circleMarker([areaLat, areaLng], {
              radius: baseRadius,
              color: areaColor,
              fillColor: areaColor,
              fillOpacity: 0.75,
              weight: 1,
              className: 'impact-area-marker'
            }).bindTooltip(`受影响区域: ${area.name}`, {
              direction: 'top',
              offset: [0, -8],
              opacity: 0.92,
              sticky: true
            }).bindPopup(`
              <div style="font-size: 11px;">
                <strong>${area.name}</strong><br/>
                严重程度: ${area.severity}<br/>
                ${area.population > 0 ? `受影响人口: ${area.population.toLocaleString()}人` : ''}<br/>
                <span style="color: #999; font-size: 9px;">空间类型: 区域级空间</span>
              </div>
            `).addTo(this.map)

            areaMarker.on('mouseover', () => {
              areaMarker.setRadius(hoverRadius)
              areaMarker.setStyle({
                fillOpacity: 0.95,
                weight: 2
              })
            })

            areaMarker.on('mouseout', () => {
              areaMarker.setRadius(baseRadius)
              areaMarker.setStyle({
                fillOpacity: 0.75,
                weight: 1
              })
            })

            this.allMarkers.push(areaMarker)
          })
        }

        // === 区域级空间: 救援队位置（抽象表达，非精确坐标） ===
        if (event.rescueTeams && event.rescueTeams.length > 0) {
          event.rescueTeams.forEach((team, index) => {
            // 使用事件中心附近的区域级位置，而非原始的精确坐标
            // 采用环形分布避免重叠
            const angle = (index / event.rescueTeams.length) * 2 * Math.PI + Math.PI / 4
            const distance = 0.35 // 比受灾区域稍远
            const teamLat = displayLat + distance * Math.cos(angle)
            const teamLng = displayLng + distance * Math.sin(angle)
            
            const teamIcon = L.divIcon({
              html: `
                <div style="
                  background-color: #10B981;
                  width: 20px;
                  height: 20px;
                  border-radius: 50%;
                  border: 2px solid white;
                  box-shadow: 0 2px 6px rgba(16, 185, 129, 0.6);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  color: white;
                  font-size: 12px;
                  font-weight: bold;
                  cursor: pointer;
                  transition: transform 0.18s ease, box-shadow 0.18s ease;
                ">🚑</div>
              `,
              iconSize: [20, 20],
              className: 'rescue-team-icon'
            })
            
            // ✅ 坐标顺序: [lat, lng] - 使用区域级抽象坐标
            const teamMarker = L.marker([teamLat, teamLng], {
              icon: teamIcon,
              riseOnHover: true,
              title: team.name
            }).bindTooltip(`救援队: ${team.name}`, {
              direction: 'top',
              offset: [0, -8],
              opacity: 0.92,
              sticky: true
            })
              .bindPopup(`
                <div style="font-size: 11px;">
                  <strong style="color: #10B981;">🚑 ${team.name}</strong><br/>
                  人数: ${team.personnel}人<br/>
                  <span style="color: #999; font-size: 9px;">空间类型: 区域级空间 (非精确坐标)</span>
                </div>
              `).addTo(this.map)
            this.allMarkers.push(teamMarker)
          })
        }

        // === 半抽象空间: 事件主标记 ===
        const isFocusedEvent = this.highlightedEventId
          ? this.highlightedEventId === event.id
          : ((this.activeEvents && this.activeEvents.length > 0)
            ? this.activeEvents.some(activeEvent => activeEvent.id === event.id)
            : (this.nearestEvent && this.nearestEvent.id === event.id))
        const markerSize = isFocusedEvent ? 28 : 24
        const markerOpacity = this.cinematicMode
          ? (isFocusedEvent ? 1 : 0.58)
          : (isFocusedEvent ? 1 : 0.88)
        
        const iconHtml = `
          <div style="
            background-color: ${color};
            width: ${markerSize}px;
            height: ${markerSize}px;
            border-radius: 50%;
            border: ${isFocusedEvent ? '3px' : '2px'} solid white;
            box-shadow: ${isFocusedEvent ? '0 0 16px rgba(255, 45, 85, 0.8)' : '0 2px 4px rgba(0,0,0,0.3)'};
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: ${markerOpacity};
            transition: opacity 0.45s ease, transform 0.32s ease;
            ${isFocusedEvent ? 'animation: event-pulse 2s ease-in-out infinite;' : ''}
          "></div>
        `

        const customIcon = L.divIcon({
          html: iconHtml,
          iconSize: [markerSize, markerSize],
          className: 'event-marker-icon'
        })

        // 构建 Popup 内容（包含 details 和空间类型说明）
        let popupContent = `
          <div style="font-size: 12px; width: 280px; max-height: 400px; overflow-y: auto;">
            <div style="font-weight: bold; margin-bottom: 8px; color: ${color}; font-size: 14px;">
              [${event.type.toUpperCase()}] ${event.title}
            </div>
            <div style="margin-bottom: 6px;">
              <strong>时间：</strong>${new Date(event.time).toLocaleString()}
            </div>
            <div style="margin-bottom: 6px;">
              <strong>原始位置：</strong>[${event.lat.toFixed(3)}, ${event.lng.toFixed(3)}]
            </div>
            <div style="margin-bottom: 6px;">
              <strong>显示位置：</strong>[${displayLat.toFixed(3)}, ${displayLng.toFixed(3)}]
            </div>
            <div style="margin-bottom: 6px;">
              <strong>空间类型：</strong><span style="color: ${spatialType.includes('投影') ? '#FF6B6B' : '#4D96FF'};">${spatialType}</span>
            </div>
            <div style="margin-bottom: 6px;">
              <strong>影响范围：</strong>${(event.impactRadius / 1000).toFixed(0)} km
            </div>
            <div style="border-top: 1px solid #e0e0e0; padding-top: 8px; margin-top: 8px; color: #555; line-height: 1.5;">
              ${event.content}
            </div>
        `

        // 添加 details 详细新闻
        if (event.details && event.details.length > 0) {
          popupContent += `
            <div style="border-top: 1px solid #e0e0e0; padding-top: 8px; margin-top: 8px;">
              <strong style="color: #333; font-size: 13px;">📰 相关新闻 (${event.details.length})</strong>
              <div style="margin-top: 6px;">
          `
          event.details.forEach((detail) => {
            popupContent += `
              <div style="margin-bottom: 8px; padding: 6px; background: #f9fafb; border-left: 3px solid ${color}; font-size: 11px;">
                <div style="font-weight: 600; color: ${color}; margin-bottom: 3px;">${detail.source}</div>
                <div style="color: #555; line-height: 1.4;">${detail.summary}</div>
                ${detail.link ? `<a href="${detail.link}" target="_blank" style="color: #3b82f6; text-decoration: none; font-size: 10px;">查看详情 →</a>` : ''}
              </div>
            `
          })
          popupContent += `</div></div>`
        }

        // 添加重建进度（如果有）
        if (event.reconstructionProgress) {
          popupContent += `
            <div style="border-top: 1px solid #e0e0e0; padding-top: 8px; margin-top: 8px;">
              <strong style="color: #333; font-size: 13px;">🔧 重建进度</strong>
              <div style="margin-top: 6px; font-size: 11px;">
          `
          const progressItems = {
            power: '电力',
            water: '供水',
            transport: '交通',
            communication: '通讯',
            housing: '住房',
            agriculture: '农业'
          }
          
          for (const [key, label] of Object.entries(progressItems)) {
            if (event.reconstructionProgress[key] !== undefined) {
              const progress = event.reconstructionProgress[key]
              popupContent += `
                <div style="margin-bottom: 4px;">
                  <span style="display: inline-block; width: 50px;">${label}:</span>
                  <div style="display: inline-block; width: 100px; height: 12px; background: #e5e7eb; border-radius: 6px; vertical-align: middle; overflow: hidden;">
                    <div style="width: ${progress}%; height: 100%; background: linear-gradient(90deg, #10B981 0%, #34D399 100%);"></div>
                  </div>
                  <span style="margin-left: 8px; color: #666;">${progress}%</span>
                </div>
              `
            }
          }
          popupContent += `</div></div>`
        }

        popupContent += `</div>`

        // ✅ 坐标顺序: [lat, lng] - 使用计算后的显示坐标
        const marker = L.marker([displayLat, displayLng], { icon: customIcon })
          .bindPopup(popupContent, { maxWidth: 300 })
          .addTo(this.map)

        marker.on('click', () => {
          try {
            marker.openPopup()
          } catch (e) {
            // ignore if popup cannot be opened for some reason
          }
          this.$emit('selectEvent', event)
        })

        this.eventMarkers.push(marker)
        this.allMarkers.push(marker)
      })
    },
    getSeverityColor(severity) {
      // === 工具方法: 严重程度到颜色映射 ===
      const colorMap = {
        '极严重': '#DC2626',
        '严重': '#F59E0B',
        '中等': '#10B981',
        '轻微': '#3B82F6',
        '重建中': '#6B7280'
      }
      return colorMap[severity] || '#808080'
    }
  }
}
</script>

<style scoped>
.map-container {
  position: fixed;
  top: 64px;
  left: 0;
  right: 0;
  bottom: 0;
  background: #0a0a12;
  overflow: hidden;
}

.map-canvas {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #0a0a12 0%, #1a1a2e 50%, #16213e 100%);
  position: relative;
}

.right-ui-layer {
  position: fixed;
  right: 20px;
  top: 80px;
  bottom: 40px;
  z-index: 1500;
  width: clamp(320px, 24vw, 380px);
  display: flex;
  flex-direction: column;
  gap: 15px;
  align-items: stretch;
  pointer-events: none;
}

.narrative-panel {
  position: relative;
  z-index: 1;
  width: 100%;
  max-height: min(42vh, 380px);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex-shrink: 0;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(16, 16, 28, 0.8);
  backdrop-filter: blur(10px);
  box-shadow: 0 12px 28px rgba(2, 6, 23, 0.28);
  pointer-events: auto;
}

.side-panel-container {
  position: relative;
  z-index: 1;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  pointer-events: auto;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(16, 16, 28, 0.8);
  backdrop-filter: blur(10px);
  box-shadow: 0 12px 28px rgba(2, 6, 23, 0.28);
}

.narrative-panel,
.side-panel-container {
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
}

.narrative-panel:hover,
.side-panel-container:hover {
  scrollbar-color: rgba(255, 255, 255, 0.22) transparent;
}

.narrative-panel::-webkit-scrollbar,
.side-panel-container::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}

.narrative-panel::-webkit-scrollbar-track,
.side-panel-container::-webkit-scrollbar-track {
  background: transparent;
}

.narrative-panel::-webkit-scrollbar-thumb,
.side-panel-container::-webkit-scrollbar-thumb {
  background: transparent;
  border-radius: 10px;
}

.narrative-panel:hover::-webkit-scrollbar-thumb,
.side-panel-container:hover::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
}

.narrative-card {
  padding: 12px;
  border-radius: 12px;
  border: 1px solid rgba(147, 197, 253, 0.28);
  background: rgba(25, 25, 25, 0.55);
  backdrop-filter: blur(8px);
  color: #ffffff;
  box-shadow: 0 0 12px rgba(147, 197, 253, 0.12);
  transition: box-shadow 0.25s ease, border-color 0.25s ease;
}

.narrative-card:hover {
  box-shadow: 0 0 20px rgba(147, 197, 253, 0.22);
  border-color: rgba(147, 197, 253, 0.42);
}

::v-deep .leaflet-control-layers {
  display: none;
}

::v-deep .leaflet-overlay-pane {
  z-index: 450;
}

::v-deep .leaflet-marker-pane {
  z-index: 500;
}

.narrative-title {
  font-size: 13px;
  font-weight: 700;
  color: #FFD700;
}

.narrative-subtitle {
  margin-top: 4px;
  font-size: 11px;
  color: #e5e7eb;
}

.basemap-switcher {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.basemap-label {
  font-size: 11px;
  color: #d1d5db;
}

.basemap-dot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid rgba(148, 163, 184, 0.5);
  background: rgba(15, 23, 42, 0.8);
  color: #f9fafb;
  font-size: 11px;
  cursor: pointer;
}

.basemap-dot.active {
  border-color: rgba(255, 215, 0, 0.9);
  color: #FFD700;
  box-shadow: 0 0 8px rgba(255, 215, 0, 0.35);
}

.typhoon-level-legend {
  margin-top: 12px;
  padding: 8px 10px;
  background: rgba(15, 23, 42, 0.5);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 8px;
}

.legend-title {
  font-size: 11px;
  font-weight: 600;
  color: #9ca3af;
  margin-bottom: 8px;
}

.legend-items {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.legend-text {
  font-size: 10px;
  color: #d1d5db;
}

.module-block {
  margin-top: 10px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  border-radius: 10px;
  overflow: hidden;
}

.module-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: none;
  padding: 8px 10px;
  background: rgba(31, 41, 55, 0.75);
  color: #FFD700;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.module-content {
  padding: 8px 10px 10px;
}

.module-news-list {
  display: grid;
  gap: 8px;
}

.news-item {
  border-left: 2px solid rgba(255, 215, 0, 0.6);
  padding-left: 8px;
}

.news-time {
  font-size: 10px;
  color: #cbd5e1;
}

.news-title {
  font-size: 11px;
  color: #ffffff;
  line-height: 1.35;
}

.narrative-actions {
  margin-top: 10px;
  display: grid;
  gap: 8px;
}

.narrative-btn {
  appearance: none;
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.75);
  color: #ffffff;
  font-size: 12px;
  font-weight: 600;
  text-align: left;
  padding: 8px 10px;
  cursor: pointer;
}

.narrative-btn.active {
  border-color: rgba(255, 215, 0, 0.72);
  background: rgba(250, 204, 21, 0.16);
  color: #FFD700;
}

.narrative-kv {
  margin-top: 8px;
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #f3f4f6;
}

.narrative-kv strong {
  color: #FFD700;
  font-weight: 600;
}

.risk-score-bar {
  margin-top: 8px;
  height: 6px;
  border-radius: 999px;
  background: rgba(51, 65, 85, 0.65);
  overflow: hidden;
}

.risk-score-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #22c55e 0%, #eab308 45%, #ef4444 100%);
  transition: width 0.35s ease;
}

.loss-chart {
  margin-top: 10px;
  display: grid;
  gap: 8px;
}

.loss-bar-row {
  display: grid;
  grid-template-columns: 46px 1fr 40px;
  gap: 8px;
  align-items: center;
}

.loss-label,
.loss-value {
  font-size: 11px;
  color: #cbd5e1;
}

.loss-track {
  height: 10px;
  background: rgba(51, 65, 85, 0.65);
  border-radius: 999px;
  overflow: hidden;
}

.loss-bar {
  height: 100%;
  border-radius: 999px;
}

.loss-bar-10 {
  background: linear-gradient(90deg, #7a431d 0%, #ffd700 70%, #ffffff 100%);
}

.loss-bar-11 {
  background: linear-gradient(90deg, #7f1d1d 0%, #ef4444 75%, #fca5a5 100%);
}

.loss-note {
  margin-top: 10px;
  font-size: 11px;
  line-height: 1.45;
  color: #94a3b8;
}

.night-focus-mask {
  position: absolute;
  inset: 0;
  z-index: 1020;
  pointer-events: none;
  background: radial-gradient(circle at 52% 53%, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.16) 70%, rgba(0, 0, 0, 0.28) 100%);
}

::v-deep .compare-control .compare-btn {
  background: rgba(10, 10, 16, 0.92);
  color: #f8fafc;
  border: 1px solid rgba(148, 163, 184, 0.5);
  border-radius: 4px;
  padding: 6px 10px;
  font-size: 12px;
  cursor: pointer;
}

::v-deep .compare-control .compare-btn:hover {
  background: rgba(30, 41, 59, 0.92);
}

.coordinate-panel {
  position: relative;
  z-index: 1;
  width: 100%;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(22, 22, 34, 0.84);
  backdrop-filter: blur(10px);
  color: #e5e7eb;
  pointer-events: none;
}

.coordinate-title {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.3px;
  color: #f3f4f6;
  margin-bottom: 8px;
}

.coordinate-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.coordinate-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.coordinate-label {
  font-size: 12px;
  color: #9ca3af;
}

.coordinate-value {
  font-size: 12px;
  font-weight: 600;
  color: #60a5fa;
  font-variant-numeric: tabular-nums;
}

.coordinate-empty {
  font-size: 12px;
  color: #9ca3af;
  line-height: 1.4;
}

.situation-panel {
  position: relative;
  z-index: 1;
  width: 100%;
  min-width: 0;
  max-height: none;
  padding: 0;
  border-radius: 10px;
  color: #e5e7eb;
  overflow: visible;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  margin-bottom: 10px;
}

.panel-toggles {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}

.panel-title {
  font-size: 13px;
  font-weight: 700;
  color: #f3f4f6;
}

.risk-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #cbd5e1;
  cursor: pointer;
}

.panel-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.panel-item {
  padding: 8px;
  border-radius: 8px;
  background: rgba(148, 163, 184, 0.08);
  border: 1px solid rgba(148, 163, 184, 0.15);
}

.panel-item.full-width {
  grid-column: 1 / -1;
}

.item-label {
  font-size: 11px;
  color: #94a3b8;
  margin-bottom: 4px;
}

.item-value {
  font-size: 12px;
  font-weight: 600;
  color: #f8fafc;
}

.panel-section {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(148, 163, 184, 0.2);
}

.section-title {
  font-size: 12px;
  font-weight: 700;
  color: #f1f5f9;
  margin-bottom: 6px;
}

.section-note {
  font-size: 11px;
  line-height: 1.4;
  color: #94a3b8;
  margin-top: 4px;
}

.event-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.event-item {
  padding: 8px;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: rgba(30, 41, 59, 0.5);
}

.event-item-title {
  font-size: 12px;
  color: #e2e8f0;
  font-weight: 600;
}

.event-item-meta {
  margin-top: 3px;
  font-size: 11px;
  color: #93c5fd;
}

.phase-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 6px;
}

.phase-chip {
  height: 30px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(15, 23, 42, 0.7);
  color: #cbd5e1;
  font-size: 12px;
  cursor: pointer;
}

.phase-chip.active {
  border-color: rgba(34, 197, 94, 0.65);
  background: rgba(34, 197, 94, 0.2);
  color: #dcfce7;
}

.day-picks {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.day-chip {
  height: 28px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  background: rgba(30, 41, 59, 0.7);
  color: #e2e8f0;
  font-size: 11px;
  cursor: pointer;
}

.day-chip.active {
  border-color: rgba(250, 204, 21, 0.75);
  background: rgba(250, 204, 21, 0.2);
  color: #fef9c3;
}

.phase-note {
  margin-top: 8px;
  font-size: 11px;
  color: #93c5fd;
}

.day-select-row {
  margin-top: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 11px;
  color: #cbd5e1;
}

.day-select-row select {
  flex: 1;
  min-width: 0;
  height: 30px;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(15, 23, 42, 0.75);
  color: #e2e8f0;
  padding: 0 8px;
}

.log-table-wrapper {
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 8px;
  overflow-x: hidden;
  overflow-y: auto;
  background: rgba(15, 23, 42, 0.5);
}

.log-table {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
  font-size: 11px;
}

.log-table th,
.log-table td {
  padding: 6px 7px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.16);
  text-align: left;
  color: #cbd5e1;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.log-table th {
  background: rgba(30, 41, 59, 0.72);
  color: #e2e8f0;
  font-weight: 600;
}

.log-table tr:last-child td {
  border-bottom: none;
}

.table-empty {
  text-align: center !important;
  color: #94a3b8 !important;
}

.section-highlight {
  font-size: 12px;
  line-height: 1.45;
  color: #e2e8f0;
}

.risk-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 8px;
}

.risk-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 6px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  font-size: 11px;
  color: #dbeafe;
}

.risk-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.risk-dot-high {
  background: #f43f5e;
}

.risk-dot-medium {
  background: #f59e0b;
}

.risk-dot-low {
  background: #22c55e;
}

.point-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: #cbd5e1;
  margin-bottom: 6px;
  line-height: 1.35;
}

.point-item:last-child {
  margin-bottom: 0;
}

.point-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  flex-shrink: 0;
}

.point-badge-affected {
  background: #f59e0b;
  border: 1px solid #f8fafc;
}

.point-badge-rescue {
  background: #10b981;
  border: 1px solid #f8fafc;
  font-size: 10px;
}

.risk-high {
  color: #f43f5e;
}

.risk-medium {
  color: #f59e0b;
}

.risk-low {
  color: #22c55e;
}

.risk-stable {
  color: #60a5fa;
}

::v-deep .impact-area-marker {
  cursor: pointer;
}

::v-deep .rescue-team-icon {
  cursor: pointer;
}

::v-deep .rescue-team-icon:hover > div {
  transform: scale(1.12);
  box-shadow: 0 4px 10px rgba(16, 185, 129, 0.75);
}

::v-deep .event-ripple-circle {
  animation: event-ripple-pulse 2.2s ease-in-out infinite;
}

::v-deep .rescue-flow-arrow {
  pointer-events: auto;
}

::v-deep .rescue-flow-arrow-shape {
  width: 0;
  height: 0;
  border-top: 8px solid transparent;
  border-bottom: 8px solid transparent;
  border-left: 12px solid #60a5fa;
  filter: drop-shadow(0 0 6px rgba(96, 165, 250, 0.65));
  animation: rescue-arrow-breath 1.1s ease-in-out infinite;
}

::v-deep .rescue-flow-label-wrap {
  pointer-events: auto;
}

::v-deep .rescue-flow-label {
  display: inline-block;
  max-width: 210px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid rgba(96, 165, 250, 0.55);
  background: rgba(15, 23, 42, 0.84);
  color: #dbeafe;
  font-size: 11px;
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.35);
}

@keyframes rescue-arrow-breath {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.85;
  }
  50% {
    transform: scale(1.14);
    opacity: 1;
  }
}

@keyframes event-ripple-pulse {
  0%,
  100% {
    opacity: 0.7;
  }
  50% {
    opacity: 1;
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .map-container {
    top: 56px;
    bottom: 0;
  }

  .narrative-panel {
    top: 68px;
    left: 10px;
    width: min(260px, calc(100vw - 20px));
    max-height: calc(100vh - 200px);
  }

  .side-panel-container {
    display: none;
  }
  
  .marker-dot {
    width: 16px;
    height: 16px;
  }
  
  .marker-label {
    font-size: 10px;
    padding: 2px 6px;
  }
  
  .current-marker {
    width: 14px;
    height: 14px;
  }
}

@media (max-width: 480px) {
  .narrative-panel {
    left: 8px;
    top: 64px;
    width: calc(100vw - 16px);
    max-height: calc(100vh - 190px);
  }

  .typhoon-path-demo,
  .event-markers-demo {
    display: none;
  }
}

/* 事件 Marker 脉冲动画 */
@keyframes event-pulse {
  0%, 100% {
    box-shadow: 0 0 16px rgba(255, 45, 85, 0.8);
  }
  50% {
    box-shadow: 0 0 24px rgba(255, 45, 85, 1);
  }
}

/* 台风轨迹点悬停提示样式 */
.typhoon-track-tooltip {
  background: rgba(30, 30, 40, 0.95);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
  padding: 10px 14px;
  color: #e2e8f0;
  font-family: inherit;
  max-width: 280px;
}

.typhoon-track-tooltip::before {
  border-top-color: rgba(255, 255, 255, 0.15) !important;
}

.leaflet-tooltip.typhoon-track-tooltip.top {
  margin-top: -12px;
}
</style>
