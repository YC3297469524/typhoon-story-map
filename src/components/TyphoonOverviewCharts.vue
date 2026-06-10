<template>
  <div class="charts-container">
    <div v-if="hasEventData" class="chart-card">
      <div class="chart-title">台风事件类型分布</div>
      <div class="chart-wrap" ref="eventTypeChart"></div>
    </div>
    
    <div v-if="hasDisasterData" class="chart-card">
      <div class="chart-title">灾害发展时间线</div>
      <div class="chart-wrap" ref="disasterTimelineChart"></div>
    </div>
  </div>
</template>

<script>
import * as echarts from 'echarts'
import { typhoonEvents } from '../data/typhoonEvents.js'
import { disasterStats } from '../data/disasterStats.js'

const TYPE_NAMES = {
  'formation': '生成',
  'warning': '预警',
  'alert': '警报',
  'approaching': '逼近',
  'landfall': '登陆',
  'disaster': '灾情',
  'weakening': '减弱',
  'dissipate': '消散',
  'assessment': '评估'
}

const TYPE_COLORS = {
  'formation': '#fbbf24',
  'warning': '#f97316',
  'alert': '#ef4444',
  'approaching': '#a855f7',
  'landfall': '#dc2626',
  'disaster': '#991b1b',
  'weakening': '#60a5fa',
  'dissipate': '#94a3b8',
  'assessment': '#22c55e'
}

export default {
  name: 'TyphoonOverviewCharts',
  data() {
    return {
      eventTypeChart: null,
      disasterTimelineChart: null
    }
  },
  computed: {
    hasEventData() {
      return Array.isArray(typhoonEvents) && typhoonEvents.length > 0
    },
    hasDisasterData() {
      return Array.isArray(disasterStats) && disasterStats.length > 0
    }
  },
  mounted() {
    this.$nextTick(() => {
      if (this.hasEventData) this.initEventTypeChart()
      if (this.hasDisasterData) this.initDisasterTimelineChart()
    })
  },
  beforeDestroy() {
    if (this.eventTypeChart) this.eventTypeChart.dispose()
    if (this.disasterTimelineChart) this.disasterTimelineChart.dispose()
  },
  methods: {
    initEventTypeChart() {
      if (!this.$refs.eventTypeChart) return
      
      this.eventTypeChart = echarts.init(this.$refs.eventTypeChart)
      
      const typeCount = {}
      typhoonEvents.forEach(event => {
        const type = event.type || 'other'
        typeCount[type] = (typeCount[type] || 0) + 1
      })
      
      const pieData = Object.keys(typeCount).map(type => ({
        name: TYPE_NAMES[type] || type,
        value: typeCount[type],
        itemStyle: {
          color: TYPE_COLORS[type] || '#94a3b8'
        }
      }))
      
      const option = {
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'item',
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          borderColor: 'rgba(251, 191, 36, 0.3)',
          textStyle: {
            color: '#f1f5f9'
          },
          formatter: '{a} <br/>{b}: {c} ({d}%)'
        },
        legend: {
          orient: 'vertical',
          left: 'left',
          textStyle: {
            color: '#cbd5e1',
            fontSize: 10
          }
        },
        series: [
          {
            name: '事件类型',
            type: 'pie',
            radius: ['40%', '70%'],
            avoidLabelOverlap: false,
            itemStyle: {
              borderRadius: 10,
              borderColor: 'rgba(15, 23, 42, 0.9)',
              borderWidth: 2
            },
            label: {
              show: true,
              color: '#f1f5f9',
              fontSize: 11
            },
            emphasis: {
              label: {
                show: true,
                fontSize: 14,
                fontWeight: 'bold'
              }
            },
            labelLine: {
              show: true,
              lineStyle: {
                color: '#64748b'
              }
            },
            data: pieData
          }
        ]
      }
      
      this.eventTypeChart.setOption(option)
    },
    
    initDisasterTimelineChart() {
      if (!this.$refs.disasterTimelineChart) return
      
      this.disasterTimelineChart = echarts.init(this.$refs.disasterTimelineChart)
      
      const times = disasterStats.map(d => {
        const dt = new Date(d.time)
        return `${dt.getMonth() + 1}-${dt.getDate()}`
      })
      
      const option = {
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'axis',
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          borderColor: 'rgba(251, 191, 36, 0.3)',
          textStyle: {
            color: '#f1f5f9'
          },
          axisPointer: {
            type: 'cross'
          }
        },
        legend: {
          data: ['受灾城市', '转移人口', '经济损失'],
          textStyle: {
            color: '#cbd5e1',
            fontSize: 10
          },
          top: 0
        },
        grid: {
          left: '15%',
          right: '15%',
          top: '20%',
          bottom: '15%'
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
            fontSize: 10
          },
          axisTick: {
            show: false
          }
        },
        yAxis: [
          {
            type: 'value',
            name: '受灾城市',
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
              fontSize: 10
            },
            splitLine: {
              lineStyle: {
                color: 'rgba(148, 163, 184, 0.15)'
              }
            }
          },
          {
            type: 'value',
            name: '转移人口',
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
              fontSize: 10
            },
            splitLine: {
              show: false
            }
          },
          {
            type: 'value',
            name: '经济损失(万)',
            nameTextStyle: {
              color: '#22c55e',
              fontSize: 10
            },
            axisLine: {
              lineStyle: {
                color: 'rgba(34, 197, 94, 0.4)'
              }
            },
            axisLabel: {
              color: '#22c55e',
              fontSize: 10
            },
            splitLine: {
              show: false
            }
          }
        ],
        series: [
          {
            name: '受灾城市',
            type: 'bar',
            yAxisIndex: 0,
            data: disasterStats.map(d => d.impactedCities),
            itemStyle: {
              color: '#f97316',
              borderRadius: [4, 4, 0, 0]
            }
          },
          {
            name: '转移人口',
            type: 'line',
            yAxisIndex: 1,
            data: disasterStats.map(d => d.transferredPeople),
            smooth: true,
            symbol: 'circle',
            symbolSize: 6,
            lineStyle: {
              color: '#3b82f6',
              width: 2
            },
            itemStyle: {
              color: '#3b82f6'
            }
          },
          {
            name: '经济损失',
            type: 'line',
            yAxisIndex: 2,
            data: disasterStats.map(d => d.estimatedLoss),
            smooth: true,
            symbol: 'circle',
            symbolSize: 6,
            lineStyle: {
              color: '#22c55e',
              width: 2
            },
            itemStyle: {
              color: '#22c55e'
            }
          }
        ]
      }
      
      this.disasterTimelineChart.setOption(option)
    }
  }
}
</script>

<style scoped>
.charts-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.chart-card {
  padding: 12px;
  border-radius: 10px;
  border: 1px solid rgba(251, 191, 36, 0.25);
  background: rgba(15, 23, 42, 0.55);
}

.chart-title {
  font-size: 12px;
  font-weight: 700;
  color: #fde68a;
  margin-bottom: 8px;
}

.chart-wrap {
  width: 100%;
  height: 240px;
  border-radius: 6px;
  background: rgba(2, 6, 23, 0.45);
}
</style>
