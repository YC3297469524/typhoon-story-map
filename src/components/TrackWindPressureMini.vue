<template>
  <div v-if="hasTrack" class="track-mini-root">
    <div class="track-mini-head">台风强度变化</div>
    <p class="track-mini-caption">风速（橙色）与气压（蓝色）随时间变化</p>
    <div class="track-chart-wrap" ref="chartContainer"></div>
  </div>
</template>

<script>
import * as echarts from 'echarts'

export default {
  name: 'TrackWindPressureMini',
  props: {
    typhoonTrack: {
      type: Array,
      default: () => []
    },
    currentTime: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      chart: null
    }
  },
  computed: {
    sortedTrack() {
      const list = (this.typhoonTrack || []).slice()
      return list.sort((a, b) => new Date(a.time) - new Date(b.time))
    },
    hasTrack() {
      return this.sortedTrack.length >= 2
    }
  },
  mounted() {
    if (this.hasTrack) {
      this.$nextTick(() => {
        this.initChart()
      })
    }
  },
  beforeDestroy() {
    if (this.chart) {
      this.chart.dispose()
    }
  },
  watch: {
    sortedTrack: {
      handler() {
        if (this.hasTrack) {
          this.$nextTick(() => {
            if (!this.chart) {
              this.initChart()
            } else {
              this.updateChart()
            }
          })
        }
      },
      deep: true
    },
    currentTime() {
      if (this.chart) {
        this.updateChart()
      }
    }
  },
  methods: {
    initChart() {
      if (!this.$refs.chartContainer) return
      
      this.chart = echarts.init(this.$refs.chartContainer)
      this.updateChart()
      
      window.addEventListener('resize', this.handleResize)
    },
    handleResize() {
      if (this.chart) {
        this.chart.resize()
      }
    },
    updateChart() {
      if (!this.chart || !this.sortedTrack.length) return
      
      const times = this.sortedTrack.map(p => {
        const d = new Date(p.time)
        return `${d.getMonth() + 1}-${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:00`
      })
      
      const windSpeeds = this.sortedTrack.map(p => Number(p.windSpeed))
      const pressures = this.sortedTrack.map(p => Number(p.pressure))
      
      const currentIndex = this.getCurrentIndex()
      
      const option = {
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'axis',
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          borderColor: 'rgba(251, 191, 36, 0.3)',
          textStyle: {
            color: '#f1f5f9'
          },
          formatter: (params) => {
            const idx = params[0].dataIndex
            const point = this.sortedTrack[idx]
            return `
              <div style="font-weight: 700; margin-bottom: 4px;">${times[idx]}</div>
              <div>风速: <span style="color: #f97316;">${point.windSpeed} m/s</span></div>
              <div>气压: <span style="color: #3b82f6;">${point.pressure} hPa</span></div>
              <div>强度: <span style="color: #fcd34d;">${point.level}</span></div>
            `
          }
        },
        grid: {
          left: '12%',
          right: '12%',
          top: '15%',
          bottom: '15%'
        },
        legend: {
          data: ['风速', '气压'],
          textStyle: {
            color: '#cbd5e1',
            fontSize: 10
          },
          top: 0
        },
        xAxis: {
          type: 'category',
          data: times,
          axisLine: {
            lineStyle: {
              color: 'rgba(148, 163, 184, 0.4)'
            }
          },
          axisLabel: {
            color: '#94a3b8',
            fontSize: 9,
            rotate: 45
          },
          axisTick: {
            show: false
          }
        },
        yAxis: [
          {
            type: 'value',
            name: '风速 (m/s)',
            nameTextStyle: {
              color: '#f97316',
              fontSize: 10
            },
            axisLine: {
              lineStyle: {
                color: 'rgba(249, 115, 22, 0.4)'
              }
            },
            axisLabel: {
              color: '#f97316',
              fontSize: 9
            },
            splitLine: {
              lineStyle: {
                color: 'rgba(148, 163, 184, 0.15)'
              }
            }
          },
          {
            type: 'value',
            name: '气压 (hPa)',
            nameTextStyle: {
              color: '#3b82f6',
              fontSize: 10
            },
            axisLine: {
              lineStyle: {
                color: 'rgba(59, 130, 246, 0.4)'
              }
            },
            axisLabel: {
              color: '#3b82f6',
              fontSize: 9
            },
            splitLine: {
              show: false
            }
          }
        ],
        series: [
          {
            name: '风速',
            type: 'line',
            yAxisIndex: 0,
            data: windSpeeds,
            smooth: true,
            symbol: 'circle',
            symbolSize: 4,
            lineStyle: {
              color: '#f97316',
              width: 2
            },
            itemStyle: {
              color: '#f97316'
            },
            areaStyle: {
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: 'rgba(249, 115, 22, 0.3)' },
                  { offset: 1, color: 'rgba(249, 115, 22, 0.05)' }
                ]
              }
            },
            markLine: currentIndex >= 0 ? {
              data: [{ xAxis: currentIndex }],
              lineStyle: {
                color: 'rgba(248, 113, 113, 0.8)',
                width: 2,
                type: 'dashed'
              }
            } : undefined
          },
          {
            name: '气压',
            type: 'line',
            yAxisIndex: 1,
            data: pressures,
            smooth: true,
            symbol: 'circle',
            symbolSize: 4,
            lineStyle: {
              color: '#3b82f6',
              width: 2
            },
            itemStyle: {
              color: '#3b82f6'
            },
            areaStyle: {
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
                  { offset: 1, color: 'rgba(59, 130, 246, 0.05)' }
                ]
              }
            }
          }
        ]
      }
      
      this.chart.setOption(option, true)
    },
    getCurrentIndex() {
      const pts = this.sortedTrack
      if (!pts.length || !this.currentTime) return -1
      
      const t = new Date(this.currentTime).getTime()
      const t0 = new Date(pts[0].time).getTime()
      const tLast = new Date(pts[pts.length - 1].time).getTime()
      
      if (t <= t0) return 0
      if (t >= tLast) return pts.length - 1
      
      for (let i = 1; i < pts.length; i += 1) {
        const a = new Date(pts[i - 1].time).getTime()
        const b = new Date(pts[i].time).getTime()
        if (t <= b) {
          const f = (t - a) / (b - a)
          if (f < 0.5) return i - 1
          return i
        }
      }
      return pts.length - 1
    }
  }
}
</script>

<style scoped>
.track-mini-root {
  margin-top: 10px;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid rgba(251, 191, 36, 0.25);
  background: rgba(15, 23, 42, 0.55);
}

.track-mini-head {
  font-size: 12px;
  font-weight: 700;
  color: #fde68a;
  margin-bottom: 4px;
}

.track-mini-caption {
  margin: 0 0 8px;
  font-size: 10px;
  line-height: 1.35;
  color: #94a3b8;
}

.track-chart-wrap {
  width: 100%;
  height: 200px;
  border-radius: 6px;
  background: rgba(2, 6, 23, 0.45);
}
</style>
