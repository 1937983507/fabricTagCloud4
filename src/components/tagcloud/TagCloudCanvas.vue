<template>
  <aside class="tagcloud-panel">
    <header class="panel-head">
      <div class="toolbar-left">
        <el-button-group>
          <el-button type="primary" @click="handleRenderCloud">运行生成标签云</el-button>
          <el-button @click="switchResolution('coarse')">粗略显示</el-button>
          <el-button @click="switchResolution('fine')">精细显示</el-button>
        </el-button-group>
        <div class="toolbar-options">
          <el-checkbox v-model="showRank" class="first-checkbox">显示排名信息</el-checkbox>
          <el-checkbox v-model="showTime">显示通行时间(min)</el-checkbox>
          <el-button @click="exportAsImage">导出图片</el-button>
          <span class="label-count">标签数量: {{ renderedLabelCount }}</span>
        </div>
      </div>
    </header>
    <div class="canvas-wrapper" ref="wrapperRef">
      <canvas
        :key="canvasKey"
        ref="canvasRef"
        :width="canvasWidth"
        :height="canvasHeight"
      ></canvas>
      <div v-if="!allowRenderCloud || poiStore.visibleList.length === 0" class="empty-cloud-hint">
        <div class="hint-content">
          <div class="hint-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="hint-text">
            <p class="hint-title">{{ allowRenderCloud ? '数据筛选中' : '准备生成标签云' }}</p>
            <p class="hint-desc">
              {{ allowRenderCloud ? '请在地图上绘制筛选区域' : '请先在地图上绘制筛选区域，然后点击"运行生成标签云"按钮' }}
            </p>
          </div>
        </div>
      </div>
      
      <!-- 距离图例 -->
      <div class="distance-legend">
        <p class="legend-title">与中心的距离</p>
        <div class="legend-colors" ref="legendColorsRef">
          <div
            v-for="(color, index) in poiStore.colorSettings.palette"
            :key="`legend-${index}`"
            class="legend-color-item"
            :style="{ background: color }"
            @mouseenter="handleLegendHover(color)"
            @mouseleave="handleLegendLeave"
          ></div>
        </div>
        <p class="legend-max-distance">
          <span>{{ maxDistanceText || '0 km' }}</span>
        </p>
      </div>
      
      <!-- 交互工具栏 -->
      <div class="canvas-toolbar">
        <el-button
          circle
          size="small"
          :icon="RefreshLeft"
          @click="returnToCenter"
          title="返回中心点"
        />
        <el-button
          circle
          size="small"
          :icon="FullScreen"
          @click="returnToScale"
          title="返回原始缩放"
        />
        <el-button
          circle
          size="small"
          :icon="Rank"
          :type="isPanning ? 'primary' : 'default'"
          @click="togglePanning"
          title="漫游"
        />
        <el-button
          circle
          size="small"
          :icon="ZoomIn"
          @click="zoomIn"
          title="放大"
        />
        <el-button
          circle
          size="small"
          :icon="ZoomOut"
          @click="zoomOut"
          title="缩小"
        />
      </div>
    </div>
  </aside>
</template>

<script setup>
import { Canvas, Text, Textbox, Point } from 'fabric';
import {
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  computed,
} from 'vue';
import { usePoiStore } from '@/stores/poiStore';
import AMapLoader from '@amap/amap-jsapi-loader';
import {
  RefreshLeft,
  FullScreen,
  Rank,
  ZoomIn,
  ZoomOut,
} from '@element-plus/icons-vue';

const canvasRef = ref(null);
const wrapperRef = ref(null);
const legendColorsRef = ref(null);
const showRank = ref(false); // 默认不显示排名
const showTime = ref(false);
const poiStore = usePoiStore();

let canvasInstance;
let resolutionScale = 1;
let resizeObserver;
let isRendering = false; // 标记是否正在渲染
let isPanning = ref(true); // 是否启用漫游（默认开启）
let vpt = [1, 0, 0, 1, 0, 0]; // viewport transform
let originalCenterX = 0;
let originalCenterY = 0;
const maxDistance = ref(0); // 最大距离（米）- 使用ref以便响应式更新
let poisPyramid = []; // POI数据金字塔
let tagCloudScale = 0; // 当前显示层级
let amapGlobal = null; // 高德地图全局对象
let drivingInstance = null; // 高德地图驾车路径规划实例

const allowRenderCloud = ref(false);
const canvasWidth = ref(900);
const canvasHeight = ref(900);
const canvasKey = ref(0); // 用于强制重新渲染canvas
const isClearing = ref(false); // 标记是否正在清除，用于防止watch触发重新渲染
const renderedLabelCount = ref(0); // 当前渲染的标签数量
const baseAngles = [-15, -10, -5, 0, 5, 10, 15];
const stepDistance = 22;
const maxIterations = 220;
const POI_THRESHOLD = 100; // POI数量阈值（首次渲染数量）

// 最大距离文本
const maxDistanceText = computed(() => {
  if (maxDistance.value === 0) return '0 km';
  return `${(maxDistance.value / 1000).toFixed(2)} km`;
});

const initCanvas = () => {
  if (!canvasRef.value) return; // 确保canvas元素存在
  
  if (canvasInstance) {
    // 保存当前的viewport transform
    vpt = canvasInstance.viewportTransform;
    canvasInstance.dispose();
  }
  canvasInstance = new Canvas(canvasRef.value, {
    backgroundColor: poiStore.colorSettings.background,
    selection: false,
    defaultCursor: isPanning.value ? 'grab' : 'default',
  });
  
  // 如果漫游已开启，立即设置鼠标样式
  if (isPanning.value) {
    canvasInstance.defaultCursor = 'grab';
  }
  canvasInstance.setWidth(canvasWidth.value);
  canvasInstance.setHeight(canvasHeight.value);
  
  // 恢复viewport transform
  if (vpt) {
    canvasInstance.setViewportTransform(vpt);
  }
  
  // 设置鼠标交互
  setupCanvasInteractions();
};

// 监听背景色变化，立即更新canvas
watch(
  () => poiStore.colorSettings.background,
  (newColor) => {
    if (canvasInstance && newColor) {
      // Fabric.js v6 中直接设置 backgroundColor 属性
      canvasInstance.backgroundColor = newColor;
      canvasInstance.renderAll();
    }
  },
  { immediate: false }
);

// 初始化canvas尺寸（只执行一次，固定大小）
const initCanvasSize = () => {
  if (!wrapperRef.value) return;
  const rect = wrapperRef.value.getBoundingClientRect();
  // 使用容器的初始尺寸，固定canvas大小
  const width = Math.floor(rect.width);
  const height = Math.floor(rect.height);
  canvasWidth.value = width;
  canvasHeight.value = height;
};


function handleRenderCloud() {
  allowRenderCloud.value = true;
  // 每次点击【运行生成标签云】时，强制重新构建POI金字塔，使用最新的筛选数据
  renderCloud(true);
}

// 清除标签云
const clearTagCloud = () => {
  // 设置清除标志，防止watch触发重新渲染
  isClearing.value = true;
  allowRenderCloud.value = false;
  maxDistance.value = 0;
  poisPyramid = [];
  tagCloudScale = 0;
  isRendering = false;
  renderedLabelCount.value = 0; // 重置标签数量
  
  // 完全销毁canvas实例
  if (canvasInstance) {
    try {
      // 先移除所有对象
      const objects = canvasInstance.getObjects();
      objects.forEach(obj => {
        canvasInstance.remove(obj);
      });
      canvasInstance.dispose();
    } catch (e) {
      console.warn('Canvas dispose error:', e);
    }
    canvasInstance = null;
  }
  
  // 通过更新key来强制Vue删除旧的canvas元素并创建新的
  canvasKey.value += 1;
  
  // 等待Vue重新创建canvas元素后，初始化新的canvas实例
  nextTick(() => {
    if (canvasRef.value) {
      initCanvas();
    }
    // 清除完成后，重置标志
    isClearing.value = false;
  });
};

// 初始化高德地图和Driving实例
const initAMapDriving = async () => {
  if (amapGlobal && drivingInstance) return; // 已经初始化
  
  try {
    amapGlobal = await AMapLoader.load({
      key: '80838eddfb922202b289fd1ad6fa4e58',
      version: '2.0',
      plugins: ['AMap.Driving'],
    });
    
    // 创建驾车路径规划实例
    drivingInstance = new amapGlobal.Driving({
      policy: amapGlobal.DrivingPolicy.LEAST_TIME, // 最便捷的驾车策略
    });
  } catch (error) {
    console.warn('高德地图加载失败:', error);
  }
};

// 计算通行时间（使用高德地图Driving API）- 保留原方法
const calculateTravelTimeAPI = (centerLng, centerLat, poiLng, poiLat) => {
  return new Promise((resolve, reject) => {
    if (!drivingInstance || !amapGlobal) {
      resolve(null);
      return;
    }
    
    try {
      drivingInstance.search(
        new amapGlobal.LngLat(centerLng, centerLat),
        new amapGlobal.LngLat(poiLng, poiLat),
        (status, result) => {
          if (status === 'complete' && result.routes && result.routes.length > 0) {
            // 时间单位：秒，转换为分钟
            const timeInSeconds = result.routes[0].time;
            const timeInMinutes = Math.round(timeInSeconds / 60);
            resolve(timeInMinutes);
          } else {
            resolve(null);
          }
        }
      );
    } catch (error) {
      console.warn('计算通行时间失败:', error);
      resolve(null);
    }
  });
};

// 计算通行时间（基于经纬度估算）- 新方法
const calculateTravelTime = (centerLng, centerLat, poiLng, poiLat) => {
  // 计算直线距离（米）
  const distanceInMeters = calculateDistance(centerLat, centerLng, poiLat, poiLng);
  
  // 实际道路距离通常比直线距离长，使用系数1.4（考虑城市道路的绕行）
  const roadDistanceFactor = 1.4;
  const roadDistanceKm = (distanceInMeters / 1000) * roadDistanceFactor;
  
  // 根据距离选择不同的平均车速
  // 短距离（<10km）：城市道路，平均30km/h
  // 中距离（10-50km）：混合道路，平均45km/h
  // 长距离（>50km）：高速公路为主，平均70km/h
  let averageSpeed;
  if (roadDistanceKm < 10) {
    averageSpeed = 30; // 城市道路
  } else if (roadDistanceKm < 50) {
    averageSpeed = 45; // 混合道路
  } else {
    averageSpeed = 70; // 高速公路为主
  }
  
  // 计算时间：时间(分钟) = 距离(km) / 速度(km/h) * 60
  const timeInMinutes = Math.round((roadDistanceKm / averageSpeed) * 60);
  
  // 至少返回1分钟
  return Math.max(1, timeInMinutes);
};

// 计算两点之间的经纬度距离（使用Haversine公式，返回米）
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371000; // 地球半径（米）
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// 计算中心位置（基于经纬度的几何中心）
const computeCenter = (list) => {
  if (!list.length) return { lng: 0, lat: 0 };
  const lngs = list.map((poi) => poi.lng);
  const lats = list.map((poi) => poi.lat);
  return {
    lng: (Math.min(...lngs) + Math.max(...lngs)) / 2,
    lat: (Math.min(...lats) + Math.max(...lats)) / 2,
  };
};

const computeBounds = (list) => {
  const lngs = list.map((poi) => poi.lng);
  const lats = list.map((poi) => poi.lat);
  return {
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
  };
};

// 计算自然间断点（Jenks算法）
const calculateJenks = (data, numClasses) => {
  const n = data.length;
  const mat1 = [];
  const mat2 = [];
  const classIndex = [];

  for (let i = 0; i <= n; i++) {
    mat1[i] = [];
    mat2[i] = [];
    for (let j = 0; j <= numClasses; j++) {
      mat1[i][j] = 0;
      mat2[i][j] = 0;
    }
  }

  for (let i = 1; i <= numClasses; i++) {
    mat1[1][i] = 1;
    mat2[1][i] = 0;
    for (let j = 2; j <= n; j++) {
      mat2[j][i] = Infinity;
    }
  }

  let v = 0;
  for (let l = 2; l <= n; l++) {
    let s1 = 0;
    let s2 = 0;
    let w = 0;
    for (let m = 1; m <= l; m++) {
      const i3 = l - m + 1;
      const val = data[i3 - 1];
      s2 += val * val;
      s1 += val;
      w += 1;
      const v1 = s2 - (s1 * s1) / w;
      let i4 = i3 - 1;
      if (i4 !== 0) {
        for (let j = 2; j <= numClasses; j++) {
          if (mat2[l][j] >= v1 + mat2[i4][j - 1]) {
            mat1[l][j] = i3;
            mat2[l][j] = v1 + mat2[i4][j - 1];
          }
        }
      }
    }
    mat1[l][1] = 1;
    mat2[l][1] = v;
  }

  let k = n;
  for (let j = numClasses; j >= 1; j--) {
    classIndex[j - 1] = mat1[k][j] - 1;
    k = mat1[k][j] - 1;
  }

  const jenksBreaks = [];
  for (let i = 0; i < classIndex.length; i++) {
    jenksBreaks.push(data[classIndex[i]]);
  }
  return jenksBreaks;
};

// 计算颜色类别索引
const calculateClassIndex = (data, index, total, colorNum, discreteMethod) => {
  let classIndex;
  const distance = data[index].distance;

  switch (discreteMethod) {
    case 'equal':
      // 相等间隔
      const minValue = Math.min(...data.map((item) => item.distance));
      const maxValue = Math.max(...data.map((item) => item.distance));
      const range = maxValue - minValue;
      const interval = range / colorNum;
      classIndex = Math.floor((distance - minValue) / interval);
      if (classIndex >= colorNum) classIndex = colorNum - 1;
      break;
    case 'quantile':
      // 分位数
      const percentile = (index + 1) / total;
      classIndex = Math.ceil(colorNum * percentile) - 1;
      break;
    case 'jenks':
      // 自然间断点(Jenks)
      const values = data.map((item) => item.distance).sort((a, b) => a - b);
      const jenksBreaks = calculateJenks(values, colorNum);
      for (let i = 0; i < jenksBreaks.length; i++) {
        if (distance <= jenksBreaks[i]) {
          classIndex = i;
          break;
        }
      }
      if (classIndex === undefined) classIndex = colorNum - 1;
      break;
    case 'geometric':
      // 几何间隔
      const minVal = Math.min(...data.map((item) => item.distance));
      const maxVal = Math.max(...data.map((item) => item.distance));
      const ratio = Math.pow(maxVal / minVal, 1 / colorNum);
      classIndex = Math.floor(Math.log(distance / minVal) / Math.log(ratio));
      if (classIndex >= colorNum) classIndex = colorNum - 1;
      if (classIndex < 0) classIndex = 0;
      break;
    case 'stddev':
      // 标准差
      const allValues = data.map((item) => item.distance);
      const mean = allValues.reduce((acc, curr) => acc + curr, 0) / allValues.length;
      const stdDev = Math.sqrt(
        allValues.reduce((acc, curr) => acc + Math.pow(curr - mean, 2), 0) /
          allValues.length,
      );
      const deviation = distance - mean;
      const stdDevInterval = stdDev / colorNum;
      classIndex = Math.floor(deviation / stdDevInterval) + Math.floor(colorNum / 2);
      if (classIndex < 0) classIndex = 0;
      else if (classIndex >= colorNum) classIndex = colorNum - 1;
      break;
    default:
      classIndex = 0;
      break;
  }

  return classIndex;
};

// 绘制中心位置
const drawCenter = (centerX, centerY) => {
  const centerText = new Textbox('中间位置', {
    left: centerX,
    top: centerY,
    fill: 'rgb(255, 255, 255)',
    fontSize: 60 * resolutionScale,
    strokeWidth: 5,
    fontWeight: 1000,
    stroke: 'rgba(255,255,255,0.7)',
    fontFamily: 'Comic Sans',
    textAlign: 'center',
    originX: 'center',
    originY: 'center',
    selectable: false,
  });
  canvasInstance.add(centerText);
};

const rotate = (cx, cy, x, y, angle) => {
  const radians = (Math.PI / 180) * angle;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const nx = cos * (x - cx) + sin * (y - cy) + cx;
  const ny = cos * (y - cy) - sin * (x - cx) + cy;
  return [nx, ny];
};

const buildLayoutEntries = async (list, bounds, center, colorSettings) => {
  const width = canvasInstance.getWidth();
  const height = canvasInstance.getHeight();
  const { fontSettings } = poiStore;

  // 计算每个POI到中心的距离，并添加距离信息
  const entriesWithDistance = await Promise.all(list.map(async (poi) => {
    const distance = calculateDistance(
      center.lat,
      center.lng,
      poi.lat,
      poi.lng,
    );

    const normalizedX =
      (poi.lng - bounds.minLng) / ((bounds.maxLng - bounds.minLng) || 1);
    const normalizedY =
      (poi.lat - bounds.minLat) / ((bounds.maxLat - bounds.minLat) || 1);
    const screenX = width * 0.08 + normalizedX * width * 0.84;
    const screenY = height * 0.08 + (1 - normalizedY) * height * 0.84;

    // 如果需要显示通行时间且还没有计算，则计算通行时间
    if (showTime.value && !poi.time) {
      const travelTime = await calculateTravelTime(center.lng, center.lat, poi.lng, poi.lat);
      if (travelTime !== null) {
        poi.time = travelTime;
      }
    }

    // 构建标签文本：格式为"名称 排名|时间"或"名称 排名"或"名称 时间"
    let labelText = poi.name;
    const rankPart = showRank.value && poi.rank ? String(poi.rank) : '';
    const timePart = showTime.value && poi.time ? String(poi.time) : '';
    if (rankPart && timePart) {
      labelText = `${poi.name} ${rankPart}|${timePart}`;
    } else if (rankPart) {
      labelText = `${poi.name} ${rankPart}`;
    } else if (timePart) {
      labelText = `${poi.name} ${timePart}`;
    }

    return {
      id: poi.id,
      textValue: labelText,
      fontSize:
        fontSettings.fontSizes[poi.rank % fontSettings.fontSizes.length] *
        resolutionScale,
      fontFamily: fontSettings.fontFamily,
      fontWeight: fontSettings.fontWeight,
      screenX,
      screenY,
      distance,
      lat: poi.lat,
      lng: poi.lng,
    };
  }));

  // 按距离升序排序（先绘制距离近的）
  entriesWithDistance.sort((a, b) => a.distance - b.distance);

  // 根据距离分配颜色
  const colorNum = colorSettings.discreteCount || colorSettings.palette.length;
  const discreteMethod = colorSettings.discreteMethod || 'quantile';
  const palette = colorSettings.palette;

  return entriesWithDistance.map((entry, index) => {
    const classIndex = calculateClassIndex(
      entriesWithDistance,
      index,
      entriesWithDistance.length,
      colorNum,
      discreteMethod,
    );
    return {
      ...entry,
      fontColor: palette[classIndex] || palette[0],
    };
  });
};

// 多角度径向偏移策略（参考原有项目strategy 3）
const simulateDirection = (entry, originX, originY, angle) => {
  // 初始位置为圆形中心
  let newX = originX;
  let newY = originY;
  
  // 计算旋转后的目标方向
  const target = rotate(originX, originY, entry.screenX, entry.screenY, angle);
  const offsetXX = target[0] - originX;
  const offsetYY = target[1] - originY;
  
  // 计算单位方向向量和步长（对应原有项目的20像素）
  const xie = Math.sqrt(offsetXX * offsetXX + offsetYY * offsetYY);
  const stepX = (offsetXX / xie) * stepDistance;
  const stepY = (offsetYY / xie) * stepDistance;

  // 创建临时标签用于碰撞检测（使用Text确保单行显示）
  const temp = new Text(entry.textValue, {
    originX: 'center',
    originY: 'center',
    left: newX,
    top: newY,
    fill: entry.fontColor,
    fontSize: entry.fontSize,
    fontFamily: entry.fontFamily,
    fontWeight: entry.fontWeight,
    selectable: false,
  });
  canvasInstance.add(temp);

  // 开始偏移（沿着旋转后的方向，参考原有项目strategy 3）
  let iterations = 0;
  while (iterations < maxIterations) {
    // 默认不需要偏移
    let isShift = false;
    
    // 遍历画布上所有元素，检查碰撞
    canvasInstance.forEachObject((obj) => {
      // 排除当前正在移动的元素
      if (obj === temp) return;
      
      // 检查对象是否与另一个对象相交
      if (temp.intersectsWithObject(obj)) {
        // 有重叠，得继续偏移
        isShift = true;
        // 计算偏移后的坐标（沿着旋转后的方向）
        newX = newX + stepX;
        newY = newY + stepY;
        // 更新临时标签位置
        temp.set({ left: newX, top: newY });
        temp.setCoords();
      }
    });
    
    // 如果不需要偏移了，退出循环
    if (!isShift) {
      break;
    }
    
    iterations++;
  }

  const result = { 
    x: temp.left, 
    y: temp.top, 
    collision: iterations >= maxIterations // 如果达到最大迭代次数，认为有碰撞
  };
  canvasInstance.remove(temp);
  return result;
};

// 多角度径向偏移策略绘制标签（参考原有项目strategy 3）
const drawLabel = (entry, originX, originY) => {
  // 对每个角度进行模拟，找到所有可行的位置
  const candidates = baseAngles.map((angle) =>
    simulateDirection(entry, originX, originY, angle),
  );
  
  // 优先选择没有碰撞的位置
  const viable = candidates.filter((c) => !c.collision);
  const selectFrom = viable.length > 0 ? viable : candidates;
  
  // 寻找距离中心最近的位置
  let theMinDistance = Infinity;
  let theNewLocation = null;
  
  for (const item of selectFrom) {
    const tempDis = (item.x - originX) * (item.x - originX) + 
      (item.y - originY) * (item.y - originY);
    if (tempDis < theMinDistance) {
      // 更新最近距离
      theMinDistance = tempDis;
      theNewLocation = { x: item.x, y: item.y };
    }
  }
  
  // 如果没有找到合适的位置，使用原始屏幕坐标
  if (!theNewLocation) {
    theNewLocation = { x: entry.screenX, y: entry.screenY };
  }

  // 正式绘制标签（使用Text确保单行显示，直接拼接文本）
  const text = new Text(entry.textValue, {
    originX: 'center',
    originY: 'center',
    left: theNewLocation.x,
    top: theNewLocation.y,
    fill: entry.fontColor,
    fontSize: entry.fontSize,
    fontFamily: entry.fontFamily,
    fontWeight: entry.fontWeight,
    stroke: 'rgba(0,0,0,0.45)',
    strokeWidth: 1,
    shadow: {
      color: 'rgba(0, 0, 0, 0.25)',
      offsetX: 2,
      offsetY: 2,
      blur: 8,
    },
    selectable: false,
  });
  canvasInstance.add(text);
};

// 逐步渲染标签的延迟函数
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const renderCloud = async (forceReinitPyramid = false) => {
  if (!allowRenderCloud.value || !poiStore.visibleList.length) return;
  if (isRendering) return; // 如果正在渲染，则跳过
  
  isRendering = true;
  await nextTick();
  // Canvas尺寸已固定，不需要更新
  initCanvas();
  
  const sourceList = poiStore.visibleList;
  if (!sourceList.length) {
    isRendering = false;
    return;
  }

  // 只有在数据变化或强制重新初始化时才重新构建金字塔
  if (forceReinitPyramid || poisPyramid.length === 0) {
    initPoisPyramid(sourceList);
  }
  
  // 获取当前层级的数据
  const currentData = poisPyramid[tagCloudScale] || poisPyramid[0] || sourceList;
  
  // 计算中心位置（基于经纬度）
  const center = computeCenter(sourceList);
  const bounds = computeBounds(sourceList);
  
  // 将中心位置转换为屏幕坐标
  const width = canvasInstance.getWidth();
  const height = canvasInstance.getHeight();
  const normalizedCenterX =
    (center.lng - bounds.minLng) / ((bounds.maxLng - bounds.minLng) || 1);
  const normalizedCenterY =
    (center.lat - bounds.minLat) / ((bounds.maxLat - bounds.minLat) || 1);
  originalCenterX = width * 0.08 + normalizedCenterX * width * 0.84;
  originalCenterY = height * 0.08 + (1 - normalizedCenterY) * height * 0.84;

  // 绘制中心位置
  drawCenter(originalCenterX, originalCenterY);

  // 构建布局条目（已按距离排序并分配颜色）
  const entries = await buildLayoutEntries(
    currentData,
    bounds,
    center,
    poiStore.colorSettings,
  );
  
  // 计算最大距离（基于构建后的entries，因为entries已经计算了距离）
  maxDistance.value = 0;
  entries.forEach((entry) => {
    if (entry.distance > maxDistance.value) {
      maxDistance.value = entry.distance;
    }
  });

  // 更新标签数量
  renderedLabelCount.value = entries.length;

  // 逐步渲染标签
  for (let i = 0; i < entries.length; i++) {
    drawLabel(entries[i], originalCenterX, originalCenterY);
    // 每绘制10个标签后暂停一下，实现逐步渲染效果
    if (i % 5 === 0 && i > 0) {
      await sleep(5); // 10ms延迟
    }
  }

  isRendering = false;
};

// 按排名升序排列
const upRank = (a, b) => a.rank - b.rank;

// 按距离升序排列
const upDis = (a, b) => a.distance - b.distance;

// 初始化POI金字塔（参考原有项目算法）
const initPoisPyramid = (data) => {
  poisPyramid = [];
  const dataLength = data.length;
  
  // 计算中心位置（用于计算距离）
  const center = computeCenter(data);
  
  // 为每个POI计算距离（如果还没有）
  const dataWithDistance = data.map((poi) => {
    if (!poi.distance) {
      poi.distance = calculateDistance(center.lat, center.lng, poi.lat, poi.lng);
    }
    return poi;
  });
  
  // 第一步：先按距离排序，第一层是全部数据（按距离排序）
  const sortedByDistance = [...dataWithDistance].sort(upDis);
  poisPyramid[0] = sortedByDistance;
  
  // 第二步：按排名排序，用于构建后续层级
  const sortedByRank = [...dataWithDistance].sort(upRank);
  
  // 确定初始scale（首次渲染约100个POI）
  tagCloudScale = 0;
  
  // 构建金字塔：每一层都是按排名取前N个，然后按距离排序
  let currentData = sortedByRank;
  let currentLength = dataLength;
  let scale = 0;
  
  // 定义函数用于判断是否达到了数据量小于10的条件
  const shouldStopSplitting = (length) => length <= 10;
  
  // 自定义划分分层数据
  while (!shouldStopSplitting(currentLength)) {
    // 当数据量还大于10的时候，继续构建层级
    if (tagCloudScale === 0 && currentLength <= POI_THRESHOLD) {
      // 当数据量已经小于等于100的时候，设置tagCloudScale
      tagCloudScale = scale;
    }
    
    scale++;
    // 进行数据划分（取前一半）
    currentData = currentData.slice(0, Math.round(currentLength / 2));
    currentLength = currentData.length;
    
    // 按距离排序后存入金字塔
    const sorted = [...currentData].sort(upDis);
    poisPyramid[scale] = sorted;
  }
  
  // 如果tagCloudScale还是0，说明数据量小于等于100，使用第0层
  if (tagCloudScale === 0 && dataLength <= POI_THRESHOLD) {
    tagCloudScale = 0;
  }
  
  console.log('POI金字塔构建完成:', {
    totalLayers: poisPyramid.length,
    currentScale: tagCloudScale,
    layerSizes: poisPyramid.map((layer, idx) => ({ scale: idx, count: layer.length }))
  });
};

// 切换分辨率（粗略/精细显示）
const switchResolution = async (mode) => {
  if (!allowRenderCloud.value || poisPyramid.length === 0) return;
  
  const oldScale = tagCloudScale;
  
  if (mode === 'fine') {
    // 精细显示：显示更多POI（降低scale）
    if (tagCloudScale > 0) {
      tagCloudScale--;
    }
  } else {
    // 粗略显示：显示更少POI（提高scale）
    if (tagCloudScale < poisPyramid.length - 1) {
      tagCloudScale++;
    }
  }
  
  // 如果scale没有变化，不重新渲染
  if (oldScale === tagCloudScale) {
    console.log('Scale未变化，跳过渲染');
    return;
  }
  
  console.log(`切换分辨率: ${mode}, scale: ${oldScale} -> ${tagCloudScale}, POI数量: ${poisPyramid[oldScale]?.length} -> ${poisPyramid[tagCloudScale]?.length}`);
  
  // 重新渲染（不重新初始化金字塔）
  await renderCloud(false);
};

// Canvas交互设置
const setupCanvasInteractions = () => {
  if (!canvasInstance) return;
  
  // 鼠标滚轮缩放
  canvasInstance.on('mouse:wheel', (opt) => {
    const delta = opt.e.deltaY;
    let zoom = canvasInstance.getZoom();
    zoom *= 0.999 ** delta;
    if (zoom > 20) zoom = 20;
    if (zoom < 0.01) zoom = 0.01;
    
    canvasInstance.zoomToPoint(
      { x: opt.e.offsetX, y: opt.e.offsetY },
      zoom,
    );
    
    vpt = canvasInstance.viewportTransform;
    opt.e.preventDefault();
    opt.e.stopPropagation();
  });
  
  // 鼠标拖拽（漫游）
  let isDragging = false;
  let lastPosX = 0;
  let lastPosY = 0;
  
  canvasInstance.on('mouse:down', (opt) => {
    if (isPanning.value) {
      const evt = opt.e;
      isDragging = true;
      lastPosX = evt.clientX;
      lastPosY = evt.clientY;
    }
  });
  
  canvasInstance.on('mouse:move', (opt) => {
    if (isDragging && isPanning.value) {
      const e = opt.e;
      vpt = canvasInstance.viewportTransform;
      vpt[4] += e.clientX - lastPosX;
      vpt[5] += e.clientY - lastPosY;
      canvasInstance.setViewportTransform(vpt);
      lastPosX = e.clientX;
      lastPosY = e.clientY;
    }
  });
  
  canvasInstance.on('mouse:up', () => {
    if (isDragging) {
      isDragging = false;
      vpt = canvasInstance.viewportTransform;
    }
  });
};

// 返回中心点
const returnToCenter = () => {
  if (!canvasInstance) return;
  vpt[4] = 0;
  vpt[5] = 0;
  canvasInstance.setViewportTransform(vpt);
};

// 返回原始缩放
const returnToScale = () => {
  if (!canvasInstance) return;
  vpt[0] = 1;
  vpt[1] = 0;
  vpt[2] = 0;
  vpt[3] = 1;
  canvasInstance.setViewportTransform(vpt);
};

// 切换漫游
const togglePanning = () => {
  isPanning.value = !isPanning.value;
  if (canvasInstance) {
    canvasInstance.defaultCursor = isPanning.value ? 'grab' : 'default';
  }
};

// 放大
const zoomIn = () => {
  if (!canvasInstance) return;
  let zoom = canvasInstance.getZoom();
  zoom *= 1.1;
  if (zoom > 20) zoom = 20;
  
  const center = new Point(
    canvasInstance.getWidth() / 2,
    canvasInstance.getHeight() / 2,
  );
  canvasInstance.zoomToPoint(center, zoom);
  vpt = canvasInstance.viewportTransform;
};

// 缩小
const zoomOut = () => {
  if (!canvasInstance) return;
  let zoom = canvasInstance.getZoom();
  zoom *= 0.9;
  if (zoom < 0.01) zoom = 0.01;
  
  const center = new Point(
    canvasInstance.getWidth() / 2,
    canvasInstance.getHeight() / 2,
  );
  canvasInstance.zoomToPoint(center, zoom);
  vpt = canvasInstance.viewportTransform;
};

// 图例悬停高亮
const handleLegendHover = (color) => {
  if (!canvasInstance) return;
  canvasInstance.forEachObject((obj) => {
    if (obj.fill === color) {
      obj.set({
        strokeWidth: obj.fontSize / 12,
        stroke: 'rgba(255,255,255,0.8)',
      });
    } else {
      obj.set({ strokeWidth: 0 });
    }
  });
  canvasInstance.renderAll();
};

// 图例离开
const handleLegendLeave = () => {
  if (!canvasInstance) return;
  canvasInstance.forEachObject((obj) => {
    obj.set({ strokeWidth: 0 });
  });
  canvasInstance.renderAll();
};

// 更新标签颜色（不重新绘制）
const updateLabelColors = () => {
  if (!canvasInstance || !allowRenderCloud.value) return;
  
  const sourceList = poiStore.visibleList;
  if (!sourceList.length || poisPyramid.length === 0) return;
  
  // 使用当前的tagCloudScale，不要重置
  const currentData = poisPyramid[tagCloudScale];
  if (!currentData) {
    console.warn(`tagCloudScale ${tagCloudScale} 超出范围，使用第0层`);
    return;
  }
  
  const center = computeCenter(sourceList);
  const bounds = computeBounds(sourceList);
  
  // 重新计算颜色
  const entries = buildLayoutEntries(
    currentData,
    bounds,
    center,
    poiStore.colorSettings,
  );
  
  // 创建颜色映射（基于文本内容匹配，因为canvas对象没有id）
  const colorMap = new Map();
  entries.forEach((entry) => {
    colorMap.set(entry.textValue, entry.fontColor);
  });
  
  // 更新canvas中的标签颜色
  canvasInstance.forEachObject((obj, i) => {
    if (i === 0) return; // 跳过中心点
    const color = colorMap.get(obj.text);
    if (color && obj.fill !== color) {
      obj.set({ fill: color });
    }
  });
  
  canvasInstance.renderAll();
};

// 更新标签字体和字重（不重新绘制）
const updateLabelFonts = () => {
  if (!canvasInstance || !allowRenderCloud.value) return;
  
  const { fontSettings } = poiStore;
  let index = 1; // 跳过中心点
  
  canvasInstance.forEachObject((obj, i) => {
    if (i === 0) return; // 跳过中心点
    const updates = {};
    if (obj.fontFamily !== fontSettings.fontFamily) {
      updates.fontFamily = fontSettings.fontFamily;
    }
    if (obj.fontWeight !== fontSettings.fontWeight) {
      updates.fontWeight = fontSettings.fontWeight;
    }
    if (Object.keys(updates).length > 0) {
      obj.set(updates);
    }
    index++;
  });
  
  canvasInstance.renderAll();
};

const exportAsImage = () => {
  if (!canvasInstance) return;
  const dataURL = canvasInstance.toDataURL({
    format: 'png',
    multiplier: 2,
  });
  const link = document.createElement('a');
  link.href = dataURL;
  link.download = 'tag-cloud.png';
  link.click();
};

onMounted(() => {
  // 初始化canvas尺寸（只执行一次，固定大小）
  initCanvasSize();
  // 初始化高德地图和Driving实例
  initAMapDriving();
  // 初始化canvas，默认显示并使用设定好的背景色
  nextTick(() => {
    if (canvasRef.value) {
      initCanvas();
    }
  });
  // 不再监听窗口大小变化，canvas尺寸固定
});

// 监听清除标签云事件
watch(
  () => poiStore.hasDrawing,
  (hasDrawing) => {
    if (!hasDrawing) {
      // 当hasDrawing变为false时，清除标签云（无论allowRenderCloud的值如何）
      clearTagCloud();
    }
  },
);

// 监听数据列表变化（需要重新渲染）
watch(
  () => poiStore.visibleList,
  (newList, oldList) => {
    // 如果正在清除，不触发重新渲染
    if (isClearing.value) return;
    
    if (allowRenderCloud.value) {
      // 只有当数据真正变化时才重新初始化金字塔
      // 通过比较长度和第一个元素的id来判断是否真的变化了
      const isDataChanged = !oldList || 
        newList.length !== oldList.length ||
        (newList.length > 0 && oldList.length > 0 && newList[0].id !== oldList[0].id);
      
      if (isDataChanged) {
        // 数据变化时需要重新初始化金字塔
        renderCloud(true);
      }
    }
  },
  { deep: false },
);

// 监听字体设置变化（只有字号变化才重新绘制）
watch(
  () => poiStore.fontSettings.fontSizes,
  () => {
    // 如果正在清除，不触发重新渲染
    if (isClearing.value) return;
    
    if (allowRenderCloud.value) {
      // 字号变化需要重新绘制（影响布局）
      renderCloud(false);
    }
  },
  { deep: true },
);

// 监听颜色设置变化（直接更新，不重新绘制）
watch(
  () => poiStore.colorSettings,
  (newVal, oldVal) => {
    if (allowRenderCloud.value && canvasInstance) {
      // 只有palette、discreteCount、discreteMethod变化才更新颜色
      // background变化已经在单独的watch中处理
      if (newVal.palette !== oldVal?.palette || 
          newVal.discreteCount !== oldVal?.discreteCount ||
          newVal.discreteMethod !== oldVal?.discreteMethod) {
        updateLabelColors();
      }
    }
  },
  { deep: true },
);

// 监听字体和字重变化（直接更新，不重新绘制）
watch(
  () => [poiStore.fontSettings.fontFamily, poiStore.fontSettings.fontWeight],
  () => {
    if (allowRenderCloud.value) {
      updateLabelFonts();
    }
  },
);

watch([showRank, showTime], () => {
  // 如果正在清除，不触发重新渲染
  if (isClearing.value) return;
  
  if (allowRenderCloud.value) renderCloud();
});

onBeforeUnmount(() => {
  if (resizeObserver && wrapperRef.value) {
    resizeObserver.unobserve(wrapperRef.value);
    resizeObserver = null;
  }
  if (canvasInstance) canvasInstance.dispose();
});
</script>

<style scoped>
.tagcloud-panel {
  background: #01030c;
  color: #fff;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 650px;
  width: 100%;
  height: 100%;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.05);
  overflow: hidden;
}
.canvas-wrapper {
  flex: 1;
  display: flex;
  align-items: stretch;
  justify-content: stretch;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  position: relative;
}

.subtext {
  margin: 0;
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
}

canvas {
  border-radius: 12px;
  background: #050816;
  width: 100% !important;
  height: 100% !important;
  display: block;
}

.empty-cloud-hint {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(5, 8, 22, 0.95) 0%, rgba(12, 16, 36, 0.9) 100%);
  backdrop-filter: blur(8px);
  z-index: 5;
  pointer-events: none;
}

.hint-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  padding: 40px;
  text-align: center;
  max-width: 500px;
}

.hint-icon {
  width: 80px;
  height: 80px;
  color: rgba(255, 255, 255, 0.3);
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
}

.hint-text {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.hint-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  letter-spacing: 0.5px;
}

.hint-desc {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.6);
  letter-spacing: 0.3px;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.toolbar-options {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #fff;
}

.toolbar-options :deep(.el-checkbox__label) {
  color: #fff !important;
}

.toolbar-options :deep(.el-checkbox) {
  color: #fff;
}

.toolbar-options :deep(.first-checkbox) {
  margin-right: 0 !important;
}

.label-count {
  color: #fff;
  font-size: 14px;
  margin-left: 12px;
  padding: 0 8px;
}

.tagcloud-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #fff;
}

/* 距离图例 */
.distance-legend {
  position: absolute;
  top: 16px;
  right: 16px;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  padding: 12px 16px;
  min-width: 180px;
  z-index: 10;
  border: 1px solid rgba(255, 255, 255, 0.1);
  pointer-events: auto;
}

.legend-title {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #fff;
  font-weight: 500;
}

.legend-colors {
  display: flex;
  gap: 2px;
  margin-bottom: 8px;
  height: 24px;
}

.legend-color-item {
  flex: 1;
  border-radius: 3px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  min-width: 20px;
}

.legend-color-item:hover {
  transform: scale(1.1);
  box-shadow: 0 0 8px rgba(255, 255, 255, 0.5);
  z-index: 1;
  position: relative;
}

.legend-max-distance {
  margin: 0;
  text-align: right;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
}

/* Canvas工具栏 */
.canvas-toolbar {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 10;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(10px);
  padding: 8px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  pointer-events: auto;
}

.canvas-toolbar :deep(.el-button) {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
  color: #fff;
}

.canvas-toolbar :deep(.el-button:hover) {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
}

.canvas-toolbar :deep(.el-button.is-circle) {
  width: 36px;
  height: 36px;
  display: flex;
  margin: 0;
  align-items: center;
  justify-content: center;
}
</style>

