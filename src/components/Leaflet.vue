<template>
  <div class="leaflet-wrapper">
    <!-- 顶部标题栏 -->
    <HeaderBar
      :currentTimeDisplay="currentTimeDisplay"
      :currentStats="currentTrackStats"
      :replayMeta="replayMeta"
      :panelVisibility="panelVisibility"
      :narrativeSubmodules="narrativeSubmodules"
      :impactSubmodules="impactSubmodules"
      :timelineSubmodules="timelineSubmodules"
      :autoPlayMode="isPlaying"
      :playbackSpeed="playbackSpeed"
      :activeChapterTitle="activeChapterTitle"
      :activeChapterSubtitle="activeChapterSubtitle"
      @toggle-panel="handlePanelToggle"
      @dropdown-action="handleDropdownAction"
    />
    
    <!-- 地图主视区 -->
    <MapContainer 
      :typhoonTrack="typhoonTrack"
      :typhoonEvents="typhoonEvents"
      :currentTime="currentTime"
      :nearestEvent="nearestEvent"
      :activeEvents="activeEvents"
      :timelineIndex="timelineIndex"
      :highlightedEventId="highlightedEventId"
      :reviewStats="reviewStats"
      :alertLogs="visibleAlertLogs"
      :sourceCredibilityMap="sourceCredibilityMap"
      :showNarrativePanel="panelVisibility.narrative"
      :showImpactPanel="panelVisibility.impact"
      :narrativeSubmodules="narrativeSubmodules"
      :narrativeActiveModule="narrativeActiveModule"
      :impactSubmodules="impactSubmodules"
      :cinematicScene="activeCinematicScene"
      :cinematicMode="isPlaying"
      @selectEvent="handleSelectEvent"
      @setNarrativeActiveModule="val => narrativeActiveModule = val"
    />
    
    <!-- 左侧事件时间线 -->
    <EventTimeline
      v-if="panelVisibility.timeline"
      :events="typhoonEvents"
      :currentTime="currentTime"
      :nearestEvent="nearestEvent"
      :activeEvents="activeEvents"
      :highlightedEventId="highlightedEventId"
      :filterState="eventFilters"
      :typeOptions="eventTypeOptions"
      :sourceOptions="eventSourceOptions"
      :sourceCredibilityMap="sourceCredibilityMap"
      :timelineSubmodules="timelineSubmodules"
      :alertLogs="visibleAlertLogs"
      @selectEvent="handleSelectEvent"
      @filterChange="handleEventFilterChange"
    />
    
    <!-- 底部时间轴控制器 -->
    <TimelineControl
      :timelineIndex.sync="timelineIndex"
      :timelineSteps="timelineSteps"
      :currentTime="currentTime"
      :minTime="minTime"
      :maxTime="maxTime"
      :isPlaying="isPlaying"
      :playbackSpeed="playbackSpeed"
      :keyEvents="keyEvents"
      @playPause="toggleTimelinePlay"
      @cycleSpeed="cyclePlaybackSpeed"
      @update:timelineIndex="handleTimelineIndexUpdate"
    />
  </div>
</template>

<script>
import HeaderBar from './HeaderBar.vue'
import MapContainer from './MapContainer.vue'
import EventTimeline from './EventTimeline.vue'
import TimelineControl from './TimelineControl.vue'
import { loadReplayBundle } from '@/services/replayDataService'

export default {
  name: 'LeafletMap',
  components: {
    HeaderBar,
    MapContainer,
    EventTimeline,
    TimelineControl
  },
  data() {
    return {
      typhoonTrack: [],
      baseTyphoonEvents: [],
      typhoonEvents: [],
      unifiedTimeline: [], // 统一时间轴数组
      currentTime: '',
      minTime: '',
      maxTime: '',
      timelineSteps: 0,
      timelineIndex: 0,
      isPlaying: false,
      playTimer: null,
      playbackSpeed: 1,
      chapterScript: [],
      activeChapterKey: '',
      activeChapterTitle: '',
      activeChapterSubtitle: '',
      activeCinematicScene: null,
      nearestEvent: null,
      activeEvents: [],
      highlightedEventId: null,
      sourceCredibilityMap: {},
      alertLogs: [],
      disasterStats: [],
      rainfallGridMeta: null,
      nightLightMeta: null,
      dataSource: 'pending',
      panelVisibility: {
        narrative: true,
        timeline: true,
        impact: true
      },
      narrativeSubmodules: {
        status: true,
        track: true,
        chart: true
      },
      narrativeActiveModule: 'status',
      impactSubmodules: {
        disaster: true,    // 灾害统计
        nightlight: true,  // 夜光影像
        risk: true         // 风险等级
      },
      timelineSubmodules: {
        events: true,      // 事件列表
        logs: true,        // 预警响应
        credibility: true  // 来源评估
      },
      eventFilters: {
        type: 'all',
        source: 'all',
        keyword: ''
      }
    }
  },
  created() {
    // 大体量原始数组放到非响应式实例属性，避免深层依赖追踪开销。
    this.rainfallFrames = []
    this.rainfallGridCells = []
    this.nightLightCells = []
  },
  mounted() {
    this.loadTyphoonData()
  },
  beforeDestroy() {
    this.stopTimelinePlay()
  },
  computed: {
    minTimeDisplay() {
      if (!this.minTime) return ''
      return new Date(this.minTime).toLocaleString('zh-CN', { 
        month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' 
      })
    },
    maxTimeDisplay() {
      if (!this.maxTime) return ''
      return new Date(this.maxTime).toLocaleString('zh-CN', { 
        month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' 
      })
    },
    currentTimeDisplay() {
      if (!this.currentTime) return '未设置'
      return new Date(this.currentTime).toLocaleString('zh-CN')
    },
    currentTrackPoint() {
      if (!this.typhoonTrack || this.typhoonTrack.length === 0 || !this.currentTime) return null
      const currentTimeValue = new Date(this.currentTime).getTime()
      const points = this.typhoonTrack.filter((point) => new Date(point.time).getTime() <= currentTimeValue)
      return points.length > 0 ? points[points.length - 1] : null
    },
    previousTrackPoint() {
      if (!this.typhoonTrack || this.typhoonTrack.length === 0 || !this.currentTime) return null
      const currentTimeValue = new Date(this.currentTime).getTime()
      const points = this.typhoonTrack.filter((point) => new Date(point.time).getTime() <= currentTimeValue)
      if (points.length < 2) return null
      return points[points.length - 2]
    },
    currentTrackStats() {
      if (!this.currentTrackPoint) {
        return {
          levelLabel: '--',
          windSpeed: null,
          pressure: null,
          moveSpeed: null,
          moveDirection: '--'
        }
      }

      const windSpeed = Number(this.currentTrackPoint.windSpeed)
      const pressure = Number(this.currentTrackPoint.pressure)
      const hasWindSpeed = Number.isFinite(windSpeed) && windSpeed > 0
      const hasPressure = Number.isFinite(pressure) && pressure > 0

      let moveSpeed = null
      let moveDirection = '--'

      const officialMoveSpeed = Number(this.currentTrackPoint.moveSpeed)
      const officialMoveDirection = String(this.currentTrackPoint.moveDirection || '').trim()
      if (Number.isFinite(officialMoveSpeed) && officialMoveSpeed >= 0) {
        moveSpeed = officialMoveSpeed
      }
      if (officialMoveDirection) {
        moveDirection = officialMoveDirection
      }

      if (this.previousTrackPoint) {
        const timeGapMs = new Date(this.currentTrackPoint.time).getTime() - new Date(this.previousTrackPoint.time).getTime()
        if (timeGapMs > 0 && moveSpeed === null) {
          const hours = timeGapMs / (1000 * 60 * 60)
          const distance = this.getDistanceKm(this.previousTrackPoint, this.currentTrackPoint)
          moveSpeed = distance / hours
          if (moveDirection === '--') {
            moveDirection = this.getDirectionLabel(this.previousTrackPoint, this.currentTrackPoint)
          }
        }
      }

      return {
        levelLabel: this.getLevelLabel(this.currentTrackPoint.level),
        windSpeed: hasWindSpeed ? windSpeed : null,
        pressure: hasPressure ? pressure : null,
        moveSpeed,
        moveDirection
      }
    },
    replayMeta() {
      return {
        stageLabel: this.replayStageLabel,
        evidenceCoverage: this.evidenceCoverage,
        latestUpdate: this.currentTime,
        dataSource: this.dataSource
      }
    },
    currentDisasterStat() {
      if (!Array.isArray(this.disasterStats) || this.disasterStats.length === 0 || !this.currentTime) {
        return null
      }

      const currentTimeValue = new Date(this.currentTime).getTime()
      const candidates = this.disasterStats.filter((item) => new Date(item.time).getTime() <= currentTimeValue)
      if (candidates.length === 0) return null
      return candidates[candidates.length - 1]
    },
    reviewStats() {
      const stat = this.currentDisasterStat || {}
      return {
        impactedCities: Number(stat.impactedCities || 0),
        transferredPeople: Number(stat.transferredPeople || 0),
        suspensionCount: Number(stat.suspensionCount || 0),
        casualties: Number(stat.casualties || 0),
        estimatedLoss: Number(stat.estimatedLoss || 0)
      }
    },
    visibleAlertLogs() {
      if (!Array.isArray(this.alertLogs) || this.alertLogs.length === 0 || !this.currentTime) return []
      const currentTimeValue = new Date(this.currentTime).getTime()
      return this.alertLogs
        .filter((item) => new Date(item.time).getTime() <= currentTimeValue)
        .slice(-6)
    },
    replayStageLabel() {
      if (!this.unifiedTimeline || this.unifiedTimeline.length === 0 || this.timelineSteps <= 0) {
        return '阶段待定'
      }

      const progress = this.timelineIndex / this.timelineSteps
      if (progress < 0.25) return '生成发展阶段'
      if (progress < 0.5) return '逼近登陆阶段'
      if (progress < 0.75) return '影响扩散阶段'
      return '减弱善后阶段'
    },
    evidenceCoverage() {
      if (!Array.isArray(this.typhoonEvents) || this.typhoonEvents.length === 0 || !this.currentTime) return 0

      const currentTimeValue = new Date(this.currentTime).getTime()
      const scopedEvents = this.typhoonEvents.filter((event) => new Date(event.time).getTime() <= currentTimeValue)
      if (scopedEvents.length === 0) return 0

      const withSourceTag = scopedEvents.filter((event) => this.sourceCredibilityMap[event.source])
      return Math.round((withSourceTag.length / scopedEvents.length) * 100)
    },
    nearestEventByTime() {
      if (!this.typhoonEvents || this.typhoonEvents.length === 0) return null
      const currentTimeValue = new Date(this.currentTime).getTime()
      let nearest = null
      let minDiff = Infinity
      this.typhoonEvents.forEach(event => {
        const eventTime = new Date(event.time).getTime()
        if (eventTime <= currentTimeValue) {
          const diff = currentTimeValue - eventTime
          if (diff < minDiff) {
            minDiff = diff
            nearest = event
          }
        }
      })
      return nearest
    },
    activeEventsByTime() {
      if (!this.typhoonEvents || this.typhoonEvents.length === 0 || !this.currentTime) return []
      return this.typhoonEvents.filter((event) => event.time === this.currentTime)
    },
    eventTypeOptions() {
      const labelMap = {
        formation: '形成',
        warning: '警报',
        alert: '预警',
        approaching: '逼近',
        landfall: '登陆',
        disaster: '灾情',
        weakening: '减弱',
        dissipate: '消散',
        assessment: '评估',
        reconstruction: '重建'
      }

      const types = Array.from(new Set((this.baseTyphoonEvents || []).map((event) => event.type))).filter(Boolean)
      return types.map((type) => ({
        value: type,
        label: labelMap[type] || type
      }))
    },
    eventSourceOptions() {
      const sources = Array.from(new Set((this.baseTyphoonEvents || []).map((event) => event.source))).filter(Boolean)
      return sources
        .slice()
        .sort((a, b) => a.localeCompare(b, 'zh-CN'))
        .map((source) => ({
          value: source,
          label: source
        }))
    },
    keyEvents() {
      if (!this.typhoonTrack || this.typhoonTrack.length === 0 || !this.minTime || !this.maxTime) return []

      const minTimeValue = new Date(this.minTime).getTime()
      const maxTimeValue = new Date(this.maxTime).getTime()
      const timeRange = Math.max(1, maxTimeValue - minTimeValue)
      const currentTimeValue = new Date(this.currentTime).getTime()
      const nodes = []

      const addNode = (node) => {
        if (!node || !node.time) return
        const timeValue = new Date(node.time).getTime()
        if (!Number.isFinite(timeValue)) return
        const position = ((timeValue - minTimeValue) / timeRange) * 100
        const index = this.unifiedTimeline.indexOf(node.time)
        const normalizedIndex = index >= 0 ? index : 0
        const positionByIndex = this.timelineSteps > 0
          ? (normalizedIndex / this.timelineSteps) * 100
          : position
        nodes.push({
          ...node,
          id: node.id || `${node.kind || 'node'}-${node.time}-${node.title || ''}`,
          index: normalizedIndex,
          position: Math.max(0, Math.min(100, positionByIndex)),
          isActive: Math.abs(timeValue - currentTimeValue) <= 60 * 60 * 1000
        })
      }

      const sortedTrack = this.typhoonTrack
        .slice()
        .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())

      const firstPoint = sortedTrack[0]
      if (firstPoint) {
        addNode({
          kind: 'phase',
          time: firstPoint.time,
          title: '台风生成',
          shortTitle: '生成',
          type: 'formation'
        })
      }

      let lastIntensityNodeTime = firstPoint ? new Date(firstPoint.time).getTime() : 0
      for (let i = 1; i < sortedTrack.length; i += 1) {
        const prev = sortedTrack[i - 1]
        const current = sortedTrack[i]
        if (prev.level !== current.level) {
          const currentValue = new Date(current.time).getTime()
          if (Number.isFinite(lastIntensityNodeTime) && currentValue - lastIntensityNodeTime < 6 * 60 * 60 * 1000) {
            continue
          }
          addNode({
            kind: 'intensity',
            time: current.time,
            title: `形态变化: ${this.getLevelLabel(prev.level)} → ${this.getLevelLabel(current.level)}`,
            shortTitle: `${this.getLevelLabel(current.level)}`,
            type: String(current.level || '').toLowerCase()
          })
          lastIntensityNodeTime = currentValue
        }
      }

      const keyTypes = ['formation', 'approaching', 'warning', 'alert', 'landfall', 'disaster', 'weakening', 'dissipate']
      const majorEvents = (this.typhoonEvents || [])
        .filter((event) => keyTypes.includes(event.type))
        .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())

      let lastEventNodeTime = 0
      majorEvents.forEach((event) => {
        const eventTimeValue = new Date(event.time).getTime()
        if (Number.isFinite(lastEventNodeTime) && eventTimeValue - lastEventNodeTime < 3 * 60 * 60 * 1000) {
          return
        }
        addNode({
          kind: 'event',
          time: event.time,
          title: event.title || this.getEventTypeLabel(event.type),
          shortTitle: this.getEventTypeLabel(event.type),
          type: event.type
        })
        lastEventNodeTime = eventTimeValue
      })

      const deduped = []
      const seen = new Set()
      nodes
        .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
        .forEach((node) => {
          const key = `${node.time}-${node.shortTitle}-${node.kind}`
          if (seen.has(key)) return
          seen.add(key)
          deduped.push(node)
        })

      return deduped
    },
    playIntervalMs() {
      const normalizedSpeed = Number(this.playbackSpeed)
      if (!Number.isFinite(normalizedSpeed) || normalizedSpeed <= 0) {
        return 1200
      }
      return Math.max(280, Math.round(1200 / normalizedSpeed))
    }
  },
  watch: {
    playbackSpeed() {
      if (!this.isPlaying) return
      this.stopTimelinePlay()
      this.startTimelinePlay()
    }
  },
  methods: {
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
    handlePanelToggle(panelKey) {
      if (panelKey !== 'narrative' && panelKey !== 'timeline' && panelKey !== 'impact') {
        return
      }

      this.panelVisibility = {
        ...this.panelVisibility,
        [panelKey]: !this.panelVisibility[panelKey]
      }
    },
    handleDropdownAction({ panel, action }) {
      if (panel === 'narrative') {
        if (action === 'status' || action === 'track' || action === 'chart') {
          this.narrativeSubmodules[action] = !this.narrativeSubmodules[action]
          if (this.narrativeSubmodules[action]) {
            this.panelVisibility.narrative = true
            this.narrativeActiveModule = action
          } else {
            const allClosed = !this.narrativeSubmodules.status && !this.narrativeSubmodules.track && !this.narrativeSubmodules.chart
            if (allClosed) {
              this.panelVisibility.narrative = false
            }
          }
        }
      } else if (panel === 'impact') {
        if (action === 'disaster' || action === 'nightlight' || action === 'risk') {
          this.impactSubmodules[action] = !this.impactSubmodules[action]
          if (this.impactSubmodules[action]) {
            this.panelVisibility.impact = true
          } else {
            const allClosed = !this.impactSubmodules.disaster && !this.impactSubmodules.nightlight && !this.impactSubmodules.risk
            if (allClosed) {
              this.panelVisibility.impact = false
            }
          }
        }
      } else if (panel === 'timeline') {
        if (action === 'events' || action === 'logs' || action === 'credibility') {
          this.timelineSubmodules[action] = !this.timelineSubmodules[action]
          if (this.timelineSubmodules[action]) {
            this.panelVisibility.timeline = true
          } else {
            const allClosed = !this.timelineSubmodules.events && !this.timelineSubmodules.logs && !this.timelineSubmodules.credibility
            if (allClosed) {
              this.panelVisibility.timeline = false
            }
          }
        }
      }
    },
    getDirectionLabel(from, to) {
      const dLat = to.lat - from.lat
      const dLng = to.lng - from.lng
      if (Math.abs(dLat) < 0.00001 && Math.abs(dLng) < 0.00001) return '基本静止'

      const angle = (Math.atan2(dLng, dLat) * 180) / Math.PI
      const normalized = (angle + 360) % 360
      const directions = ['北', '东北', '东', '东南', '南', '西南', '西', '西北']
      const index = Math.round(normalized / 45) % 8
      return directions[index]
    },
    getLevelLabel(levelCode) {
      const levelMap = {
        SuperTY: '超强台风',
        STY: '强台风',
        TY: '台风',
        STS: '强热带风暴',
        TS: '热带风暴',
        TD: '热带低压',
        LOW: '低压'
      }
      return levelMap[levelCode] || '待定'
    },
    getEventTypeLabel(type) {
      const eventTypeMap = {
        formation: '生成',
        approaching: '逼近',
        warning: '预警',
        alert: '警报',
        landfall: '登陆',
        disaster: '灾情',
        weakening: '减弱',
        dissipate: '消散',
        assessment: '评估',
        reconstruction: '重建'
      }
      return eventTypeMap[type] || '事件'
    },
    normalizeTrack(track) {
      if (!Array.isArray(track)) return []
      return track
        .filter((point) => point && point.time)
        .slice()
        .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
    },
    createInterpolatedTrackPoint(previousPoint, nextPoint, targetTime) {
      const previousTime = new Date(previousPoint.time).getTime()
      const nextTime = new Date(nextPoint.time).getTime()
      const targetTimeValue = new Date(targetTime).getTime()

      if (!Number.isFinite(previousTime) || !Number.isFinite(nextTime) || nextTime <= previousTime) {
        return null
      }

      const ratio = (targetTimeValue - previousTime) / (nextTime - previousTime)
      if (ratio <= 0 || ratio >= 1) {
        return null
      }

      let lat = previousPoint.lat + (nextPoint.lat - previousPoint.lat) * ratio
      let lng = previousPoint.lng + (nextPoint.lng - previousPoint.lng) * ratio

      // 当前后点坐标完全相同，给插值点一个极小偏移，避免与已知轨迹点重合
      if (lat === previousPoint.lat && lng === previousPoint.lng) {
        lat += 0.0001
        lng += 0.0001
      }

      return {
        ...previousPoint,
        time: targetTime,
        lat,
        lng,
        isInterpolated: true,
        description: '事件时间插值轨迹点'
      }
    },
    augmentTrackWithEventTimes(track, events) {
      const orderedTrack = this.normalizeTrack(track)
      if (orderedTrack.length === 0) return []

      const trackByTime = new Map(orderedTrack.map((point) => [point.time, point]))
      const eventTimes = Array.from(new Set((events || []).map((event) => event.time))).sort()
      const augmentedTrack = orderedTrack.slice()

      eventTimes.forEach((eventTime) => {
        if (trackByTime.has(eventTime)) return

        const eventTimeValue = new Date(eventTime).getTime()
        if (!Number.isFinite(eventTimeValue)) return

        let previousPoint = null
        let nextPoint = null

        for (let i = 0; i < orderedTrack.length; i++) {
          const current = orderedTrack[i]
          const currentTimeValue = new Date(current.time).getTime()

          if (currentTimeValue < eventTimeValue) {
            previousPoint = current
          } else if (currentTimeValue > eventTimeValue) {
            nextPoint = current
            break
          }
        }

        if (!previousPoint || !nextPoint) return

        const insertedPoint = this.createInterpolatedTrackPoint(previousPoint, nextPoint, eventTime)
        if (!insertedPoint) return

        augmentedTrack.push(insertedPoint)
        trackByTime.set(eventTime, insertedPoint)
      })

      return augmentedTrack.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
    },
    bindEventsToTrackPoints(events, track) {
      const trackByTime = new Map((track || []).map((point) => [point.time, point]))

      return (events || []).map((event) => {
        const boundPoint = trackByTime.get(event.time)
        if (!boundPoint) return event

        return {
          ...event,
          lat: boundPoint.lat,
          lng: boundPoint.lng,
          trackTime: boundPoint.time,
          isInterpolatedTrackPoint: Boolean(boundPoint.isInterpolated)
        }
      })
    },
    handleTimelineIndexUpdate(newIndex) {
      this.timelineIndex = newIndex
      this.handleSliderChange()
      this.updateActiveChapterByIndex(this.timelineIndex)
    },
    isCurrentKeyEvent(event) {
      if (!this.nearestEvent) return false
      return event.id === this.nearestEvent.id
    },
    handleSelectEvent(event) {
      if (event && event.id) {
        this.highlightedEventId = event.id
      }

      // 在统一时间轴中找到事件对应的索引
      const targetIndex = this.unifiedTimeline.findIndex(time => time === event.time)
      
      if (targetIndex !== -1) {
        this.timelineIndex = targetIndex
        this.handleSliderChange()
        this.updateActiveChapterByIndex(this.timelineIndex)
      }
    },
    buildChapterScript() {
      if (this.timelineSteps <= 0) {
        this.chapterScript = []
        return
      }

      const firstEnd = Math.max(1, Math.floor(this.timelineSteps * 0.34))
      const secondEnd = Math.max(firstEnd + 1, Math.floor(this.timelineSteps * 0.72))

      this.chapterScript = [
        {
          key: 'pre',
          title: '灾前城市',
          subtitle: '城市基线与台风生成阶段',
          stage: 'typhoon',
          phase: 'pre',
          camera: [28.01, 120.65, 8.8],
          transitionSeconds: 1.1,
          startIndex: 0,
          endIndex: firstEnd
        },
        {
          key: 'during',
          title: '台风过境',
          subtitle: '路径推进与重点事件触发',
          stage: 'typhoon',
          phase: 'during',
          camera: [27.5, 121.2, 7.4],
          transitionSeconds: 1.2,
          startIndex: firstEnd + 1,
          endIndex: secondEnd
        },
        {
          key: 'post',
          title: '灾后影响',
          subtitle: '夜光变化与风险复盘总结',
          stage: 'typhoon',
          phase: 'post',
          camera: [28.01, 120.65, 8.8],
          transitionSeconds: 1.15,
          startIndex: secondEnd + 1,
          endIndex: this.timelineSteps
        }
      ]
    },
    getChapterByIndex(index) {
      if (!Array.isArray(this.chapterScript) || this.chapterScript.length === 0) {
        return null
      }
      return this.chapterScript.find((chapter) => index >= chapter.startIndex && index <= chapter.endIndex) || this.chapterScript[this.chapterScript.length - 1]
    },
    updateActiveChapterByIndex(index, forceRefresh = false) {
      const chapter = this.getChapterByIndex(index)
      if (!chapter) return

      const chapterChanged = chapter.key !== this.activeChapterKey
      if (!chapterChanged && !forceRefresh) return

      this.activeChapterKey = chapter.key
      this.activeChapterTitle = chapter.title
      this.activeChapterSubtitle = chapter.subtitle
      this.activeCinematicScene = {
        key: chapter.key,
        title: chapter.title,
        subtitle: chapter.subtitle,
        stage: chapter.stage,
        phase: chapter.phase,
        camera: chapter.camera,
        transitionSeconds: chapter.transitionSeconds,
        nightLights: true,
        nightLightOpacity: chapter.key === 'during' ? 0.96 : 0.82
      }
    },
    handleEventFilterChange(nextFilters) {
      this.eventFilters = {
        ...this.eventFilters,
        ...nextFilters
      }
      this.applyEventFilters()
    },
    applyEventFilters() {
      const keyword = String(this.eventFilters.keyword || '').trim().toLowerCase()

      this.typhoonEvents = (this.baseTyphoonEvents || []).filter((event) => {
        if (this.eventFilters.type !== 'all' && event.type !== this.eventFilters.type) {
          return false
        }

        if (this.eventFilters.source !== 'all' && event.source !== this.eventFilters.source) {
          return false
        }

        if (!keyword) {
          return true
        }

        const detailsText = (event.details || [])
          .map((detail) => `${detail.source || ''} ${detail.summary || ''}`)
          .join(' ')

        const searchableText = [
          event.title,
          event.content,
          event.source,
          detailsText
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()

        return searchableText.includes(keyword)
      })

      this.updateNearestEvent()
    },
    async loadTyphoonData() {
      let bundle = null

      try {
        bundle = await loadReplayBundle()
      } catch (error) {
        bundle = {
          typhoonTrack: [],
          typhoonEvents: [],
          alertLogs: [],
          disasterStats: [],
          sourceCredibilityMap: {},
          rainfallFrames: [],
          rainfallGridCells: [],
          nightLightCells: [],
          rainfallGridMeta: null,
          nightLightMeta: null,
          dataSource: 'error'
        }
      }

      this.sourceCredibilityMap = { ...(bundle.sourceCredibilityMap || {}) }
      this.alertLogs = (bundle.alertLogs || [])
        .slice()
        .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
      this.disasterStats = (bundle.disasterStats || [])
        .slice()
        .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
      this.rainfallFrames = (bundle.rainfallFrames || [])
        .slice()
        .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
      this.rainfallGridCells = (bundle.rainfallGridCells || [])
        .slice()
        .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
      this.nightLightCells = (bundle.nightLightCells || [])
        .slice()
        .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
      this.rainfallGridMeta = bundle.rainfallGridMeta || null
      this.nightLightMeta = bundle.nightLightMeta || null
      this.dataSource = bundle.dataSource || 'unknown'

      const baseTrack = this.normalizeTrack(bundle.typhoonTrack || [])
      const orderedEvents = (bundle.typhoonEvents || [])
        .slice()
        .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())

      this.typhoonTrack = baseTrack
      this.typhoonEvents = orderedEvents

      if (!this.typhoonTrack || this.typhoonTrack.length === 0) {
        this.unifiedTimeline = []
        this.minTime = ''
        this.maxTime = ''
        this.timelineSteps = 0
        this.timelineIndex = 0
        this.currentTime = ''
        this.baseTyphoonEvents = []
        this.typhoonEvents = []
        this.nearestEvent = null
        this.activeEvents = []
        this.highlightedEventId = null
        return
      }

      const trackTimes = this.typhoonTrack.map(point => point.time)
      const trackMinTime = trackTimes[0]
      const trackMaxTime = trackTimes[trackTimes.length - 1]

      // 仅保留轨迹时间范围内的事件，避免旧事件影响时间轴
      const inRangeEvents = this.typhoonEvents.filter(event => {
        return event.time >= trackMinTime && event.time <= trackMaxTime
      })

      // 保持轨迹数据一对一，不再为新闻事件插值补点。
      // 新闻事件只保留时间语义，用于时间线和筛选，不再强制投影到轨迹点。
      this.baseTyphoonEvents = inRangeEvents.slice()
      this.typhoonEvents = this.baseTyphoonEvents.slice()

      // 生成统一时间轴：合并轨迹和事件的时间，去重排序
      const allTimes = new Set()
      
      // 添加轨迹时间
      this.typhoonTrack.forEach(point => {
        allTimes.add(point.time)
      })
      
      // 添加事件时间
      this.baseTyphoonEvents.forEach(event => {
        allTimes.add(event.time)
      })
      
      // 排序并转为数组
      this.unifiedTimeline = Array.from(allTimes).sort()

      if (this.unifiedTimeline.length > 0) {
        this.minTime = this.unifiedTimeline[0]
        this.maxTime = this.unifiedTimeline[this.unifiedTimeline.length - 1]
        this.timelineSteps = this.unifiedTimeline.length - 1
        this.timelineIndex = this.timelineSteps
        this.currentTime = this.unifiedTimeline[this.timelineIndex]
      }

      this.buildChapterScript()
      this.updateActiveChapterByIndex(this.timelineIndex, true)

      this.applyEventFilters()
    },
    handleSliderChange() {
      if (this.unifiedTimeline.length === 0) return

      // 直接从统一时间轴数组中获取当前时间
      this.currentTime = this.unifiedTimeline[this.timelineIndex]
      this.updateNearestEvent()
      this.updateActiveChapterByIndex(this.timelineIndex)
    },
    updateNearestEvent() {
      this.activeEvents = this.activeEventsByTime
      if (this.activeEvents.length > 0) {
        this.nearestEvent = this.activeEvents[0]
      } else {
        this.nearestEvent = this.nearestEventByTime
      }

      const hasHighlighted = this.typhoonEvents.some((event) => event.id === this.highlightedEventId)
      if (!hasHighlighted) {
        this.highlightedEventId = this.nearestEvent ? this.nearestEvent.id : null
      }
    },
    toggleTimelinePlay() {
      if (this.isPlaying) {
        this.stopTimelinePlay()
      } else {
        this.startTimelinePlay()
      }
    },
    cyclePlaybackSpeed() {
      const speeds = [1, 2, 4]
      const currentIndex = speeds.indexOf(this.playbackSpeed)
      const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % speeds.length
      this.playbackSpeed = speeds[nextIndex]
    },
    startTimelinePlay() {
      if (this.isPlaying || this.timelineSteps <= 0) return

      if (this.timelineIndex >= this.timelineSteps) {
        this.timelineIndex = 0
        this.handleSliderChange()
      }

      this.isPlaying = true
      this.updateActiveChapterByIndex(this.timelineIndex, true)
      this.playTimer = setInterval(() => {
        if (this.timelineIndex >= this.timelineSteps) {
          this.stopTimelinePlay()
          return
        }
        this.timelineIndex += 1
        this.handleSliderChange()
      }, this.playIntervalMs)
    },
    stopTimelinePlay() {
      this.isPlaying = false
      if (this.playTimer) {
        clearInterval(this.playTimer)
        this.playTimer = null
      }
    }
  }
}
</script>

<style scoped>
.leaflet-wrapper {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>
