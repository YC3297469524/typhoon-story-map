#!/usr/bin/env python3
"""
处理VNP46A2卫星灯光数据，提取温州地区的时间序列数据
"""

import h5py
import json
import os
from datetime import datetime, timedelta
import numpy as np
from collections import defaultdict
from pathlib import Path

# 配置
PROJECT_ROOT = Path(__file__).resolve().parent
INPUT_DIR = Path(os.getenv('VNP46A2_INPUT_DIR', PROJECT_ROOT / 'data' / 'vnp46a2_raw')).expanduser().resolve()
OUTPUT_DIR = Path(os.getenv('NIGHTLIGHTS_OUTPUT_DIR', PROJECT_ROOT / 'public' / 'leaflet-index')).expanduser().resolve()
EXPORT_SCOPE = os.getenv('NIGHTLIGHTS_EXPORT_SCOPE', 'all').strip().lower()  # all | wenzhou
PIXEL_STRIDE = max(1, int(os.getenv('NIGHTLIGHTS_PIXEL_STRIDE', '1')))
MAX_POINTS_PER_FILE = max(0, int(os.getenv('NIGHTLIGHTS_MAX_POINTS_PER_FILE', '0')))
LIGHT_THRESHOLD = float(os.getenv('NIGHTLIGHTS_LIGHT_THRESHOLD', '8'))
INCLUDE_NO_DATA = os.getenv('NIGHTLIGHTS_INCLUDE_NO_DATA', '0').strip().lower() in ('1', 'true', 'yes')
NO_DATA_STRIDE = max(1, int(os.getenv('NIGHTLIGHTS_NO_DATA_STRIDE', '16')))
WRITE_TIMESERIES = os.getenv('NIGHTLIGHTS_WRITE_TIMESERIES', '0').strip().lower() in ('1', 'true', 'yes')
DEDUP_BY_COORD = os.getenv('NIGHTLIGHTS_DEDUP_BY_COORD', '0').strip().lower() in ('1', 'true', 'yes')
WENZHOU_BOUNDS = {
    'lat_min': 27.0,
    'lat_max': 28.5,
    'lon_min': 119.5,
    'lon_max': 121.5
}

def parse_date_from_filename(filename):
    """从文件名中提取日期, 例如 VNP46A2.A2025181 -> 2025-06-30"""
    try:
        import re
        match = re.search(r'A(\d{7})', filename)
        if match:
            year_day = match.group(1)
            year = int(year_day[:4])
            day_of_year = int(year_day[4:])
            date = datetime(year, 1, 1) + timedelta(days=day_of_year - 1)
            return date
    except:
        pass
    return None

def extract_tile_id(filename):
    """从文件名提取瓦片ID，例如 h29v05"""
    import re
    match = re.search(r'(h\d+v\d+)', filename)
    if match:
        return match.group(1)
    return None


def _find_dataset_in_data_fields(group, candidates):
    """在 Data Fields 下按候选名查找数据集，支持大小写与下划线差异。"""
    if group is None:
        return None

    for name in candidates:
        if name in group:
            return group[name]

    normalized = {k.replace('_', '').lower(): k for k in group.keys()}
    for name in candidates:
        key = normalized.get(name.replace('_', '').lower())
        if key:
            return group[key]
    return None


def _status_priority(status):
    """同坐标多来源去重时使用：LIGHT > NO_LIGHT > NO_DATA。"""
    if status == 'LIGHT':
        return 3
    if status == 'NO_LIGHT':
        return 2
    return 1


def _classify_pixel_status(intensity):
    """按亮度阈值分类像元状态。"""
    if intensity is None or not np.isfinite(intensity):
        return 'NO_DATA'
    if intensity < LIGHT_THRESHOLD:
        return 'NO_LIGHT'
    return 'LIGHT'

def h5_grid_to_points(h5file, region_bounds=None):
    """从HDF5网格数据转换为点数据流。region_bounds=None 时导出全范围。"""
    try:
        with h5py.File(h5file, 'r') as f:
            data_fields = f.get('HDFEOS/GRIDS/VIIRS_Grid_DNB_2d/Data Fields')
            if data_fields is None:
                return

            # 获取灯光数据和坐标
            try:
                dnb_data = data_fields['DNB_BRDF-Corrected_NTL'][:]
            except:
                try:
                    dnb_data = data_fields['Gap_Filled_DNB_BRDF-Corrected_NTL'][:]
                except:
                    return

            try:
                lats = data_fields['lat'][:]
                lons = data_fields['lon'][:]
            except:
                return

            # 质量层是解释“黑块”的关键，存在即导出，不存在则置空。
            mandatory_quality_ds = _find_dataset_in_data_fields(data_fields, [
                'Mandatory_Quality_Flag',
                'MandatoryQualityFlag'
            ])
            cloud_mask_ds = _find_dataset_in_data_fields(data_fields, [
                'QF_Cloud_Mask',
                'Cloud_Mask_QF',
                'Cloud_Mask_Quality_Flag',
                'CloudMaskQualityFlag'
            ])
            snow_flag_ds = _find_dataset_in_data_fields(data_fields, [
                'Snow_Flag',
                'Snow_Ice_Flag',
                'SnowIceFlag'
            ])

            mandatory_quality = mandatory_quality_ds[:] if mandatory_quality_ds is not None else None
            cloud_mask = cloud_mask_ds[:] if cloud_mask_ds is not None else None
            snow_flag = snow_flag_ds[:] if snow_flag_ds is not None else None

            # 支持稀疏采样，避免全范围导出时数据量过大。
            if PIXEL_STRIDE > 1:
                lats = lats[::PIXEL_STRIDE]
                lons = lons[::PIXEL_STRIDE]
                dnb_data = dnb_data[::PIXEL_STRIDE, ::PIXEL_STRIDE]
                if mandatory_quality is not None:
                    mandatory_quality = mandatory_quality[::PIXEL_STRIDE, ::PIXEL_STRIDE]
                if cloud_mask is not None:
                    cloud_mask = cloud_mask[::PIXEL_STRIDE, ::PIXEL_STRIDE]
                if snow_flag is not None:
                    snow_flag = snow_flag[::PIXEL_STRIDE, ::PIXEL_STRIDE]

            region_rows = np.ones(dnb_data.shape[0], dtype=bool)
            region_cols = np.ones(dnb_data.shape[1], dtype=bool)

            # 可选空间裁剪（温州模式）
            if region_bounds is not None:
                region_rows = (lats >= region_bounds['lat_min']) & (lats <= region_bounds['lat_max'])
                region_cols = (lons >= region_bounds['lon_min']) & (lons <= region_bounds['lon_max'])

            produced_points = 0
            for i in range(dnb_data.shape[0]):
                if not region_rows[i]:
                    continue

                row_values = dnb_data[i]
                valid_row_mask = region_cols & np.isfinite(row_values) & (row_values >= 0)
                valid_cols = np.where(valid_row_mask)[0]

                for j in valid_cols.tolist():
                    intensity_value = float(row_values[j])
                    mandatory_quality_value = int(mandatory_quality[i, j]) if mandatory_quality is not None else None
                    cloud_mask_value = int(cloud_mask[i, j]) if cloud_mask is not None else None
                    snow_flag_value = int(snow_flag[i, j]) if snow_flag is not None else None
                    pixel_status = _classify_pixel_status(intensity_value)

                    yield {
                        'lat': round(float(lats[i]), 6),
                        'lon': round(float(lons[j]), 6),
                        'intensity': round(intensity_value, 2),
                        'mandatoryQuality': mandatory_quality_value,
                        'cloudMaskQuality': cloud_mask_value,
                        'snowFlag': snow_flag_value,
                        'pixelStatus': pixel_status
                    }

                    produced_points += 1
                    if MAX_POINTS_PER_FILE > 0 and produced_points >= MAX_POINTS_PER_FILE:
                        return

                # 可选导出 NO_DATA（默认关闭，避免文件体积激增）
                if INCLUDE_NO_DATA:
                    no_data_row_mask = region_cols & (~valid_row_mask)
                    no_cols = np.where(no_data_row_mask)[0]
                    if NO_DATA_STRIDE > 1 and no_cols.size > 0:
                        no_cols = no_cols[::NO_DATA_STRIDE]

                    for j in no_cols.tolist():
                        yield {
                            'lat': round(float(lats[i]), 6),
                            'lon': round(float(lons[j]), 6),
                            'intensity': None,
                            'mandatoryQuality': None,
                            'cloudMaskQuality': None,
                            'snowFlag': None,
                            'pixelStatus': 'NO_DATA'
                        }
    except Exception as e:
        print(f"  错误: {e}")
        return


def write_json_array(output_file, items):
    """将可迭代对象写成 JSON 数组，避免一次性拼接超大字符串。"""
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write('[\n')
        first = True
        for item in items:
            if not first:
                f.write(',\n')
            json.dump(item, f, ensure_ascii=False)
            first = False
        f.write('\n]\n')

def process_all_files():
    """处理所有H5文件"""
    
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    # 查找所有H5文件
    h5_files = sorted(INPUT_DIR.glob('*.h5'))
    
    region_bounds = WENZHOU_BOUNDS if EXPORT_SCOPE == 'wenzhou' else None
    scope_label = '温州裁剪' if region_bounds is not None else '全范围导出'

    print(f"找到 {len(h5_files)} 个H5文件")
    print(f"导出模式: {scope_label}")
    if region_bounds is not None:
        print(f"处理地区: 温州 (纬度 {WENZHOU_BOUNDS['lat_min']}-{WENZHOU_BOUNDS['lat_max']}, "
              f"经度 {WENZHOU_BOUNDS['lon_min']}-{WENZHOU_BOUNDS['lon_max']})")
    print(f"像元采样步长: {PIXEL_STRIDE}")
    if MAX_POINTS_PER_FILE > 0:
        print(f"单文件最大点数限制: {MAX_POINTS_PER_FILE}")
    print(f"亮度阈值(LIGHT): {LIGHT_THRESHOLD}")
    print(f"导出 NO_DATA: {INCLUDE_NO_DATA} (采样步长: {NO_DATA_STRIDE})")
    print(f"写综合时序文件: {WRITE_TIMESERIES}")
    print(f"跨瓦片坐标去重: {DEDUP_BY_COORD}")
    print()
    
    # 按时间整理文件，改成按天处理，避免把所有点一次性堆进内存。
    files_by_time = defaultdict(list)
    tiles_in_source = set()
    tiles_with_points = set()
    
    for h5file in h5_files:
        filename = h5file.name
        
        # 提取日期
        date = parse_date_from_filename(filename)
        if not date:
            print(f"跳过: {filename} (无法解析日期)")
            continue
        
        tile_id = extract_tile_id(filename)
        if tile_id:
            tiles_in_source.add(tile_id)

        time_str = date.strftime('%Y-%m-%dT12:00')
        files_by_time[time_str].append(h5file)
        
        print(f'登记: {filename} -> {time_str}')
    
    print()
    print(f"提取了 {len(files_by_time)} 个不同时间段的数据")
    if tiles_in_source:
        print(f"输入瓦片数: {len(tiles_in_source)} ({', '.join(sorted(tiles_in_source))})")
    
    # 生成多个时间的JSON文件（每个时间一个文件），按天处理、按天落盘。
    times = []
    total_points = 0
    timeseries_handle = None
    first_timeseries_item = True
    timeseries_file = OUTPUT_DIR / 'radiance_data_timeseries.json'
    if WRITE_TIMESERIES:
        timeseries_handle = open(timeseries_file, 'w', encoding='utf-8')
        timeseries_handle.write('[\n')

    try:
        for time_str in sorted(files_by_time.keys()):
            date_part = time_str.split('T')[0].replace('-', '')
            output_file = OUTPUT_DIR / f'radiance_data_{date_part}.json'

            day_points = {} if DEDUP_BY_COORD else None
            day_count = 0

            with open(output_file, 'w', encoding='utf-8') as day_handle:
                day_handle.write('[\n')
                first_day_item = True

                def write_point(point):
                    nonlocal first_day_item, day_count, first_timeseries_item
                    normalized = {
                        'lat': point['lat'],
                        'lon': point['lon'],
                        'intensity': point['intensity'],
                        'time': time_str,
                        'mandatoryQuality': point.get('mandatoryQuality'),
                        'cloudMaskQuality': point.get('cloudMaskQuality'),
                        'snowFlag': point.get('snowFlag'),
                        'pixelStatus': point.get('pixelStatus', _classify_pixel_status(point.get('intensity')))
                    }

                    if not first_day_item:
                        day_handle.write(',\n')
                    json.dump(normalized, day_handle, ensure_ascii=False)
                    first_day_item = False
                    day_count += 1

                    if timeseries_handle is not None:
                        if not first_timeseries_item:
                            timeseries_handle.write(',\n')
                        json.dump(normalized, timeseries_handle, ensure_ascii=False)
                        first_timeseries_item = False

                for h5file in files_by_time[time_str]:
                    filename = h5file.name
                    tile_id = extract_tile_id(filename)
                    print(f'处理: {filename}')

                    points_count = 0
                    for point in h5_grid_to_points(str(h5file), region_bounds):
                        points_count += 1
                        if DEDUP_BY_COORD:
                            key = (point['lat'], point['lon'])
                            existing = day_points.get(key)
                            if existing is None:
                                day_points[key] = point
                                continue

                            new_priority = _status_priority(point.get('pixelStatus'))
                            old_priority = _status_priority(existing.get('pixelStatus'))
                            if new_priority > old_priority:
                                day_points[key] = point
                                continue

                            if new_priority == old_priority:
                                new_intensity = point.get('intensity')
                                old_intensity = existing.get('intensity')
                                if isinstance(new_intensity, (int, float)) and isinstance(old_intensity, (int, float)):
                                    if new_intensity > old_intensity:
                                        day_points[key] = point
                        else:
                            write_point(point)

                    if points_count:
                        if tile_id:
                            tiles_with_points.add(tile_id)
                        print(f"  -> {points_count} 个数据点 (时间: {time_str})")
                    else:
                        print(f"  -> 未找到有效数据")

                if DEDUP_BY_COORD:
                    for point in day_points.values():
                        write_point(point)

                day_handle.write('\n]\n')

            print(f'SAVED: {output_file.name} ({day_count} 个点)')
            times.append(time_str)
            total_points += day_count
    finally:
        if timeseries_handle is not None:
            timeseries_handle.write('\n]\n')
            timeseries_handle.close()

    if WRITE_TIMESERIES:
        print()
        print(f'SAVED: radiance_data_timeseries.json ({total_points} 个点)')

    # 生成元数据文件
    metadata = {
        'region': 'Wenzhou' if region_bounds is not None else 'FullTiles',
        'bounds': region_bounds,
        'times': times,
        'totalPoints': total_points,
        'source': 'NOAA VNP46A2',
        'description': '温州地区卫星夜间灯光时间序列数据' if region_bounds is not None else '多瓦片全范围卫星夜间灯光时间序列数据',
        'exportScope': EXPORT_SCOPE,
        'pixelStride': PIXEL_STRIDE,
        'maxPointsPerFile': MAX_POINTS_PER_FILE,
        'lightThreshold': LIGHT_THRESHOLD,
        'includeNoData': INCLUDE_NO_DATA,
        'noDataStride': NO_DATA_STRIDE
    }
    
    metadata_file = OUTPUT_DIR / 'radiance_data_metadata.json'
    with open(metadata_file, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)
    
    print(f'SAVED: radiance_data_metadata.json')
    print()
    print(f'时间覆盖: {times[0]} 到 {times[-1]} ({len(times)} 天)')
    
    return times

if __name__ == '__main__':
    process_all_files()
