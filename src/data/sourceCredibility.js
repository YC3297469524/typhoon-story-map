// 来源可信度映射，用于复盘证据分层与筛选
export const sourceCredibilityMap = {
  '中央气象台': { level: 'official', score: 100, label: '官方' },
  '中国气象局': { level: 'official', score: 100, label: '官方' },
  '香港天文台': { level: 'official', score: 98, label: '官方' },
  '台湾交通部中央气象署': { level: 'official', score: 98, label: '官方' },
  '新华社': { level: 'authoritative-media', score: 95, label: '权威媒体' },
  '央视新闻': { level: 'authoritative-media', score: 93, label: '权威媒体' },
  '央视网': { level: 'authoritative-media', score: 92, label: '权威媒体' },
  '中国天气网': { level: 'professional-media', score: 90, label: '专业媒体' },
  '中央社': { level: 'mainstream-media', score: 88, label: '主流媒体' },
  '中国新闻网': { level: 'mainstream-media', score: 86, label: '主流媒体' }
}
