<template>
  <div class="map-wrapper">
    <header class="map-head">
      <el-dropdown 
        trigger="click" 
        @command="handleDrawCommand"
        data-intro-target="dataFilterBtn"
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
    <div ref="mapRef" class="map-canvas"></div>
    <el-dialog v-model="openSearch" title="搜索位置、公交站、地铁站" width="360px">
      <el-input v-model="searchKeyword" placeholder="请输入关键词" @keyup.enter="searchPlace">
        <template #append>
          <el-button @click="searchPlace">搜索</el-button>
        </template>
      </el-input>
    </el-dialog>
  </div>
</template>

<script setup>
import { ArrowDown } from '@element-plus/icons-vue';
import { usePoiStore } from '@/stores/poiStore';
import AMapLoader from '@amap/amap-jsapi-loader';
import { onMounted, onBeforeUnmount, ref, watch } from 'vue';

const poiStore = usePoiStore();
const mapRef = ref(null);
const openSearch = ref(false);
const searchKeyword = ref('');

let mapInstance = null;
let mapLayers = {};
let autoComplete = null;
let placeSearch = null;
let amapGlobal = null;
let mouseTool = null;
let drawObj = null;
let heatmapLayer = null;
let massLayer = null;
let MASS_STYLES = [];

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

const resetDrawing = () => {
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
  
  resetDrawing();
  if (command === 'clearDrawing') {
    clearDrawing();
    return;
  }
  mouseTool = new amapGlobal.MouseTool(mapInstance);
  mouseTool.on('draw', (event) => {
    drawObj = event.obj;
    mouseTool.close(false);
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
  if (!geometry) return;
  const filtered = poiStore.poiList.filter((poi) => {
    const lnglat = [poi.lng, poi.lat];
    if (geometry.contains) return geometry.contains(lnglat);
    if (geometry.className?.includes('Polygon')) {
      return amapGlobal.GeometryUtil.isPointInRing(lnglat, geometry.getPath());
    }
    return false;
  });
  poiStore.applySelection(filtered.map((poi) => poi.id));
  poiStore.showSelected();
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
}
</style>

