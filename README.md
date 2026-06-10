台风丹娜丝叙事新闻地图

一个基于 WebGIS 的台风灾害监测可视化系统，通过交互式地图展示台风路径、新闻事件、夜光影像和气象数据的时空演变。

功能特性

交互式地图：基于 Leaflet 的地图展示，支持底图切换、缩放和平移
台风路径回放：按时间轴动态展示台风位置、强度和气压变化
事件时间线：串联新闻、预警、登陆、灾情和重建等关键节点
夜光影像：展示夜间灯光变化，反映受灾区域恢复情况
气象数据叠加：降雨量、云量等气象要素可视化
时间轴控制：支持拖动、播放、暂停的时间轴交互

技术栈

前端框架：Vue 2.6 + Vue CLI
地图引擎：Leaflet 1.9
可视化：ECharts 6.0
数据缓存：IndexedDB

快速开始

安装依赖：npm install

开发模式：npm run serve

生产构建：npm run build

代码检查：npm run lint

项目结构

src/components/     Vue 组件
    MapContainer.vue      地图容器，支持底图切换、图层控制
    EventTimeline.vue     事件时间线展示
    TimelineControl.vue    时间轴播放控制
    TyphoonOverviewCharts.vue   台风强度曲线图
    TrackWindPressureMini.vue   风速气压迷你图
    HeaderBar.vue         顶部导航栏
    Leaflet.vue           Leaflet 地图封装

src/data/          静态数据
    typhoonTrack.js       台风轨迹数据（中央气象台）
    typhoonEvents.js      新闻事件时间线
    rainfallFrames.js     降雨帧数据
    rainfallGridCells.js  降雨格网数据
    nightLightCells.js    夜光格网数据
    alertLogs.js          警报日志
    disasterStats.js      灾情统计
    parse_nmc_typhoon.js  轨迹数据解析脚本

public/leaflet-index/   静态资源
    radiance_images/      夜光影像 PNG 文件
    meteo/imerg/         IMERG 降雨数据（NC4格式）
    meteo/era5/          ERA5 气象数据

scripts/           数据处理脚本
    render_radiance_from_h5.py   夜光 H5 转 PNG
    meteo/               气象数据处理流程

数据说明

台风轨迹：中央气象台台风网（http://typhoon.nmc.cn）
新闻事件：人工整理的关键新闻节点
夜光影像：VIIRS/VNP46A2，覆盖长三角地区
降雨数据：GPM/IMERG 每日产品
气象数据：ERA5 再分析数据

配置说明

环境变量

VUE_APP_DATA_SOURCE - 数据来源（auto/api/static），默认 auto
VUE_APP_API_BASE - API 基础路径，默认 /api
PORT - 开发服务器端口，默认 8080

相关文档

SUMMARY.md                  项目整体说明
DATA_UPDATE_GUIDE.md        台风轨迹数据更新
TRACK_DATA_VALIDATION.md    轨迹数据验证
DEBUG_GUIDE.md              调试模式说明
SPATIAL_TYPES_DOC.md         空间类型与坐标
NIGHTLIGHTS_TIMESERIES_GUIDE.md  夜光数据使用
IMPLEMENTATION_SUMMARY.md    夜光时间轴实现

许可证

MIT License
