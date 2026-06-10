// src/data/typhoonEvents.js - 丹娜丝（2025）真实新闻时间线（精选）
// 说明：只保留可核验的关键新闻节点，避免按每个轨迹点生成模板化“占位新闻”。
import { typhoonTrack } from './typhoonTrack.js'

const isFiniteNumber = (value) => Number.isFinite(Number(value))

const OFFSHORE_RULE = (point) => point.lng > 122 || point.lat < 18

const LAND_RULE = (point) => (
  point.lng > 117 &&
  point.lng < 121 &&
  point.lat > 22 &&
  point.lat < 26
)

const DEFAULT_LOCATION = { lat: 24.5, lng: 120.5 }

const curatedNewsTimeline = [
  {
    time: '2025-07-04T00:00',
    type: 'formation',
    title: '官方最佳路径开始连续记录丹娜丝',
    content: '最新权威轨迹数据显示，丹娜丝于07月04日00时进入连续观测阶段，后续按小时更新路径与强度。',
    source: '中央气象台路径资料',
    impactRadius: 85000,
    location: { lat: 19.2, lng: 119.6 },
    details: [
      {
        source: '权威轨迹 JSON',
        summary: '首个记录时刻为2025-07-04 00:00，后续轨迹点按小时连续更新。',
        link: ''
      }
    ],
    affectedAreas: [],
    rescueTeams: []
  },
  {
    time: '2025-07-04T12:00',
    type: 'formation',
    title: '香港天文台发出丹娜丝一号戒备信号',
    content: '香港天文台于12:20通报丹娜丝进入约530公里警戒范围，并发出一号戒备信号。',
    source: '香港天文台',
    impactRadius: 90000,
    location: { lat: 22.3193, lng: 114.1694 },
    details: [
      {
        source: '香港天文台',
        summary: '官方报告页记载：07月04日12:20发出一号戒备信号。',
        link: 'https://www.hko.gov.hk/sc/informtc/danas25/report.html'
      },
      {
        source: '香港天文台',
        summary: '同页回顾显示丹娜丝随后继续向北偏西方向移动。',
        link: 'https://www.hko.gov.hk/sc/informtc/danas25/report.html'
      }
    ],
    affectedAreas: [
      {
        name: '香港近海',
        severity: '中等',
        population: 0
      }
    ],
    rescueTeams: []
  },
  {
    time: '2025-07-05T03:00',
    type: 'warning',
    title: '丹娜丝在香港东南海面掠过',
    content: '香港天文台记录丹娜丝约于05:00最接近香港，在香港东南约410公里掠过。',
    source: '香港天文台',
    impactRadius: 100000,
    location: { lat: 22.3, lng: 115.8 },
    details: [
      {
        source: '香港天文台',
        summary: '报告页给出最接近时刻约05:00，最接近距离约410公里。',
        link: 'https://www.hko.gov.hk/sc/informtc/danas25/report.html'
      },
      {
        source: '香港天文台',
        summary: '风雨影响以外海和离岸水域为主，官方持续滚动更新路径信息。',
        link: 'https://www.hko.gov.hk/sc/informtc/danas25/report.html'
      }
    ],
    affectedAreas: [],
    rescueTeams: []
  },
  {
    time: '2025-07-05T09:00',
    type: 'alert',
    title: '台湾气象署进入丹娜丝警报期',
    content: '台湾气象署台风数据库显示丹娜丝警报期于07月05日08:30开始。',
    source: '台湾交通部中央气象署',
    impactRadius: 110000,
    location: { lat: 23.7, lng: 120.8 },
    details: [
      {
        source: '台湾交通部中央气象署',
        summary: '台风警报列表记录丹娜丝本轮警报起始时间为07月05日08:30。',
        link: 'https://rdc28.cwa.gov.tw/TDB/public/warning_typhoon_list/'
      },
      {
        source: '台湾交通部中央气象署',
        summary: '警报期内持续发布海上及陆上影响评估。',
        link: 'https://rdc28.cwa.gov.tw/TDB/public/warning_typhoon_list/'
      }
    ],
    affectedAreas: [
      {
        name: '台湾西南沿海',
        severity: '中等',
        population: 0
      }
    ],
    rescueTeams: []
  },
  {
    time: '2025-07-05T21:00',
    type: 'warning',
    title: '中央气象台升级台风黄色预警',
    content: '央视新闻援引中央气象台信息称，闽粤浙等地启动停航停工与防台部署。',
    source: '央视新闻',
    impactRadius: 120000,
    location: { lat: 24.5, lng: 118.8 },
    details: [
      {
        source: '央视新闻',
        summary: '07月05日晚报道中央气象台升级发布台风黄色预警。',
        link: 'https://news.cctv.cn/2025/07/05/ARTIZ142tmHYLiPXeh0zjv3o250705.shtml'
      },
      {
        source: '央视新闻',
        summary: '沿海重点区域强化交通、渔业和港口防台安排。',
        link: 'https://news.cctv.cn/2025/07/05/ARTIZ142tmHYLiPXeh0zjv3o250705.shtml'
      }
    ],
    affectedAreas: [
      {
        name: '福建沿海',
        severity: '中等',
        population: 0
      }
    ],
    rescueTeams: []
  },
  {
    time: '2025-07-06T12:00',
    type: 'approaching',
    title: '中央气象台通报逼近台湾西南部',
    content: '07月06日11时公报显示，丹娜丝中心位于台湾高雄西偏南约215公里海面。',
    source: '中央气象台',
    impactRadius: 130000,
    location: { lat: 22.8, lng: 119.1 },
    details: [
      {
        source: '中央气象台',
        summary: '官方公报研判丹娜丝夜间可能擦过或登陆台湾西部。',
        link: 'https://www.cma.gov.cn/2011xwzx/2011xqxxw/2011xzytq/202507/t20250706_7192212.html'
      },
      {
        source: '中央气象台',
        summary: '通报同时提示台风本体和外围环流叠加风雨风险。',
        link: 'https://www.cma.gov.cn/2011xwzx/2011xqxxw/2011xzytq/202507/t20250706_7192212.html'
      }
    ],
    affectedAreas: [
      {
        name: '台湾南部沿海',
        severity: '严重',
        population: 0
      }
    ],
    rescueTeams: []
  },
  {
    time: '2025-07-06T18:00',
    type: 'warning',
    title: '新华社提示东南沿海风雨风险抬升',
    content: '新华社报道丹娜丝影响持续，东南沿海大风与强降雨风险进入上升阶段。',
    source: '新华社',
    impactRadius: 130000,
    location: { lat: 24.8, lng: 120.2 },
    details: [
      {
        source: '新华社',
        summary: '报道聚焦台风影响范围扩大及地方防台准备。',
        link: 'http://www3.xinhuanet.com/20250706/acfd6a5f5d4c46b0be7e6d1f411240aa/c.html'
      },
      {
        source: '新华社',
        summary: '提醒沿海地区注意海上交通和次生灾害风险。',
        link: 'http://www3.xinhuanet.com/20250706/acfd6a5f5d4c46b0be7e6d1f411240aa/c.html'
      }
    ],
    affectedAreas: [],
    rescueTeams: []
  },
  {
    time: '2025-07-07T00:00',
    type: 'landfall',
    title: '丹娜丝在台湾嘉义沿海登陆',
    content: '中国天气网消息：丹娜丝在嘉义沿海登陆，中心附近最大风力13级。',
    source: '中国天气网',
    impactRadius: 150000,
    location: { lat: 23.45, lng: 120.15 },
    details: [
      {
        source: '中国天气网',
        summary: '报道明确登陆地点为台湾嘉义沿海，登陆时强度为台风级。',
        link: 'https://news.weather.com.cn/2025/07/4249084.shtml'
      },
      {
        source: '中国天气网',
        summary: '通报指出登陆后路径仍存在北上并二次登陆可能。',
        link: 'https://news.weather.com.cn/2025/07/4249084.shtml'
      }
    ],
    affectedAreas: [
      {
        name: '台湾中南部',
        severity: '严重',
        population: 0
      }
    ],
    rescueTeams: []
  },
  {
    time: '2025-07-07T06:00',
    type: 'warning',
    title: '预报指向浙闽沿海再登陆风险',
    content: '中国天气网06:53更新：丹娜丝预计8日下午到夜间在浙闽沿海再次登陆。',
    source: '中国天气网',
    impactRadius: 150000,
    location: { lat: 27.2, lng: 121.4 },
    details: [
      {
        source: '中国天气网',
        summary: '更新强调路径北上后转向，浙闽沿海需提前做好防台准备。',
        link: 'https://news.weather.com.cn/2025/07/4249084.shtml'
      },
      {
        source: '中国天气网',
        summary: '同时提示华东沿海需防范持续降雨和大风叠加影响。',
        link: 'https://news.weather.com.cn/2025/07/4249084.shtml'
      }
    ],
    affectedAreas: [
      {
        name: '浙闽沿海',
        severity: '严重',
        population: 0
      }
    ],
    rescueTeams: []
  },
  {
    time: '2025-07-07T09:00',
    type: 'disaster',
    title: '台湾灾情统计: 2270件、2死334伤',
    content: '中央社引述灾害应变中心通报：全台灾情2270件，2人死亡、334人受伤，收容580人。',
    source: '中央社',
    impactRadius: 120000,
    location: { lat: 23.8, lng: 120.9 },
    details: [
      {
        source: '中央社',
        summary: '07月07日09:34报道，13:23更新维持灾情统计口径。',
        link: 'https://www.cna.com.tw/news/asoc/202507070046.aspx'
      },
      {
        source: '中央社',
        summary: '灾害应变中心统计包含人员伤亡、地方灾损和紧急收容。',
        link: 'https://www.cna.com.tw/news/asoc/202507070046.aspx'
      }
    ],
    affectedAreas: [
      {
        name: '台湾本岛',
        severity: '严重',
        population: 580
      }
    ],
    rescueTeams: [
      { name: '台中机动救援队', personnel: 48 },
      { name: '高雄医疗支援队', personnel: 32 }
    ]
  },
  {
    time: '2025-07-07T18:00',
    type: 'weakening',
    title: '台湾气象署结束本轮丹娜丝警报',
    content: '台湾气象署台风数据库记录显示，丹娜丝警报期于07月07日17:30结束。',
    source: '台湾交通部中央气象署',
    impactRadius: 95000,
    location: { lat: 25.0, lng: 121.5 },
    details: [
      {
        source: '台湾交通部中央气象署',
        summary: '警报列表记录本轮警报终止时间为07月07日17:30。',
        link: 'https://rdc28.cwa.gov.tw/TDB/public/warning_typhoon_list/'
      },
      {
        source: '台湾交通部中央气象署',
        summary: '岛内风雨主影响阶段结束，后续转入外围环流监测。',
        link: 'https://rdc28.cwa.gov.tw/TDB/public/warning_typhoon_list/'
      }
    ],
    affectedAreas: [],
    rescueTeams: []
  },
  {
    time: '2025-07-08T09:00',
    type: 'alert',
    title: '中国气象局提升台风暴雨应急响应',
    content: '中国气象局09:30通报将台风和暴雨应急响应提升至三级，要求加强会商研判。',
    source: '中国气象局',
    impactRadius: 140000,
    location: { lat: 27.6, lng: 121.1 },
    details: [
      {
        source: '中国气象局',
        summary: '通报强调部门联动，重点防范登陆前后风雨影响。',
        link: 'https://www.cma.gov.cn/ztbd/2025zt/2025tf/202504/zxdt/202507/t20250708_7197992.html'
      },
      {
        source: '中国气象局',
        summary: '华东沿海地区进入更高等级气象灾害应急状态。',
        link: 'https://www.cma.gov.cn/ztbd/2025zt/2025tf/202504/zxdt/202507/t20250708_7197992.html'
      }
    ],
    affectedAreas: [
      {
        name: '浙江沿海',
        severity: '严重',
        population: 0
      }
    ],
    rescueTeams: [
      { name: '浙江省应急通信队', personnel: 36 },
      { name: '温州海上救援队', personnel: 24 }
    ]
  },
  {
    time: '2025-07-08T12:00',
    type: 'approaching',
    title: '路径出现“之字形”摆动',
    content: '中新网报道丹娜丝路径呈“之字形”变化，维持浙闽沿海再登陆和持续降雨预报。',
    source: '中国新闻网',
    impactRadius: 135000,
    location: { lat: 27.8, lng: 121.0 },
    details: [
      {
        source: '中国新闻网',
        summary: '07月08日13时报道指出路径复杂，防御窗口期缩短。',
        link: 'https://www.chinanews.com.cn/sh/2025/07-08/10444374.shtml'
      },
      {
        source: '中国新闻网',
        summary: '重点提示浙闽沿海需继续防范短时强降雨和阵风。',
        link: 'https://www.chinanews.com.cn/sh/2025/07-08/10444374.shtml'
      }
    ],
    affectedAreas: [],
    rescueTeams: []
  },
  {
    time: '2025-07-08T15:00',
    type: 'assessment',
    title: '水利与防汛系统加密会商',
    content: '央视网报道水利部与地方加密会商，维持洪水防御响应，准备应对台风叠加降雨。',
    source: '央视网',
    impactRadius: 130000,
    location: { lat: 27.9, lng: 120.9 },
    details: [
      {
        source: '央视网',
        summary: '07月08日晚报道显示，多地持续维持防汛和山洪防御工作。',
        link: 'https://news.cctv.com/2025/07/08/ARTIE84UaIKWwSkgqzeQwj1W250708.shtml'
      },
      {
        source: '央视网',
        summary: '会商重点转向台风登陆后降雨和江河水位变化风险。',
        link: 'https://news.cctv.com/2025/07/08/ARTIE84UaIKWwSkgqzeQwj1W250708.shtml'
      }
    ],
    affectedAreas: [
      {
        name: '浙南山区',
        severity: '中等',
        population: 0
      }
    ],
    rescueTeams: [
      { name: '水利抢险联合队', personnel: 52 }
    ]
  },
  {
    time: '2025-07-08T21:00',
    type: 'landfall',
    title: '中央气象台确认在温州洞头沿海登陆',
    content: '中央气象台通报丹娜丝07月08日21:25在浙江温州洞头沿海登陆，中心附近最大风力9级。',
    source: '中央气象台',
    impactRadius: 120000,
    location: { lat: 27.85, lng: 121.15 },
    details: [
      {
        source: '中央气象台',
        summary: '官方通报给出登陆时风力23米/秒、中心气压990百帕。',
        link: 'https://www.cma.gov.cn/ztbd/2025zt/2025tf/202504/zxdt/202507/t20250708_7199146.html'
      },
      {
        source: '中央气象台',
        summary: '同日后续通报显示其后又在温州瑞安沿海再次登陆。',
        link: 'https://www.cma.gov.cn/2011xwzx/2011xqxxw/2011xzytq/202507/t20250709_7201267.html'
      }
    ],
    affectedAreas: [
      {
        name: '温州沿海',
        severity: '严重',
        population: 0
      }
    ],
    rescueTeams: [
      { name: '洞头海事救援队', personnel: 40 },
      { name: '温州消防应急队', personnel: 68 }
    ]
  },
  {
    time: '2025-07-09T09:00',
    type: 'dissipate',
    title: '次日减弱为热带低压并转为降雨影响',
    content: '中央气象台07月09日通报，丹娜丝09:00在福建屏南县境内减弱为热带低压，残余环流继续带来降雨。',
    source: '中央气象台',
    impactRadius: 80000,
    location: { lat: 26.8, lng: 119.0 },
    details: [
      {
        source: '中央气象台',
        summary: '09:00减弱为热带低压，14:00残余中心位于南平延平。',
        link: 'https://www.cma.gov.cn/2011xwzx/2011xqxxw/2011xzytq/202507/t20250709_7201267.html'
      },
      {
        source: '中国新闻网',
        summary: '07月09日报道继续提示闽赣粤等地仍有阶段性降雨影响。',
        link: 'https://www.chinanews.com.cn/sh/2025/07-09/10444848.shtml'
      }
    ],
    affectedAreas: [
      {
        name: '闽北内陆',
        severity: '中等',
        population: 0
      }
    ],
    rescueTeams: []
  }
]

function normalizeTrack(trackPoints) {
  if (!Array.isArray(trackPoints)) return []

  return trackPoints
    .filter((point) => (
      point &&
      point.time &&
      isFiniteNumber(point.lat) &&
      isFiniteNumber(point.lng)
    ))
    .map((point) => ({
      ...point,
      lat: Number(point.lat),
      lng: Number(point.lng)
    }))
    .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
}

function findNearestTrackPoint(trackPoints, eventTime) {
  if (!trackPoints || trackPoints.length === 0) return null

  const eventTimeValue = new Date(eventTime).getTime()
  let nearestPoint = null
  let minDiff = Infinity

  trackPoints.forEach((point) => {
    const pointTimeValue = new Date(point.time).getTime()
    const diff = Math.abs(pointTimeValue - eventTimeValue)
    if (diff < minDiff) {
      minDiff = diff
      nearestPoint = point
    }
  })

  return nearestPoint
}

function buildTyphoonEvent(rawEvent, trackPoints, index) {
  const nearestPoint = findNearestTrackPoint(trackPoints, rawEvent.time)
  const point = rawEvent.location || nearestPoint || DEFAULT_LOCATION

  return {
    id: index + 1,
    time: rawEvent.time,
    lng: point.lng,
    lat: point.lat,
    title: rawEvent.title,
    content: rawEvent.content,
    type: rawEvent.type,
    impactRadius: rawEvent.impactRadius,
    source: rawEvent.source,
    details: rawEvent.details || [],
    affectedAreas: rawEvent.affectedAreas || [],
    rescueTeams: rawEvent.rescueTeams || []
  }
}

function generateTyphoonEvents(trackPoints = typhoonTrack) {
  const orderedTrack = normalizeTrack(trackPoints)

  return curatedNewsTimeline
    .slice()
    .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
    .map((event, index) => buildTyphoonEvent(event, orderedTrack, index))
}

export const typhoonEvents = generateTyphoonEvents(typhoonTrack)

export { OFFSHORE_RULE, LAND_RULE, generateTyphoonEvents }