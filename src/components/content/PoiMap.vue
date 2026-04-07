<template>
  <div class="map-wrapper">
    <header
      v-if="!isMobile"
      class="map-head"
      :class="{ 'map-head--draw-active': poiStore.hasDrawing }"
    >
        <el-dropdown
          trigger="click"
          class="map-head-ctl map-toolbar-pair"
          :disabled="poiStore.hasDrawing"
          @command="handleDrawCommand"
        >
          <span class="map-toolbar-trigger" data-intro-target="dataFilterBtn">
            <span class="map-toolbar-trigger__text">地图框选</span>
            <el-icon class="map-toolbar-trigger__icon"><ArrowDown /></el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="drawCircle" :disabled="poiStore.hasDrawing">圆形</el-dropdown-item>
              <el-dropdown-item command="drawRectangle" :disabled="poiStore.hasDrawing">矩形</el-dropdown-item>
              <el-dropdown-item command="drawPolygon" :disabled="poiStore.hasDrawing">多边形</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-button
          class="map-toolbar-btn map-head-ctl map-toolbar-pair"
          @click="openNearbyDialog"
          :disabled="poiStore.hasDrawing"
        >
          周边筛选
        </el-button>
        <el-button
          class="map-toolbar-btn map-head-ctl"
          @click="clearDrawing"
          :disabled="!poiStore.hasDrawing"
        >
          清除绘制
        </el-button>
        <el-button class="map-toolbar-btn map-head-ctl" @click="openSearch = true">
          检索定位
        </el-button>
    </header>
    <!-- PC：弹窗；移动端：见下方内联块，避免覆盖 workspace 顶栏 -->
    <el-dialog
      v-if="!isMobile"
      v-model="openSearch"
      title="搜索位置、公交站、地铁站"
      width="360px"
      class="poi-map-dialog poi-map-dialog--search"
    >
      <el-input v-model="searchKeyword" placeholder="请输入关键词" @keyup.enter="searchPlace">
        <template #append>
          <el-button @click="searchPlace">搜索</el-button>
        </template>
      </el-input>
    </el-dialog>
    <el-dialog
      v-if="!isMobile"
      v-model="openLocationFilter"
      title="周边筛选"
      width="480px"
      :close-on-click-modal="false"
      class="poi-map-dialog poi-map-dialog--nearby"
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
        <el-radio-group v-model="nearbyTier" class="nearby-tier-switch">
          <el-radio-button label="basic">基础版</el-radio-button>
          <el-radio-button label="advanced">高级版</el-radio-button>
        </el-radio-group>

        <template v-if="nearbyTier === 'basic'">
          <el-alert
            type="info"
            :closable="false"
            show-icon
            style="margin: 16px 0;"
            title="中心点由自动定位确定（浏览器 / 高德 / IP），您只需指定半径。"
          />
          <div class="filter-form-item">
            <label class="filter-label">半径（km）</label>
            <el-input-number
              v-model="filterRadius"
              :min="0.1"
              :max="1000"
              :step="0.1"
              :precision="1"
              style="width: 100%;"
            />
          </div>
        </template>

        <template v-else>
          <section class="nearby-section nearby-section--center" aria-label="中心点">
            <div class="nearby-section__header">
              <span class="nearby-section__badge">1</span>
              <div class="nearby-section__titles">
                <h4 class="nearby-section__title">中心点</h4>
                <p class="nearby-section__hint">如何确定地图上的筛选中心</p>
              </div>
            </div>
            <div class="nearby-section__body">
              <label class="nearby-field-label" for="nearby-center-mode-m">来源</label>
              <el-select
                id="nearby-center-mode-m"
                v-model="advancedCenterMode"
                class="nearby-select-full"
                placeholder="选择中心点来源"
              >
                <el-option label="自动定位" value="auto" />
                <el-option label="文本输入" value="place" />
                <el-option label="经纬度输入" value="coord" />
              </el-select>
              <div
                v-if="advancedCenterMode === 'place'"
                class="nearby-follow-field"
              >
                <el-input
                  v-model="advancedPlaceQuery"
                  class="nearby-select-full"
                  placeholder="输入地点关键词，确定后将进行地理编码"
                  clearable
                />
              </div>
              <div
                v-if="advancedCenterMode === 'coord'"
                class="nearby-follow-field"
              >
                <el-input
                  v-model="advancedCoordStr"
                  class="nearby-select-full"
                  placeholder="经度,纬度，例如 114.3342,30.5768"
                  @keyup.enter="applyNearbyFilter"
                />
              </div>
            </div>
          </section>
          <section class="nearby-section nearby-section--filter" aria-label="筛选方式">
            <div class="nearby-section__header">
              <span class="nearby-section__badge">2</span>
              <div class="nearby-section__titles">
                <h4 class="nearby-section__title">筛选方式</h4>
                <p class="nearby-section__hint">按圆形半径或按距中心直线距离最近的 N 个点</p>
              </div>
            </div>
            <div class="nearby-section__body">
              <label class="nearby-field-label" for="nearby-filter-mode-m">方式</label>
              <el-select
                id="nearby-filter-mode-m"
                v-model="advancedFilterMode"
                class="nearby-select-full"
                placeholder="选择筛选方式"
              >
                <el-option label="按半径" value="radius" />
                <el-option label="按 POI 数量（最近 N 个）" value="count" />
              </el-select>
              <template v-if="advancedFilterMode === 'radius'">
                <label class="nearby-field-label nearby-block-gap" for="nearby-radius-km-m">半径（km）</label>
                <el-input-number
                  id="nearby-radius-km-m"
                  v-model="filterRadius"
                  class="nearby-select-full"
                  :min="0.1"
                  :max="1000"
                  :step="0.1"
                  :precision="1"
                />
              </template>
              <template v-else>
                <label class="nearby-field-label nearby-block-gap" for="nearby-poi-n-m">POI 数量 N</label>
                <el-input-number
                  id="nearby-poi-n-m"
                  v-model="filterPoiCount"
                  class="nearby-select-full"
                  :min="1"
                  :max="100000"
                  :step="1"
                  :precision="0"
                />
              </template>
            </div>
          </section>
        </template>

        <div v-if="locationLoading" class="location-loading">
          <el-icon class="loading-icon"><Loading /></el-icon>
          <span class="loading-text">{{ currentLocationMethod || '处理中，请稍等…' }}</span>
        </div>
      </div>
      <template #footer>
        <el-button @click="openLocationFilter = false">取消</el-button>
        <el-button
          type="primary"
          @click="applyNearbyFilter"
          :loading="locationLoading"
        >
          确定
        </el-button>
      </template>
    </el-dialog>
    <!-- 移动端：周边筛选常显；顶行含标题、基础/高级、清除筛选 -->
    <div v-if="isMobile" class="map-flow-panel map-flow-panel--nearby">
      <div class="map-flow-panel__head map-flow-panel__head--nearby-mobile">
        <span class="map-flow-panel__title map-flow-panel__title--inline">周边筛选</span>
        <el-radio-group v-model="nearbyTier" class="nearby-tier-switch nearby-tier-switch--head">
          <el-radio-button label="basic">基础版</el-radio-button>
          <el-radio-button label="advanced">高级版</el-radio-button>
        </el-radio-group>
        <el-button
          class="map-flow-panel__clear-draw"
          plain
          size="small"
          @click="clearDrawing"
          :disabled="!poiStore.hasDrawing"
        >
          清除筛选
        </el-button>
      </div>
      <div class="location-filter-content">
        <el-alert
          v-if="locationError"
          :title="locationError"
          type="error"
          :closable="false"
          show-icon
          class="map-flow-panel__alert-error"
        />

        <template v-if="nearbyTier === 'basic'">
          <el-alert
            type="info"
            :closable="false"
            show-icon
            class="map-flow-panel__alert-info"
            title="中心点由自动定位确定（浏览器 / 高德 / IP），您只需指定半径。"
          />
          <div class="map-flow-panel__radius-row">
            <label class="map-flow-panel__radius-label" for="nearby-radius-mobile">半径（km）</label>
            <el-input-number
              id="nearby-radius-mobile"
              v-model="filterRadius"
              class="map-flow-panel__radius-input"
              :min="0.1"
              :max="1000"
              :step="0.1"
              :precision="1"
              controls-position="right"
            />
          </div>
        </template>

        <template v-else>
          <section class="nearby-section nearby-section--center" aria-label="中心点">
            <div class="nearby-section__header">
              <span class="nearby-section__badge">1</span>
              <div class="nearby-section__titles">
                <h4 class="nearby-section__title">中心点</h4>
                <p class="nearby-section__hint">如何确定地图上的筛选中心</p>
              </div>
            </div>
            <div class="nearby-section__body">
              <label class="nearby-field-label" for="nearby-center-mode-inline">来源</label>
              <el-select
                id="nearby-center-mode-inline"
                v-model="advancedCenterMode"
                class="nearby-select-full"
                placeholder="选择中心点来源"
              >
                <el-option label="自动定位" value="auto" />
                <el-option label="文本输入" value="place" />
                <el-option label="经纬度输入" value="coord" />
              </el-select>
              <div
                v-if="advancedCenterMode === 'place'"
                class="nearby-follow-field"
              >
                <el-input
                  v-model="advancedPlaceQuery"
                  class="nearby-select-full"
                  placeholder="输入地点关键词，确定后将进行地理编码"
                  clearable
                />
              </div>
              <div
                v-if="advancedCenterMode === 'coord'"
                class="nearby-follow-field"
              >
                <el-input
                  v-model="advancedCoordStr"
                  class="nearby-select-full"
                  placeholder="经度,纬度，例如 114.3342,30.5768"
                  @keyup.enter="applyNearbyFilter"
                />
              </div>
            </div>
          </section>
          <section class="nearby-section nearby-section--filter" aria-label="筛选方式">
            <div class="nearby-section__header">
              <span class="nearby-section__badge">2</span>
              <div class="nearby-section__titles">
                <h4 class="nearby-section__title">筛选方式</h4>
                <p class="nearby-section__hint">按圆形半径或按距中心直线距离最近的 N 个点</p>
              </div>
            </div>
            <div class="nearby-section__body">
              <label class="nearby-field-label" for="nearby-filter-mode-inline">方式</label>
              <el-select
                id="nearby-filter-mode-inline"
                v-model="advancedFilterMode"
                class="nearby-select-full"
                placeholder="选择筛选方式"
              >
                <el-option label="按半径" value="radius" />
                <el-option label="按 POI 数量（最近 N 个）" value="count" />
              </el-select>
              <template v-if="advancedFilterMode === 'radius'">
                <label class="nearby-field-label nearby-block-gap" for="nearby-radius-km-inline">半径（km）</label>
                <el-input-number
                  id="nearby-radius-km-inline"
                  v-model="filterRadius"
                  class="nearby-select-full"
                  :min="0.1"
                  :max="1000"
                  :step="0.1"
                  :precision="1"
                />
              </template>
              <template v-else>
                <label class="nearby-field-label nearby-block-gap" for="nearby-poi-n-inline">POI 数量 N</label>
                <el-input-number
                  id="nearby-poi-n-inline"
                  v-model="filterPoiCount"
                  class="nearby-select-full"
                  :min="1"
                  :max="100000"
                  :step="1"
                  :precision="0"
                />
              </template>
            </div>
          </section>
        </template>

        <div v-if="locationLoading" class="location-loading">
          <el-icon class="loading-icon"><Loading /></el-icon>
          <span class="loading-text">{{ currentLocationMethod || '处理中，请稍等…' }}</span>
        </div>
      </div>
      <div class="map-flow-panel__footer">
        <el-button v-if="!isMobile" @click="openLocationFilter = false">取消</el-button>
        <el-button type="primary" @click="applyNearbyFilter" :loading="locationLoading">确定</el-button>
      </div>
    </div>
    <div ref="mapRef" class="map-canvas">
      <div
        class="map-layer-dock"
        @mouseenter="onMapLayerDockEnter"
        @mouseleave="onMapLayerDockLeave"
      >
        <div class="map-layer-hover-zone">
          <button
            type="button"
            class="map-layer-fab"
            :aria-expanded="mapLayerPanelOpen"
            :aria-label="`地图图层，当前：${currentMapLayerLabel}`"
          >
            <img
              :src="currentMapLayerThumb"
              alt=""
              class="map-layer-fab__img"
              width="28"
              height="28"
              draggable="false"
            />
          </button>
          <transition name="map-layer-panel-t">
            <div
              v-show="mapLayerPanelOpen"
              class="map-layer-panel"
              role="listbox"
              aria-label="选择地图类型"
            >
              <el-tooltip
                v-for="opt in MAP_LAYER_OPTIONS"
                :key="opt.type"
                :content="opt.label"
                placement="left"
                effect="dark"
                :show-after="0"
                :hide-after="100"
                popper-class="map-layer-el-tooltip"
              >
                <button
                  type="button"
                  class="map-layer-option"
                  :class="{ 'is-active': activeMapLayerType === opt.type }"
                  role="option"
                  :aria-label="opt.label"
                  :aria-selected="activeMapLayerType === opt.type"
                  @click="selectMapLayer(opt.type)"
                >
                  <img
                    :src="opt.thumb"
                    alt=""
                    class="map-layer-option__thumb"
                    width="28"
                    height="28"
                    draggable="false"
                  />
                </button>
              </el-tooltip>
            </div>
          </transition>
        </div>
      </div>
      <!-- 数据加载遮罩 -->
      <div v-if="poiStore.dataLoading" class="loading-overlay">
        <div class="loading-content">
          <el-icon class="loading-icon"><Loading /></el-icon>
          <div class="loading-text">数据正在加载中，请稍后...</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ArrowDown, Loading } from '@element-plus/icons-vue';
import { usePoiStore } from '@/stores/poiStore';
import AMapLoader from '@amap/amap-jsapi-loader';
import { getAmapLoaderConfig } from '@/config/amapLoader';
import { onMounted, onBeforeUnmount, ref, watch, nextTick, computed } from 'vue';
import { useMobileLayout } from '@/composables/useMobileLayout';
import mapLayerNormalUrl from '@/assets/map-layers/normal.svg?url';
import mapLayerSatelliteUrl from '@/assets/map-layers/satellite.svg?url';
import mapLayerRoadnetUrl from '@/assets/map-layers/roadnet.svg?url';
import mapLayerTrafficUrl from '@/assets/map-layers/traffic.svg?url';

const poiStore = usePoiStore();
const { isMobile } = useMobileLayout();
const mapRef = ref(null);
const openSearch = ref(false);
const searchKeyword = ref('');
const openLocationFilter = ref(false);
const filterRadius = ref(5); // 默认5km
const locationLoading = ref(false);
const locationError = ref('');
const currentLocationMethod = ref(''); // 当前使用的定位方式
const skipAutoLocation = ref(false); // 调试：跳过自动定位（控制台 window.skipAutoLocation）
const nearbyTier = ref('basic');
const advancedCenterMode = ref('auto');
const advancedFilterMode = ref('radius');
const filterPoiCount = ref(30);
const advancedPlaceQuery = ref('');
const advancedCoordStr = ref('');

/** 图层缩略图：走 Vite ?url，构建后路径带 hash，不依赖 public 与 BASE_URL 手写拼接 */
const MAP_LAYER_OPTIONS = [
  { type: 'normal', label: '普通地图', thumb: mapLayerNormalUrl },
  { type: 'satellite', label: '卫星地图', thumb: mapLayerSatelliteUrl },
  { type: 'roadnet', label: '路网地图', thumb: mapLayerRoadnetUrl },
  { type: 'traffic', label: '交通地图', thumb: mapLayerTrafficUrl },
];

const activeMapLayerType = ref('normal');
const mapLayerPanelOpen = ref(false);
let mapLayerDockLeaveTimer = null;

const currentMapLayerThumb = computed(() => {
  const hit = MAP_LAYER_OPTIONS.find((o) => o.type === activeMapLayerType.value);
  return hit?.thumb ?? mapLayerNormalUrl;
});

const currentMapLayerLabel = computed(() => {
  const hit = MAP_LAYER_OPTIONS.find((o) => o.type === activeMapLayerType.value);
  return hit?.label ?? '普通地图';
});

const onMapLayerDockEnter = () => {
  if (mapLayerDockLeaveTimer != null) {
    clearTimeout(mapLayerDockLeaveTimer);
    mapLayerDockLeaveTimer = null;
  }
  mapLayerPanelOpen.value = true;
};

const onMapLayerDockLeave = () => {
  if (mapLayerDockLeaveTimer != null) {
    clearTimeout(mapLayerDockLeaveTimer);
  }
  mapLayerDockLeaveTimer = window.setTimeout(() => {
    mapLayerPanelOpen.value = false;
    mapLayerDockLeaveTimer = null;
  }, 280);
};

let mapInstance = null;

let mapLayers = {};
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
/** 海量点悬浮地名提示（仅 MassMarks 显示时） */
let hoverTipEl = null;
/** 地图容器内最近一次鼠标位置（相对容器），用于 MassMarks 事件无坐标时的补位 */
let lastMapPointer = { x: 0, y: 0, valid: false };
let mapPointerMoveHandler = null;
let mapPointerLeaveHandler = null;

/** 与标签云一致的显示名：英文模式优先英文名，否则中文 */
const getPoiLabelForMap = (poi) => {
  if (!poi) return '';
  const lang = poiStore.fontSettings?.language || 'zh';
  const zh = poi.name && String(poi.name).trim();
  const en = poi.name_en && String(poi.name_en).trim();
  if (lang === 'en') {
    if (en) return en;
    return zh || '';
  }
  if (zh) return zh;
  return en || '';
};

const hideMassHoverTip = () => {
  if (hoverTipEl) hoverTipEl.style.display = 'none';
};

const readEventPixel = (e) => {
  const p = e?.pixel;
  if (!p) return null;
  const x = p.x !== undefined ? p.x : p.getX?.();
  const y = p.y !== undefined ? p.y : p.getY?.();
  if (typeof x !== 'number' || typeof y !== 'number') return null;
  /* MassMarks 的 pixel 常固定为 (0,0)，不能再用来定位 */
  if (x === 0 && y === 0) return null;
  return { x, y };
};

const pixelToXY = (px) => {
  if (!px) return null;
  if (typeof px.getX === 'function' && typeof px.getY === 'function') {
    return { x: px.getX(), y: px.getY() };
  }
  if (typeof px.x === 'number' && typeof px.y === 'number') {
    return { x: px.x, y: px.y };
  }
  return null;
};

const clampTipPosition = (baseX, baseY, padX, padY) => {
  if (!hoverTipEl || !mapRef.value) return;
  let x = baseX + padX;
  let y = baseY + padY;
  const cw = mapRef.value.clientWidth;
  const ch = mapRef.value.clientHeight;
  const tw = hoverTipEl.offsetWidth || 160;
  const th = hoverTipEl.offsetHeight || 32;
  x = Math.min(Math.max(4, x), Math.max(4, cw - tw - 4));
  y = Math.min(Math.max(4, y), Math.max(4, ch - th - 4));
  hoverTipEl.style.left = `${x}px`;
  hoverTipEl.style.top = `${y}px`;
};

/**
 * 悬浮提示定位：优先用数据点经纬度转容器像素（MassMarks 的 e.pixel 常为 0）；
 * 其次用地图容器 mousemove 缓存的指针；再尝试原生事件 / e.pixel。
 */
const positionMassHoverTip = (e) => {
  if (!hoverTipEl || !mapRef.value) return;

  const data = e?.data;
  if (mapInstance && data?.lnglat && Array.isArray(data.lnglat) && data.lnglat.length >= 2) {
    try {
      const px = mapInstance.lngLatToContainer(data.lnglat);
      const xy = pixelToXY(px);
      if (xy) {
        clampTipPosition(xy.x, xy.y, 10, 12);
        return;
      }
    } catch {
      /* 继续其它方式 */
    }
  }

  if (lastMapPointer.valid) {
    clampTipPosition(lastMapPointer.x, lastMapPointer.y, 14, 18);
    return;
  }

  const domEv =
    e?.originEvent ||
    e?.originalEvent ||
    e?.domEvent ||
    (typeof e?.event === 'object' ? e.event : null);
  if (domEv && typeof domEv.clientX === 'number' && typeof domEv.clientY === 'number') {
    const r = mapRef.value.getBoundingClientRect();
    clampTipPosition(domEv.clientX - r.left, domEv.clientY - r.top, 14, 18);
    return;
  }

  const pt = readEventPixel(e);
  if (pt) {
    clampTipPosition(pt.x, pt.y, 12, 12);
    return;
  }

  if (mapInstance && e?.lnglat) {
    try {
      const px = mapInstance.lngLatToContainer(e.lnglat);
      const xy = pixelToXY(px);
      if (xy) clampTipPosition(xy.x, xy.y, 10, 12);
    } catch {
      /* ignore */
    }
  }
};

const ensureMassHoverTip = () => {
  if (hoverTipEl || !mapRef.value) return;
  hoverTipEl = document.createElement('div');
  hoverTipEl.className = 'map-poi-mass-hover-tip';
  hoverTipEl.setAttribute('role', 'tooltip');
  Object.assign(hoverTipEl.style, {
    position: 'absolute',
    left: '0',
    top: '0',
    zIndex: '1000',
    pointerEvents: 'none',
    display: 'none',
    padding: '6px 10px',
    background: 'rgba(30, 30, 30, 0.9)',
    color: '#fff',
    fontSize: '12px',
    lineHeight: '1.4',
    borderRadius: '4px',
    maxWidth: '280px',
    wordBreak: 'break-word',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
  });
  mapRef.value.appendChild(hoverTipEl);
};

const loadMap = async () => {
  amapGlobal = await AMapLoader.load(
    getAmapLoaderConfig({
      plugins: [
        'AMap.ToolBar',
        'AMap.Scale',
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
    }),
  );

  mapInstance = new amapGlobal.Map(mapRef.value, {
    zoom: 7,
    viewMode: '2D',
  });

  lastMapPointer = { x: 0, y: 0, valid: false };
  mapPointerMoveHandler = (ev) => {
    const el = mapRef.value;
    if (!el) return;
    const r = el.getBoundingClientRect();
    lastMapPointer.x = ev.clientX - r.left;
    lastMapPointer.y = ev.clientY - r.top;
    lastMapPointer.valid = true;
  };
  mapPointerLeaveHandler = () => {
    lastMapPointer.valid = false;
  };
  mapRef.value.addEventListener('mousemove', mapPointerMoveHandler, { passive: true });
  mapRef.value.addEventListener('mouseleave', mapPointerLeaveHandler);

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

  placeSearch = new amapGlobal.PlaceSearch({
    map: mapInstance,
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

  massLayer.on('mouseover', (e) => {
    const raw = e.data;
    if (raw?.id == null) return;
    const poi = poiStore.poiList.find((p) => p.id === raw.id);
    const text = getPoiLabelForMap(poi);
    if (!text) {
      hideMassHoverTip();
      return;
    }
    ensureMassHoverTip();
    if (!hoverTipEl) return;
    hoverTipEl.textContent = text;
    hoverTipEl.style.display = 'block';
    positionMassHoverTip(e);
  });

  massLayer.on('mousemove', (e) => {
    if (!hoverTipEl || hoverTipEl.style.display === 'none') return;
    positionMassHoverTip(e);
  });

  massLayer.on('mouseout', hideMassHoverTip);

  mapInstance.on('movestart', hideMassHoverTip);
  mapInstance.on('zoomstart', hideMassHoverTip);

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
  
  if (poiStore.hasDrawing) {
    return;
  }
  
  resetDrawing();
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
  activeMapLayerType.value = type;
};

const selectMapLayer = (type) => {
  changeMapType(type);
};

const searchPlace = () => {
  if (!searchKeyword.value || !placeSearch) return;
  placeSearch.search(searchKeyword.value);
  openSearch.value = false;
};

// 处理周边筛选对话框关闭
const handleLocationDialogClose = () => {
  locationError.value = '';
  currentLocationMethod.value = '';
  locationLoading.value = false;
  nearbyTier.value = 'basic';
  advancedCenterMode.value = 'auto';
  advancedFilterMode.value = 'radius';
  advancedPlaceQuery.value = '';
  advancedCoordStr.value = '';
};

const openNearbyDialog = () => {
  if (poiStore.hasDrawing) return;
  locationError.value = '';
  openLocationFilter.value = true;
};

const GEOCODE_TIMEOUT_MS = 15000;

/** 防止高德 Geocoder / PlaceSearch 回调永不触发导致界面永久卡在「正在解析地点」 */
const promiseWithTimeout = (promise, ms, message = '请求超时') =>
  new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(message)), ms);
    promise
      .then((v) => {
        clearTimeout(t);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(t);
        reject(e);
      });
  });

/** 将 Geocoder / POI 返回的 location 统一为 AMap.LngLat */
const normalizeAmapLngLat = (raw) => {
  if (!raw || !amapGlobal) return null;
  if (typeof raw.getLng === 'function' && typeof raw.getLat === 'function') return raw;
  const lng =
    typeof raw.getLng === 'function'
      ? raw.getLng()
      : raw.lng ?? raw.longitude ?? (Array.isArray(raw) ? raw[0] : undefined);
  const lat =
    typeof raw.getLat === 'function'
      ? raw.getLat()
      : raw.lat ?? raw.latitude ?? (Array.isArray(raw) ? raw[1] : undefined);
  if (lng != null && lat != null && !Number.isNaN(+lng) && !Number.isNaN(+lat)) {
    return new amapGlobal.LngLat(+lng, +lat);
  }
  if (typeof raw === 'string') {
    const parts = raw.split(/[,\s]+/).map((s) => parseFloat(s.trim()));
    if (parts.length >= 2 && !Number.isNaN(parts[0]) && !Number.isNaN(parts[1])) {
      return new amapGlobal.LngLat(parts[0], parts[1]);
    }
  }
  return null;
};

/** 地点关键词 → LngLat（Geocoder 优先，失败则 PlaceSearch） */
const geocodeKeyword = async (keyword) => {
  const input = keyword?.trim();
  if (!input) throw new Error('请输入地点关键词');
  if (!geocoder) {
    geocoder = new amapGlobal.Geocoder({ city: '全国' });
  }
  currentLocationMethod.value = '正在解析地点…';

  const geocodeViaGeocoder = () =>
    new Promise((resolve, reject) => {
      geocoder.getLocation(input, (status, result) => {
        if (status === 'complete' && result?.geocodes?.length) {
          resolve(result.geocodes[0]);
        } else {
          reject(new Error(result?.info || 'Geocoder未找到该地点'));
        }
      });
    });

  try {
    const geocodeItem = await promiseWithTimeout(
      geocodeViaGeocoder(),
      GEOCODE_TIMEOUT_MS,
      '地理编码超时，将尝试地点搜索',
    );
    const lngLat = normalizeAmapLngLat(geocodeItem?.location);
    if (lngLat) return lngLat;
  } catch {
    /* PlaceSearch 兜底 */
  }

  // 独立实例 + 不设 map，避免与初始化时的 PlaceSearch 抢回调或受地图状态影响
  const placeSearchLocal = new amapGlobal.PlaceSearch({ city: '全国' });
  const placeResult = await promiseWithTimeout(
    new Promise((resolve, reject) => {
      placeSearchLocal.search(input, (status, result) => {
        if (status !== 'complete') {
          reject(new Error(result?.info || '搜索失败'));
          return;
        }
        let poi = null;
        if (result.poiList?.pois?.length) {
          poi = result.poiList.pois[0];
        } else if (Array.isArray(result.poiList) && result.poiList.length) {
          poi = result.poiList[0];
        } else if (Array.isArray(result.pois) && result.pois.length) {
          poi = result.pois[0];
        }
        if (poi?.location) resolve(poi);
        else reject(new Error('未找到该地点'));
      });
    }),
    GEOCODE_TIMEOUT_MS,
    '地点搜索超时，请检查网络或稍后重试',
  );
  const lngLat = normalizeAmapLngLat(placeResult.location);
  if (!lngLat) throw new Error('无法解析该地点坐标');
  return lngLat;
};

/** 多级自动定位：浏览器 → 高德 → IP；失败返回 null */
const getAutoUserLocation = async () => {
  if (!amapGlobal || !mapInstance) return null;
  if (skipAutoLocation.value || (typeof window !== 'undefined' && window.skipAutoLocation)) {
    return null;
  }
  let userLocation = null;
  try {
    if (navigator.geolocation) {
      currentLocationMethod.value = '正在使用浏览器定位…';
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 60000,
          },
        );
      });
      const { latitude, longitude } = position.coords;
      const gcj02Coord = wgs84ToGcj02(longitude, latitude);
      userLocation = new amapGlobal.LngLat(gcj02Coord.lng, gcj02Coord.lat);
      currentLocationMethod.value = '浏览器定位成功';
      return userLocation;
    }
  } catch {
    /* 尝试高德 */
  }
  if (!userLocation) {
    try {
      currentLocationMethod.value = '正在使用高德定位…';
      if (!geolocation) {
        geolocation = new amapGlobal.Geolocation({
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
          convert: true,
          showButton: false,
          buttonDom: null,
          showMarker: false,
          showCircle: false,
          panToLocation: false,
          zoomToAccuracy: false,
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
      userLocation = position.position;
      currentLocationMethod.value = '高德定位成功';
      return userLocation;
    } catch {
      /* 尝试 IP */
    }
  }
  if (!userLocation) {
    try {
      currentLocationMethod.value = '正在使用 IP 定位…';
      const ipLocation = await getLocationByIP();
      if (ipLocation) {
        userLocation = new amapGlobal.LngLat(ipLocation.lng, ipLocation.lat);
        currentLocationMethod.value = 'IP 定位成功';
        return userLocation;
      }
    } catch {
      /* ignore */
    }
  }
  return null;
};

const resolveAdvancedCenter = async () => {
  if (advancedCenterMode.value === 'auto') {
    const loc = await getAutoUserLocation();
    if (!loc) {
      throw new Error('自动定位失败，请改用文本或经纬度指定中心。');
    }
    return loc;
  }
  if (advancedCenterMode.value === 'coord') {
    const input = advancedCoordStr.value.trim();
    const coordPattern = /^-?\d+\.?\d*,\s*-?\d+\.?\d*$/;
    if (!coordPattern.test(input)) {
      throw new Error('经纬度格式：经度,纬度');
    }
    const [lng, lat] = input.split(',').map((s) => parseFloat(s.trim()));
    if (Number.isNaN(lng) || Number.isNaN(lat) || lng < -180 || lng > 180 || lat < -90 || lat > 90) {
      throw new Error('经纬度数值超出有效范围');
    }
    return new amapGlobal.LngLat(lng, lat);
  }
  const q = advancedPlaceQuery.value.trim();
  if (!q) throw new Error('请输入地点关键词');
  return geocodeKeyword(q);
};

/** 按直线距离取距中心最近的 N 个 POI，并绘制包络圆；与半径模式一致启用 CircleEditor，可拖移圆心、调整半径 */
const applyNearbyCountFilter = async (centerLngLat, n) => {
  const count = Math.max(1, Math.floor(Number(n)) || 1);
  resetDrawing();
  const centerArr = [centerLngLat.getLng(), centerLngLat.getLat()];
  const withDist = poiStore.poiList.map((poi) => ({
    poi,
    d: amapGlobal.GeometryUtil.distance(centerArr, [poi.lng, poi.lat]),
  }));
  withDist.sort((a, b) => a.d - b.d);
  const top = withDist.slice(0, Math.min(count, withDist.length));
  const ids = top.map((x) => x.poi.id);
  const maxD = top.length ? top[top.length - 1].d : 100;
  const radiusMeters = Math.max(maxD * 1.05, 80);

  const drawStyle = {
    fillColor: '#00b0ff',
    strokeColor: '#80d8ff',
    fillOpacity: 0.2,
  };
  drawObj = new amapGlobal.Circle({
    center: centerLngLat,
    radius: radiusMeters,
    ...drawStyle,
  });
  drawObj.setMap(mapInstance);

  drawEditor = new amapGlobal.CircleEditor(mapInstance, drawObj);
  drawEditor.open();

  updateCircleMarkers(drawObj);
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

  mapInstance.setCenter(centerLngLat);
  mapInstance.setZoom(calculateZoomByRadius(radiusMeters));
  await new Promise((r) => setTimeout(r, 100));

  poiStore.applySelection(ids);
  poiStore.showSelected();
  poiStore.setSelectionContext({
    center: { lng: centerLngLat.getLng(), lat: centerLngLat.getLat() },
    geometry: drawObj,
    nearbyFilter: 'nearestN',
    nearestN: count,
  });
  poiStore.setHasDrawing(true);
  updateLayerByView();
};

const applyNearbyFilter = async () => {
  if (!amapGlobal || !mapInstance) {
    locationError.value = '地图未初始化，请稍后再试';
    return;
  }
  locationError.value = '';
  locationLoading.value = true;
  currentLocationMethod.value = '';

  try {
    if (nearbyTier.value === 'basic') {
      if (!filterRadius.value || filterRadius.value <= 0) {
        locationError.value = '请输入有效半径';
        return;
      }
      const loc = await getAutoUserLocation();
      if (!loc) {
        locationError.value =
          '自动定位失败，请切换到高级版手动指定中心，或检查浏览器定位权限与网络。';
        return;
      }
      await createCircleAndFilter(loc);
      openLocationFilter.value = false;
      return;
    }

    let center;
    try {
      center = await resolveAdvancedCenter();
    } catch (e) {
      locationError.value = e.message || '无法解析中心点';
      return;
    }

    if (advancedFilterMode.value === 'radius') {
      if (!filterRadius.value || filterRadius.value <= 0) {
        locationError.value = '请输入有效半径';
        return;
      }
      await createCircleAndFilter(center);
    } else {
      const pn = filterPoiCount.value;
      if (!pn || pn < 1) {
        locationError.value = '请输入有效的 POI 数量';
        return;
      }
      await applyNearbyCountFilter(center, pn);
    }
    openLocationFilter.value = false;
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
  if (mapLayerDockLeaveTimer != null) {
    clearTimeout(mapLayerDockLeaveTimer);
    mapLayerDockLeaveTimer = null;
  }
  const container = mapRef.value;
  if (container && mapPointerMoveHandler) {
    container.removeEventListener('mousemove', mapPointerMoveHandler);
  }
  if (container && mapPointerLeaveHandler) {
    container.removeEventListener('mouseleave', mapPointerLeaveHandler);
  }
  mapPointerMoveHandler = null;
  mapPointerLeaveHandler = null;
  lastMapPointer = { x: 0, y: 0, valid: false };

  hideMassHoverTip();
  if (hoverTipEl?.parentNode) {
    hoverTipEl.parentNode.removeChild(hoverTipEl);
  }
  hoverTipEl = null;
  resetDrawing();
  if (mapInstance) {
    mapInstance.destroy();
  }
  mapInstance = null;
});
</script>

<style lang="scss" scoped>
@use '@/assets/styles/mobile-layout-mixin.scss' as *;
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
  flex-wrap: nowrap;
  gap: 10px;
  flex-shrink: 0;
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: 2px;
  scrollbar-width: thin;
}

.map-head-ctl {
  flex-shrink: 0;
}

.map-head :deep(.el-dropdown) {
  flex-shrink: 0;
}

.map-toolbar-trigger {
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 32px;
  padding: 0 14px;
  border-radius: 8px;
  background: #fff;
  border: 1px solid #dcdfe6;
  color: #1f2333;
  cursor: pointer;
  font-size: 14px;
  font-weight: 400;
  line-height: 1;
  white-space: nowrap;
  transition: background-color 0.15s, border-color 0.15s, color 0.15s;
}

.map-toolbar-trigger:hover {
  background: #f5f7fa;
  border-color: #c0c4cc;
}

.map-toolbar-trigger__text {
  white-space: nowrap;
  font-weight: 400;
}

.map-toolbar-trigger__icon {
  flex-shrink: 0;
  font-size: 12px;
}

.map-head :deep(.map-toolbar-btn.el-button) {
  flex-shrink: 0;
  white-space: nowrap;
  height: 32px;
  padding: 0 14px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 400;
  background: #fff;
  border: 1px solid #dcdfe6;
  color: #1f2333;
}

.map-head :deep(.map-toolbar-btn.el-button:hover:not(:disabled)) {
  background: #f5f7fa;
  border-color: #c0c4cc;
  color: #1f2333;
}

.nearby-tier-switch {
  display: flex;
  margin-bottom: 4px;
}

.nearby-section {
  margin-top: 14px;
  padding: 16px 18px;
  border-radius: 10px;
  border: 1px solid #e4e7ed;
  background: linear-gradient(180deg, #fafbfc 0%, #f5f7fa 100%);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.nearby-section:first-of-type {
  margin-top: 12px;
}

.nearby-section--center {
  border-left: 4px solid #409eff;
}

.nearby-section--filter {
  border-left: 4px solid #67c23a;
}

.nearby-section__header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 14px;
  padding-bottom: 12px;
  border-bottom: 1px solid #ebeef5;
}

.nearby-section__badge {
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  border-radius: 8px;
  background: #409eff;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.nearby-section--filter .nearby-section__badge {
  background: #67c23a;
}

.nearby-section__titles {
  min-width: 0;
}

.nearby-section__title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  line-height: 1.35;
}

.nearby-section__hint {
  margin: 4px 0 0;
  font-size: 12px;
  color: #909399;
  line-height: 1.45;
}

.nearby-section__body {
  display: flex;
  flex-direction: column;
}

.nearby-field-label {
  display: block;
  font-size: 13px;
  color: #606266;
  font-weight: 500;
  margin-bottom: 6px;
}

/** 「来源」下拉下方的联想输入 / 经纬度输入，与下拉留出与经纬度模式一致的间距 */
.nearby-follow-field {
  margin-top: 12px;
  width: 100%;
}

.nearby-block-gap {
  margin-top: 12px;
}

.nearby-select-full {
  width: 100%;
  max-width: 100%;
}

.location-filter-content :deep(.nearby-select-full.el-input-number) {
  width: 100%;
}

.location-filter-content :deep(.nearby-select-full.el-input-number .el-input__wrapper) {
  width: 100%;
}

.location-filter-content :deep(.nearby-select-full.el-select) {
  width: 100%;
}

.location-filter-content :deep(.nearby-select-full.el-input) {
  width: 100%;
}

/* 已有绘制：地图框选、周边筛选 禁用且文字统一为灰色（不用整体 opacity，避免字重错觉） */
.map-head--draw-active :deep(.map-toolbar-pair.el-dropdown.is-disabled .map-toolbar-trigger),
.map-head--draw-active :deep(.map-toolbar-pair.el-button.is-disabled) {
  cursor: not-allowed;
  pointer-events: none;
  background: #f5f7fa !important;
  border-color: #e4e7ed !important;
  color: #a8abb2 !important;
  font-weight: 400 !important;
  -webkit-font-smoothing: antialiased;
}

.map-head--draw-active :deep(.map-toolbar-pair.el-dropdown.is-disabled .map-toolbar-trigger__icon) {
  color: #a8abb2;
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

/* 右上角地图图层：悬停展开 4×1，缩略图 + tooltip 文案 */
.map-layer-dock {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 500;
}

.map-layer-hover-zone {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  padding: 2px;
}

.map-layer-fab {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  padding: 0;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  transition: border-color 0.15s, box-shadow 0.15s;
}

.map-layer-fab:hover {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);
}

.map-layer-fab__img {
  display: block;
  width: 28px;
  height: 28px;
  border-radius: 4px;
  object-fit: cover;
}

.map-layer-panel {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 3px;
  padding: 5px;
  min-width: 0;
  border-radius: 8px;
  background: #fff;
  border: 1px solid #e4e7ed;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.map-layer-panel-t-enter-active,
.map-layer-panel-t-leave-active {
  transition: opacity 0.14s ease, transform 0.14s ease;
}

.map-layer-panel-t-enter-from,
.map-layer-panel-t-leave-to {
  opacity: 0;
  transform: translateY(-3px);
}

.map-layer-option {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 5px;
  background: transparent;
  cursor: pointer;
  transition: background-color 0.12s, box-shadow 0.12s;
}

.map-layer-option:hover {
  background: #f5f7fa;
}

.map-layer-option.is-active {
  background: #ecf5ff;
  box-shadow: 0 0 0 2px #409eff;
}

.map-layer-option__thumb {
  display: block;
  width: 28px;
  height: 28px;
  border-radius: 4px;
  object-fit: cover;
  border: 1px solid rgba(0, 0, 0, 0.06);
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

.map-flow-panel {
  flex-shrink: 0;
  width: 100%;
  box-sizing: border-box;
  margin: 0 0 10px;
  padding: 12px;
  background: #fff;
  border-radius: 10px;
  border: 1px solid #e4e7ed;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.map-flow-panel__title {
  font-weight: 600;
  margin-bottom: 10px;
  font-size: 14px;
  color: #303133;
}

.map-flow-panel__title--solo {
  margin-bottom: 12px;
}

.map-flow-panel__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.map-flow-panel__head .map-flow-panel__title {
  margin-bottom: 0;
}

/* 移动端周边筛选：顶行 标题 | 基础/高级 | 清除筛选（与按钮同高） */
.map-flow-panel__head--nearby-mobile {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  min-width: 0;
  --nearby-head-ctl-height: 28px;
}

.map-flow-panel__title--inline {
  flex-shrink: 0;
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  white-space: nowrap;
}

.nearby-tier-switch--head {
  flex: 1 1 auto;
  min-width: 0;
  margin: 0;
  display: flex;
  justify-content: center;
  align-items: center;
}

/* 与 small 按钮同高，避免 segmented 被压扁 */
.nearby-tier-switch--head :deep(.el-radio-button__inner) {
  box-sizing: border-box;
  min-height: var(--nearby-head-ctl-height, 28px);
  height: var(--nearby-head-ctl-height, 28px);
  padding: 0 10px;
  font-size: 12px;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.map-flow-panel__clear-draw {
  flex-shrink: 0;
  box-sizing: border-box;
  height: var(--nearby-head-ctl-height, 28px);
  min-height: var(--nearby-head-ctl-height, 28px);
  padding: 0 10px;
  font-size: 12px;
  line-height: 1;
}

.map-flow-panel__alert-error {
  margin-bottom: 8px;
}

.map-flow-panel__alert-info {
  margin: 0 0 8px;
}

.map-flow-panel__radius-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.map-flow-panel__radius-label {
  flex-shrink: 0;
  font-size: 12px;
  color: #606266;
  font-weight: 500;
}

.map-flow-panel__radius-input {
  flex: 1 1 auto;
  min-width: 0;
  width: 100%;
}

.map-flow-panel__close {
  margin-top: 8px;
}

.map-flow-panel--search .map-flow-panel__title {
  margin-bottom: 8px;
}

.map-flow-panel--nearby .location-filter-content {
  max-height: min(52vh, 460px);
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.map-flow-panel__footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #ebeef5;
}

@include mobile-layout {
  /*
   * 避免 height:100% + flex 子项争占父级全高，导致地图与下方表格重叠。
   * 地图区用固定高度，由整块纵向流式排布。
   */
  .map-wrapper {
    display: flex;
    flex-direction: column;
    height: auto;
    min-height: 0;
    overflow: visible;
    flex-shrink: 0;
    width: 100%;
  }

  .map-flow-panel {
    flex-shrink: 0;
  }

  .map-canvas {
    flex: 0 0 auto;
    width: 100%;
    height: min(42vh, 320px);
    min-height: 200px;
    max-height: 55vh;
  }

  .map-head {
    flex-wrap: wrap;
    justify-content: flex-start;
  }

  .map-flow-panel--nearby .location-filter-content {
    max-height: min(58vh, 520px);
  }

  /* 周边筛选：移动端更紧凑 */
  .map-flow-panel--nearby {
    margin: 0 0 6px;
    padding: 8px 10px;
  }

  .map-flow-panel--nearby .map-flow-panel__head--nearby-mobile {
    margin-bottom: 6px;
    gap: 4px;
  }

  .map-flow-panel--nearby .map-flow-panel__title--inline {
    font-size: 13px;
  }

  .map-flow-panel--nearby .nearby-tier-switch--head :deep(.el-radio-button__inner) {
    min-height: 28px;
    height: 28px;
    padding: 0 8px;
    font-size: 12px;
  }

  .map-flow-panel--nearby .map-flow-panel__clear-draw {
    height: 28px;
    min-height: 28px;
  }

  .map-flow-panel--nearby .nearby-tier-switch {
    margin-bottom: 0;
  }

  .map-flow-panel--nearby .nearby-section {
    margin-top: 8px;
    padding: 10px 12px;
  }

  .map-flow-panel--nearby .nearby-section:first-of-type {
    margin-top: 6px;
  }

  .map-flow-panel--nearby .nearby-section__header {
    margin-bottom: 8px;
    padding-bottom: 8px;
    gap: 8px;
  }

  .map-flow-panel--nearby .nearby-section__badge {
    width: 22px;
    height: 22px;
    font-size: 12px;
  }

  .map-flow-panel--nearby .nearby-section__title {
    font-size: 14px;
  }

  .map-flow-panel--nearby .nearby-section__hint {
    margin-top: 2px;
    font-size: 11px;
    line-height: 1.35;
  }

  .map-flow-panel--nearby .nearby-field-label {
    margin-bottom: 4px;
    font-size: 12px;
  }

  .map-flow-panel--nearby .nearby-follow-field {
    margin-top: 8px;
  }

  .map-flow-panel--nearby .nearby-block-gap {
    margin-top: 8px;
  }

  .map-flow-panel--nearby .location-filter-content {
    padding: 4px 0 0;
  }

  .map-flow-panel--nearby :deep(.el-alert) {
    margin-bottom: 6px;
    padding: 6px 10px;
  }

  .map-flow-panel--nearby .map-flow-panel__alert-info {
    margin-bottom: 6px;
  }

  .map-flow-panel--nearby .map-flow-panel__radius-row :deep(.el-input-number) {
    width: 100%;
  }
}
</style>

<style>
/* 图层子项 tooltip：替代原生 title（浏览器常延迟 1s+），并保证浮在地图与 loading 之上 */
.map-layer-el-tooltip.el-popper {
  z-index: 1100 !important;
}
</style>

