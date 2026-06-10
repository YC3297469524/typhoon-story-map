夜光时间轴功能使用说明

数据覆盖

夜光数据覆盖长三角地区，时间范围从 2025 年 6 月 30 日到 7 月 15 日，共 10 个时间点。数据来自 VIIRS VNP46A2 产品，经过处理后生成 PNG 影像供前端展示。

数据文件

public/leaflet-index/radiance_images/ 目录下存放按日期命名的 PNG 文件，如 radiance_image_20250630.png、radiance_image_20250701.png 等。

元数据文件包括 radiance_images_metadata.json 和 radiance_data_metadata.json，记录每个时间点的地理范围和影像参数。

使用方式

MapContainer.vue 组件负责加载和展示夜光数据。加载流程如下：首先读取元数据文件获取可用时间点列表，然后根据当前时间轴位置选择最接近的日期，最后加载对应日期的 PNG 文件叠加到地图上。

时间轴联动

当用户拖动时间轴时，夜光图层会自动切换到对应日期的数据。如果某个日期没有可用数据，会自动选择最近的可用时间点。

界面控制

地图右上角的控制面板可以切换夜光图层的显示和隐藏。还可以切换不同的夜光处理模式，如标准模式显示原始灯光强度。

数据更新

如果需要处理新的夜光数据，运行 scripts/render_radiance_from_h5.py 脚本。输入是 VNP46A2 H5 文件，输出 PNG 影像到 public/leaflet-index/radiance_images/ 目录。处理完成后需要更新元数据文件。

注意事项

夜光数据受云层和大气条件影响，部分日期可能数据质量较差。长江三角洲地区夜间灯光密集，适合做灾害前后对比分析。
