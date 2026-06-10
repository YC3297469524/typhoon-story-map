<template>
  <div class="timeline-shell" :class="{ expanded: isExpanded, collapsed: !isExpanded }">
    <div class="compact-bar" @click="handleCompactBarClick">

      <button class="mini-play" @click.stop="handlePlayPause">
        {{ isPlaying ? '暂停' : '播放' }}
      </button>

      <div class="mini-time">{{ currentTimeDisplay }}</div>

      <button class="mini-speed" @click.stop="handleCycleSpeed">{{ playbackSpeed }}x</button>
    </div>

    <div
      class="timeline-slider-row"
      ref="sliderRow"
      @mousedown.prevent.stop="startScrub"
      @touchstart.prevent.stop="startScrubTouch"
    >
      <input
        type="range"
        :min="0"
        :max="timelineSteps"
        :value="timelineIndex"
        @input="handleSliderChange"
        @mousedown.prevent.stop="startScrub"
        @touchstart.prevent.stop="startScrubTouch"
        class="timeline-slider"
      >
    </div>

    <div class="timeline-panel">
      <div class="timeline-topbar">
        <span class="time-label">{{ minTimeDisplay }}</span>
        <span class="time-sep">至</span>
        <span class="time-label">{{ maxTimeDisplay }}</span>
      </div>

      <div class="event-board">
        <div class="event-guide-line"></div>
        <button
          v-for="node in renderedNodes"
          :key="node.id"
          type="button"
          class="event-node"
          :class="[
            `kind-${node.kind || 'event'}`,
            node.type ? `type-${node.type}` : '',
            { active: node.isActive }
          ]"
          :style="{
            left: `${node.position}%`,
            top: `${14 + node.row * 34}px`
          }"
          :title="node.title"
          @click="jumpToEvent(node)"
        >
          <span class="node-marker"></span>
          <span class="node-chip">{{ node.shortTitle || node.title }}</span>
          <span class="node-time">{{ formatNodeTime(node.time) }}</span>
        </button>
      </div>

    </div>
  </div>
</template>

<script>
export default {
  name: 'TimelineControl',
  props: {
    timelineIndex: {
      type: Number,
      default: 0
    },
    timelineSteps: {
      type: Number,
      default: 0
    },
    currentTime: {
      type: String,
      default: ''
    },
    minTime: {
      type: String,
      default: ''
    },
    maxTime: {
      type: String,
      default: ''
    },
    isPlaying: {
      type: Boolean,
      default: false
    },
    playbackSpeed: {
      type: Number,
      default: 1
    },
    keyEvents: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      isExpanded: false,
      isScrubbing: false
    }
  },
  computed: {
    minTimeDisplay() {
      if (!this.minTime) return ''
      return new Date(this.minTime).toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    },
    maxTimeDisplay() {
      if (!this.maxTime) return ''
      return new Date(this.maxTime).toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    },
    currentTimeDisplay() {
      if (!this.currentTime) return '未设置'
      return new Date(this.currentTime).toLocaleString('zh-CN')
    },
    timelinePercentage() {
      if (!Number.isFinite(this.timelineSteps) || this.timelineSteps === 0) return 0
      return (this.timelineIndex / this.timelineSteps) * 100
    },
    renderedNodes() {
      const nodes = (this.keyEvents || [])
        .slice()
        .sort((a, b) => Number(a.position || 0) - Number(b.position || 0))

      const rowLastPos = [-999, -999, -999, -999]
      const minGap = 12

      return nodes.map((node) => {
        let row = 0
        for (let i = 0; i < rowLastPos.length; i += 1) {
          if (Math.abs(Number(node.position || 0) - rowLastPos[i]) >= minGap) {
            row = i
            break
          }
          row = i
        }
        rowLastPos[row] = Number(node.position || 0)
        return {
          ...node,
          row
        }
      })
    }
  },
  methods: {
    handleCompactBarClick(event) {
      if (event.target.closest('.timeline-slider, .timeline-slider-row, .mini-play, .mini-speed')) {
        return
      }
      this.toggleExpanded()
    },
    startScrub(event) {
      this.isScrubbing = true
      this.updateTimelineByClientX(event.clientX)
      window.addEventListener('mousemove', this.onScrubMove)
      window.addEventListener('mouseup', this.endScrub)
    },
    startScrubTouch(event) {
      const touch = event.touches && event.touches[0]
      if (!touch) return
      this.isScrubbing = true
      this.updateTimelineByClientX(touch.clientX)
      window.addEventListener('touchmove', this.onScrubTouchMove, { passive: false })
      window.addEventListener('touchend', this.endScrub)
      window.addEventListener('touchcancel', this.endScrub)
    },
    onScrubMove(event) {
      if (!this.isScrubbing) return
      this.updateTimelineByClientX(event.clientX)
    },
    onScrubTouchMove(event) {
      if (!this.isScrubbing) return
      const touch = event.touches && event.touches[0]
      if (!touch) return
      event.preventDefault()
      this.updateTimelineByClientX(touch.clientX)
    },
    endScrub() {
      this.isScrubbing = false
      window.removeEventListener('mousemove', this.onScrubMove)
      window.removeEventListener('mouseup', this.endScrub)
      window.removeEventListener('touchmove', this.onScrubTouchMove)
      window.removeEventListener('touchend', this.endScrub)
      window.removeEventListener('touchcancel', this.endScrub)
    },
    updateTimelineByClientX(clientX) {
      const row = this.$refs.sliderRow
      if (!row) return
      const rect = row.getBoundingClientRect()
      if (!rect || rect.width <= 0) return

      const x = Math.max(rect.left, Math.min(clientX, rect.right))
      const ratio = (x - rect.left) / rect.width
      const maxSteps = Number(this.timelineSteps) || 0
      const value = Math.round(ratio * maxSteps)
      this.$emit('update:timelineIndex', value)
    },
    toggleExpanded() {
      this.isExpanded = !this.isExpanded
    },
    handlePlayPause() {
      this.$emit('playPause')
    },
    handleCycleSpeed() {
      this.$emit('cycleSpeed')
    },
    handleSliderChange(event) {
      const value = parseInt(event.target.value, 10)
      this.$emit('update:timelineIndex', value)
    },
    jumpToEvent(event) {
      if (!event || !Number.isFinite(Number(event.index))) return
      this.$emit('update:timelineIndex', Number(event.index))
    },
    formatNodeTime(time) {
      if (!time) return '--'
      return new Date(time).toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  },
  beforeDestroy() {
    this.endScrub()
  }
}
</script>

<style scoped>
.timeline-shell {
  position: fixed;
  left: 16px;
  right: 16px;
  bottom: 10px;
  z-index: 2000;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: linear-gradient(180deg, rgba(14, 21, 36, 0.96) 0%, rgba(8, 12, 22, 0.96) 100%);
  box-shadow: 0 10px 32px rgba(0, 0, 0, 0.42);
  overflow: hidden;
  transition: all 280ms cubic-bezier(0.2, 0.9, 0.2, 1);
}

.compact-bar {
  height: 50px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px 0;
  background: rgba(15, 23, 42, 0.82);
  border-bottom: 1px solid rgba(148, 163, 184, 0.25);
  cursor: pointer;
  user-select: none;
  transition: background 200ms ease, box-shadow 200ms ease;
}

.compact-bar:hover {
  background: rgba(15, 23, 42, 0.92);
  box-shadow: inset 0 0 8px rgba(56, 189, 248, 0.1);
}

.mini-play,
.mini-speed {
  height: 30px;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(30, 41, 59, 0.72);
  color: #dbeafe;
  padding: 0 10px;
  font-size: 12px;
  cursor: pointer;
  pointer-events: auto;
}

.mini-time {
  color: #d1d5db;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  margin-right: 8px;
}

.timeline-slider-row {
  padding: 8px 12px;
  background: rgba(15, 23, 42, 0.72);
  border-bottom: 1px solid rgba(148, 163, 184, 0.25);
  pointer-events: auto;
}

.timeline-slider {
  width: 100%;
  height: 8px;
  border-radius: 8px;
  background: rgba(148, 163, 184, 0.25);
  outline: none;
  -webkit-appearance: none;
  appearance: none;
  cursor: pointer;
  pointer-events: auto;
}

.timeline-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: linear-gradient(135deg, #22d3ee, #3b82f6);
  border: 2px solid rgba(226, 232, 240, 0.95);
  box-shadow: 0 0 12px rgba(59, 130, 246, 0.45);
}

.timeline-slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: linear-gradient(135deg, #22d3ee, #3b82f6);
  border: 2px solid rgba(226, 232, 240, 0.95);
  box-shadow: 0 0 12px rgba(59, 130, 246, 0.45);
}

.timeline-panel {
  max-height: 320px;
  opacity: 1;
  padding: 10px 12px 14px;
  transition: max-height 360ms cubic-bezier(0.2, 0.9, 0.2, 1), opacity 260ms ease, padding 260ms ease;
}

.timeline-shell.collapsed .timeline-panel {
  max-height: 0;
  opacity: 0;
  padding-top: 0;
  padding-bottom: 0;
  pointer-events: none;
}

.timeline-topbar {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #cbd5e1;
  margin-bottom: 10px;
}

.time-label {
  font-size: 11px;
  color: #94a3b8;
  font-variant-numeric: tabular-nums;
}

.time-sep {
  font-size: 11px;
  color: #64748b;
}

.event-board {
  position: relative;
  height: 148px;
  border-radius: 12px;
  background: radial-gradient(circle at 50% 0%, rgba(30, 64, 175, 0.2), rgba(15, 23, 42, 0.35) 48%, rgba(2, 6, 23, 0.72));
  border: 1px solid rgba(96, 165, 250, 0.22);
  overflow: hidden;
}

.event-guide-line {
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  height: 1px;
  background: linear-gradient(90deg, rgba(56, 189, 248, 0.1) 0%, rgba(56, 189, 248, 0.35) 50%, rgba(56, 189, 248, 0.1) 100%);
}

.event-node {
  position: absolute;
  transform: translateX(-50%);
  border: 0;
  background: transparent;
  color: #e2e8f0;
  padding: 0;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  max-width: 120px;
}

.node-marker {
  width: 12px;
  height: 12px;
  border-radius: 4px;
  background: #60a5fa;
  box-shadow: 0 0 0 2px rgba(15, 23, 42, 0.9);
}

.event-node.kind-phase .node-marker {
  border-radius: 999px;
  background: linear-gradient(135deg, #f59e0b, #fbbf24);
}

.event-node.kind-intensity .node-marker {
  transform: rotate(45deg);
  background: linear-gradient(135deg, #fb7185, #ef4444);
}

.event-node.kind-event.type-landfall .node-marker {
  background: linear-gradient(135deg, #dc2626, #f97316);
}

.event-node.kind-event.type-disaster .node-marker {
  background: linear-gradient(135deg, #7f1d1d, #ef4444);
}

.event-node.kind-event.type-warning .node-marker,
.event-node.kind-event.type-alert .node-marker {
  background: linear-gradient(135deg, #f59e0b, #fbbf24);
}

.node-chip {
  font-size: 11px;
  line-height: 1.1;
  max-width: 114px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 2px 6px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.65);
  border: 1px solid rgba(148, 163, 184, 0.35);
}

.node-time {
  font-size: 10px;
  color: #93c5fd;
}

.event-node.active .node-chip {
  border-color: rgba(56, 189, 248, 0.85);
  box-shadow: 0 0 14px rgba(56, 189, 248, 0.32);
}

@media (max-width: 768px) {
  .timeline-shell {
    left: 10px;
    right: 10px;
  }

  .mini-time {
    display: none;
  }

  .event-board {
    height: 132px;
  }

  .event-node {
    max-width: 84px;
  }

  .node-chip {
    max-width: 80px;
  }

  .node-time {
    display: none;
  }
}
</style>
