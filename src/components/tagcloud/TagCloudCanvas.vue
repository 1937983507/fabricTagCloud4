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

const rotate = (cx, cy, x, y, angle) => {
  const radians = (Math.PI / 180) * angle;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const nx = cos * (x - cx) + sin * (y - cy) + cx;
  const ny = cos * (y - cy) - sin * (x - cx) + cy;
  return [nx, ny];
};

const buildLayoutEntries = (list, bounds) => {
  const width = canvasInstance.getWidth();
  const height = canvasInstance.getHeight();
  const { fontSettings, colorSettings } = poiStore;

  return list.map((poi, index) => {
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
      fontColor:
        colorSettings.palette[index % colorSettings.palette.length],
      fontSize:
        fontSettings.fontSizes[index % fontSettings.fontSizes.length] *
        resolutionScale,
      fontFamily: fontSettings.fontFamily,
      fontWeight: fontSettings.fontWeight,
      screenX,
      screenY,
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

const renderCloud = async () => {
  if (!allowRenderCloud.value || !poiStore.visibleList.length) return;
  await nextTick();
  updateCanvasSize();
  initCanvas();
  
  const sourceList = poiStore.visibleList;
  if (!sourceList.length) return;
  const bounds = computeBounds(sourceList);
  const centerX = canvasInstance.getWidth() / 2;
  const centerY = canvasInstance.getHeight() / 2;
  const entries = buildLayoutEntries(sourceList, bounds);
  entries.forEach((entry) => drawLabel(entry, centerX, centerY));
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

