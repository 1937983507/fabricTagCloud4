<template>
  <aside class="tagcloud-panel">
    <header class="panel-head">
      <div class="toolbar-left">
        <el-button-group>
          <el-button id="runTagCloudBtn" type="primary" data-intro-target="runTagCloudBtn" @click="handleRenderCloud">运行生成标签云</el-button>
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
      
      <!-- POI信息窗口 -->
      <div v-if="selectedPoi" class="poi-info-window">
        <div class="info-window-header">
          <span class="info-window-title">地名信息</span>
          <el-button
            text
            circle
            size="small"
            @click="closePoiInfo"
            class="close-btn"
          >
            <el-icon><Close /></el-icon>
          </el-button>
        </div>
        <div class="info-window-content">
          <div class="info-item">
            <span class="info-label">名称：</span>
            <span class="info-value">{{ selectedPoi.name }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">城市：</span>
            <span class="info-value">{{ selectedPoi.city || '未知' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">排名：</span>
            <span class="info-value">{{ selectedPoi.rank || '未知' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">经度：</span>
            <span class="info-value">{{ selectedPoi.lng?.toFixed(6) || '未知' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">纬度：</span>
            <span class="info-value">{{ selectedPoi.lat?.toFixed(6) || '未知' }}</span>
          </div>
          <div v-if="selectedPoi.distance !== undefined" class="info-item">
            <span class="info-label">距离中心：</span>
            <span class="info-value">{{ (selectedPoi.distance / 1000).toFixed(2) }} km</span>
          </div>
          <div v-if="selectedPoi.time" class="info-item">
            <span class="info-label">通行时间：</span>
            <span class="info-value">{{ selectedPoi.time }} 分钟</span>
          </div>
        </div>
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
import introJs from 'intro.js';
import 'intro.js/minified/introjs.min.css';
import {
  RefreshLeft,
  FullScreen,
  Rank,
  ZoomIn,
  ZoomOut,
  Close,
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
const selectedPoi = ref(null); // 当前选中的POI信息
const baseAngles = [-15, -10, -5, 0, 5, 10, 15];
const stepDistance = 22;
const maxIterations = 220;
const POI_THRESHOLD = 100; // POI数量阈值（首次渲染数量）

let secondIntroStarted = false;

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

const getDataFilterButtonElement = () => {
  return (
    document.querySelector('[data-intro-target="dataFilterBtn"]') ||
    document.querySelector('.map-head .dropdown-btn') ||
    document.querySelector('.map-head .el-dropdown-link')
  );
};

const getRunTagCloudButtonElement = () => {
  return (
    document.querySelector('[data-intro-target="runTagCloudBtn"]') ||
    document.querySelector('#runTagCloudBtn') ||
    document.querySelector('.tagcloud-panel .panel-head .el-button--primary')
  );
};

const startDrawGuideIntro = () => {
  if (secondIntroStarted) return;
  secondIntroStarted = true;

  const attemptStart = (retries = 8) => {
    const dataFilterBtn = getDataFilterButtonElement();
    const runBtn = getRunTagCloudButtonElement();

    if (dataFilterBtn && runBtn) {
      try {
        const intro = introJs.tour();
        intro.addSteps([
          {
            element: dataFilterBtn,
            intro:
              '<div style="line-height:1.6;"><strong style="font-size:16px;color:#1f2333;">数据筛选</strong><br/><span style="color:#64748b;">您需要在此对点数据进行筛选操作。点击下拉菜单选择圆形、矩形或多边形筛选方式。</span></div>',
          },
          {
            element: runBtn,
            intro:
              '<div style="line-height:1.6;"><strong style="font-size:16px;color:#1f2333;">运行生成标签云</strong><br/><span style="color:#64748b;">完成数据筛选之后，点击此按钮生成标签云。</span></div>',
          },
        ]);
        intro.setOptions({
          nextLabel: '下一步 →',
          prevLabel: '← 上一步',
          skipLabel: '跳过',
          doneLabel: '完成',
          showStepNumbers: true,
          showProgress: true,
          disableInteraction: false,
          tooltipClass: 'customTooltipClass',
          highlightClass: 'customHighlightClass',
          exitOnOverlayClick: true,
          exitOnEsc: true,
          keyboardNavigation: true,
          tooltipRenderAsHtml: true,
        });
        intro.onComplete(() => {
          secondIntroStarted = false;
        });
        intro.onExit(() => {
          secondIntroStarted = false;
        });
        intro.start();
      } catch (error) {
        console.error('[TagCloudCanvas] 二次引导启动失败', error);
        secondIntroStarted = false;
      }
      return;
    }

    if (retries > 0) {
      setTimeout(() => attemptStart(retries - 1), 200);
    } else {
      console.warn('[TagCloudCanvas] 未找到绘制引导元素');
      secondIntroStarted = false;
    }
  };

  nextTick(() => {
    setTimeout(() => attemptStart(), 120);
  });
};

function handleRenderCloud() {
  // 如果没有筛选数据，启动第二个引导并阻止绘制
  if (!poiStore.hasDrawing) {
    startDrawGuideIntro();
    return;
  }
  
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

// 计算颜色类别索引（优化版本：使用预计算的缓存值）
const calculateClassIndexOptimized = (entry, index, total, colorNum, discreteMethod, cache) => {
  let classIndex;
  const distance = entry.distance;

  switch (discreteMethod) {
    case 'equal':
      // 相等间隔（使用缓存值）
      classIndex = Math.floor((distance - cache.minValue) / cache.interval);
      if (classIndex >= colorNum) classIndex = colorNum - 1;
      break;
    case 'quantile':
      // 分位数
      const percentile = (index + 1) / total;
      classIndex = Math.ceil(colorNum * percentile) - 1;
      break;
    case 'jenks':
      // 自然间断点(Jenks)（使用缓存值）
      for (let i = 0; i < cache.jenksBreaks.length; i++) {
        if (distance <= cache.jenksBreaks[i]) {
          classIndex = i;
          break;
        }
      }
      if (classIndex === undefined) classIndex = colorNum - 1;
      break;
    case 'geometric':
      // 几何间隔（使用缓存值）
      classIndex = Math.floor(Math.log(distance / cache.minValue) / Math.log(cache.ratio));
      if (classIndex >= colorNum) classIndex = colorNum - 1;
      if (classIndex < 0) classIndex = 0;
      break;
    case 'stddev':
      // 标准差（使用缓存值）
      const deviation = distance - cache.mean;
      classIndex = Math.floor(deviation / cache.stdDevInterval) + cache.halfColorNum;
      if (classIndex < 0) classIndex = 0;
      else if (classIndex >= colorNum) classIndex = colorNum - 1;
      break;
    default:
      classIndex = 0;
      break;
  }

  return classIndex;
};

// 保留原函数以兼容（如果其他地方有调用）
const calculateClassIndex = (data, index, total, colorNum, discreteMethod) => {
  const entry = data[index];
  // 如果没有缓存，使用原逻辑（性能较差，但兼容）
  let colorCache = {};
  if (discreteMethod === 'equal' || discreteMethod === 'geometric') {
    const distances = data.map((item) => item.distance);
    colorCache.minValue = Math.min(...distances);
    colorCache.maxValue = Math.max(...distances);
    if (discreteMethod === 'geometric') {
      colorCache.ratio = Math.pow(colorCache.maxValue / colorCache.minValue, 1 / colorNum);
    } else {
      colorCache.range = colorCache.maxValue - colorCache.minValue;
      colorCache.interval = colorCache.range / colorNum;
    }
  } else if (discreteMethod === 'stddev') {
    const allValues = data.map((item) => item.distance);
    colorCache.mean = allValues.reduce((acc, curr) => acc + curr, 0) / allValues.length;
    colorCache.stdDev = Math.sqrt(
      allValues.reduce((acc, curr) => acc + Math.pow(curr - colorCache.mean, 2), 0) /
        allValues.length,
    );
    colorCache.stdDevInterval = colorCache.stdDev / colorNum;
    colorCache.halfColorNum = Math.floor(colorNum / 2);
  } else if (discreteMethod === 'jenks') {
    const values = data.map((item) => item.distance).sort((a, b) => a - b);
    colorCache.jenksBreaks = calculateJenks(values, colorNum);
  }
  return calculateClassIndexOptimized(entry, index, total, colorNum, discreteMethod, colorCache);
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

  // 先按rank排序，用于计算字号分级
  const sortedByRank = [...list].sort((a, b) => (a.rank || 0) - (b.rank || 0));
  const dataLength = sortedByRank.length;
  const levelCount = fontSettings.levelCount || fontSettings.fontSizes.length;
  // 只使用前levelCount个字号
  const effectiveFontSizes = fontSettings.fontSizes.slice(0, levelCount);
  const itemsPerLevel = dataLength / levelCount;

  // 创建rank到字号级别的映射
  const rankToFontSizeIndex = new Map();
  sortedByRank.forEach((poi, index) => {
    // 计算当前POI所属的级别（rank小的级别更小，字号更大）
    // 例如：100个POI，5级，每级20个
    // index 0-19 -> classIndex 0 (最大字号)
    // index 20-39 -> classIndex 1
    // index 40-59 -> classIndex 2
    // index 60-79 -> classIndex 3
    // index 80-99 -> classIndex 4 (最小字号)
    const classIndex = Math.floor(index / itemsPerLevel);
    // 确保classIndex在有效范围内（0 到 levelCount-1）
    const fontSizeIndex = Math.min(classIndex, levelCount - 1);
    rankToFontSizeIndex.set(poi.id, fontSizeIndex);
  });

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
    // 优化：不阻塞渲染，如果计算时间过长则使用估算值
    if (showTime.value && !poi.time) {
      // 使用估算方法（更快），如果需要精确值可以后续异步更新
      const travelTime = calculateTravelTime(center.lng, center.lat, poi.lng, poi.lat);
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

    // 根据rank排序后的位置获取字号级别
    const fontSizeIndex = rankToFontSizeIndex.get(poi.id) || 0;

    return {
      id: poi.id,
      textValue: labelText,
      fontSize:
        effectiveFontSizes[fontSizeIndex] *
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

  // 根据距离分配颜色（优化：预先计算需要的值，避免重复计算）
  const colorNum = colorSettings.discreteCount || colorSettings.palette.length;
  const discreteMethod = colorSettings.discreteMethod || 'quantile';
  const palette = colorSettings.palette;
  const total = entriesWithDistance.length;

  // 预先计算颜色分类所需的公共值（避免在循环中重复计算）
  let colorCache = {};
  if (discreteMethod === 'equal' || discreteMethod === 'geometric') {
    const distances = entriesWithDistance.map((item) => item.distance);
    colorCache.minValue = Math.min(...distances);
    colorCache.maxValue = Math.max(...distances);
    if (discreteMethod === 'geometric') {
      colorCache.ratio = Math.pow(colorCache.maxValue / colorCache.minValue, 1 / colorNum);
    } else {
      colorCache.range = colorCache.maxValue - colorCache.minValue;
      colorCache.interval = colorCache.range / colorNum;
    }
  } else if (discreteMethod === 'stddev') {
    const allValues = entriesWithDistance.map((item) => item.distance);
    colorCache.mean = allValues.reduce((acc, curr) => acc + curr, 0) / allValues.length;
    colorCache.stdDev = Math.sqrt(
      allValues.reduce((acc, curr) => acc + Math.pow(curr - colorCache.mean, 2), 0) /
        allValues.length,
    );
    colorCache.stdDevInterval = colorCache.stdDev / colorNum;
    colorCache.halfColorNum = Math.floor(colorNum / 2);
  } else if (discreteMethod === 'jenks') {
    const values = entriesWithDistance.map((item) => item.distance).sort((a, b) => a - b);
    colorCache.jenksBreaks = calculateJenks(values, colorNum);
  }

  return entriesWithDistance.map((entry, index) => {
    const classIndex = calculateClassIndexOptimized(
      entry,
      index,
      total,
      colorNum,
      discreteMethod,
      colorCache,
    );
    return {
      ...entry,
      fontColor: palette[classIndex] || palette[0],
    };
  });
};

// 空间索引：用于快速查找附近的标签（优化碰撞检测）
class SpatialIndex {
  constructor(cellSize = 100) {
    this.cellSize = cellSize;
    this.grid = new Map();
  }

  // 获取坐标对应的网格键
  getKey(x, y) {
    const gridX = Math.floor(x / this.cellSize);
    const gridY = Math.floor(y / this.cellSize);
    return `${gridX},${gridY}`;
  }

  // 添加对象到索引
  add(obj, x, y) {
    const key = this.getKey(x, y);
    if (!this.grid.has(key)) {
      this.grid.set(key, []);
    }
    this.grid.get(key).push(obj);
  }

  // 获取附近的对象（检查当前网格和相邻网格）
  // 为了确保覆盖标签的边界框，检查更大的区域（5x5网格）
  getNearby(x, y) {
    const gridX = Math.floor(x / this.cellSize);
    const gridY = Math.floor(y / this.cellSize);
    const nearby = [];
    
    // 检查5x5网格区域（扩大检查范围，确保覆盖标签边界框）
    // 这样可以确保即使标签跨越多个网格，也能被检测到
    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        const key = `${gridX + dx},${gridY + dy}`;
        if (this.grid.has(key)) {
          nearby.push(...this.grid.get(key));
        }
      }
    }
    return nearby;
  }

  // 清空索引
  clear() {
    this.grid.clear();
  }
}

// 多角度径向偏移策略（优化版本：使用空间索引）
const simulateDirection = (entry, originX, originY, angle, spatialIndex) => {
  // 初始位置为圆形中心
  let newX = originX;
  let newY = originY;
  
  // 计算旋转后的目标方向
  const target = rotate(originX, originY, entry.screenX, entry.screenY, angle);
  const offsetXX = target[0] - originX;
  const offsetYY = target[1] - originY;
  
  // 计算单位方向向量和步长（对应原有项目的20像素）
  const xie = Math.sqrt(offsetXX * offsetXX + offsetYY * offsetYY);
  if (xie === 0) {
    // 如果距离为0，直接返回中心位置
    return { x: originX, y: originY, collision: false };
  }
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
  temp.setCoords(); // 初始化坐标

  // 开始偏移（沿着旋转后的方向，参考原有项目strategy 3）
  let iterations = 0;
  
  while (iterations < maxIterations) {
    // 默认不需要偏移
    let isShift = false;
    
    // 获取所有已绘制的对象（排除临时对象）
    // 重要：为了确保碰撞检测的准确性，始终检查所有已绘制的标签
    // 空间索引主要用于其他优化，但碰撞检测必须检查所有对象
    const allObjects = canvasInstance.getObjects();
    
    // 遍历所有元素，检查碰撞
    for (const obj of allObjects) {
      // 排除当前正在移动的临时元素
      if (obj === temp) continue;
      
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
        break; // 找到碰撞就退出，继续下一轮
      }
    }
    
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

// 多角度径向偏移策略绘制标签（优化版本：使用空间索引，提前退出）
const drawLabel = (entry, originX, originY, spatialIndex) => {
  // 对每个角度进行模拟，找到所有可行的位置
  // 优化：如果找到无碰撞位置，可以提前退出
  const candidates = [];
  let foundViable = false;
  
  for (const angle of baseAngles) {
    const result = simulateDirection(entry, originX, originY, angle, spatialIndex);
    candidates.push(result);
    
    // 如果找到无碰撞的位置，可以提前退出（但为了找到最近的位置，继续检查所有角度）
    if (!result.collision && !foundViable) {
      foundViable = true;
    }
  }
  
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
    strokeWidth: 0, // 不使用轮廓
    shadow: {
      color: 'rgba(0, 0, 0, 0.25)',
      offsetX: 2,
      offsetY: 2,
      blur: 8,
    },
    selectable: false,
  });
  
  // 存储距离信息和POI ID到canvas对象上，用于后续颜色更新和点击事件
  text.distance = entry.distance;
  text.poiId = entry.id; // 存储POI ID，用于点击时查找POI数据
  
  canvasInstance.add(text);
  // 确保坐标已更新
  text.setCoords();
  
  // 将新标签添加到空间索引（使用实际位置）
  if (spatialIndex) {
    const actualX = text.left || theNewLocation.x;
    const actualY = text.top || theNewLocation.y;
    spatialIndex.add(text, actualX, actualY);
  }
  
  return text;
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

  // 创建空间索引以优化碰撞检测（网格大小根据标签平均大小调整）
  // 注意：为了确保碰撞检测准确性，网格大小应该足够大以包含标签的边界框
  const avgFontSize = entries.length > 0 
    ? entries.reduce((sum, e) => sum + e.fontSize, 0) / entries.length 
    : 20;
  // 网格大小应该至少是最大标签宽度的2-3倍，以确保能覆盖标签的边界框
  // 估算：文本宽度大约是字号的0.6-1倍（取决于文本长度），所以使用字号*3作为网格大小
  const cellSize = Math.max(avgFontSize * 3, 100); // 网格大小至少为平均字号的3倍，最小100
  const spatialIndex = new SpatialIndex(cellSize);
  
  // 将中心点添加到空间索引
  const centerObjects = canvasInstance.getObjects();
  if (centerObjects.length > 0) {
    const centerObj = centerObjects[0];
    // 使用对象的实际中心位置
    const centerX = centerObj.left || originalCenterX;
    const centerY = centerObj.top || originalCenterY;
    spatialIndex.add(centerObj, centerX, centerY);
  }

  // 优化渲染：批量渲染，减少延迟
  const batchSize = 5; // 每批渲染标签个数
  const renderDelay = 1; // 每批之间的延迟（ms）
  
  for (let i = 0; i < entries.length; i++) {
    drawLabel(entries[i], originalCenterX, originalCenterY, spatialIndex);
    
    // 每批渲染后暂停一下，使用requestAnimationFrame优化
    if ((i + 1) % batchSize === 0 && i < entries.length - 1) {
      await sleep(renderDelay);
      // 使用requestAnimationFrame让浏览器有机会更新UI
      await new Promise(resolve => requestAnimationFrame(resolve));
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
  
  let clickStartTime = 0;
  let clickStartPos = { x: 0, y: 0 };
  let hasMoved = false; // 标记是否发生了移动
  
  canvasInstance.on('mouse:down', (opt) => {
    const evt = opt.e;
    // 记录点击开始时间和位置，用于区分拖拽和点击
    clickStartTime = Date.now();
    clickStartPos = { x: evt.clientX, y: evt.clientY };
    hasMoved = false;
    
    if (isPanning.value) {
      isDragging = true;
      lastPosX = evt.clientX;
      lastPosY = evt.clientY;
    }
  });
  
  canvasInstance.on('mouse:move', (opt) => {
    if (isDragging && isPanning.value) {
      const e = opt.e;
      const moveDistance = Math.sqrt(
        Math.pow(e.clientX - clickStartPos.x, 2) + 
        Math.pow(e.clientY - clickStartPos.y, 2)
      );
      // 如果移动距离超过5像素，认为是拖拽
      if (moveDistance > 5) {
        hasMoved = true;
      }
      
      vpt = canvasInstance.viewportTransform;
      vpt[4] += e.clientX - lastPosX;
      vpt[5] += e.clientY - lastPosY;
      canvasInstance.setViewportTransform(vpt);
      lastPosX = e.clientX;
      lastPosY = e.clientY;
    }
  });
  
  canvasInstance.on('mouse:up', (opt) => {
    if (isDragging) {
      isDragging = false;
      vpt = canvasInstance.viewportTransform;
    }
    
    // 处理点击事件：只有在没有拖拽或拖拽距离很小的情况下才处理
    const clickDuration = Date.now() - clickStartTime;
    const evt = opt.e;
    const moveDistance = Math.sqrt(
      Math.pow(evt.clientX - clickStartPos.x, 2) + 
      Math.pow(evt.clientY - clickStartPos.y, 2)
    );
    
    // 如果是短时间点击且移动距离小，认为是点击事件而不是拖拽
    if (clickDuration < 300 && moveDistance < 5 && !hasMoved) {
      // 检查是否点击了标签（排除中心点）
      const target = opt.target;
      const objects = canvasInstance.getObjects();
      const centerObject = objects.length > 0 ? objects[0] : null;
      
      if (target && target.poiId && target !== centerObject) {
        // 根据POI ID查找对应的POI数据
        const poi = poiStore.poiList.find(p => p.id === target.poiId);
        if (poi) {
          // 获取标签的距离信息
          const poiWithDistance = {
            ...poi,
            distance: target.distance,
          };
          selectedPoi.value = poiWithDistance;
        }
      } else {
        // 点击空白区域，关闭信息窗口
        selectedPoi.value = null;
      }
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

// 关闭POI信息窗口
const closePoiInfo = () => {
  selectedPoi.value = null;
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

// 更新标签颜色（不重新绘制，只更新颜色属性）
// 重要：基于当前要渲染展示的POI数据重新计算颜色分类
const updateLabelColors = () => {
  if (!canvasInstance || !allowRenderCloud.value) return;
  
  const sourceList = poiStore.visibleList;
  if (!sourceList.length || poisPyramid.length === 0) return;
  
  // 使用当前的tagCloudScale，获取当前要渲染展示的POI数据
  const currentData = poisPyramid[tagCloudScale];
  if (!currentData) {
    console.warn(`tagCloudScale ${tagCloudScale} 超出范围，使用第0层`);
    return;
  }
  
  const center = computeCenter(sourceList);
  const colorSettings = poiStore.colorSettings;
  const colorNum = colorSettings.discreteCount || colorSettings.palette.length;
  const discreteMethod = colorSettings.discreteMethod || 'quantile';
  const palette = colorSettings.palette;
  
  // 创建POI文本到POI数据的映射（用于快速查找）
  const textToPoiMap = new Map();
  currentData.forEach((poi) => {
    // 构建标签文本（与buildLayoutEntries中的逻辑一致）
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
    textToPoiMap.set(labelText, poi);
  });
  
  // 重要：基于当前要渲染展示的POI数据重新计算所有距离
  // 这样可以确保颜色分类是基于当前展示的POI数量，而不是已绘制的对象数量
  const entriesWithDistance = currentData.map((poi) => {
    const distance = calculateDistance(
      center.lat,
      center.lng,
      poi.lat,
      poi.lng,
    );
    
    // 构建标签文本
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
      textValue: labelText,
      distance,
    };
  });
  
  // 按距离升序排序（用于quantile方法）
  entriesWithDistance.sort((a, b) => a.distance - b.distance);
  
  // 提取所有距离值
  const distances = entriesWithDistance.map(entry => entry.distance);
  
  // 预先计算颜色分类所需的公共值（避免在循环中重复计算）
  let colorCache = {};
  if (discreteMethod === 'equal' || discreteMethod === 'geometric') {
    if (distances.length > 0) {
      colorCache.minValue = Math.min(...distances);
      colorCache.maxValue = Math.max(...distances);
      if (discreteMethod === 'geometric') {
        colorCache.ratio = Math.pow(colorCache.maxValue / colorCache.minValue, 1 / colorNum);
      } else {
        colorCache.range = colorCache.maxValue - colorCache.minValue;
        colorCache.interval = colorCache.range / colorNum;
      }
    }
  } else if (discreteMethod === 'stddev') {
    if (distances.length > 0) {
      colorCache.mean = distances.reduce((acc, curr) => acc + curr, 0) / distances.length;
      colorCache.stdDev = Math.sqrt(
        distances.reduce((acc, curr) => acc + Math.pow(curr - colorCache.mean, 2), 0) /
          distances.length,
      );
      colorCache.stdDevInterval = colorCache.stdDev / colorNum;
      colorCache.halfColorNum = Math.floor(colorNum / 2);
    }
  } else if (discreteMethod === 'jenks') {
    if (distances.length > 0) {
      const values = [...distances].sort((a, b) => a - b);
      colorCache.jenksBreaks = calculateJenks(values, colorNum);
    }
  }
  
  // 创建文本到颜色类别的映射
  const textToColorMap = new Map();
  entriesWithDistance.forEach((entry, index) => {
    let classIndex = 0;
    
    if (discreteMethod === 'quantile') {
      // 分位数：基于排序后的索引
      const percentile = (index + 1) / entriesWithDistance.length;
      classIndex = Math.ceil(colorNum * percentile) - 1;
    } else {
      classIndex = calculateClassIndexOptimized(
        entry,
        index,
        entriesWithDistance.length,
        colorNum,
        discreteMethod,
        colorCache,
      );
    }
    
    const color = palette[classIndex] || palette[0];
    textToColorMap.set(entry.textValue, color);
  });
  
  // 更新canvas中的标签颜色（只更新fill属性，不触发重绘）
  // 使用set方法批量更新，确保Fabric.js正确更新属性
  let hasUpdates = false;
  let updatedCount = 0;
  let skippedCount = 0;
  
  // 临时禁用canvas的渲染，避免逐个更新时触发重绘
  const wasRenderOnAddRemove = canvasInstance.renderOnAddRemove;
  canvasInstance.renderOnAddRemove = false;
  
  canvasInstance.forEachObject((obj, i) => {
    if (i === 0) return; // 跳过中心点
    
    // 从映射中获取新颜色
    const newColor = textToColorMap.get(obj.text);
    if (!newColor) {
      // 如果找不到对应的颜色，可能是文本不匹配，尝试调试
      skippedCount++;
      return;
    }
    
    // 只更新颜色，不触发重绘
    if (obj.fill !== newColor) {
      // 使用set方法更新属性，确保Fabric.js正确更新内部状态
      // 注意：set方法会触发对象更新，但不会立即渲染（因为已禁用renderOnAddRemove）
      obj.set({ fill: newColor });
      // 同时更新存储的距离信息（如果存在）
      const poi = textToPoiMap.get(obj.text);
      if (poi) {
        obj.distance = calculateDistance(
          center.lat,
          center.lng,
          poi.lat,
          poi.lng,
        );
      }
      // 确保对象状态已更新
      obj.setCoords();
      hasUpdates = true;
      updatedCount++;
    }
  });
  
  // 恢复canvas的渲染设置
  canvasInstance.renderOnAddRemove = wasRenderOnAddRemove;
  
  // 如果有更新，立即渲染所有更新
  if (hasUpdates) {
    // 强制渲染所有对象，确保所有颜色更新都显示出来
    // 直接调用renderAll，不使用requestAnimationFrame，确保立即渲染
    canvasInstance.renderAll();
  }
  
  // 调试信息（开发时使用）
  if (process.env.NODE_ENV === 'development' && (updatedCount > 0 || skippedCount > 0)) {
    console.log(`颜色更新: 已更新 ${updatedCount} 个标签, 跳过 ${skippedCount} 个标签, 总对象数: ${canvasInstance.getObjects().length - 1}`);
  }
};

// 更新标签字体和字重（不重新绘制，只更新属性）
// 优化：使用与updateLabelColors相同的方式，批量更新后一次性渲染
const updateLabelFonts = () => {
  if (!canvasInstance || !allowRenderCloud.value) return;
  
  const { fontSettings } = poiStore;
  let hasUpdates = false;
  let updatedCount = 0;
  
  // 临时禁用canvas的渲染，避免逐个更新时触发重绘
  const wasRenderOnAddRemove = canvasInstance.renderOnAddRemove;
  canvasInstance.renderOnAddRemove = false;
  
  // 批量更新所有对象的字体和字重
  canvasInstance.forEachObject((obj, i) => {
    if (i === 0) return; // 跳过中心点
    
    // 检查是否需要更新
    const needsFontFamilyUpdate = obj.fontFamily !== fontSettings.fontFamily;
    const needsFontWeightUpdate = obj.fontWeight !== fontSettings.fontWeight;
    
    if (needsFontFamilyUpdate || needsFontWeightUpdate) {
      // 使用set方法批量更新属性，确保Fabric.js正确更新内部状态
      // 注意：字体和字重改变可能影响文本尺寸，需要重新计算边界框
      const updates = {};
      if (needsFontFamilyUpdate) {
        updates.fontFamily = fontSettings.fontFamily;
      }
      if (needsFontWeightUpdate) {
        updates.fontWeight = fontSettings.fontWeight;
      }
      // 确保移除轮廓（切换字体时不应该有轮廓）
      // 无条件清除轮廓，避免字体切换时出现轮廓
      updates.strokeWidth = 0;
      
      // 批量更新属性（不触发渲染）
      obj.set(updates);
      // 确保对象状态已更新（字体改变可能影响文本尺寸，需要重新计算）
      obj.setCoords();
      hasUpdates = true;
      updatedCount++;
    }
  });
  
  // 恢复canvas的渲染设置
  canvasInstance.renderOnAddRemove = wasRenderOnAddRemove;
  
  // 如果有更新，立即渲染所有更新（一次性渲染，不会一个一个重绘）
  if (hasUpdates) {
    // 强制渲染所有对象，确保所有字体更新都显示出来
    // 直接调用renderAll，不使用requestAnimationFrame，确保立即渲染
    canvasInstance.renderAll();
  }
  
  // 调试信息（开发时使用）
  if (process.env.NODE_ENV === 'development' && updatedCount > 0) {
    console.log(`字体更新: 已更新 ${updatedCount} 个标签的字体/字重`);
  }
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

/* POI信息窗口 */
.poi-info-window {
  position: absolute;
  bottom: 16px;
  right: 16px;
  width: 320px;
  max-width: calc(100% - 32px);
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  z-index: 20;
  animation: slideInUp 0.3s ease-out;
  pointer-events: auto;
}

@keyframes slideInUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.info-window-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.info-window-title {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
}

.info-window-header .close-btn {
  color: rgba(255, 255, 255, 0.7);
  padding: 4px;
}

.info-window-header .close-btn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
}

.info-window-content {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 14px;
  line-height: 1.6;
}

.info-label {
  color: rgba(255, 255, 255, 0.6);
  min-width: 80px;
  flex-shrink: 0;
}

.info-value {
  color: #fff;
  font-weight: 500;
  word-break: break-word;
}
</style>

