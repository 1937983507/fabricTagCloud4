#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CSV转JSON脚本
将chinapoi.csv转换为chinapoi.json
"""

import os
import json
import csv
import sys
from pathlib import Path

# 获取脚本所在目录
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent

# 路径配置
CSV_PATH = PROJECT_ROOT / 'public' / 'data' / 'chinapoi.csv'
JSON_PATH = PROJECT_ROOT / 'public' / 'data' / 'chinapoi.json'


def convert_csv_to_json():
    """转换CSV文件为JSON格式"""
    print('开始转换CSV到JSON...')
    print(f'读取文件: {CSV_PATH}')
    
    if not CSV_PATH.exists():
        raise FileNotFoundError(f'CSV文件不存在: {CSV_PATH}')
    
    # 获取原始文件大小
    original_size = CSV_PATH.stat().st_size
    
    # 尝试多种编码读取CSV
    encodings = ['utf-8-sig', 'utf-8', 'gb18030', 'gbk']
    csv_text = None
    used_encoding = None
    
    for encoding in encodings:
        try:
            with open(CSV_PATH, 'r', encoding=encoding) as f:
                csv_text = f.read()
            if csv_text and csv_text.strip():
                used_encoding = encoding
                print(f'✓ 成功使用编码: {encoding}')
                break
        except (UnicodeDecodeError, UnicodeError) as e:
            print(f'✗ 编码 {encoding} 失败: {e}')
            continue
    
    if not csv_text:
        raise ValueError('无法使用任何编码读取CSV文件')
    
    # 解析CSV
    lines = csv_text.strip().split('\n')
    print(f'总行数: {len(lines)}')
    
    poi_list = []
    
    # 使用csv模块解析，处理引号内的逗号
    csv_reader = csv.reader(lines)
    
    # 跳过表头（第一行）
    header = next(csv_reader, None)
    if header:
        print(f'表头: {header}')
    
    # 解析数据行
    for i, row in enumerate(csv_reader, start=2):
        if len(row) < 6:
            print(f'警告: 第 {i} 行数据不完整，跳过')
            continue
        
        try:
            pname = row[0].strip() if row[0] else ''
            X_gcj02 = float(row[1])
            Y_gcj02 = float(row[2])
            city = row[3].strip() if row[3] else ''
            rankInCity = int(row[4]) if row[4] else 0
            rankInChina = int(row[5]) if row[5] else 0
            name_en = row[6].strip() if len(row) >= 7 and row[6] else ''
            
            # 验证数据有效性
            if not pname or (X_gcj02 == 0 and Y_gcj02 == 0):
                print(f'警告: 第 {i} 行数据无效，跳过')
                continue
            
            poi_list.append({
                'id': len(poi_list),
                'name': pname,
                'name_en': name_en,
                'city': city,
                'rank': rankInChina,
                'rankInCity': rankInCity,
                'lng': X_gcj02,
                'lat': Y_gcj02,
            })
        except (ValueError, IndexError) as e:
            print(f'警告: 第 {i} 行解析失败: {e}，跳过')
            continue
    
    print(f'成功解析 {len(poi_list)} 条POI数据')
    
    # 确保输出目录存在
    JSON_PATH.parent.mkdir(parents=True, exist_ok=True)
    
    # 写入JSON文件（使用紧凑格式以减小文件大小）
    with open(JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(poi_list, f, ensure_ascii=False, separators=(',', ':'))
    
    # 统计信息
    json_size = JSON_PATH.stat().st_size
    size_diff = ((json_size - original_size) / original_size * 100)
    
    print(f'✓ JSON文件已生成: {JSON_PATH}')
    print(f'  原始CSV大小: {original_size / 1024 / 1024:.2f} MB')
    print(f'  JSON大小: {json_size / 1024 / 1024:.2f} MB')
    print(f'  大小变化: {size_diff:+.2f}%')
    
    return len(poi_list)


if __name__ == '__main__':
    try:
        count = convert_csv_to_json()
        print(f'\n✓ 转换完成！共 {count} 条数据')
        sys.exit(0)
    except Exception as e:
        print(f'\n✗ 转换失败: {e}')
        import traceback
        traceback.print_exc()
        sys.exit(1)

