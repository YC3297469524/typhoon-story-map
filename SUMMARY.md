台风丹娜丝项目说明

台风丹娜丝（国际编号 2504）于 2025 年 7 月初生成，穿越菲律宾海后在台湾岛东北部近海停滞，后期转向长江三角洲地区。本项目整合了台风轨迹、新闻事件、夜光影像和气象数据，通过交互式叙事地图呈现台风全过程。

数据概况

轨迹数据来自中央气象台台风网，包含每小时观测点，记录了台风从热带低压到登陆后的完整路径。每个点包含经纬度、气压、风速、移动方向和未来预报信息。

新闻事件经过人工筛选，只保留可核验的关键节点，包括台风生成编号、各地警报、登陆台湾、转向长三角等重要时刻。

夜光数据覆盖长三角地区，时间跨度 2025 年 6 月底到 7 月中旬，共 10 个时间点。原始数据来自 VIIRS VNP46A2 产品，处理成 PNG 影像供前端叠加。

降雨数据使用 IMERG 每日产品，覆盖台风影响期间。云量和降水来自 ERA5 再分析数据。

组件结构

MapContainer.vue 是核心组件，负责地图渲染、图层叠加和时间轴联动。包含底图切换、台风路径绘制、夜光叠加、降雨叠加等功能模块。

EventTimeline.vue 显示新闻事件时间线，支持按类型筛选。 TyphoonOverviewCharts.vue 和 TrackWindPressureMini.vue 展示风速气压曲线。

TimelineControl.vue 处理时间轴拖动、播放和暂停。

数据更新

台风轨迹更新需要修改 src/data/raw/nmc_typhoon_3049534.txt，然后运行 node src/data/parse_nmc_typhoon.js 重新生成 typhoonTrack.js。

夜光数据处理使用 scripts/render_radiance_from_h5.py，将原始 H5 文件转换为 public/leaflet-index/radiance_images/ 目录下的 PNG 文件。

气象数据处理脚本位于 scripts/meteo/ 目录，包括 IMERG 和 ERA5 的下载和处理流程。
