<template>
  <div class="map-wrapper">
    <header class="map-head">
      <el-dropdown 
        trigger="click" 
        @command="handleDrawCommand"
      >
        <span class="el-dropdown-link dropdown-btn" data-intro-target="dataFilterBtn">
          数据筛选
          <el-icon><ArrowDown /></el-icon>
        </span>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="drawCircle" :disabled="poiStore.hasDrawing">圆形筛选</el-dropdown-item>
            <el-dropdown-item command="drawRectangle" :disabled="poiStore.hasDrawing">矩形筛选</el-dropdown-item>
            <el-dropdown-item command="drawPolygon" :disabled="poiStore.hasDrawing">多边形筛选</el-dropdown-item>
            <el-dropdown-item 
              divided 
              command="locationFilter"
              :disabled="poiStore.hasDrawing"
            >
              定位筛选
            </el-dropdown-item>
            <el-dropdown-item 
              divided 
              command="clearDrawing"
              :disabled="!poiStore.hasDrawing"
            >
              清除绘制
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      <el-dropdown @command="changeMapType">
        <span class="el-dropdown-link dropdown-btn">
          地图切换
          <el-icon><ArrowDown /></el-icon>
        </span>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="normal">普通地图</el-dropdown-item>
            <el-dropdown-item command="satellite">卫星地图</el-dropdown-item>
            <el-dropdown-item command="roadnet">路网地图</el-dropdown-item>
            <el-dropdown-item command="traffic">交通地图</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      <el-button text @click="openSearch = true">检索定位</el-button>
    </header>
    <div ref="mapRef" class="map-canvas">
      <!-- 数据加载遮罩 -->
      <div v-if="poiStore.dataLoading" class="loading-overlay">
        <div class="loading-content">
          <el-icon class="loading-icon"><Loading /></el-icon>
          <div class="loading-text">数据正在加载中，请稍后...</div>
        </div>
      </div>
    </div>
    <el-dialog v-model="openSearch" title="搜索位置、公交站、地铁站" width="360px">
      <el-input v-model="searchKeyword" placeholder="请输入关键词" @keyup.enter="searchPlace">
        <template #append>
          <el-button @click="searchPlace">搜索</el-button>
        </template>
      </el-input>
    </el-dialog>
    <!-- 定位筛选对话框 -->
    <el-dialog 
      v-model="openLocationFilter" 
      title="定位筛选" 
      width="400px"
      :close-on-click-modal="false"
      @close="handleLocationDialogClose"
    >
      <div class="location-filter-content">
        <el-alert
          v-if="locationError"
          :title="locationError"
          type="error"
          :closable="false"
          show-icon
          style="margin-bottom: 16px;"
        />
        <div class="filter-form-item">
          <label class="filter-label">筛选范围（km）：</label>
          <el-input-number
            v-model="filterRadius"
            :min="0.1"
            :max="1000"
            :step="0.1"
            :precision="1"
            placeholder="请输入范围"
            style="width: 100%;"
          />
        </div>
        <!-- 定位加载提示 -->
        <div v-if="locationLoading && !showManualInput" class="location-loading">
          <el-icon class="loading-icon"><Loading /></el-icon>
          <span class="loading-text">{{ currentLocationMethod || '正在定位中，请稍等...' }}</span>
        </div>
        <!-- 手动输入地点（兜底策略） -->
        <div v-if="showManualInput" class="manual-location-input">
          <el-alert
            title="所有自动定位方式均失败，请手动输入地点或经纬度"
            type="warning"
            :closable="false"
            show-icon
            style="margin-bottom: 16px;"
          />
          <div class="filter-form-item">
            <label class="filter-label">地点或经纬度：</label>
            <el-input
              v-model="manualLocationInput"
              placeholder="请输入地点名称（如：湖北大学）或经纬度（如：114.3342,30.5768）"
              @keyup.enter="handleManualLocation"
            />
            <div class="input-tips">
              <p>• 支持地点名称搜索（如：湖北大学、北京天安门）</p>
              <p>• 支持经纬度输入（格式：经度,纬度，如：114.3342,30.5768）</p>
              <p style="color: #409eff; margin-top: 8px;">• 输入完成后点击【确定】按钮或按回车键进行搜索</p>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="openLocationFilter = false">取消</el-button>
        <el-button 
          type="primary" 
          @click="handleLocationFilterOrManual"
          :loading="locationLoading"
        >
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ArrowDown, Loading } from '@element-plus/icons-vue';
import { usePoiStore } from '@/stores/poiStore';
import AMapLoader from '@amap/amap-jsapi-loader';
import { onMounted, onBeforeUnmount, ref, watch } from 'vue';

const poiStore = usePoiStore();
const mapRef = ref(null);
const openSearch = ref(false);
const searchKeyword = ref('');
const openLocationFilter = ref(false);
const filterRadius = ref(5); // 默认5km
const locationLoading = ref(false);
const locationError = ref('');
const currentLocationMethod = ref(''); // 当前使用的定位方式
const showManualInput = ref(false); // 是否显示手动输入框
const manualLocationInput = ref('湖北大学'); // 手动输入的地点，默认湖北大学
const skipAutoLocation = ref(false); // 调试开关：跳过自动定位，直接显示手动输入

let mapInstance = null;
let mapLayers = {};
let autoComplete = null;
let placeSearch = null;
let amapGlobal = null;
let mouseTool = null;
let drawObj = null;
let drawEditor = null; // 编辑器实例
// let radiusLabel = null; // 圆形半径标注
let heatmapLayer = null;
let massLayer = null;
let MASS_STYLES = [];
let geolocation = null; // 高德定位实例
let geocoder = null; // 地理编码实例

const loadMap = async () => {
  amapGlobal = await AMapLoader.load({
    key: '80838eddfb922202b289fd1ad6fa4e58',
    version: '2.0',
    plugins: [
      'AMap.ToolBar',
      'AMap.Scale',
      'AMap.AutoComplete',
      'AMap.PlaceSearch',
      'AMap.TileLayer.Satellite',
      'AMap.TileLayer.RoadNet',
      'AMap.TileLayer.Traffic',
      'AMap.HeatMap',
      'AMap.MouseTool',
      'AMap.GeometryUtil',
      'AMap.MassMarks',
      'AMap.CircleEditor',
      'AMap.RectangleEditor',
      'AMap.Geolocation', // 添加高德定位插件
      'AMap.Geocoder', // 添加地理编码插件，用于地点搜索
    ],
  });

  mapInstance = new amapGlobal.Map(mapRef.value, {
    zoom: 7,
    viewMode: '2D',
  });

  mapLayers = {
    satellite: new amapGlobal.TileLayer.Satellite(),
    roadnet: new amapGlobal.TileLayer.RoadNet(),
    traffic: new amapGlobal.TileLayer.Traffic(),
  };
  Object.values(mapLayers).forEach((layer) => {
    mapInstance.add(layer);
    layer.hide();
  });

  mapInstance.addControl(new amapGlobal.ToolBar());
  mapInstance.addControl(new amapGlobal.Scale());

  autoComplete = new amapGlobal.AutoComplete();
  placeSearch = new amapGlobal.PlaceSearch({
    map: mapInstance,
  });
  autoComplete.on('select', (event) => {
    placeSearch.setCity(event.poi.adcode);
    placeSearch.search(event.poi.name);
    openSearch.value = false;
  });

  heatmapLayer = new amapGlobal.HeatMap(mapInstance, {
    radius: 15,
    opacity: [0, 0.3],
  });

  MASS_STYLES = [
    {
      url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOCIgaGVpZ2h0PSI4IiB2aWV3Qm94PSIwIDAgOCA4IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxjaXJjbGUgY3g9IjQiIGN5PSI0IiByPSIzLjUiIGZpbGw9IiM0NWM0ZjkiLz48L3N2Zz4=',
      anchor: new amapGlobal.Pixel(4, 4),
      size: new amapGlobal.Size(8, 8),
    },
    {
      url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIHZpZXdCb3g9IjAgMCAxMCAxMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSI1IiBjeT0iNSIgcj0iNCIgZmlsbD0iI0ZENUY0NSIvPjwvc3ZnPg==',
      anchor: new amapGlobal.Pixel(5, 5),
      size: new amapGlobal.Size(10, 10),
    },
  ];

  massLayer = new amapGlobal.MassMarks([], {
    zIndex: 111,
    cursor: 'pointer',
    alwaysRender: true,
    style: MASS_STYLES,
  });
  massLayer.setMap(mapInstance);
  massLayer.on('click', (e) => {
    const poi = e.data;
    if (poi?.id) {
      poiStore.toggleSelect(poi.id);
      updateLayerByView();
    }
  });

  mapInstance.on('moveend', updateLayerByView);
  mapInstance.on('zoomend', updateLayerByView);

  updateLayerByView();
};

const buildHeatmapData = () => {
  if (!mapInstance) return [];
  const bounds = mapInstance.getBounds();
  // 只渲染当前视图范围内的POI，并抽稀数据
  const boundPOIs = poiStore.poiList.filter((poi) => 
    bounds.contains([poi.lng, poi.lat])
  );
  // 抽稀：每10个取1个，减少热力图数据量
  // 参考原有项目：count = 41960 - rankInChina
  return boundPOIs
    .filter((_, index) => index % 10 === 0)
    .map((poi) => ({
      lng: poi.lng,
      lat: poi.lat,
      count: 41960 - (poi.rank || 0),
    }));
};

const buildMassPoints = () => {
  if (!mapInstance) return [];
  const bounds = mapInstance.getBounds();
  // 只渲染当前视图范围内的POI
  const boundPOIs = poiStore.poiList.filter((poi) => 
    bounds.contains([poi.lng, poi.lat])
  );
  return boundPOIs.map((poi) => ({
    lnglat: [poi.lng, poi.lat],
    pname: poi.name,
    id: poi.id,
    style: poiStore.selectedIds.includes(poi.id) ? 1 : 0,
  }));
};

const updateLayerByView = () => {
  if (!mapInstance || !heatmapLayer || !massLayer) return;
  const bounds = mapInstance.getBounds();
  const boundPOIs = poiStore.poiList.filter((poi) => 
    bounds.contains([poi.lng, poi.lat])
  );
  const boundCount = boundPOIs.length;
  
  // 当视图内POI数量>500时使用热力图，否则使用MassMarks
  if (boundCount > 500) {
    massLayer.hide();
    const heatmapData = buildHeatmapData();
    heatmapLayer.setDataSet({ data: heatmapData });
    heatmapLayer.show();
  } else {
    heatmapLayer.hide();
    const massData = buildMassPoints();
    massLayer.setData(massData);
    massLayer.show();
  }
};

// // 清除半径标注
// const clearCircleMarkers = () => {
//   if (radiusLabel) {
//     radiusLabel.setMap(null);
//     radiusLabel = null;
//   }
// };

// 更新圆形半径标注
const updateCircleMarkers = (circle) => {
  if (!circle || !amapGlobal || !mapInstance) return;
  
  // // 清除旧的标注（确保只有一个，双重保险）
  // if (radiusLabel) {
  //   radiusLabel.setMap(null);
  //   radiusLabel = null;
  // }
  
  // 获取圆心和半径
  const center = circle.getCenter();
  const radius = circle.getRadius();
  
  // 创建半径标注（在圆心的右侧显示）
  // 使用自定义HTML的Marker来显示文本，更可靠
  const radiusKm = (radius / 1000).toFixed(2);
  const labelContent = document.createElement('div');
  labelContent.style.cssText = `
    padding: 4px 8px;
    background-color: rgba(255, 255, 255, 0.95);
    border: 1px solid #00b0ff;
    border-radius: 4px;
    font-size: 12px;
    color: #333;
    white-space: nowrap;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    pointer-events: none;
  `;
  labelContent.textContent = `半径: ${radiusKm} km`;
  
  // // 只创建一个半径标注
  // radiusLabel = new amapGlobal.Marker({
  //   position: center,
  //   content: labelContent,
  //   offset: new amapGlobal.Pixel(20, -10),
  //   zIndex: 1000,
  //   draggable: false,
  // });
  // radiusLabel.setMap(mapInstance);
};

const resetDrawing = () => {
  // 清除编辑器
  if (drawEditor) {
    drawEditor.close();
    drawEditor = null;
  }
  // // 清除圆心标记和半径标注
  // clearCircleMarkers();
  // 清除覆盖物
  if (drawObj?.setMap) {
    drawObj.setMap(null);
  }
  drawObj = null;
  if (mouseTool) {
    mouseTool.close(false);
    mouseTool = null;
  }
};

// 暴露清除绘制函数给父组件
const clearDrawing = () => {
  if (!amapGlobal || !mapInstance) return;
  // 清除地图覆盖物
  resetDrawing();
  // 清除POI选择
  poiStore.showAll();
  poiStore.applySelection([]);
  // 清除绘制区域中心
  poiStore.setSelectionContext(null);
  // 清除标签云（通过事件通知TagCloudCanvas）
  poiStore.clearTagCloud();
  updateLayerByView();
};

const handleDrawCommand = (command) => {
  if (!amapGlobal || !mapInstance) return;
  
  // 如果已经有绘制且不是清除操作，直接返回
  if (poiStore.hasDrawing && command !== 'clearDrawing') {
    return;
  }
  
  // 处理定位筛选命令
  if (command === 'locationFilter') {
    openLocationFilter.value = true;
    locationError.value = '';
    return;
  }
  
  resetDrawing();
  if (command === 'clearDrawing') {
    clearDrawing();
    return;
  }
  mouseTool = new amapGlobal.MouseTool(mapInstance);
  mouseTool.on('draw', (event) => {
    drawObj = event.obj;
    mouseTool.close(false);
    
    // 根据覆盖物类型启用相应的编辑器
    // 判断是否为圆形：检查是否有getRadius方法或className包含Circle
    const isCircle = drawObj && (
      typeof drawObj.getRadius === 'function' ||
      drawObj.className?.includes('Circle')
    );
    
    // 判断是否为矩形：检查是否有getBounds方法或className包含Rectangle
    const isRectangle = drawObj && (
      typeof drawObj.getBounds === 'function' ||
      drawObj.className?.includes('Rectangle')
    );
    
    if (isCircle) {
      // 圆形覆盖物
      drawEditor = new amapGlobal.CircleEditor(mapInstance, drawObj);
      drawEditor.open();
      // 更新圆形标记
      updateCircleMarkers(drawObj);
      
      // 监听编辑器事件：move（移动圆心）、adjust（调整半径）、end（编辑结束）
      drawEditor.on('move', () => {
        updateCircleMarkers(drawObj);
        filterPOIByGeometry(drawObj);
      });
      drawEditor.on('adjust', () => {
        updateCircleMarkers(drawObj);
        filterPOIByGeometry(drawObj);
      });
      drawEditor.on('end', () => {
        updateCircleMarkers(drawObj);
        filterPOIByGeometry(drawObj);
      });
    } else if (isRectangle) {
      // 矩形覆盖物
      drawEditor = new amapGlobal.RectangleEditor(mapInstance, drawObj);
      drawEditor.open();
      
      // 监听编辑器事件：move（移动矩形）、adjust（调整大小）、end（编辑结束）
      drawEditor.on('move', () => {
        filterPOIByGeometry(drawObj);
      });
      drawEditor.on('adjust', () => {
        filterPOIByGeometry(drawObj);
      });
      drawEditor.on('end', () => {
        filterPOIByGeometry(drawObj);
      });
    }
    // 注意：多边形暂时不支持编辑器，保持原有逻辑
    
    // 初始筛选
    filterPOIByGeometry(drawObj);
    // 绘制完成后，通知store更新状态
    poiStore.setHasDrawing(true);
  });
  const drawStyle = {
    fillColor: '#00b0ff',
    strokeColor: '#80d8ff',
    fillOpacity: 0.2,
  };
  if (command === 'drawCircle') {
    mouseTool.circle(drawStyle);
  } else if (command === 'drawRectangle') {
    mouseTool.rectangle(drawStyle);
  } else if (command === 'drawPolygon') {
    mouseTool.polygon(drawStyle);
  }
};

// 暴露给父组件
defineExpose({
  clearDrawing,
});

const filterPOIByGeometry = (geometry) => {
  if (!geometry || !amapGlobal) return;
  const filtered = poiStore.poiList.filter((poi) => {
    // 判断是否为圆形：检查是否有getRadius方法或className包含Circle
    const isCircle = geometry && (
      typeof geometry.getRadius === 'function' ||
      geometry.className?.includes('Circle')
    );
    
    // 判断是否为矩形：检查是否有getBounds方法或className包含Rectangle
    const isRectangle = geometry && (
      typeof geometry.getBounds === 'function' ||
      geometry.className?.includes('Rectangle')
    );
    
    // 判断是否为多边形：检查是否有getPath方法或className包含Polygon
    const isPolygon = geometry && (
      typeof geometry.getPath === 'function' ||
      geometry.className?.includes('Polygon')
    );
    
    if (isCircle) {
      // 圆形：使用contains方法，需要传入LngLat对象
      const lnglat = new amapGlobal.LngLat(poi.lng, poi.lat);
      return geometry.contains(lnglat);
    } else if (isRectangle) {
      // 矩形：使用contains方法，可以传入数组或LngLat对象
      const lnglat = new amapGlobal.LngLat(poi.lng, poi.lat);
      return geometry.contains(lnglat);
    } else if (isPolygon) {
      // 多边形：使用GeometryUtil.isPointInRing方法
      const lnglat = [poi.lng, poi.lat];
      return amapGlobal.GeometryUtil.isPointInRing(lnglat, geometry.getPath());
    }
    
    // 兜底：尝试通用的contains方法
    if (geometry.contains) {
      try {
        // 先尝试LngLat对象
        const lnglat = new amapGlobal.LngLat(poi.lng, poi.lat);
        return geometry.contains(lnglat);
      } catch (e) {
        // 如果失败，尝试数组格式
        const lnglat = [poi.lng, poi.lat];
        return geometry.contains(lnglat);
      }
    }
    
    return false;
  });
  
  console.log(`筛选结果: 共 ${filtered.length} 个POI在覆盖物内`);
  poiStore.applySelection(filtered.map((poi) => poi.id));
  poiStore.showSelected();
  
  // 保存绘制区域的中心到store，用于标签云的中心计算
  let selectionCenter = null;
  if (geometry) {
    // 圆形：使用圆心
    if (typeof geometry.getCenter === 'function') {
      const center = geometry.getCenter();
      selectionCenter = { lng: center.getLng(), lat: center.getLat() };
    }
    // 矩形：使用中心点
    else if (typeof geometry.getBounds === 'function') {
      const bounds = geometry.getBounds();
      const center = bounds.getCenter();
      selectionCenter = { lng: center.getLng(), lat: center.getLat() };
    }
    // 多边形：使用路径的中心点
    else if (geometry.getPath && typeof geometry.getPath === 'function') {
      const path = geometry.getPath();
      if (path && path.length > 0) {
        const lngs = path.map((p) => p.getLng());
        const lats = path.map((p) => p.getLat());
        selectionCenter = {
          lng: (Math.min(...lngs) + Math.max(...lngs)) / 2,
          lat: (Math.min(...lats) + Math.max(...lats)) / 2,
        };
      }
    }
  }
  
  // 保存到store
  if (selectionCenter) {
    poiStore.setSelectionContext({ center: selectionCenter, geometry });
  }
  
  updateLayerByView();
};

const changeMapType = (type) => {
  if (!mapInstance) return;
  Object.entries(mapLayers).forEach(([name, layer]) => {
    if (type === name) layer.show();
    else layer.hide();
  });
  if (type === 'normal') {
    Object.values(mapLayers).forEach((layer) => layer.hide());
  }
};

const searchPlace = () => {
  if (!searchKeyword.value || !placeSearch) return;
  placeSearch.search(searchKeyword.value);
  openSearch.value = false;
};

// 处理定位对话框关闭
const handleLocationDialogClose = () => {
  // 清空定位相关状态
  locationError.value = '';
  currentLocationMethod.value = '';
  locationLoading.value = false;
  showManualInput.value = false;
  manualLocationInput.value = '湖北大学'; // 重置为默认值
};

// 处理确定按钮点击（自动定位或手动输入）
const handleLocationFilterOrManual = async () => {
  // 如果显示手动输入框，执行手动定位
  if (showManualInput.value) {
    await handleManualLocation();
  } else {
    // 否则执行自动定位
    await handleLocationFilter();
  }
};

// 处理手动输入地点
const handleManualLocation = async () => {
  if (!amapGlobal || !mapInstance) {
    locationError.value = '地图未初始化，请稍后再试';
    return;
  }
  
  if (!manualLocationInput.value || !manualLocationInput.value.trim()) {
    locationError.value = '请输入地点名称或经纬度';
    return;
  }
  
  locationLoading.value = true;
  locationError.value = '';
  
  try {
    const input = manualLocationInput.value.trim();
    let userLocation = null;
    
    // 判断输入是否为经纬度格式（经度,纬度）
    const coordPattern = /^-?\d+\.?\d*,\s*-?\d+\.?\d*$/;
    if (coordPattern.test(input)) {
      // 解析经纬度
      const [lng, lat] = input.split(',').map(s => parseFloat(s.trim()));
      if (isNaN(lng) || isNaN(lat) || lng < -180 || lng > 180 || lat < -90 || lat > 90) {
        throw new Error('经纬度格式错误，经度范围：-180~180，纬度范围：-90~90');
      }
      userLocation = new amapGlobal.LngLat(lng, lat);
      console.log('使用手动输入的经纬度:', lng, lat);
    } else {
      // 使用地点搜索
      currentLocationMethod.value = '正在搜索地点，请稍等...';
      
      // 优先使用 Geocoder 进行地理编码（更可靠）
      if (!geocoder) {
        geocoder = new amapGlobal.Geocoder({
          city: '全国', // 全国范围搜索
        });
      }
      
      // 尝试使用 Geocoder
      try {
        const geocodeResult = await new Promise((resolve, reject) => {
          geocoder.getLocation(input, (status, result) => {
            if (status === 'complete' && result.geocodes && result.geocodes.length > 0) {
              resolve(result.geocodes[0]);
            } else {
              reject(new Error('Geocoder未找到该地点'));
            }
          });
        });
        
        if (geocodeResult && geocodeResult.location) {
          userLocation = geocodeResult.location;
          console.log('地点搜索成功（Geocoder）:', input, userLocation);
        }
      } catch (geocodeError) {
        console.warn('Geocoder搜索失败，尝试PlaceSearch:', geocodeError);
        
        // 如果 Geocoder 失败，尝试使用 PlaceSearch
        if (!placeSearch) {
          placeSearch = new amapGlobal.PlaceSearch({
            map: mapInstance,
            city: '全国', // 全国范围搜索
          });
        }
        
        const placeResult = await new Promise((resolve, reject) => {
          placeSearch.search(input, (status, result) => {
            console.log('PlaceSearch回调:', status, result);
            
            // 检查不同的结果结构
            if (status === 'complete') {
              // 尝试多种可能的结果结构
              let poi = null;
              
              // 结构1: result.poiList.pois
              if (result.poiList && result.poiList.pois && result.poiList.pois.length > 0) {
                poi = result.poiList.pois[0];
              }
              // 结构2: result.poiList (直接是数组)
              else if (result.poiList && Array.isArray(result.poiList) && result.poiList.length > 0) {
                poi = result.poiList[0];
              }
              // 结构3: result.pois
              else if (result.pois && Array.isArray(result.pois) && result.pois.length > 0) {
                poi = result.pois[0];
              }
              
              if (poi && poi.location) {
                resolve(poi);
              } else {
                reject(new Error('未找到该地点，请检查输入是否正确'));
              }
            } else {
              reject(new Error(`搜索失败: ${result.info || '未知错误'}`));
            }
          });
        });
        
        if (placeResult && placeResult.location) {
          userLocation = placeResult.location;
          console.log('地点搜索成功（PlaceSearch）:', placeResult.name || input, userLocation);
        } else {
          throw new Error('未找到该地点，请检查输入是否正确');
        }
      }
    }
    
    if (!userLocation) {
      throw new Error('无法获取位置信息');
    }
    
    // 执行后续的绘制和筛选逻辑
    await createCircleAndFilter(userLocation);
    
    // 关闭对话框
    openLocationFilter.value = false;
    showManualInput.value = false;
    
  } catch (error) {
    console.error('手动定位失败:', error);
    locationError.value = error.message || '定位失败，请重试';
  } finally {
    locationLoading.value = false;
    currentLocationMethod.value = '';
  }
};

// 创建圆形覆盖物并执行筛选（提取公共逻辑）
const createCircleAndFilter = async (userLocation) => {
  // 将半径从km转换为米
  const radiusInMeters = filterRadius.value * 1000;
  
  // 清除之前的绘制
  resetDrawing();
  
  // 创建圆形覆盖物
  const drawStyle = {
    fillColor: '#00b0ff',
    strokeColor: '#80d8ff',
    fillOpacity: 0.2,
  };
  
  drawObj = new amapGlobal.Circle({
    center: userLocation,
    radius: radiusInMeters,
    ...drawStyle,
  });
  
  // 将圆形添加到地图
  drawObj.setMap(mapInstance);
  
  // 启用圆形编辑器
  drawEditor = new amapGlobal.CircleEditor(mapInstance, drawObj);
  drawEditor.open();
  
  // 更新圆形标记
  updateCircleMarkers(drawObj);
  
  // 监听编辑器事件
  drawEditor.on('move', () => {
    updateCircleMarkers(drawObj);
    filterPOIByGeometry(drawObj);
  });
  drawEditor.on('adjust', () => {
    updateCircleMarkers(drawObj);
    filterPOIByGeometry(drawObj);
  });
  drawEditor.on('end', () => {
    updateCircleMarkers(drawObj);
    filterPOIByGeometry(drawObj);
  });
  
  // 将地图中心移动到用户位置，并调整缩放级别
  mapInstance.setCenter(userLocation);
  // 根据半径计算合适的缩放级别
  const zoomLevel = calculateZoomByRadius(radiusInMeters);
  mapInstance.setZoom(zoomLevel);
  
  // 等待地图渲染完成后再执行数据筛选
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // 执行数据筛选
  filterPOIByGeometry(drawObj);
  
  // 更新状态
  poiStore.setHasDrawing(true);
};

// 处理定位筛选 - 使用多级定位策略
const handleLocationFilter = async () => {
  if (!amapGlobal || !mapInstance) {
    locationError.value = '地图未初始化，请稍后再试';
    return;
  }
  
  // 验证输入
  if (!filterRadius.value || filterRadius.value <= 0) {
    locationError.value = '请输入有效的筛选范围';
    return;
  }
  
  locationLoading.value = true;
  locationError.value = '';
  currentLocationMethod.value = '';
  showManualInput.value = false;
  
  let userLocation = null;
  let locationMethod = '';
  
  // 调试开关：如果启用，跳过所有自动定位，直接显示手动输入
  // 使用方法：在浏览器控制台执行 window.skipAutoLocation = true 来启用调试模式
  // 或者在代码中临时设置 skipAutoLocation.value = true
  if (skipAutoLocation.value || (typeof window !== 'undefined' && window.skipAutoLocation)) {
    console.log('[调试模式] 跳过自动定位，直接显示手动输入');
    locationLoading.value = false;
    showManualInput.value = true;
    return;
  }
  
  // 策略1: 尝试浏览器定位（降低精度要求，增加超时时间）
  try {
    if (navigator.geolocation) {
      currentLocationMethod.value = '正在使用浏览器定位，请稍等...';
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: false, // 降低精度要求，提高成功率
            timeout: 10000, // 增加到10秒超时
            maximumAge: 60000, // 允许使用1分钟内的缓存位置
          }
        );
      });
      
      const { latitude, longitude } = position.coords;
      // 将WGS84坐标转换为高德地图坐标（GCJ02）
      const gcj02Coord = wgs84ToGcj02(longitude, latitude);
      userLocation = new amapGlobal.LngLat(gcj02Coord.lng, gcj02Coord.lat);
      locationMethod = '浏览器定位';
      currentLocationMethod.value = '浏览器定位成功';
      console.log('使用浏览器定位成功');
    }
  } catch (error) {
    console.warn('浏览器定位失败，尝试高德定位:', error);
  }
  
  // 策略2: 如果浏览器定位失败，使用高德地图定位API
  if (!userLocation) {
    try {
      currentLocationMethod.value = '正在使用高德定位，请稍等...';
      if (!geolocation) {
        geolocation = new amapGlobal.Geolocation({
          enableHighAccuracy: true, // 高精度定位
          timeout: 10000,
          maximumAge: 0,
          convert: true, // 自动偏移坐标，偏移后的坐标为高德坐标
          showButton: false, // 不显示定位按钮
          buttonDom: null,
          showMarker: false, // 不显示定位标记
          showCircle: false, // 不显示定位精度圆圈
          panToLocation: false, // 定位成功后不自动调整地图视野
          zoomToAccuracy: false, // 定位成功后不自动调整地图缩放级别
        });
      }
      
      const position = await new Promise((resolve, reject) => {
        geolocation.getCurrentPosition((status, result) => {
          if (status === 'complete' && result.position) {
            resolve(result);
          } else {
            reject(new Error(result.message || '高德定位失败'));
          }
        });
      });
      
      userLocation = position.position; // 高德定位返回的已经是LngLat对象
      locationMethod = '高德定位';
      currentLocationMethod.value = '高德定位成功';
      console.log('使用高德定位成功');
    } catch (error) {
      console.warn('高德定位失败，尝试IP定位:', error);
    }
  }
  
  // 策略3: 如果都失败，使用IP定位（精度较低但最可靠）
  if (!userLocation) {
    try {
      currentLocationMethod.value = '正在使用IP定位，请稍等...';
      const ipLocation = await getLocationByIP();
      if (ipLocation) {
        userLocation = new amapGlobal.LngLat(ipLocation.lng, ipLocation.lat);
        locationMethod = 'IP定位（精度较低）';
        currentLocationMethod.value = 'IP定位成功';
        console.log('使用IP定位成功');
      }
    } catch (error) {
      console.error('IP定位也失败:', error);
    }
  }
  
  // 如果所有定位方法都失败
  if (!userLocation) {
    locationLoading.value = false;
    locationError.value = '定位失败：浏览器定位、高德定位和IP定位均失败，请检查网络连接或稍后重试';
    return;
  }
  
  try {
    // 将半径从km转换为米
    const radiusInMeters = filterRadius.value * 1000;
    
    // 清除之前的绘制
    resetDrawing();
    
    // 创建圆形覆盖物
    const drawStyle = {
      fillColor: '#00b0ff',
      strokeColor: '#80d8ff',
      fillOpacity: 0.2,
    };
    
    drawObj = new amapGlobal.Circle({
      center: userLocation,
      radius: radiusInMeters,
      ...drawStyle,
    });
    
    // 将圆形添加到地图
    drawObj.setMap(mapInstance);
    
    // 启用圆形编辑器
    drawEditor = new amapGlobal.CircleEditor(mapInstance, drawObj);
    drawEditor.open();
    
    // 更新圆形标记
    updateCircleMarkers(drawObj);
    
    // 监听编辑器事件
    drawEditor.on('move', () => {
      updateCircleMarkers(drawObj);
      filterPOIByGeometry(drawObj);
    });
    drawEditor.on('adjust', () => {
      updateCircleMarkers(drawObj);
      filterPOIByGeometry(drawObj);
    });
    drawEditor.on('end', () => {
      updateCircleMarkers(drawObj);
      filterPOIByGeometry(drawObj);
    });
    
    // 将地图中心移动到用户位置，并调整缩放级别
    mapInstance.setCenter(userLocation);
    // 根据半径计算合适的缩放级别
    const zoomLevel = calculateZoomByRadius(radiusInMeters);
    mapInstance.setZoom(zoomLevel);
    
    // 等待地图渲染完成后再执行数据筛选
    // 使用nextTick确保圆形对象已经完全初始化
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 执行数据筛选
    filterPOIByGeometry(drawObj);
    
    // 更新状态
    poiStore.setHasDrawing(true);
    
    // 关闭对话框
    openLocationFilter.value = false;
    
    // 显示定位成功提示（可选）
    if (locationMethod) {
      console.log(`定位成功，使用方式: ${locationMethod}`);
    }
    
    // 清空定位方式提示
    currentLocationMethod.value = '';
    
  } catch (error) {
    console.error('定位处理失败:', error);
    locationError.value = error.message || '定位处理失败，请重试';
    currentLocationMethod.value = '';
  } finally {
    locationLoading.value = false;
  }
};

// IP定位（使用第三方API，精度较低但最可靠）
const getLocationByIP = async () => {
  try {
    // 使用多个IP定位服务作为备选，提高成功率
    const ipLocationServices = [
      // 方案1: 使用ipapi.co（免费，无需API key，支持HTTPS）
      async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        try {
          const response = await fetch('https://ipapi.co/json/', {
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          if (response.ok) {
            const data = await response.json();
            if (data.latitude && data.longitude) {
              // ipapi.co返回的是WGS84坐标，需要转换
              const gcj02Coord = wgs84ToGcj02(data.longitude, data.latitude);
              return { lng: gcj02Coord.lng, lat: gcj02Coord.lat };
            }
          }
        } catch (e) {
          clearTimeout(timeoutId);
          throw e;
        }
        return null;
      },
      // 方案2: 使用ip-api.com（免费，但可能不支持HTTPS）
      async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        try {
          const response = await fetch('https://ip-api.com/json/?fields=status,lat,lon', {
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          if (response.ok) {
            const data = await response.json();
            if (data.status === 'success' && data.lat && data.lon) {
              // ip-api.com返回的也是WGS84坐标
              const gcj02Coord = wgs84ToGcj02(data.lon, data.lat);
              return { lng: gcj02Coord.lng, lat: gcj02Coord.lat };
            }
          }
        } catch (e) {
          clearTimeout(timeoutId);
          throw e;
        }
        return null;
      },
    ];
    
    // 依次尝试各个服务
    for (const service of ipLocationServices) {
      try {
        const result = await service();
        if (result) {
          return result;
        }
      } catch (error) {
        console.warn('IP定位服务失败，尝试下一个:', error);
        continue;
      }
    }
    
    return null;
  } catch (error) {
    console.warn('所有IP定位服务均失败:', error);
    return null;
  }
};

// 根据半径计算合适的缩放级别
const calculateZoomByRadius = (radiusInMeters) => {
  // 根据半径估算合适的缩放级别
  // 这个公式是经验值，可以根据实际效果调整
  if (radiusInMeters <= 1000) {
    // 1km以内，使用较大缩放级别（显示更详细）
    return 14;
  } else if (radiusInMeters <= 5000) {
    // 1-5km，使用中等缩放级别
    return 12;
  } else if (radiusInMeters <= 20000) {
    // 5-20km
    return 10;
  } else if (radiusInMeters <= 50000) {
    // 20-50km
    return 9;
  } else {
    // 50km以上
    return 7;
  }
};

// WGS84坐标系转GCJ02坐标系（高德地图坐标系）
// 参考：https://en.wikipedia.org/wiki/Restrictions_on_geographic_data_in_China
const wgs84ToGcj02 = (lng, lat) => {
  const a = 6378245.0; // 长半轴
  const ee = 0.00669342162296594323; // 偏心率平方
  
  let dLat = transformLat(lng - 105.0, lat - 35.0);
  let dLng = transformLng(lng - 105.0, lat - 35.0);
  const radLat = (lat / 180.0) * Math.PI;
  let magic = Math.sin(radLat);
  magic = 1 - ee * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  dLat = (dLat * 180.0) / ((a * (1 - ee)) / (magic * sqrtMagic) * Math.PI);
  dLng = (dLng * 180.0) / (a / sqrtMagic * Math.cos(radLat) * Math.PI);
  const mgLat = lat + dLat;
  const mgLng = lng + dLng;
  
  return { lng: mgLng, lat: mgLat };
};

// 辅助函数：纬度转换
const transformLat = (lng, lat) => {
  let ret = -100.0 + 2.0 * lng + 3.0 * lat + 0.2 * lat * lat + 0.1 * lng * lat + 0.2 * Math.sqrt(Math.abs(lng));
  ret += ((20.0 * Math.sin(6.0 * lng * Math.PI) + 20.0 * Math.sin(2.0 * lng * Math.PI)) * 2.0) / 3.0;
  ret += ((20.0 * Math.sin(lat * Math.PI) + 40.0 * Math.sin(lat / 3.0 * Math.PI)) * 2.0) / 3.0;
  ret += ((160.0 * Math.sin(lat / 12.0 * Math.PI) + 320 * Math.sin(lat * Math.PI / 30.0)) * 2.0) / 3.0;
  return ret;
};

// 辅助函数：经度转换
const transformLng = (lng, lat) => {
  let ret = 300.0 + lng + 2.0 * lat + 0.1 * lng * lng + 0.1 * lng * lat + 0.1 * Math.sqrt(Math.abs(lng));
  ret += ((20.0 * Math.sin(6.0 * lng * Math.PI) + 20.0 * Math.sin(2.0 * lng * Math.PI)) * 2.0) / 3.0;
  ret += ((20.0 * Math.sin(lng * Math.PI) + 40.0 * Math.sin(lng / 3.0 * Math.PI)) * 2.0) / 3.0;
  ret += ((150.0 * Math.sin(lng / 12.0 * Math.PI) + 300.0 * Math.sin(lng / 30.0 * Math.PI)) * 2.0) / 3.0;
  return ret;
};

onMounted(loadMap);

watch(
  () => poiStore.poiList,
  () => {
    updateLayerByView();
  },
  { deep: true },
);

watch(
  () => poiStore.selectedIds,
  () => {
    if (massLayer) {
      massLayer.setData(buildMassPoints());
    }
  },
);

onBeforeUnmount(() => {
  resetDrawing();
  if (mapInstance) {
    mapInstance.destroy();
  }
  mapInstance = null;
});
</script>

<style scoped>
.map-wrapper {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.map-head {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}

.el-dropdown-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  color: #e3e6f4;
  cursor: pointer;
}

.dropdown-btn {
  color: #1f2333 !important;
  background: #fff !important;
  border: 1px solid #dcdfe6;
}

.dropdown-btn:hover {
  background: #f5f7fa !important;
  border-color: #c0c4cc;
}

.dropdown-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.map-canvas {
  width: 100%;
  flex: 1 1 auto;
  min-height: 200px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.05);
  position: relative;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  border-radius: 12px;
  transition: opacity 0.3s ease;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 24px;
  background-color: rgba(255, 255, 255, 0.98);
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.loading-icon {
  font-size: 36px;
  color: #409eff;
  animation: rotating 2s linear infinite;
}

.loading-text {
  font-size: 15px;
  color: #606266;
  font-weight: 500;
  letter-spacing: 0.5px;
}

@keyframes rotating {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* 定位筛选对话框样式 */
.location-filter-content {
  padding: 8px 0;
}

.filter-form-item {
  margin-bottom: 20px;
}

.filter-label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}

/* 定位加载提示 */
.location-loading {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  padding: 12px;
  background-color: #f0f9ff;
  border-radius: 4px;
  border: 1px solid #b3d8ff;
}

.location-loading .loading-icon {
  font-size: 18px;
  color: #409eff;
  animation: rotating 1s linear infinite;
}

.location-loading .loading-text {
  font-size: 14px;
  color: #409eff;
  font-weight: 500;
}

/* 手动输入地点样式 */
.manual-location-input {
  margin-top: 16px;
}

.input-tips {
  margin-top: 8px;
  padding: 8px 12px;
  background-color: #f5f7fa;
  border-radius: 4px;
  font-size: 12px;
  color: #909399;
  line-height: 1.6;
}

.input-tips p {
  margin: 2px 0;
}
</style>

