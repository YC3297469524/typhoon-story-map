// src/data/parse_nmc_typhoon.js
// 解析中央气象台台风网数据并生成完整台风轨迹

const fs = require('fs');
const path = require('path');

// 台风强度代码映射
const intensityMap = {
  'TD': 1,    // 热带低压
  'TS': 2,    // 热带风暴
  'STS': 3,   // 强热带风暴
  'TY': 3,    // 台风
  'STY': 3,   // 强台风
  'TYP': 3,   // 超强台风
  'TY': 3
};

// 台风等级描述
const levelDescriptions = {
  'TD': '热带低压',
  'TS': '热带风暴',
  'STS': '强热带风暴',
  'TY': '台风',
  'STY': '强台风',
  'TYP': '超强台风'
};

// 移动方向映射
const directionMap = {
  'N': '北',
  'NE': '东北',
  'E': '东',
  'SE': '东南',
  'S': '南',
  'SW': '西南',
  'W': '西',
  'NW': '西北',
  'NNE': '北偏东',
  'ENE': '东偏北',
  'ESE': '东偏南',
  'SSE': '南偏东',
  'SSW': '南偏西',
  'WSW': '西偏南',
  'WNW': '西偏北',
  'NNW': '北偏西'
};

// 解析台风网数据
function parseNmcData(data) {
  // 去掉 JSONP 包装
  let jsonStr = data.replace(/^typhoon_jsons_view_\d+\(/, '').replace(/\);?$/, '');
  const parsed = JSON.parse(jsonStr);
  const typhoon = parsed.typhoon;
  const trackPoints = typhoon[8]; // 台风路径数组

  const result = [];

  trackPoints.forEach((point, index) => {
    const [
      id,
      timeStr,
      timestamp,
      level,
      lng,
      lat,
      pressure,
      windSpeed,
      moveDirection,
      moveSpeed,
      windRadii,
      forecast,
      bulletin
    ] = point;

    // 格式化时间
    const year = timeStr.substring(0, 4);
    const month = timeStr.substring(4, 6);
    const day = timeStr.substring(6, 8);
    const hour = timeStr.substring(8, 10);
    const formattedTime = `${year}-${month}-${day}T${hour}:00`;

    // 构建轨迹点
    const trackPoint = {
      time: formattedTime,
      lat: lat,
      lng: lng,
      level: level,
      pressure: pressure,
      windSpeed: windSpeed,
      description: `${levelDescriptions[level] || level} - 路径点 ${index + 1}`,
      intensityCode: intensityMap[level] || 1,
      moveSpeed: moveSpeed,
      moveDirection: directionMap[moveDirection] || moveDirection
    };

    // 如果有预报数据，也加上
    if (forecast) {
      trackPoint.forecast = forecast;
    }
    if (windRadii && windRadii.length > 0) {
      trackPoint.windRadii = windRadii;
    }

    result.push(trackPoint);
  });

  return result;
}

// 生成 typhoonTrack.js
function generateTrackFile() {
  const inputPath = path.join(__dirname, 'raw', 'nmc_typhoon_3049534.txt');
  const outputPath = path.join(__dirname, 'typhoonTrack.js');

  if (!fs.existsSync(inputPath)) {
    console.error('错误：找不到输入文件', inputPath);
    process.exit(1);
  }

  const rawData = fs.readFileSync(inputPath, 'utf-8');
  const trackPoints = parseNmcData(rawData);

  const code = `// src/data/typhoonTrack.js — 丹娜丝（2504）台风轨迹（中央气象台台风网真实数据）
// 说明：由 src/data/parse_nmc_typhoon.js 解析台风网接口数据生成，包含真实观测值
// 数据来源：中央气象台台风网 http://typhoon.nmc.cn
// 生成日期: ${new Date().toISOString().split('T')[0]}

export const typhoonTrack = ${JSON.stringify(trackPoints, null, 2)};
`;

  fs.writeFileSync(outputPath, code, 'utf-8');
  console.log(`✅ 成功解析台风网数据！`);
  console.log(`   共 ${trackPoints.length} 个路径点已生成`);
  console.log(`   输出到: ${outputPath}`);
}

// 执行
generateTrackFile();
