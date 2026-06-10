夜光时间轴功能实现说明

功能目标

实现多个时间点的夜光影像随时间轴变化而切换，让用户能够观察台风影响期间夜间灯光的动态变化。

技术方案

原始数据来自 NASA VIIRS VNP46A2 H5 文件。每个 H5 文件包含一天的所有观测数据，需要提取目标区域（长三角地区）的灯光强度值。

处理脚本 process_vnp46a2.py（或 render_radiance_from_h5.py）完成以下工作：读取 H5 文件、筛选目标区域、提取灯光强度、按日期输出处理结果。输出包括按日期分开的 JSON 数据文件和 PNG 影像文件。

前端实现

MapContainer.vue 组件中实现了夜光时间轴功能。组件包含以下关键方法：

loadNightlightsMetadata() 读取元数据，获取可用时间点列表。
loadDailyNightLights(date) 加载指定日期的夜光数据。
updateNightLightForCurrentTime() 根据当前时间轴位置更新夜光图层。

按需加载

为了减少首屏加载时间，采用按需加载策略。首先加载元数据文件（很小），然后只加载当前日期对应的数据文件。用户拖动时间轴时，再动态加载其他日期的数据。

与时间轴联动

时间轴组件 TimelineControl 维护当前时间 currentTime。MapContainer 监听这个值的变化，找到最接近的可用夜光日期，加载对应图层。

图层控制

夜光图层使用 Leaflet 的 imageOverlay 或 canvas 方式叠加。支持透明度调整，可以与底图和其他数据图层叠加展示。
