台风轨迹数据更新说明

数据来源

台风轨迹原始数据从中央气象台台风网获取。下载后保存为 src/data/raw/nmc_typhoon_3049534.txt。

解析脚本

src/data/parse_nmc_typhoon.js 负责解析原始数据，输出 typhoonTrack.js。脚本会清理 JSONP 包装，提取轨迹数组，转换为标准格式。

更新步骤

第一步，确认原始文件已保存到 src/data/raw/ 目录。

第二步，运行解析脚本。

node src/data/parse_nmc_typhoon.js

第三步，检查生成的 typhoonTrack.js 文件。确认时间顺序正确，经纬度在合理范围内，风速和气压数据完整。

数据字段

解析后的数据包含以下字段：time（时间）、lat（纬度）、lng（经度）、level（等级）、pressure（气压）、windSpeed（风速）、description（描述）、intensityCode（强度代码）、moveSpeed（移动速度）、moveDirection（移动方向）、forecast（预报）、windRadii（风圈半径）。

前端组件直接读取这些字段进行展示。

验证方法

打开浏览器开发者工具，检查以下内容：轨迹点时间是否连续递增、坐标是否落在合理区域（西北太平洋）、台风等级变化是否符合物理规律、预报信息是否存在且合理。

注意事项

如果原始数据格式发生变化，需要相应修改 parse_nmc_typhoon.js 中的解析逻辑。备份旧版本的 typhoonTrack.js 以便对比。
