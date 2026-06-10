气象数据处理流程

这个目录用来补充台风影响分析中的气象证据。现在主要处理三类内容。第一类是 IMERG 日降雨。第二类是 ERA5 小时级降雨和云量。第三类是夜光可判读性统计。

开始前先复制配置模板，把 meteo_config.example.json 复制成 meteo_config.json，然后根据分析窗口和区域边界修改配置。配置里最重要的是时间范围和目标区域。

下载 IMERG 时需要设置 Earthdata token，然后运行 download_imerg_daily_from_cmr.py。下载结果会放到 public 目录下的 meteo imerg 文件夹。

下载 ERA5 时需要先安装 cdsapi，再配置 CDS 账号，然后运行 download_era5_from_cds.py。下载结果会放到 public 目录下的 meteo era5 文件夹。

如果要生成夜光可判读性统计，就运行 compute_nightlight_observability.py。这个脚本会输出汇总文件，供后续判断哪些区域是变暗，哪些区域只是因为云和观测条件变差而看不清。

这套流程的推荐顺序是先看可判读性比例，再看夜光变化，最后用降雨和云量做解释。这样可以减少把观测问题误判成真实变化。
