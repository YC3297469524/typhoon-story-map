<template>
  <aside class="event-timeline">
    <div class="module-block" v-if="timelineSubmodules.events">
      <button type="button" class="module-header" @click="toggleModule('events')">
        <span>事件列表</span>
        <span v-if="activeModule === 'events'">↑</span>
        <span v-else>↓</span>
      </button>
      <div v-if="activeModule === 'events'" class="module-content">
        <div v-if="eventTypeDistribution.length" class="type-distribution">
          <div class="dist-title">截至当前时刻 · 事件类型分布</div>
          <div
            v-for="row in eventTypeDistribution"
            :key="`dist-${row.type}`"
            class="dist-row"
          >
            <span class="dist-label">{{ row.label }}</span>
            <div class="dist-track">
              <div
                class="dist-fill"
                :style="{ width: `${row.widthPct}%`, background: row.color }"
              />
            </div>
            <span class="dist-count">{{ row.count }}</span>
          </div>
        </div>

        <div class="timeline-filters">
          <select class="filter-select" :value="filterState.type" @change="handleTypeFilterChange">
            <option value="all">全部类型</option>
            <option v-for="option in typeOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>

          <select class="filter-select" :value="filterState.source" @change="handleSourceFilterChange">
            <option value="all">全部来源</option>
            <option v-for="option in sourceOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>

          <div class="filter-keyword-row">
            <input
              class="filter-keyword"
              type="text"
              :value="filterState.keyword"
              placeholder="搜索标题/内容/来源"
              @input="handleKeywordInput"
            >
            <button v-if="hasActiveFilters" class="filter-reset" @click="resetFilters">重置</button>
          </div>
        </div>

        <div class="timeline-list">
          <div v-if="timelineEvents.length === 0" class="timeline-empty">
            当前筛选条件下暂无可显示事件
          </div>

          <div 
            v-for="event in timelineEvents" 
            :key="event.id"
            :class="['timeline-item', { 'active': isActive(event) }]"
          >
            <div class="timeline-item-header" @click="handleEventClick(event)">
              <div class="timeline-item-time">{{ formatEventTime(event.time) }}</div>
              <div class="timeline-item-content">
                <span class="timeline-badge" :class="getBadgeClass(event.type)"></span>
                <div class="timeline-main">
                  <span class="timeline-title">{{ event.title }}</span>
                  <div class="timeline-meta-row">
                    <span class="timeline-source">{{ event.source }}</span>
                    <span :class="['credibility-tag', getCredibilityClass(event)]">{{ getSourceInfo(event).label }}</span>
                  </div>
                </div>
              </div>
              <div v-if="isActive(event)" class="active-indicator"></div>
            </div>
            
            <!-- 折叠的详细信息 -->
            <div v-if="event.details && event.details.length > 0" class="timeline-item-details">
              <button 
                class="details-toggle" 
                @click.stop="toggleDetails(event.id)"
                :class="{ 'expanded': expandedEvents.includes(event.id) }"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
                {{ expandedEvents.includes(event.id) ? '收起' : '展开' }} 详细新闻 ({{ event.details.length }})
              </button>
              
              <div v-if="expandedEvents.includes(event.id)" class="details-list">
                <div 
                  v-for="(detail, index) in event.details" 
                  :key="index"
                  class="detail-item"
                >
                  <div class="detail-source">{{ detail.source }}</div>
                  <div class="detail-summary">{{ detail.summary }}</div>
                  <a v-if="detail.link" :href="detail.link" target="_blank" class="detail-link">
                    查看详情 →
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="module-block" v-if="timelineSubmodules.logs">
      <button type="button" class="module-header" @click="toggleModule('logs')">
        <span>预警响应</span>
        <span v-if="activeModule === 'logs'">↑</span>
        <span v-else>↓</span>
      </button>
      <div v-if="activeModule === 'logs'" class="module-content">
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
              <tr v-for="log in visibleAlertLogs" :key="log.id">
                <td>{{ formatMiniTime(log.time) }}</td>
                <td>{{ log.level || '--' }}</td>
                <td>{{ formatResponseDuration(log.responseDelayMinutes) }}</td>
              </tr>
              <tr v-if="visibleAlertLogs.length === 0">
                <td colspan="3" class="table-empty">暂无预警记录</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="module-block" v-if="timelineSubmodules.credibility">
      <button type="button" class="module-header" @click="toggleModule('credibility')">
        <span>来源评估</span>
        <span v-if="activeModule === 'credibility'">↑</span>
        <span v-else>↓</span>
      </button>
      <div v-if="activeModule === 'credibility'" class="module-content">
        <div class="credibility-list">
          <div v-if="sourceCredibilityList.length === 0" class="section-note">暂无来源评估数据</div>
          <div v-for="item in sourceCredibilityList" :key="item.source" class="credibility-item">
            <div class="credibility-source">{{ item.source }}</div>
            <div class="credibility-score-bar">
              <div class="credibility-score-fill" :style="{ width: `${item.score || 0}%` }"></div>
            </div>
            <div class="credibility-score-value">{{ item.score || 0 }}</div>
            <span :class="['credibility-tag', getCredibilityTagClass(item.level)]">{{ item.label || '待核验' }}</span>
          </div>
        </div>
        <div class="section-title" style="margin-top: 12px;">事件类型图例</div>
        <div class="legend-section">
          <div class="legend-title">事件类型</div>
          <div class="legend-items">
            <div class="legend-item">
              <span class="legend-badge formation-badge"></span>
              <span class="legend-label">形成</span>
            </div>
            <div class="legend-item">
              <span class="legend-badge warning-badge"></span>
              <span class="legend-label">警报</span>
            </div>
            <div class="legend-item">
              <span class="legend-badge landfall-badge"></span>
              <span class="legend-label">登陆</span>
            </div>
            <div class="legend-item">
              <span class="legend-badge weakening-badge"></span>
              <span class="legend-label">减弱</span>
            </div>
            <div class="legend-item">
              <span class="legend-badge dissipate-badge"></span>
              <span class="legend-label">消散</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>

<script>
export default {
  name: 'EventTimeline',
  props: {
    events: {
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
    highlightedEventId: {
      type: Number,
      default: null
    },
    filterState: {
      type: Object,
      default: () => ({
        type: 'all',
        source: 'all',
        keyword: ''
      })
    },
    typeOptions: {
      type: Array,
      default: () => []
    },
    sourceOptions: {
      type: Array,
      default: () => []
    },
    sourceCredibilityMap: {
      type: Object,
      default: () => ({})
    },
    timelineSubmodules: {
      type: Object,
      default: () => ({
        events: true,
        logs: true,
        credibility: true
      })
    },
    alertLogs: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      activeModule: 'events', // 当前展开的子模块
      expandedEvents: [], // 已展开的事件 ID 列表
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
      }
    }
  },
  computed: {
    filteredEvents() {
      if (!this.events || !this.currentTime) return []
      const currentTimeValue = new Date(this.currentTime).getTime()
      return this.events.filter(event => {
        const eventTime = new Date(event.time).getTime()
        return eventTime <= currentTimeValue
      })
    },
    hasActiveFilters() {
      return this.filterState.type !== 'all'
        || this.filterState.source !== 'all'
        || String(this.filterState.keyword || '').trim().length > 0
    },
    visibleAlertLogs() {
      if (!Array.isArray(this.alertLogs) || this.alertLogs.length === 0 || !this.currentTime) return []
      const currentTimeValue = new Date(this.currentTime).getTime()
      return this.alertLogs
        .filter((item) => new Date(item.time).getTime() <= currentTimeValue)
        .slice(-6)
    },
    sourceCredibilityList() {
      if (!this.sourceCredibilityMap || Object.keys(this.sourceCredibilityMap).length === 0) return []
      return Object.entries(this.sourceCredibilityMap)
        .map(([source, info]) => ({ source, ...info }))
        .sort((a, b) => (b.score || 0) - (a.score || 0))
    },
    timelineEvents() {
      return this.filteredEvents
    },
    typeLabelMap() {
      return {
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
    },
    eventTypeDistribution() {
      const counts = {}
      this.filteredEvents.forEach((event) => {
        const key = event.type || 'other'
        counts[key] = (counts[key] || 0) + 1
      })
      const entries = Object.entries(counts).sort((a, b) => b[1] - a[1])
      if (!entries.length) return []
      const max = Math.max(...entries.map(([, c]) => c), 1)
      return entries.map(([type, count]) => ({
        type,
        count,
        label: this.typeLabelMap[type] || type,
        widthPct: (count / max) * 100,
        color: this.eventTypeColorMap[type] || '#94a3b8'
      }))
    }
  },
  methods: {
    formatEventTime(time) {
      const date = new Date(time)
      return date.toLocaleString('zh-CN', { 
        month: '2-digit', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    },
    formatMiniTime(time) {
      if (!time) return '--'
      const date = new Date(time)
      return date.toLocaleString('zh-CN', { 
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    },
    formatResponseDuration(minutes) {
      if (!minutes && minutes !== 0) return '--'
      if (minutes < 60) return `${minutes}分钟`
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`
    },
    toggleModule(moduleName) {
      this.activeModule = this.activeModule === moduleName ? null : moduleName
    },
    isActive(event) {
      if (this.highlightedEventId) {
        return this.highlightedEventId === event.id
      }

      if (this.activeEvents && this.activeEvents.length > 0) {
        return this.activeEvents.some(activeEvent => activeEvent.id === event.id)
      }
      return this.nearestEvent && this.nearestEvent.id === event.id
    },
    handleEventClick(event) {
      this.$emit('selectEvent', event)
    },
    getBadgeClass(type) {
      return `${type}-badge`
    },
    getSourceInfo(event) {
      return this.sourceCredibilityMap[event.source] || {
        level: 'unknown',
        score: 70,
        label: '待核验'
      }
    },
    getCredibilityClass(event) {
      const level = this.getSourceInfo(event).level
      if (level === 'official') return 'credibility-official'
      if (level === 'authoritative-media') return 'credibility-authoritative'
      if (level === 'professional-media') return 'credibility-professional'
      if (level === 'mainstream-media') return 'credibility-mainstream'
      return 'credibility-unknown'
    },
    getCredibilityTagClass(level) {
      if (level === 'official') return 'credibility-official'
      if (level === 'authoritative-media') return 'credibility-authoritative'
      if (level === 'professional-media') return 'credibility-professional'
      if (level === 'mainstream-media') return 'credibility-mainstream'
      return 'credibility-unknown'
    },
    toggleDetails(eventId) {
      const index = this.expandedEvents.indexOf(eventId)
      if (index > -1) {
        this.expandedEvents.splice(index, 1)
      } else {
        this.expandedEvents.push(eventId)
      }
    },
    emitFilterChange(patch) {
      this.$emit('filterChange', {
        ...this.filterState,
        ...patch
      })
    },
    handleTypeFilterChange(event) {
      this.emitFilterChange({ type: event.target.value })
    },
    handleSourceFilterChange(event) {
      this.emitFilterChange({ source: event.target.value })
    },
    handleKeywordInput(event) {
      this.emitFilterChange({ keyword: event.target.value })
    },
    resetFilters() {
      this.emitFilterChange({
        type: 'all',
        source: 'all',
        keyword: ''
      })
    }
  }
}
</script>

<style scoped>
.event-timeline {
  position: fixed;
  top: 80px;
  left: 12px;
  width: min(300px, calc(100vw - 24px));
  max-width: 340px;
  max-height: calc(100vh - 220px);
  background: rgba(30, 30, 40, 0.92);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5),
              0 2px 8px rgba(0, 0, 0, 0.3);
  z-index: 1500;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.type-distribution {
  flex-shrink: 0;
  padding: 10px 12px 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(30, 27, 75, 0.35);
}

.dist-title {
  font-size: 11px;
  font-weight: 700;
  color: #c4b5fd;
  margin-bottom: 8px;
}

.dist-row {
  display: grid;
  grid-template-columns: 52px 1fr 22px;
  gap: 6px;
  align-items: center;
  margin-bottom: 5px;
}

.dist-row:last-child {
  margin-bottom: 0;
}

.dist-label {
  font-size: 10px;
  color: #e2e8f0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dist-track {
  height: 8px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.75);
  overflow: hidden;
}

.dist-fill {
  height: 100%;
  border-radius: 999px;
  min-width: 4px;
  transition: width 0.35s ease;
}

.dist-count {
  font-size: 10px;
  font-weight: 700;
  color: #fbbf24;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

/* 头部 */
.timeline-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 18px;
  background: rgba(20, 20, 30, 0.8);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

.header-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #FF6B6B;
}

.header-title {
  flex: 1;
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #e5e7eb;
  letter-spacing: 0.3px;
}

.event-count {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 8px;
  background: rgba(255, 107, 107, 0.2);
  border: 1px solid rgba(255, 107, 107, 0.3);
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  color: #FF6B6B;
}

.timeline-filters {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  background: rgba(15, 18, 30, 0.75);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.filter-select,
.filter-keyword {
  width: 100%;
  height: 32px;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  background: rgba(15, 23, 42, 0.75);
  color: #e2e8f0;
  padding: 0 10px;
  font-size: 12px;
  outline: none;
}

.filter-select:focus,
.filter-keyword:focus {
  border-color: rgba(255, 107, 107, 0.65);
}

.filter-keyword-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.filter-reset {
  height: 32px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid rgba(255, 107, 107, 0.4);
  background: rgba(255, 45, 85, 0.16);
  color: #fecdd3;
  font-size: 11px;
  cursor: pointer;
  flex-shrink: 0;
}

.filter-reset:hover {
  background: rgba(255, 45, 85, 0.24);
}

/* 时间线列表 */
.timeline-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px 8px;
}

.timeline-empty {
  padding: 18px 10px;
  font-size: 12px;
  color: #94a3b8;
  text-align: center;
  border: 1px dashed rgba(148, 163, 184, 0.28);
  border-radius: 8px;
  margin: 4px;
}

.timeline-list::-webkit-scrollbar {
  width: 7px;
}

.timeline-list::-webkit-scrollbar-track {
  background: transparent;
}

.timeline-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: background 0.2s ease;
}

.timeline-list::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.25);
}

.timeline-list::-webkit-scrollbar-corner {
  background: transparent;
}

/* 时间线项目 */
.timeline-item {
  position: relative;
  margin-bottom: 8px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  transition: all 0.25s ease;
  overflow: hidden;
}

.timeline-item-header {
  padding: 10px 12px;
  cursor: pointer;
  position: relative;
}

.timeline-item:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 107, 107, 0.3);
  transform: translateX(2px);
}

.timeline-item.active {
  background: rgba(255, 45, 85, 0.15);
  border-color: rgba(255, 45, 85, 0.5);
  border-width: 2px;
  box-shadow: 0 0 16px rgba(255, 45, 85, 0.25),
              inset 0 0 12px rgba(255, 45, 85, 0.1);
}

.timeline-item.active .timeline-item-header {
  padding: 9px 11px; /* 补偿 border-width 变化 */
}

.active-indicator {
  position: absolute;
  left: -4px;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 60%;
  background: linear-gradient(180deg, #FF2D55 0%, #FF6B6B 100%);
  border-radius: 0 2px 2px 0;
  box-shadow: 0 0 8px rgba(255, 45, 85, 0.6);
}

.timeline-item-time {
  font-size: 11px;
  font-weight: 500;
  color: #9ca3af;
  margin-bottom: 6px;
  font-variant-numeric: tabular-nums;
}

.timeline-item-content {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.timeline-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.timeline-badge {
  flex-shrink: 0;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 0 6px currentColor;
}

.timeline-title {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
  color: #e5e7eb;
  line-height: 1.4;
}

.timeline-meta-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.timeline-source {
  font-size: 10px;
  color: #93c5fd;
}

.credibility-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 16px;
  padding: 0 6px;
  border-radius: 999px;
  font-size: 10px;
  border: 1px solid transparent;
}

.credibility-official {
  color: #86efac;
  border-color: rgba(134, 239, 172, 0.5);
  background: rgba(22, 163, 74, 0.2);
}

.credibility-authoritative {
  color: #fcd34d;
  border-color: rgba(252, 211, 77, 0.5);
  background: rgba(217, 119, 6, 0.2);
}

.credibility-professional {
  color: #a5b4fc;
  border-color: rgba(165, 180, 252, 0.5);
  background: rgba(79, 70, 229, 0.2);
}

.credibility-mainstream {
  color: #bfdbfe;
  border-color: rgba(191, 219, 254, 0.5);
  background: rgba(37, 99, 235, 0.2);
}

.credibility-unknown {
  color: #cbd5e1;
  border-color: rgba(148, 163, 184, 0.45);
  background: rgba(71, 85, 105, 0.25);
}

/* 事件类型颜色 */
.formation-badge {
  background: #4D96FF;
  box-shadow: 0 0 8px #4D96FF;
}

.warning-badge {
  background: #FFA500;
  box-shadow: 0 0 8px #FFA500;
}

.alert-badge {
  background: #FF0000;
  box-shadow: 0 0 8px #FF0000;
}

.approaching-badge {
  background: #FF6B6B;
  box-shadow: 0 0 8px #FF6B6B;
}

.landfall-badge {
  background: #DC143C;
  box-shadow: 0 0 8px #DC143C;
}

.disaster-badge {
  background: #8B0000;
  box-shadow: 0 0 8px #8B0000;
}

.weakening-badge {
  background: #FFD700;
  box-shadow: 0 0 8px #FFD700;
}

.dissipate-badge {
  background: #90EE90;
  box-shadow: 0 0 8px #90EE90;
}

.assessment-badge {
  background: #87CEEB;
  box-shadow: 0 0 8px #87CEEB;
}

.reconstruction-badge {
  background: #98D8C8;
  box-shadow: 0 0 8px #98D8C8;
}

/* 图例说明 */
.legend-section {
  flex-shrink: 0;
  padding: 14px 18px;
  background: rgba(20, 20, 30, 0.6);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.legend-title {
  font-size: 12px;
  font-weight: 600;
  color: #9ca3af;
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.legend-items {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.legend-badge {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.legend-label {
  font-size: 11px;
  color: #d1d5db;
}

/* 详细信息区域 */
.timeline-item-details {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.2);
}

.details-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: transparent;
  border: none;
  color: #9ca3af;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.details-toggle:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #e5e7eb;
}

.details-toggle svg {
  transition: transform 0.2s ease;
}

.details-toggle.expanded svg {
  transform: rotate(180deg);
}

.details-list {
  padding: 8px 12px 12px;
  max-height: 300px;
  overflow-y: auto;
  animation: slide-down 0.3s ease-out;
}

@keyframes slide-down {
  from {
    max-height: 0;
    opacity: 0;
  }
  to {
    max-height: 300px;
    opacity: 1;
  }
}

.detail-item {
  margin-bottom: 10px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-left: 3px solid #FF6B6B;
  border-radius: 4px;
}

.detail-item:last-child {
  margin-bottom: 0;
}

.detail-source {
  font-size: 10px;
  font-weight: 600;
  color: #FF6B6B;
  margin-bottom: 4px;
}

.detail-summary {
  font-size: 11px;
  color: #d1d5db;
  line-height: 1.5;
  margin-bottom: 4px;
}

.detail-link {
  font-size: 10px;
  color: #60A5FA;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  transition: color 0.2s ease;
}

.detail-link:hover {
  color: #93C5FD;
  text-decoration: underline;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .event-timeline {
    width: 280px;
    top: 72px;
    left: 300px;
  }
}

@media (max-width: 768px) {
  .event-timeline {
    width: 260px;
    top: 68px;
    left: auto;
    right: 12px;
    max-height: calc(100vh - 240px);
  }
  
  .timeline-header {
    padding: 12px 14px;
  }
  
  .header-title {
    font-size: 14px;
  }
  
  .timeline-item {
    padding: 8px 10px;
  }
  
  .timeline-title {
    font-size: 12px;
  }
}

@media (max-width: 480px) {
  .event-timeline {
    width: calc(100vw - 24px);
    left: 12px;
    right: 12px;
    top: auto;
    bottom: 132px;
    max-height: 40vh;
  }
  
  .legend-section {
    padding: 10px 14px;
  }
  
  .legend-items {
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
  }
}

/* 预警日志表格 */
.log-table-wrapper {
  overflow-x: auto;
  margin: 8px 0;
}

.log-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}

.log-table th,
.log-table td {
  padding: 6px 8px;
  text-align: left;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.log-table th {
  font-weight: 600;
  color: #9ca3af;
  background: rgba(0, 0, 0, 0.2);
  position: sticky;
  top: 0;
}

.log-table td {
  color: #e2e8f0;
}

.log-table tbody tr:hover {
  background: rgba(255, 255, 255, 0.05);
}

.table-empty {
  text-align: center;
  color: #6b7280;
  padding: 16px 8px !important;
  font-style: italic;
}

/* 可信度评估列表 */
.credibility-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 8px;
}

.credibility-item {
  display: grid;
  grid-template-columns: 1fr 60px 24px auto;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.credibility-source {
  font-size: 11px;
  color: #e2e8f0;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.credibility-score-bar {
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
}

.credibility-score-fill {
  height: 100%;
  background: linear-gradient(90deg, #10B981, #34D399);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.credibility-score-value {
  font-size: 11px;
  font-weight: 600;
  color: #34D399;
  text-align: right;
}

/* 子模块样式 */
.module-block {
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.module-block:last-child {
  border-bottom: none;
}

.module-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.02);
  border: none;
  color: #e2e8f0;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.module-header:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #f8fafc;
}

.module-content {
  padding: 10px 14px;
  overflow-y: auto;
  max-height: calc(100vh - 380px);
}

.module-content::-webkit-scrollbar {
  width: 7px;
}

.module-content::-webkit-scrollbar-track {
  background: transparent;
}

.module-content::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: background 0.2s ease;
}

.module-content::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.25);
}

.module-content::-webkit-scrollbar-corner {
  background: transparent;
}

.section-title {
  font-size: 11px;
  font-weight: 600;
  color: #9ca3af;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.section-note {
  font-size: 11px;
  color: #6b7280;
  line-height: 1.5;
  margin: 6px 0;
}
</style>
