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
          <el-checkbox v-model="showRank">显示排名信息</el-checkbox>
          <el-checkbox v-model="showTime" disabled>显示通行时间（待接入）</el-checkbox>
          <el-button @click="exportAsImage">导出图片</el-button>
        </div>
      </div>
    </header>
    <div class="canvas-wrapper" ref="wrapperRef">
      <canvas
        v-if="allowRenderCloud && poiStore.visibleList.length > 0"
        ref="canvasRef"
        :width="canvasWidth"
        :height="canvasHeight"
      ></canvas>
      <div v-else class="empty-cloud-hint">请先筛选数据并点击“运行生成标签云”</div>
    </div>
  </aside>
</template>

<script setup>
import { Canvas, Textbox } from 'fabric';
import {
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue';
import { usePoiStore } from '@/stores/poiStore';

const canvasRef = ref(null);
const wrapperRef = ref(null);
const showRank = ref(false); // 默认不显示排名
const showTime = ref(false);
const poiStore = usePoiStore();

let canvasInstance;
let resolutionScale = 1;
let resizeObserver;
let isRendering = false; // 标记是否正在渲染
const allowRenderCloud = ref(false);
const canvasWidth = ref(900);
const canvasHeight = ref(900);
const baseAngles = [-15, -10, -5, 0, 5, 10, 15];
const stepDistance = 22;
const maxIterations = 220;

const initCanvas = () => {
  if (canvasInstance) canvasInstance.dispose();
  canvasInstance = new Canvas(canvasRef.value, {
    backgroundColor: poiStore.colorSettings.background,
  });
  canvasInstance.setWidth(canvasWidth.value);
  canvasInstance.setHeight(canvasHeight.value);
};

// 监听背景色变化，立即更新canvas
watch(
  () => poiStore.colorSettings.background,
  (newColor) => {
    if (canvasInstance && newColor) {
      canvasInstance.setBackgroundColor(newColor, () => {
        canvasInstance.renderAll();
      });
    }
  },
  { immediate: false }
);

const updateCanvasSize = () => {
  if (!wrapperRef.value) return;
  const rect = wrapperRef.value.getBoundingClientRect();
  // 使用容器的完整尺寸，确保canvas完全填充
  const width = Math.floor(rect.width);
  const height = Math.floor(rect.height);
  canvasWidth.value = width;
  canvasHeight.value = height;
  if (canvasInstance) {
    canvasInstance.setWidth(width);
    canvasInstance.setHeight(height);
    canvasInstance.renderAll();
  }
};

function handleRenderCloud() {
  allowRenderCloud.value = true;
  renderCloud();
}

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

const buildLayoutEntries = (list, bounds, center, colorSettings) => {
  const width = canvasInstance.getWidth();
  const height = canvasInstance.getHeight();
  const { fontSettings } = poiStore;

  // 计算每个POI到中心的距离，并添加距离信息
  const entriesWithDistance = list.map((poi) => {
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

    // 默认不显示排名，格式：名称 排名|时间 或 名称 排名 或 名称 时间
    const textParts = [poi.name];
    const rankPart = showRank.value && poi.rank ? String(poi.rank) : '';
    const timePart = showTime.value && poi.time ? String(poi.time) : '';
    if (rankPart && timePart) {
      textParts.push(` ${rankPart}|${timePart}`);
    } else if (rankPart) {
      textParts.push(` ${rankPart}`);
    } else if (timePart) {
      textParts.push(` ${timePart}`);
    }

    return {
      id: poi.id,
      textValue: textParts.join(''),
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
  });

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

const simulateDirection = (entry, originX, originY, angle) => {
  let newX = originX;
  let newY = originY;
  const target = rotate(originX, originY, entry.screenX, entry.screenY, angle);
  const offsetX = target[0] - originX;
  const offsetY = target[1] - originY;
  const dist = Math.hypot(offsetX, offsetY) || 1;
  const stepX = (offsetX / dist) * stepDistance;
  const stepY = (offsetY / dist) * stepDistance;

  const temp = new Textbox(entry.textValue, {
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

  let iterations = 0;
  let collision = true;
  while (collision && iterations < maxIterations) {
    collision = false;
    canvasInstance.forEachObject((obj) => {
      if (obj === temp) return;
      if (temp.intersectsWithObject(obj)) {
        collision = true;
      }
    });
    if (collision) {
      newX += stepX;
      newY += stepY;
      temp.set({ left: newX, top: newY });
      temp.setCoords();
      iterations += 1;
    }
  }

  const result = { x: temp.left, y: temp.top, collision };
  canvasInstance.remove(temp);
  return result;
};

const drawLabel = (entry, originX, originY) => {
  const candidates = baseAngles.map((angle) =>
    simulateDirection(entry, originX, originY, angle),
  );
  const viable = candidates.filter((c) => !c.collision);
  const selectFrom = viable.length ? viable : candidates;
  const chosen = selectFrom.reduce((best, item) => {
    const dist =
      (item.x - originX) * (item.x - originX) +
      (item.y - originY) * (item.y - originY);
    if (!best || dist < best.dist) return { ...item, dist };
    return best;
  }, null);

  const text = new Textbox(entry.textValue, {
    originX: 'center',
    originY: 'center',
    left: chosen?.x ?? entry.screenX,
    top: chosen?.y ?? entry.screenY,
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

const renderCloud = async () => {
  if (!allowRenderCloud.value || !poiStore.visibleList.length) return;
  if (isRendering) return; // 如果正在渲染，则跳过
  
  isRendering = true;
  await nextTick();
  updateCanvasSize();
  initCanvas();
  
  const sourceList = poiStore.visibleList;
  if (!sourceList.length) {
    isRendering = false;
    return;
  }

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
  const centerX = width * 0.08 + normalizedCenterX * width * 0.84;
  const centerY = height * 0.08 + (1 - normalizedCenterY) * height * 0.84;

  // 绘制中心位置
  drawCenter(centerX, centerY);

  // 构建布局条目（已按距离排序并分配颜色）
  const entries = buildLayoutEntries(
    sourceList,
    bounds,
    center,
    poiStore.colorSettings,
  );

  // 逐步渲染标签
  for (let i = 0; i < entries.length; i++) {
    drawLabel(entries[i], centerX, centerY);
    // 每绘制10个标签后暂停一下，实现逐步渲染效果
    if (i % 10 === 0 && i > 0) {
      await sleep(10); // 10ms延迟
    }
  }

  isRendering = false;
};

const switchResolution = (mode) => {
  resolutionScale = mode === 'fine' ? 1.2 : 0.8;
  if (allowRenderCloud.value) renderCloud();
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
  updateCanvasSize();
  if ('ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(() => {
      updateCanvasSize();
      if (allowRenderCloud.value) renderCloud();
    });
    if (wrapperRef.value) resizeObserver.observe(wrapperRef.value);
  }
});

watch(
  () => ({
    list: poiStore.visibleList,
    font: poiStore.fontSettings,
    color: poiStore.colorSettings,
  }),
  () => {
    if (allowRenderCloud.value) renderCloud();
  },
  { deep: true },
);

watch([showRank, showTime], () => {
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
  width: 100%;
  color: #aaa;
  font-size: 18px;
  display:flex;
  align-items:center;
  justify-content:center;
  min-height: 300px;
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

.tagcloud-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #fff;
}
</style>

