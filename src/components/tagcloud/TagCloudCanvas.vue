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
          <el-dropdown @command="handleExportCommand">
            <el-button>
              导出图片<el-icon style="margin-left:4px"><ArrowDown /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="svg">导出SVG</el-dropdown-item>
                <el-dropdown-item command="png">导出PNG</el-dropdown-item>
                <el-dropdown-item command="jpeg">导出JPEG</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <div class="label-progress">
            <span class="label-count">
              标签数量:
              <span class="label-count-number">
                {{ currentRenderedCount }}
                <span v-if="totalLabelCount > 0">/ {{ totalLabelCount }}</span>
              </span>
            </span>
            <el-progress
              :percentage="renderProgress"
              :stroke-width="16"
              :show-text="true"
              :text-inside="true"
              :format="percentage => percentage + '%'"
              class="label-progress-bar"
            />
          </div>
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
        <p class="legend-title">{{ poiStore.fontSettings.language === 'en' ? 'Distance from Center (km)' : '与中心的距离(km)' }}</p>
        <div class="legend-colors-wrapper">
          <div class="legend-colors">
            <div
              v-for="(color, index) in poiStore.colorSettings.palette"
              :key="`legend-${index}`"
              class="legend-color-item"
              :style="{ background: color }"
              @mouseenter="handleLegendHover(color)"
              @mouseleave="handleLegendLeave"
            ></div>
          </div>
          <!-- 在色块下面一行显示距离标签 -->
          <div v-if="allowRenderCloud && colorBoundaries.length > 0" class="legend-boundaries">
            <span class="legend-boundary-label legend-start">0</span>
            <span
              v-for="(boundary, index) in colorBoundaries"
              :key="`boundary-${index}`"
              class="legend-boundary-label legend-middle"
              :style="{ left: `${((index + 1) * 100) / paletteCount}%` }"
            >
              {{ formatDistance(boundary) }}
            </span>
            <span
              v-if="maxDistance > 0"
              class="legend-boundary-label legend-max-distance"
            >
              {{ formatDistance(maxDistance) }}
            </span>
          </div>
        </div>
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
            <span class="info-value">{{ getPoiDisplayName(selectedPoi) }}</span>
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
    <!-- 导出图片设置对话框 -->
    <el-dialog v-model="exportDialogVisible" title="导出图片设置" width="350px" :close-on-click-modal="false">
      <template v-if="exportFormat !== 'svg'">
        <div style="display:flex; gap:10px; align-items:center; margin-bottom:10px;">
          <span style="width:60px;">宽度(px)</span>
          <el-input-number v-model="exportWidth" :min="1" :max="4000" :step="10" size="small" @change="onExportWidthChange" style="width:130px;"/>
        </div>
        <div style="display:flex; gap:10px; align-items:center; margin-bottom:10px;">
          <span style="width:60px;">高度(px)</span>
          <el-input-number v-model="exportHeight" :min="1" :max="4000" :step="10" size="small" @change="onExportHeightChange" style="width:130px;"/>
        </div>
        <div style="display:flex; gap:10px; align-items:center; margin-bottom:10px;">
          <el-checkbox v-model="lockAspectRatio" size="small">锁定比例</el-checkbox>
        </div>
      </template>
      <div style="display:flex; gap:10px; align-items:center; margin-bottom:10px;">
        <el-checkbox v-model="includeLegend" size="small">包含距离图例</el-checkbox>
      </div>
      <template #footer>
        <el-button @click="exportDialogVisible=false">取消</el-button>
        <el-button type="primary" @click="handleExportConfirm">确认导出</el-button>
      </template>
    </el-dialog>
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
import { cityNameToPinyin } from '@/utils/cityNameToPinyin';
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
  ArrowDown,
} from '@element-plus/icons-vue';

const canvasRef = ref(null);
const wrapperRef = ref(null);
const showRank = ref(false);
const showTime = ref(false);
const poiStore = usePoiStore();

// 导出相关变量
const exportDialogVisible = ref(false);
const exportWidth = ref(800);
const exportHeight = ref(600);
const exportFormat = ref('png');
const lockAspectRatio = ref(true);
const includeLegend = ref(true); // 默认包含图例
const origWidth = ref(800);
const origHeight = ref(600);
let _aspectRatio = 1;

const POI_THRESHOLD = 100;

let canvasInstance;
let isRendering = false;
let isPanning = ref(true);
let vpt = [1, 0, 0, 1, 0, 0];
const maxDistance = ref(0);
let poisPyramid = [];
let tagCloudScale = 0;
const pyramidUpdateTrigger = ref(0);
const paletteCount = computed(() => poiStore.colorSettings.palette.length || 1);
let amapGlobal = null;
let drivingInstance = null;

const allowRenderCloud = ref(false);
const canvasWidth = ref(900);
const canvasHeight = ref(900);
const canvasKey = ref(0);
const isClearing = ref(false);
const renderedLabelCount = ref(0);
const totalLabelCount = ref(0);
const currentRenderedCount = ref(0);
const selectedPoi = ref(null);

const renderProgress = computed(() => {
  if (!totalLabelCount.value) return 0;
  const ratio = currentRenderedCount.value / totalLabelCount.value;
  return Math.min(100, Math.max(0, Math.round(ratio * 100)));
});

let secondIntroStarted = false;

// 计算各个色块之间的分界点距离值
const calculateColorBoundaries = () => {
  pyramidUpdateTrigger.value;
  
  if (!allowRenderCloud.value || !poiStore.visibleList.length || poisPyramid.length === 0) {
    return [];
  }
  
  const sourceList = poiStore.visibleList;
  const currentData = poisPyramid[tagCloudScale] || poisPyramid[0] || sourceList;
  if (!currentData || currentData.length === 0) {
    return [];
  }
  
  const selectionCenter = poiStore.selectionCenter;
  if (!selectionCenter) return [];
  
  const colorSettings = poiStore.colorSettings;
  const colorNum = colorSettings.discreteCount || colorSettings.palette.length;
  const discreteMethod = colorSettings.discreteMethod || 'quantile';
  
  // 计算所有POI的距离
  const entriesWithDistance = currentData.map((poi) => {
    const distance = calculateDistance(
      selectionCenter.lat,
      selectionCenter.lng,
      poi.lat,
      poi.lng,
    );
    return { poi, distance };
  });
  
  entriesWithDistance.sort((a, b) => a.distance - b.distance);
  
  const distances = entriesWithDistance.map(entry => entry.distance);
  if (distances.length === 0) return [];
  
  // 预先计算颜色分类所需的公共值
  let colorCache = {};
  if (discreteMethod === 'equal' || discreteMethod === 'geometric') {
    colorCache.minValue = Math.min(...distances);
    colorCache.maxValue = Math.max(...distances);
    if (discreteMethod === 'geometric') {
      colorCache.ratio = Math.pow(colorCache.maxValue / colorCache.minValue, 1 / colorNum);
    } else {
      colorCache.range = colorCache.maxValue - colorCache.minValue;
      colorCache.interval = colorCache.range / colorNum;
    }
  } else if (discreteMethod === 'stddev') {
    colorCache.mean = distances.reduce((acc, curr) => acc + curr, 0) / distances.length;
    colorCache.stdDev = Math.sqrt(
      distances.reduce((acc, curr) => acc + Math.pow(curr - colorCache.mean, 2), 0) /
        distances.length,
    );
    colorCache.stdDevInterval = colorCache.stdDev / colorNum;
    colorCache.halfColorNum = Math.floor(colorNum / 2);
  } else if (discreteMethod === 'jenks') {
    const values = [...distances].sort((a, b) => a - b);
    colorCache.jenksBreaks = calculateJenks(values, colorNum);
  }
  
  // 为每个entry计算classIndex
  const entriesWithClass = entriesWithDistance.map((entry, index) => {
    let classIndex = 0;
    
    if (discreteMethod === 'quantile') {
      const percentile = (index + 1) / entriesWithDistance.length;
      classIndex = Math.ceil(colorNum * percentile) - 1;
    } else {
      const entryForClass = { distance: entry.distance };
      classIndex = calculateClassIndexOptimized(
        entryForClass,
        index,
        entriesWithDistance.length,
        colorNum,
        discreteMethod,
        colorCache,
      );
    }
    return { ...entry, classIndex };
  });
  
  // 计算每个色块的最大距离值（作为分界点），不包含最后一个色块
  const boundaries = [];
  for (let i = 0; i < colorNum - 1; i++) {
    const entriesInClass = entriesWithClass.filter(e => e.classIndex === i);
    if (entriesInClass.length > 0) {
      const maxDist = Math.max(...entriesInClass.map(e => e.distance));
      boundaries.push(maxDist);
    } else {
      boundaries.push(i > 0 ? boundaries[i - 1] : 0);
    }
  }
  
  return boundaries;
};

// 格式化距离数值，根据数值大小智能调整小数位数以避免重叠
const formatDistance = (distanceInMeters) => {
  const distanceInKm = distanceInMeters / 1000;
  
  // 如果距离 >= 100km，显示整数（0位小数）
  if (distanceInKm >= 100) {
    return Math.round(distanceInKm).toString();
  }
  // 如果距离 >= 10km，显示1位小数
  if (distanceInKm >= 10) {
    return distanceInKm.toFixed(1);
  }
  // 如果距离 < 10km，显示1位小数（保持一致性）
  return distanceInKm.toFixed(1);
};

// 各个色块之间的分界点距离值
const colorBoundaries = computed(() => {
  return calculateColorBoundaries();
});

// 根据语言获取POI显示名称
const getPoiDisplayName = (poi) => {
  const language = poiStore.fontSettings.language || 'zh';
  if (language === 'en') {
    // 优先使用英文名，如果不存在则转换为拼音
    if (poi.name_en && poi.name_en.trim()) {
      return poi.name_en;
    }
    return cityNameToPinyin(poi.name);
  }
  return poi.name;
};

const initCanvas = () => {
  if (!canvasRef.value) return;
  
  if (canvasInstance) {
    vpt = canvasInstance.viewportTransform;
    canvasInstance.dispose();
  }
  canvasInstance = new Canvas(canvasRef.value, {
    backgroundColor: poiStore.colorSettings.background,
    selection: false,
    defaultCursor: isPanning.value ? 'grab' : 'default',
  });
  
  if (isPanning.value) {
    canvasInstance.defaultCursor = 'grab';
  }
  canvasInstance.setWidth(canvasWidth.value);
  canvasInstance.setHeight(canvasHeight.value);
  
  if (vpt) {
    canvasInstance.setViewportTransform(vpt);
  }
  
  setupCanvasInteractions();
};

// 监听背景色变化，立即更新canvas
watch(
  () => poiStore.colorSettings.background,
  (newColor) => {
    if (canvasInstance && newColor) {
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
  canvasWidth.value = Math.floor(rect.width);
  canvasHeight.value = Math.floor(rect.height);
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

async function handleRenderCloud() {
  if (!poiStore.hasDrawing) {
    startDrawGuideIntro();
    return;
  }
  
  allowRenderCloud.value = true;
  try {
    await renderCloud(true);
  } catch (error) {
    console.error('生成标签云失败:', error);
  }
}

// 清除标签云
const clearTagCloud = () => {
  isClearing.value = true;
  allowRenderCloud.value = false;
  maxDistance.value = 0;
  poisPyramid = [];
  tagCloudScale = 0;
  isRendering = false;
  renderedLabelCount.value = 0;
  totalLabelCount.value = 0;
  currentRenderedCount.value = 0;
  
  if (canvasInstance) {
    try {
      const objects = canvasInstance.getObjects();
      objects.forEach(obj => canvasInstance.remove(obj));
      canvasInstance.dispose();
    } catch (e) {
      console.warn('Canvas dispose error:', e);
    }
    canvasInstance = null;
  }
  
  canvasKey.value += 1;
  
  nextTick(() => {
    if (canvasRef.value) {
      initCanvas();
    }
    isClearing.value = false;
  });
};

// 初始化高德地图和Driving实例
const initAMapDriving = async () => {
  if (amapGlobal && drivingInstance) return;
  
  try {
    amapGlobal = await AMapLoader.load({
      key: '80838eddfb922202b289fd1ad6fa4e58',
      version: '2.0',
      plugins: ['AMap.Driving'],
    });
    drivingInstance = new amapGlobal.Driving({
      policy: amapGlobal.DrivingPolicy.LEAST_TIME,
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
  const distanceInMeters = calculateDistance(centerLat, centerLng, poiLat, poiLng);
  const roadDistanceKm = (distanceInMeters / 1000) * 1.4;
  
  let averageSpeed;
  if (roadDistanceKm < 10) {
    averageSpeed = 30;
  } else if (roadDistanceKm < 50) {
    averageSpeed = 45;
  } else {
    averageSpeed = 70;
  }
  
  const timeInMinutes = Math.round((roadDistanceKm / averageSpeed) * 60);
  return Math.max(1, timeInMinutes);
};

const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371000;
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

const computeCenter = (list) => {
  if (!list.length) return { lng: 0, lat: 0 };
  const lngs = list.map((poi) => poi.lng);
  const lats = list.map((poi) => poi.lat);
  return {
    lng: (Math.min(...lngs) + Math.max(...lngs)) / 2,
    lat: (Math.min(...lats) + Math.max(...lats)) / 2,
  };
};

const calculateBearing = (centerLat, centerLng, poiLat, poiLng) => {
  const lat1 = (centerLat * Math.PI) / 180;
  const lat2 = (poiLat * Math.PI) / 180;
  const dLng = ((poiLng - centerLng) * Math.PI) / 180;

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  
  let bearing = Math.atan2(y, x);
  bearing = (bearing * 180) / Math.PI;
  bearing = (bearing + 360) % 360; // 转换为0-360度

  return bearing;
};

const isOverlapping = (rect1, rect2, padding = 2) => {
  return !(
    rect1.x + rect1.width + padding < rect2.x ||
    rect2.x + rect2.width + padding < rect1.x ||
    rect1.y + rect1.height + padding < rect2.y ||
    rect2.y + rect2.height + padding < rect1.y
  );
};

const measureText = (text, fontSize, fontFamily, fontWeight) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  const metrics = ctx.measureText(text);
  return {
    width: metrics.width,
    height: fontSize * 1.2,
  };
};

const findPositionWithSpiral = (centerX, centerY, bearing, width, height, placedLabels) => {
  const sectorHalfAngle = 15;
  const minAngle = bearing - sectorHalfAngle;
  const maxAngle = bearing + sectorHalfAngle;
  const startRadius = 5;
  const radiusIncrement = 5;
  const angleStep = 5;

  let radius = startRadius;
  let angle = minAngle;

  while (true) {
    const angleRad = (angle * Math.PI) / 180;
    const x = centerX + radius * Math.sin(angleRad);
    const y = centerY - radius * Math.cos(angleRad);

    const candidateRect = {
      x: x - width / 2,
      y: y - height / 2,
      width: width,
      height: height,
    };

    let hasCollision = false;
    for (const placed of placedLabels) {
      if (isOverlapping(candidateRect, placed, 2)) {
        hasCollision = true;
        break;
      }
    }

    if (!hasCollision) {
      return { x, y };
    }

    angle += angleStep;
    if (angle > maxAngle) {
      angle = minAngle;
      radius += radiusIncrement;
    }
  }
};

const findNearestPoi = (pois, center) => {
  if (!pois || pois.length === 0 || !center) return null;
  
  let nearestPoi = null;
  let minDistance = Infinity;
  
  for (const poi of pois) {
    const distance = calculateDistance(center.lat, center.lng, poi.lat, poi.lng);
    if (distance < minDistance) {
      minDistance = distance;
      nearestPoi = poi;
    }
  }
  
  return nearestPoi;
};

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

/**
 * 使用多角度径向移位算法布局标签
 * @param {Array} pois - POI数组
 * @param {Object} center - 中心点 {lat, lng}
 * @param {number} centerX - 画布中心X坐标
 * @param {number} centerY - 画布中心Y坐标
 * @param {Object} fontSettings - 字体设置
 * @param {Function} getPoiDisplayName - 获取POI显示名称的函数
 * @param {Object} centerLabelRect - 中心标签的矩形（可选）
 * @returns {Array} 布局结果数组 [{poi, text, x, y, width, height, fontSize, bearing}, ...]
 */
const layoutTagCloud = (pois, center, centerX, centerY, fontSettings, getPoiDisplayName, centerLabelRect = null) => {
  const layoutResults = [];
  const placedLabels = [];
  
  // 如果有中心标签，先添加到已放置标签列表
  if (centerLabelRect) {
    placedLabels.push(centerLabelRect);
  }
  
  // 1. 为每个POI计算距离和排名信息
  const poisWithInfo = pois.map(poi => {
    const distance = calculateDistance(center.lat, center.lng, poi.lat, poi.lng);
    const rank = poi.rank || 999999; // rank字段就是rankInChina
    return { poi, distance, rank };
  });
  
  // 2. 按照rankInChina（rank字段）排序，用于字号分级
  // rank字段对应全国排名（rankInChina），排名数字越小表示排名越靠前
  const sortedByRank = [...poisWithInfo].sort((a, b) => a.rank - b.rank);
  
  // 3. 根据当前层级的POI数量和levelCount重新分级，分配字号
  // 每个金字塔层级都要重新分级，例如100个标签分成5级，50个标签也分成5级
  const levelCount = fontSettings.levelCount || 5;
  const fontSizes = fontSettings.fontSizes || [64, 52, 44, 36, 28];
  const totalPois = sortedByRank.length;
  
  // 创建POI到级别的映射（基于排名）
  const poiLevelMap = new Map();
  for (let i = 0; i < sortedByRank.length; i++) {
    // 计算级别：0到levelCount-1
    // 根据当前层级的POI数量重新分级
    const level = Math.floor((i / totalPois) * levelCount);
    const finalLevel = Math.min(level, levelCount - 1);
    // 获取对应级别的字号（如果fontSizes数量不足，循环使用）
    const fontSizeIndex = Math.min(finalLevel, fontSizes.length - 1);
    const fontSize = fontSizes[fontSizeIndex];
    poiLevelMap.set(sortedByRank[i].poi.id, { level: finalLevel, fontSize });
  }
  
  // 4. 按照与中心距离的远近排序，用于布局顺序（近的先摆，远的后摆）
  const sortedByDistance = [...poisWithInfo].sort((a, b) => a.distance - b.distance);
  
  // 5. 遍历所有POI，按距离顺序逐一布局
  for (let i = 0; i < sortedByDistance.length; i++) {
    const { poi, distance } = sortedByDistance[i];
    
    // 1. 计算真实方位角
    const bearing = calculateBearing(center.lat, center.lng, poi.lat, poi.lng);
    
    // 2. 构建标签文本
    const displayName = getPoiDisplayName(poi);
    let labelText = displayName;
    const rankPart = showRank.value && poi.rank ? String(poi.rank) : '';
    const timePart = showTime.value && poi.time ? String(poi.time) : '';
    if (rankPart && timePart) {
      labelText = `${displayName} ${rankPart}|${timePart}`;
    } else if (rankPart) {
      labelText = `${displayName} ${rankPart}`;
    } else if (timePart) {
      labelText = `${displayName} ${timePart}`;
    }
    
    // 3. 根据排名级别确定字号（从映射中获取）
    const levelInfo = poiLevelMap.get(poi.id);
    const fontSize = levelInfo ? levelInfo.fontSize : fontSizes[0];
    
    // 4. 测量文本尺寸
    const { width, height } = measureText(
      labelText,
      fontSize,
      fontSettings.fontFamily,
      fontSettings.fontWeight
    );
    
    // 5. 调用多角度径向移位算法查找位置（传递中心标签矩形以优化起始半径）
    const position = findPositionWithSpiral(
      centerX,
      centerY,
      bearing,
      width,
      height,
      placedLabels,
      centerLabelRect
    );
    
    // 6. 记录已放置的标签
    const placedRect = {
      x: position.x - width / 2,
      y: position.y - height / 2,
      width: width,
      height: height,
    };
    placedLabels.push(placedRect);
    
    // 7. 保存布局结果
    layoutResults.push({
      poi: poi,
      text: labelText,
      x: position.x,
      y: position.y,
      width: width,
      height: height,
      fontSize: fontSize,
      bearing: bearing,
    });
  }
  
  return layoutResults;
};

/**
 * 渲染标签云
 * @param {boolean} rebuildPyramid - 是否重新构建POI金字塔
 */
const renderCloud = async (rebuildPyramid = false) => {
  if (isRendering) {
    console.warn('正在渲染中，跳过本次请求');
    return;
  }
  
  if (!allowRenderCloud.value || !canvasInstance) {
    return;
  }
  
  isRendering = true;
  
  try {
    // 1. 获取筛选后的POI数据
    const sourceList = poiStore.visibleList;
    if (!sourceList || sourceList.length === 0) {
      console.warn('没有可用的POI数据');
      isRendering = false;
      return;
    }
    
    // 2. 获取区域中心坐标
    const selectionCenter = poiStore.selectionCenter;
    if (!selectionCenter) {
      console.warn('没有选择区域中心坐标');
      isRendering = false;
      return;
    }
    
    // 3. 确定中心地点
    let centerPoi = null;
    let centerLabelText = '';
    const centerLabelMode = poiStore.fontSettings.centerLabelMode || 'nearest';
    
    if (centerLabelMode === 'nearest') {
      // 查找距离中心点最近的POI
      centerPoi = findNearestPoi(sourceList, selectionCenter);
      if (centerPoi) {
        centerLabelText = getPoiDisplayName(centerPoi);
      } else {
        // 如果找不到，使用"中心位置"
        centerLabelText = poiStore.fontSettings.language === 'en' ? 'Center' : '中心位置';
      }
    } else {
      // 使用"中心位置"
      centerLabelText = poiStore.fontSettings.language === 'en' ? 'Center' : '中心位置';
    }
    
    // 4. 重新构建POI金字塔（如果需要）
    if (rebuildPyramid) {
      initPoisPyramid(sourceList);
    }
    
    if (poisPyramid.length === 0) {
      console.warn('POI金字塔未初始化');
      isRendering = false;
      return;
    }
    
    // 5. 获取当前层级的POI数据
    const currentData = poisPyramid[tagCloudScale] || poisPyramid[0] || sourceList;
    if (!currentData || currentData.length === 0) {
      console.warn('当前层级没有POI数据');
      isRendering = false;
      return;
    }
    
    // 6. 计算所有POI的通行时间（如果需要显示）
    if (showTime.value) {
      for (const poi of currentData) {
        if (!poi.time) {
          // 如果POI还没有通行时间，计算它
          poi.time = calculateTravelTime(
            selectionCenter.lng,
            selectionCenter.lat,
            poi.lng,
            poi.lat
          );
        }
      }
      // 如果中心POI存在，也计算其通行时间
      if (centerPoi && !centerPoi.time) {
        centerPoi.time = calculateTravelTime(
          selectionCenter.lng,
          selectionCenter.lat,
          centerPoi.lng,
          centerPoi.lat
        );
      }
    }
    
    // 7. 过滤掉中心POI（如果存在）
    const otherPois = centerPoi 
      ? currentData.filter(poi => poi.id !== centerPoi.id)
      : currentData;
    
    // 8. 计算画布中心坐标
    const centerX = canvasWidth.value / 2;
    const centerY = canvasHeight.value / 2;
    
    // 9. 清空canvas
    canvasInstance.clear();
    canvasInstance.backgroundColor = poiStore.colorSettings.background;
    
    // 10. 绘制中心标签（特殊样式，借鉴tagCloud_Similarity项目）
    // 中心标签字号比第1级字号大20%
    const firstLevelFontSize = poiStore.fontSettings.fontSizes[0] || 64;
    const centerFontSize = Math.round(firstLevelFontSize * 1.2); // 比第1级大20%（64 -> 77）
    
    // 使用统一的measureText函数计算中心标签的尺寸
    // 注意：对于多单词的英文地名，需要确保不换行，所以使用一个足够大的宽度
    const { width: centerWidth, height: centerHeight } = measureText(
      centerLabelText,
      centerFontSize,
      'Comic Sans', // 中心标签使用的字体
      1000 // 中心标签使用的字体粗细
    );
    
    const centerLabelRect = {
      x: centerX - centerWidth / 2,
      y: centerY - centerHeight / 2,
      width: centerWidth,
      height: centerHeight,
    };
    
    // 创建中心标签文本对象（使用Textbox，白色加粗，白色半透明描边）
    // 设置足够大的width来防止多单词换行，确保单行显示
    // 使用一个非常大的宽度值（比如画布宽度的80%），确保任何长度的地名都能单行显示
    const maxWidth = canvasWidth.value * 0.8;
    const centerTextObj = new Textbox(centerLabelText, {
      left: centerX,
      top: centerY,
      fill: 'rgb(255, 255, 255)', // 白色
      fontSize: centerFontSize,
      fontWeight: 1000, // 字重1000
      strokeWidth: 5, // 描边宽度5
      stroke: 'rgba(255,255,255,0.7)', // 白色半透明描边
      fontFamily: 'Comic Sans', // 使用Comic Sans字体
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
      selectable: false,
      evented: false,
      width: Math.max(centerWidth * 2, maxWidth), // 设置足够大的宽度，确保单行显示（至少是文本宽度的2倍，或画布的80%）
      splitByGrapheme: false, // 不按字符分割
      lockScalingFlip: true, // 锁定缩放翻转
    });
    canvasInstance.add(centerTextObj);
    
    // 11. 使用多角度径向移位算法布局其他标签
    // 注意：centerLabelRect已经添加到placedLabels中，确保其他标签不会与中心标签重叠
    const layoutResults = layoutTagCloud(
      otherPois,
      selectionCenter,
      centerX,
      centerY,
      poiStore.fontSettings,
      getPoiDisplayName,
      centerLabelRect
    );
    
    // 12. 计算最大距离（用于颜色分类）
    const distances = layoutResults.map(result => {
      return calculateDistance(
        selectionCenter.lat,
        selectionCenter.lng,
        result.poi.lat,
        result.poi.lng
      );
    });
    maxDistance.value = distances.length > 0 ? Math.max(...distances) : 0;
    
    // 13. 计算颜色分类
    const colorSettings = poiStore.colorSettings;
    const colorNum = colorSettings.discreteCount || colorSettings.palette.length;
    const discreteMethod = colorSettings.discreteMethod || 'quantile';
    const palette = colorSettings.palette;
    
    // 预先计算颜色分类所需的公共值
    let colorCache = {};
    if (discreteMethod === 'equal' || discreteMethod === 'geometric') {
      colorCache.minValue = Math.min(...distances);
      colorCache.maxValue = Math.max(...distances);
      if (discreteMethod === 'geometric') {
        colorCache.ratio = Math.pow(colorCache.maxValue / colorCache.minValue, 1 / colorNum);
      } else {
        colorCache.range = colorCache.maxValue - colorCache.minValue;
        colorCache.interval = colorCache.range / colorNum;
      }
    } else if (discreteMethod === 'stddev') {
      colorCache.mean = distances.reduce((acc, curr) => acc + curr, 0) / distances.length;
      colorCache.stdDev = Math.sqrt(
        distances.reduce((acc, curr) => acc + Math.pow(curr - colorCache.mean, 2), 0) /
          distances.length,
      );
      colorCache.stdDevInterval = colorCache.stdDev / colorNum;
      colorCache.halfColorNum = Math.floor(colorNum / 2);
    } else if (discreteMethod === 'jenks') {
      const values = [...distances].sort((a, b) => a - b);
      colorCache.jenksBreaks = calculateJenks(values, colorNum);
    }
    
    // 14. 绘制所有标签
    totalLabelCount.value = layoutResults.length;
    currentRenderedCount.value = 0;
    
    // 按距离排序（用于quantile方法）
    const entriesWithDistance = layoutResults.map((result, index) => ({
      result,
      distance: distances[index],
      index,
    }));
    entriesWithDistance.sort((a, b) => a.distance - b.distance);
    
    for (let i = 0; i < entriesWithDistance.length; i++) {
      const { result, distance, index } = entriesWithDistance[i];
      
      // 计算颜色类别索引
      let classIndex = 0;
      if (discreteMethod === 'quantile') {
        const percentile = (i + 1) / entriesWithDistance.length;
        classIndex = Math.ceil(colorNum * percentile) - 1;
      } else {
        const entry = { distance };
        classIndex = calculateClassIndexOptimized(
          entry,
          i,
          entriesWithDistance.length,
          colorNum,
          discreteMethod,
          colorCache,
        );
      }
      
      const color = palette[classIndex] || palette[0];
      
      // 创建文本对象
      const textObj = new Text(result.text, {
        left: result.x,
        top: result.y,
        fontSize: result.fontSize,
        fontFamily: poiStore.fontSettings.fontFamily,
        fontWeight: poiStore.fontSettings.fontWeight,
        fill: color,
        originX: 'center',
        originY: 'center',
        selectable: false,
        evented: true,
        poiId: result.poi.id,
        distance: distance,
      });
      
      canvasInstance.add(textObj);
      currentRenderedCount.value++;
      
      // 使用requestAnimationFrame分批渲染，避免阻塞UI
      if (i % 10 === 0) {
        await new Promise(resolve => requestAnimationFrame(resolve));
      }
    }
    
    // 15. 更新最终渲染数量
    renderedLabelCount.value = layoutResults.length;
    
    // 16. 触发金字塔更新（用于响应式计算）
    pyramidUpdateTrigger.value++;
    
    // 17. 渲染canvas
    canvasInstance.renderAll();
    
    console.log('标签云渲染完成:', {
      totalLabels: layoutResults.length,
      centerLabel: centerLabelText,
      maxDistance: maxDistance.value,
    });
    
  } catch (error) {
    console.error('渲染标签云失败:', error);
  } finally {
    isRendering = false;
  }
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
const updateLabelColors = () => {
  if (!canvasInstance || !allowRenderCloud.value) return;
  
  // 获取区域中心坐标（用户绘制的区域中心）
  const selectionCenter = poiStore.selectionCenter;
  if (!selectionCenter) {
    console.warn('没有选择区域中心坐标，无法更新颜色');
    return;
  }
  
  const colorSettings = poiStore.colorSettings;
  const colorNum = colorSettings.discreteCount || colorSettings.palette.length;
  const discreteMethod = colorSettings.discreteMethod || 'quantile';
  const palette = colorSettings.palette;
  
  // 收集canvas上所有标签对象（跳过中心标签）
  const labelObjects = [];
  canvasInstance.forEachObject((obj, i) => {
    if (i === 0) return; // 跳过中心标签
    if (!obj.poiId) return; // 跳过没有poiId的对象
    
    // 获取POI数据（从poiStore中查找）
    const poi = poiStore.visibleList.find(p => p.id === obj.poiId);
    if (!poi) return;
    
    // 计算与中心的距离
    const distance = calculateDistance(
      selectionCenter.lat,
      selectionCenter.lng,
      poi.lat,
      poi.lng,
    );
    
    labelObjects.push({
      obj,
      poi,
      distance,
      text: obj.text,
    });
  });
  
  if (labelObjects.length === 0) {
    console.warn('没有找到可更新的标签对象');
    return;
  }
  
  // 按距离升序排序（距离中心最近的在前）
  labelObjects.sort((a, b) => a.distance - b.distance);
  
  // 提取所有距离值
  const distances = labelObjects.map(item => item.distance);
  
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
  
  // 为每个标签对象计算颜色类别索引
  labelObjects.forEach((item, index) => {
    let classIndex = 0;
    
    if (discreteMethod === 'quantile') {
      // 分位数：基于排序后的索引
      const percentile = (index + 1) / labelObjects.length;
      classIndex = Math.ceil(colorNum * percentile) - 1;
    } else {
      // 其他方法：基于距离值计算
      const entry = { distance: item.distance };
      classIndex = calculateClassIndexOptimized(
        entry,
        index,
        labelObjects.length,
        colorNum,
        discreteMethod,
        colorCache,
      );
    }
    
    const newColor = palette[classIndex] || palette[0];
    
    // 更新对象颜色
    if (item.obj.fill !== newColor) {
      item.obj.set({ fill: newColor });
      item.obj.distance = item.distance; // 更新存储的距离信息
      item.obj.setCoords();
    }
  });
  
  // 恢复canvas的渲染设置并渲染
  const wasRenderOnAddRemove = canvasInstance.renderOnAddRemove;
  canvasInstance.renderOnAddRemove = false;
  canvasInstance.renderAll();
  canvasInstance.renderOnAddRemove = wasRenderOnAddRemove;
};

// 更新标签字体和字重（不重新绘制，只更新属性）
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
  
  if (hasUpdates) {
    canvasInstance.renderAll();
  }
};

// 处理导出命令
const handleExportCommand = (command) => {
  if (command === 'svg') {
    // SVG导出也需要弹出设置对话框
    prepareExportDialog(command);
  } else if (command === 'png' || command === 'jpeg') {
    prepareExportDialog(command);
  }
};

// 准备导出对话框
function prepareExportDialog(format) {
  exportFormat.value = format;
  if (canvasInstance) {
    const w = canvasInstance.getWidth();
    const h = canvasInstance.getHeight();
    exportWidth.value = w;
    exportHeight.value = h;
    origWidth.value = w;
    origHeight.value = h;
    _aspectRatio = w / h;
  } else {
    exportWidth.value = 800;
    exportHeight.value = 600;
    origWidth.value = 800;
    origHeight.value = 600;
    _aspectRatio = 800 / 600;
  }
  lockAspectRatio.value = true;
  exportDialogVisible.value = true;
}

// 响应宽度变化，锁定比例
function onExportWidthChange(val) {
  if (lockAspectRatio.value && origWidth.value && origHeight.value) {
    const w = Number(val) || 1;
    exportHeight.value = Math.round((w / origWidth.value) * origHeight.value);
  }
}

// 响应高度变化，锁定比例
function onExportHeightChange(val) {
  if (lockAspectRatio.value && origWidth.value && origHeight.value) {
    const h = Number(val) || 1;
    exportWidth.value = Math.round((h / origHeight.value) * origWidth.value);
  }
}

// 确认导出
const handleExportConfirm = () => {
  exportDialogVisible.value = false;
  if (exportFormat.value === 'svg') {
    exportAsSVG();
  } else {
    exportAsRaster(exportFormat.value, exportWidth.value, exportHeight.value);
  }
};

// 生成图例的SVG元素
const generateLegendSVG = (canvasWidth, canvasHeight) => {
  // 图例在原始canvas中的位置（右上角，距离边缘16px）
  const legendRight = 16;
  const legendTop = 16;
  const legendMinWidth = 180;
  
  // 计算图例位置和尺寸
  const legendX = canvasWidth - legendRight - legendMinWidth;
  const legendY = legendTop;
  const legendWidth = legendMinWidth;
  const padding = 12;
  const titleFontSize = 14;
  const colorBarHeight = 24;
  const colorBarGap = 2;
  const textFontSize = 12;
  const radius = 8;
  
  // 计算图例高度
  const titleHeight = titleFontSize + 8;
  const colorBarArea = colorBarHeight + 8;
  const textHeight = textFontSize + 8;
  const legendHeight = padding * 2 + titleHeight + colorBarArea + textHeight;
  
  // 获取语言设置
  const language = poiStore.fontSettings.language || 'zh';
  const titleText = language === 'en' ? 'Distance from Center (km)' : '与中心的距离(km)';
  
  // 获取颜色调色板
  const palette = poiStore.colorSettings.palette || [];
  const colorCount = palette.length;
  const colorBarWidth = (legendWidth - padding * 2 - (colorBarGap * (colorCount - 1))) / colorCount;
  
  // 计算各个色块之间的分界点
  const boundaries = calculateColorBoundaries();
  const hasBoundaries = boundaries.length > 0 && allowRenderCloud.value;
  
  // 如果有距离标签，需要增加高度
  const boundaryTextHeight = hasBoundaries ? textFontSize + 4 : 0;
  const legendHeightWithBoundaries = legendHeight + boundaryTextHeight;
  
  // 构建SVG元素
  let legendSVG = '';
  
  // 定义图例组
  legendSVG += `<g id="distance-legend">`;
  
  // 绘制圆角矩形背景
  legendSVG += `<rect x="${legendX}" y="${legendY}" width="${legendWidth}" height="${legendHeightWithBoundaries}" rx="${radius}" ry="${radius}" fill="rgba(0,0,0,0.7)" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>`;
  
  // 转义XML特殊字符
  const escapeXML = (str) => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };
  
  // 绘制标题
  legendSVG += `<text x="${legendX + padding}" y="${legendY + padding + titleFontSize}" font-family="sans-serif" font-size="${titleFontSize}" font-weight="500" fill="#ffffff">${escapeXML(titleText)}</text>`;
  
  // 绘制颜色条
  const colorBarY = legendY + padding + titleHeight;
  let currentX = legendX + padding;
  
  palette.forEach((color, index) => {
    // 绘制色块
    let fillColor = color;
    if (color.startsWith('rgb')) {
      fillColor = color;
    }
    legendSVG += `<rect x="${currentX}" y="${colorBarY}" width="${colorBarWidth}" height="${colorBarHeight}" fill="${fillColor}" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>`;
    currentX += colorBarWidth + colorBarGap;
  });
  
  // 在色块下面一行绘制距离标签
  if (hasBoundaries) {
    const boundaryTextY = colorBarY + colorBarHeight + 4 + textFontSize;
    
    // 绘制第一个标签 "0"（在第一个色块的左边界）
    legendSVG += `<text x="${legendX + padding}" y="${boundaryTextY}" font-family="sans-serif" font-size="${textFontSize}" fill="rgba(255,255,255,0.8)" text-anchor="start">0</text>`;
    
    // 绘制分界点标签（在每个色块的右边界）
    let currentX = legendX + padding;
    boundaries.forEach((boundary, index) => {
      currentX += colorBarWidth + colorBarGap;
      const boundaryText = formatDistance(boundary);
      legendSVG += `<text x="${currentX}" y="${boundaryTextY}" font-family="sans-serif" font-size="${textFontSize}" fill="rgba(255,255,255,0.8)" text-anchor="middle">${escapeXML(boundaryText)}</text>`;
    });
    
    // 绘制最远距离标签（在最右边）
    if (maxDistance.value > 0) {
      const maxDistanceText = formatDistance(maxDistance.value);
      const totalBarWidth = legendWidth - padding * 2;
      const rightEdgeX = legendX + padding + totalBarWidth; // 最后一个色块右边界
      legendSVG += `<text x="${rightEdgeX}" y="${boundaryTextY}" font-family="sans-serif" font-size="${textFontSize}" fill="rgba(255,255,255,0.8)" text-anchor="middle">${escapeXML(maxDistanceText)}</text>`;
    }
  }
  
  legendSVG += `</g>`;
  
  return legendSVG;
};

// 导出为SVG
const exportAsSVG = () => {
  if (!canvasInstance) return;
  
  let svgString = canvasInstance.toSVG();
  
  if (includeLegend.value) {
    const canvasWidth = canvasInstance.getWidth();
    const canvasHeight = canvasInstance.getHeight();
    const legendSVG = generateLegendSVG(canvasWidth, canvasHeight);
    svgString = svgString.replace(/<\/svg>\s*$/, `${legendSVG}</svg>`);
  }
  
  const blob = new Blob([svgString], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'tag-cloud.svg';
  link.click();
  URL.revokeObjectURL(url);
};

// 在canvas上绘制图例
const drawLegendOnCanvas = (ctx, imageWidth, imageHeight, scaleX, scaleY, offsetX = 0, offsetY = 0) => {
  const legendRight = 16;
  const legendTop = 16;
  const legendMinWidth = 180;
  
  const legendX = offsetX + imageWidth - (legendRight * scaleX) - (legendMinWidth * scaleX);
  const legendY = offsetY + legendTop * scaleY;
  const legendWidth = legendMinWidth * scaleX;
  const padding = 12 * scaleX;
  const titleFontSize = 14 * scaleY;
  const colorBarHeight = 24 * scaleY;
  const colorBarGap = 2 * scaleX;
  const textFontSize = 12 * scaleY;
  const radius = 8 * scaleX;
  
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1 * scaleX;
  
  const titleHeight = titleFontSize + 8 * scaleY;
  const colorBarArea = colorBarHeight + 8 * scaleY;
  const textHeight = textFontSize + 8 * scaleY;
  const legendHeight = padding * 2 + titleHeight + colorBarArea + textHeight;
  
  const boundaries = calculateColorBoundaries();
  const hasBoundaries = boundaries.length > 0 && allowRenderCloud.value;
  const boundaryTextHeight = hasBoundaries ? textFontSize + 4 * scaleY : 0;
  const legendHeightWithBoundaries = legendHeight + boundaryTextHeight;
  
  // 绘制圆角矩形背景
  ctx.beginPath();
  ctx.moveTo(legendX + radius, legendY);
  ctx.lineTo(legendX + legendWidth - radius, legendY);
  ctx.quadraticCurveTo(legendX + legendWidth, legendY, legendX + legendWidth, legendY + radius);
  ctx.lineTo(legendX + legendWidth, legendY + legendHeightWithBoundaries - radius);
  ctx.quadraticCurveTo(legendX + legendWidth, legendY + legendHeightWithBoundaries, legendX + legendWidth - radius, legendY + legendHeightWithBoundaries);
  ctx.lineTo(legendX + radius, legendY + legendHeightWithBoundaries);
  ctx.quadraticCurveTo(legendX, legendY + legendHeightWithBoundaries, legendX, legendY + legendHeightWithBoundaries - radius);
  ctx.lineTo(legendX, legendY + radius);
  ctx.quadraticCurveTo(legendX, legendY, legendX + radius, legendY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  
  // 绘制标题
  ctx.fillStyle = '#ffffff';
  ctx.font = `500 ${titleFontSize}px sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const language = poiStore.fontSettings.language || 'zh';
  const titleText = language === 'en' ? 'Distance from Center (km)' : '与中心的距离(km)';
  ctx.fillText(titleText, legendX + padding, legendY + padding);
  
  // 绘制颜色条
  const colorBarY = legendY + padding + titleHeight;
  const palette = poiStore.colorSettings.palette || [];
  const colorCount = palette.length;
  const colorBarWidth = (legendWidth - padding * 2 - (colorBarGap * (colorCount - 1))) / colorCount;
  
  let currentX = legendX + padding;
  palette.forEach((color) => {
    ctx.fillStyle = color;
    ctx.fillRect(currentX, colorBarY, colorBarWidth, colorBarHeight);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1 * scaleX;
    ctx.strokeRect(currentX, colorBarY, colorBarWidth, colorBarHeight);
    currentX += colorBarWidth + colorBarGap;
  });
  
  // 绘制距离标签
  if (hasBoundaries) {
    const boundaryTextY = colorBarY + colorBarHeight + 4 * scaleY + textFontSize;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = `${textFontSize}px sans-serif`;
    ctx.textBaseline = 'top';
    
    ctx.textAlign = 'left';
    ctx.fillText('0', legendX + padding, boundaryTextY);
    
    ctx.textAlign = 'center';
    currentX = legendX + padding;
    boundaries.forEach((boundary) => {
      currentX += colorBarWidth + colorBarGap;
      ctx.fillText(formatDistance(boundary), currentX, boundaryTextY);
    });
    
    if (maxDistance.value > 0) {
      const totalBarWidth = legendWidth - padding * 2;
      const rightEdgeX = legendX + padding + totalBarWidth;
      ctx.fillText(formatDistance(maxDistance.value), rightEdgeX, boundaryTextY);
    }
  }
};

// 导出为位图格式（PNG/JPEG）
const exportAsRaster = async (format = 'png', exportWidth = 800, exportHeight = 600) => {
  if (!canvasInstance) return;
  
  const currentWidth = canvasInstance.getWidth();
  const currentHeight = canvasInstance.getHeight();
  const scaleX = exportWidth / currentWidth;
  const scaleY = exportHeight / currentHeight;
  const multiplier = Math.max(scaleX, scaleY);
  
  const dataURL = canvasInstance.toDataURL({
    format: format === 'jpeg' ? 'jpeg' : 'png',
    multiplier: multiplier,
    quality: format === 'jpeg' ? 0.92 : 1,
  });
  
  const img = new Image();
  img.onload = function() {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = exportWidth;
    tempCanvas.height = exportHeight;
    const tempCtx = tempCanvas.getContext('2d');
    
    const bgColor = poiStore.colorSettings.background || '#ffffff';
    tempCtx.fillStyle = bgColor;
    tempCtx.fillRect(0, 0, exportWidth, exportHeight);
    
    const imgWidth = img.width;
    const imgHeight = img.height;
    const targetAspect = exportWidth / exportHeight;
    const imgAspect = imgWidth / imgHeight;
    
    let drawWidth, drawHeight, drawX, drawY;
    
    if (imgAspect > targetAspect) {
      drawHeight = exportHeight;
      drawWidth = exportHeight * imgAspect;
      drawX = (exportWidth - drawWidth) / 2;
      drawY = 0;
    } else {
      drawWidth = exportWidth;
      drawHeight = exportWidth / imgAspect;
      drawX = 0;
      drawY = (exportHeight - drawHeight) / 2;
    }
    
    tempCtx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
    
    if (includeLegend.value) {
      const actualScaleX = drawWidth / currentWidth;
      const actualScaleY = drawHeight / currentHeight;
      drawLegendOnCanvas(tempCtx, drawWidth, drawHeight, actualScaleX, actualScaleY, drawX, drawY);
    }
    
    const type = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const finalDataURL = tempCanvas.toDataURL(type, format === 'jpeg' ? 0.92 : 1);
    
    const link = document.createElement('a');
    link.href = finalDataURL;
    link.download = `tag-cloud.${format}`;
    link.click();
  };
  img.onerror = () => {
    alert('图片导出失败，请重试！');
  };
  img.src = dataURL;
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

// 监听语言变化（需要重新绘制，因为文本内容变化）
watch(
  () => poiStore.fontSettings.language,
  () => {
    // 如果正在清除，不触发重新渲染
    if (isClearing.value) return;
    
    if (allowRenderCloud.value) {
      // 语言变化需要重新绘制（文本内容变化）
      renderCloud(false);
    }
  },
);

// 监听中心标签模式变化（需要重新绘制，因为中心标签文本变化）
watch(
  () => poiStore.fontSettings.centerLabelMode,
  () => {
    // 如果正在清除，不触发重新渲染
    if (isClearing.value) return;
    
    if (allowRenderCloud.value) {
      // 中心标签模式变化需要重新绘制（中心标签文本变化）
      renderCloud(false);
    }
  },
);

watch([showRank, showTime], () => {
  // 如果正在清除，不触发重新渲染
  if (isClearing.value) return;
  
  if (allowRenderCloud.value) renderCloud();
});

onBeforeUnmount(() => {
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

.label-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 200px;
  flex-shrink: 0;
}

.label-count-number {
  font-weight: 600;
  display: inline-block;
  min-width: 80px;
  text-align: center;
}

.label-progress-bar {
  width: 140px;
}

.label-progress-bar :deep(.el-progress__text) {
  color: #fff;
  font-size: 12px;
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

.legend-colors-wrapper {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.legend-colors {
  display: flex;
  gap: 2px;
  height: 24px;
}

.legend-color-item {
  flex: 1;
  border-radius: 3px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  min-width: 20px;
  height: 24px;
}

.legend-color-item:hover {
  transform: scale(1.1);
  box-shadow: 0 0 8px rgba(255, 255, 255, 0.5);
  z-index: 1;
  position: relative;
}

.legend-boundaries {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 4px;
  position: relative;
  height: 16px;
  padding: 0 2px;
  width: 100%;
  box-sizing: border-box;
}

.legend-boundary-label {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.8);
  white-space: nowrap;
  line-height: 16px;
  position: absolute;
  min-width: 0;
}

.legend-boundary-label.legend-start {
  left: 2px;
  text-align: left;
}

.legend-boundary-label.legend-middle {
  text-align: center;
  transform: translateX(-50%);
  /* 确保标签不会超出边界 */
  max-width: calc(100% / var(--color-count, 5) - 4px);
  overflow: hidden;
  text-overflow: ellipsis;
}

.legend-boundary-label.legend-max-distance {
  right: 0;
  text-align: center;
  transform: translateX(50%);
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

