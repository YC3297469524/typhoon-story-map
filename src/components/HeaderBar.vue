<template>
  <header class="header-bar">
    <div class="header-content">
      <div class="header-left">
        <div class="logo-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C9.5 2 7.5 4 7.5 6.5C7.5 9 9.5 11 12 11C14.5 11 16.5 9 16.5 6.5C16.5 4 14.5 2 12 2Z" fill="#FF6B6B" opacity="0.8"/>
            <path d="M12 11C8.5 11 5.5 14 5.5 17.5C5.5 21 8.5 24 12 24C15.5 24 18.5 21 18.5 17.5C18.5 14 15.5 11 12 11Z" fill="#FF2D55" opacity="0.6"/>
            <circle cx="12" cy="12" r="2" fill="#FFD93D"/>
          </svg>
        </div>
        <h1 class="header-title">
          台风丹娜丝轨迹与新闻事件可视化
        </h1>
        <nav class="header-nav" aria-label="左侧模块导航">
          <!-- 台风本体下拉菜单 -->
          <div class="dropdown-container">
            <button
              type="button"
              class="dropdown-trigger nav-chip"
              :class="{ active: panelVisibility.narrative, open: openDropdown === 'narrative' }"
              @click="toggleDropdown('narrative')"
            >
              <span>台风本体</span>
              <svg class="dropdown-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M7 10l5 5 5-5H7z" fill="currentColor"/>
              </svg>
            </button>
            <div v-if="openDropdown === 'narrative'" class="dropdown-menu">
              <button class="dropdown-item" :class="{ selected: narrativeSubmodules.status }" @click="handleDropdownAction('narrative', 'status')">
                <span>台风实况</span>
                <svg v-if="narrativeSubmodules.status" class="check-icon" width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor"/>
                </svg>
              </button>
              <button class="dropdown-item" :class="{ selected: narrativeSubmodules.track }" @click="handleDropdownAction('narrative', 'track')">
                <span>路径轨迹</span>
                <svg v-if="narrativeSubmodules.track" class="check-icon" width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor"/>
                </svg>
              </button>
              <button class="dropdown-item" :class="{ selected: narrativeSubmodules.chart }" @click="handleDropdownAction('narrative', 'chart')">
                <span>强度曲线</span>
                <svg v-if="narrativeSubmodules.chart" class="check-icon" width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- 影响分析下拉菜单 -->
          <div class="dropdown-container">
            <button
              type="button"
              class="dropdown-trigger nav-chip"
              :class="{ active: panelVisibility.impact, open: openDropdown === 'impact' }"
              @click="toggleDropdown('impact')"
            >
              <span>影响分析</span>
              <svg class="dropdown-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M7 10l5 5 5-5H7z" fill="currentColor"/>
              </svg>
            </button>
            <div v-if="openDropdown === 'impact'" class="dropdown-menu">
              <button class="dropdown-item" :class="{ selected: impactSubmodules.disaster }" @click="handleDropdownAction('impact', 'disaster')">
                <span>灾害统计</span>
                <svg v-if="impactSubmodules.disaster" class="check-icon" width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor"/>
                </svg>
              </button>
              <button class="dropdown-item" :class="{ selected: impactSubmodules.nightlight }" @click="handleDropdownAction('impact', 'nightlight')">
                <span>夜光影像</span>
                <svg v-if="impactSubmodules.nightlight" class="check-icon" width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor"/>
                </svg>
              </button>
              <button class="dropdown-item" :class="{ selected: impactSubmodules.risk }" @click="handleDropdownAction('impact', 'risk')">
                <span>风险等级</span>
                <svg v-if="impactSubmodules.risk" class="check-icon" width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- 事件追踪下拉菜单 -->
          <div class="dropdown-container">
            <button
              type="button"
              class="dropdown-trigger nav-chip"
              :class="{ active: panelVisibility.timeline, open: openDropdown === 'timeline' }"
              @click="toggleDropdown('timeline')"
            >
              <span>事件追踪</span>
              <svg class="dropdown-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M7 10l5 5 5-5H7z" fill="currentColor"/>
              </svg>
            </button>
            <div v-if="openDropdown === 'timeline'" class="dropdown-menu">
              <button class="dropdown-item" :class="{ selected: timelineSubmodules.events }" @click="handleDropdownAction('timeline', 'events')">
                <span>事件列表</span>
                <svg v-if="timelineSubmodules.events" class="check-icon" width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor"/>
                </svg>
              </button>
              <button class="dropdown-item" :class="{ selected: timelineSubmodules.logs }" @click="handleDropdownAction('timeline', 'logs')">
                <span>预警响应</span>
                <svg v-if="timelineSubmodules.logs" class="check-icon" width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor"/>
                </svg>
              </button>
              <button class="dropdown-item" :class="{ selected: timelineSubmodules.credibility }" @click="handleDropdownAction('timeline', 'credibility')">
                <span>来源评估</span>
                <svg v-if="timelineSubmodules.credibility" class="check-icon" width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor"/>
                </svg>
              </button>
            </div>
          </div>
        </nav>
      </div>
      
      <div class="header-right">
        <div class="story-caption" :class="{ active: autoPlayMode }">
          <span class="caption-label">章节</span>
          <span class="caption-title">{{ activeChapterTitle || '手动浏览' }}</span>
          <span class="caption-subtitle">{{ activeChapterSubtitle || '拖动时间轴可自由查看' }}</span>
        </div>

        <div class="current-time-badge">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/>
            <path d="M12 6V12L16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <span class="time-label">当前时间</span>
          <span class="time-value">{{ currentTimeDisplay }}</span>
        </div>

        <div class="stats-strip">
          <div class="stat-chip">
            <span class="stat-label">等级</span>
            <span class="stat-value">{{ currentStats.levelLabel || '--' }}</span>
          </div>
          <div class="stat-chip">
            <span class="stat-label">风速</span>
            <span class="stat-value">{{ windSpeedDisplay }}</span>
          </div>
          <div class="stat-chip">
            <span class="stat-label">气压</span>
            <span class="stat-value">{{ pressureDisplay }}</span>
          </div>
          <div class="stat-chip">
            <span class="stat-label">移速</span>
            <span class="stat-value">{{ moveSpeedDisplay }} {{ currentStats.moveDirection || '--' }}</span>
          </div>
          <div class="stat-chip">
            <span class="stat-label">复盘阶段</span>
            <span class="stat-value">{{ replayMeta.stageLabel || '--' }}</span>
          </div>
          <div class="stat-chip">
            <span class="stat-label">证据覆盖</span>
            <span class="stat-value">{{ evidenceCoverageDisplay }}</span>
          </div>
          <div class="stat-chip">
            <span class="stat-label">数据源</span>
            <span class="stat-value">{{ dataSourceDisplay }}</span>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script>
export default {
  name: 'HeaderBar',
  data() {
    return {
      openDropdown: null
    }
  },
  props: {
    currentTimeDisplay: {
      type: String,
      default: '未设置'
    },
    currentStats: {
      type: Object,
      default: () => ({
        levelLabel: '--',
        windSpeed: null,
        pressure: null,
        moveSpeed: null,
        moveDirection: '--'
      })
    },
    replayMeta: {
      type: Object,
      default: () => ({
        stageLabel: '--',
        evidenceCoverage: 0,
        latestUpdate: '',
        dataSource: 'unknown'
      })
    },
    panelVisibility: {
      type: Object,
      default: () => ({
        narrative: true,
        timeline: true,
        impact: true
      })
    },
    impactSubmodules: {
      type: Object,
      default: () => ({
        disaster: true,
        nightlight: true,
        risk: true
      })
    },
    narrativeSubmodules: {
      type: Object,
      default: () => ({
        status: true,
        track: true,
        chart: true
      })
    },
    timelineSubmodules: {
      type: Object,
      default: () => ({
        events: true,
        logs: true,
        credibility: true
      })
    },
    autoPlayMode: {
      type: Boolean,
      default: false
    },
    playbackSpeed: {
      type: Number,
      default: 1
    },
    activeChapterTitle: {
      type: String,
      default: ''
    },
    activeChapterSubtitle: {
      type: String,
      default: ''
    }
  },
  computed: {
    windSpeedDisplay() {
      if (Number.isFinite(this.currentStats.windSpeed)) {
        return `${this.currentStats.windSpeed.toFixed(1)} m/s`
      }
      return '--'
    },
    pressureDisplay() {
      if (Number.isFinite(this.currentStats.pressure)) {
        return `${Math.round(this.currentStats.pressure)} hPa`
      }
      return '--'
    },
    moveSpeedDisplay() {
      if (Number.isFinite(this.currentStats.moveSpeed)) {
        return `${this.currentStats.moveSpeed.toFixed(1)} km/h`
      }
      return '--'
    },
    evidenceCoverageDisplay() {
      const value = Number(this.replayMeta.evidenceCoverage)
      if (!Number.isFinite(value) || value < 0) return '--'
      return `${Math.max(0, Math.min(100, value))}%`
    },
    dataSourceDisplay() {
      const source = String(this.replayMeta.dataSource || '').toLowerCase()
      if (source === 'api') return 'API'
      if (source === 'api-fallback') return '静态回退'
      if (source === 'static-fallback') return '静态回退'
      if (source === 'static') return '静态'
      if (source === 'error') return '加载失败'
      return '未知'
    }
  },
  methods: {
    toggleDropdown(dropdownName) {
      this.openDropdown = this.openDropdown === dropdownName ? null : dropdownName
    },
    handleDropdownAction(panelName, action) {
      if (action === 'toggle') {
        this.$emit('toggle-panel', panelName)
      } else {
        this.$emit('dropdown-action', { panel: panelName, action })
      }
      this.openDropdown = null
    },
    handleClickOutside(event) {
      if (!event.target.closest('.dropdown-container')) {
        this.openDropdown = null
      }
    }
  },
  mounted() {
    document.addEventListener('click', this.handleClickOutside)
  },
  beforeDestroy() {
    document.removeEventListener('click', this.handleClickOutside)
  }
}
</script>

<style scoped>
.header-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 64px;
  background: rgba(20, 20, 30, 0.95);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
  z-index: 2000;
  display: flex;
  align-items: center;
  padding: 0 24px;
}

.header-content {
  width: 100%;
  max-width: 1920px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.logo-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: rgba(255, 45, 85, 0.1);
  border-radius: 8px;
  border: 1px solid rgba(255, 107, 107, 0.2);
}

.header-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #f0f0f5;
  letter-spacing: 0.5px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.header-badge {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: #e0f2fe;
  background: linear-gradient(135deg, rgba(56, 189, 248, 0.35), rgba(99, 102, 241, 0.35));
  border: 1px solid rgba(125, 211, 252, 0.45);
  vertical-align: middle;
}

.header-nav {
  display: flex;
  align-items: center;
  gap: 8px;
}

.nav-chip {
  height: 32px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(15, 23, 42, 0.65);
  color: #cbd5e1;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
}

.nav-chip.active {
  border-color: rgba(255, 107, 107, 0.65);
  background: rgba(255, 45, 85, 0.2);
  color: #ffe4e6;
}

.nav-chip.open {
  border-color: rgba(255, 215, 0, 0.6);
  background: rgba(251, 191, 36, 0.15);
  color: #fde68a;
}

.dropdown-container {
  position: relative;
}

.dropdown-arrow {
  transition: transform 0.2s ease;
}

.dropdown-trigger.open .dropdown-arrow {
  transform: rotate(180deg);
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  min-width: 160px;
  padding: 4px;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  background: rgba(15, 23, 42, 0.98);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  z-index: 3000;
}

.dropdown-item {
  width: 100%;
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #e2e8f0;
  font-size: 12px;
  cursor: pointer;
  text-align: left;
}

.dropdown-item:hover {
  background: rgba(251, 191, 36, 0.15);
  color: #fde68a;
}

.dropdown-item.selected {
  background: rgba(251, 191, 36, 0.2);
  color: #fde68a;
  font-weight: 600;
}

.check-icon {
  margin-left: auto;
  color: #fde68a;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.story-caption {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding: 0 12px;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(15, 23, 42, 0.66);
  color: #dbeafe;
  max-width: 420px;
}

.story-caption.active {
  border-color: rgba(34, 197, 94, 0.6);
  background: rgba(22, 101, 52, 0.25);
}

.caption-label {
  font-size: 11px;
  color: #86efac;
  flex-shrink: 0;
}

.caption-title {
  font-size: 12px;
  font-weight: 700;
  color: #f8fafc;
  flex-shrink: 0;
}

.caption-subtitle {
  font-size: 11px;
  color: #bfdbfe;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.current-time-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(255, 45, 85, 0.12);
  border: 1px solid rgba(255, 107, 107, 0.25);
  border-radius: 20px;
  color: #e5e7eb;
  font-size: 13px;
}

.current-time-badge svg {
  flex-shrink: 0;
  color: #FF6B6B;
}

.time-label {
  font-weight: 500;
  color: #9ca3af;
}

.time-value {
  font-weight: 600;
  color: #FF6B6B;
  font-variant-numeric: tabular-nums;
}

.stats-strip {
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: min(520px, 38vw);
  overflow-x: auto;
  flex-wrap: nowrap;
  padding-bottom: 2px;
  scrollbar-width: thin;
  scrollbar-color: rgba(148, 163, 184, 0.4) transparent;
}

.stats-strip::-webkit-scrollbar {
  height: 4px;
}

.stats-strip::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.35);
  border-radius: 4px;
}

.stat-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 10px;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  background: rgba(15, 23, 42, 0.72);
  color: #e2e8f0;
  flex-shrink: 0;
}

.stat-label {
  font-size: 11px;
  color: #94a3b8;
}

.stat-value {
  font-size: 12px;
  font-weight: 600;
  color: #f8fafc;
  font-variant-numeric: tabular-nums;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .header-bar {
    padding: 0 16px;
  }
  
  .header-title {
    font-size: 18px;
  }

  .header-nav {
    gap: 6px;
  }

  .nav-chip {
    height: 30px;
    padding: 0 8px;
    font-size: 11px;
  }
  
  .logo-icon {
    width: 36px;
    height: 36px;
  }
  
  .logo-icon svg {
    width: 24px;
    height: 24px;
  }

  .stats-strip {
    gap: 6px;
  }

  .story-caption {
    max-width: 320px;
  }

  .stat-chip {
    padding: 0 8px;
  }
}

@media (max-width: 768px) {
  .header-bar {
    height: 56px;
    padding: 0 12px;
  }
  
  .header-left {
    gap: 12px;
  }

  .header-nav {
    display: none;
  }
  
  .header-title {
    font-size: 16px;
  }
  
  .logo-icon {
    width: 32px;
    height: 32px;
  }
  
  .logo-icon svg {
    width: 20px;
    height: 20px;
  }
  
  .current-time-badge {
    padding: 6px 12px;
    font-size: 12px;
  }

  .story-caption {
    display: none;
  }

  .stats-strip {
    display: none;
  }
  
  .time-label {
    display: none;
  }
}

@media (max-width: 480px) {
  .header-title {
    font-size: 14px;
    letter-spacing: 0.3px;
  }
  
  .current-time-badge {
    padding: 6px 10px;
    gap: 6px;
  }
  
  .time-value {
    font-size: 11px;
  }
}
</style>
