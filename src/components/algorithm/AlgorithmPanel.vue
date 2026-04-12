<template>
  <section class="panel-card algorithm-panel">
    <div class="config-section">
      <div class="section-header">
        <span class="section-title">算法</span>
        <span class="section-desc">选择布局算法并微调参数；各算法参数互不影响</span>
      </div>
      <div class="section-content">
        <div class="algo-toolbar">
          <div class="algo-toolbar__field">
            <span class="algo-toolbar__label">布局算法</span>
            <el-select
              v-model="algorithmType"
              class="algo-select"
              placeholder="请选择算法"
              @change="handleAlgorithmChange"
            >
              <el-option label="多角度径向移位" value="multi-angle" />
              <el-option label="单角度径向移位" value="single-angle" />
              <el-option label="阿基米德螺线" value="archimedean" />
            </el-select>
          </div>
        </div>
        <div class="algorithm-desc">
          <p v-if="algorithmType === 'multi-angle'" class="desc-text">
            多角度径向移位：在每个标签相对中心的真实方位角附近一扇形区域内搜索空位；区域大小可在下方「扇形半角」中调整。
          </p>
          <p v-else-if="algorithmType === 'single-angle'" class="desc-text">
            单角度径向移位：沿真实方位角射线向外推移，直到不与已有标签重叠。
          </p>
          <p v-else class="desc-text">
            阿基米德螺线：按顺序沿螺线向外取点摆放，整体更接近传统词云团状；与各地点相对方位无关。
          </p>
        </div>

        <el-collapse v-model="paramCollapse" class="param-collapse">
          <el-collapse-item name="params">
            <template #title>
              <div class="collapse-title-bar">
                <span class="collapse-title-text">{{ paramPanelTitle }}</span>
                <el-button
                  link
                  type="primary"
                  size="small"
                  class="reset-defaults-btn"
                  :disabled="isCurrentAlgoAtDefaults"
                  @click.stop="restoreCurrentAlgorithmDefaults"
                >
                  <el-icon class="reset-icon"><RefreshLeft /></el-icon>
                  恢复默认值
                </el-button>
              </div>
            </template>
            <div v-if="isMultiAngleAlgo" class="param-block">
              <div class="param-field">
              <div class="param-row">
                <div class="param-label-wrap">
                  <span class="param-label">扇形半角（度）</span>
                  <p class="param-hint">
                    在真实方向角两侧搜索的扇形角度范围。数值越大，扇形角度范围将会越宽，标签整体可能更易偏离真实地理方位。
                  </p>
                </div>
                <div class="slider-pad">
                  <el-slider
                    v-model="localMulti.sectorHalfAngle"
                    :min="3"
                    :max="60"
                    :step="1"
                    show-input
                    :show-input-controls="false"
                    @change="(v) => tryCommitMulti('sectorHalfAngle', v)"
                  />
                </div>
              </div>
              </div>
              <div class="param-field">
              <div class="param-row">
                <div class="param-label-wrap">
                  <span class="param-label">半径步长（像素）</span>
                  <p class="param-hint">
                    扇区内扫完本圈后向外扩展的步长。数值越大则标签云整体越稀疏；而数值越小将标签云更紧密，但将更耗费性能。
                  </p>
                </div>
                <div class="slider-pad">
                  <el-slider
                    v-model="localMulti.radiusIncrement"
                    :min="1"
                    :max="30"
                    :step="1"
                    show-input
                    :show-input-controls="false"
                    @change="(v) => tryCommitMulti('radiusIncrement', v)"
                  />
                </div>
              </div>
              </div>
              <div class="param-field">
              <div class="param-row">
                <div class="param-label-wrap">
                  <span class="param-label">角度步长（度）</span>
                  <p class="param-hint">
                    同一半径上沿扇区扫过的角度间隔。数值越小则候选点越密集、生成的标签云更紧密，但计算次数将会显著增加。
                  </p>
                </div>
                <div class="slider-pad">
                  <el-slider
                    v-model="localMulti.angleStep"
                    :min="0.5"
                    :max="15"
                    :step="0.5"
                    show-input
                    :show-input-controls="false"
                    @change="(v) => tryCommitMulti('angleStep', v)"
                  />
                </div>
              </div>
              </div>
              <div class="param-field">
              <div class="param-row">
                <div class="param-label-wrap">
                  <span class="param-label">标签间距（像素）</span>
                  <p class="param-hint">
                    各标签之间的间隙。数值越大则标签之间空隙越大，标签云越松散。
                  </p>
                </div>
                <div class="slider-pad">
                  <el-slider
                    v-model="localMulti.overlapPadding"
                    :min="0"
                    :max="12"
                    :step="1"
                    show-input
                    :show-input-controls="false"
                    @change="(v) => tryCommitMulti('overlapPadding', v)"
                  />
                </div>
              </div>
              </div>
            </div>

            <div v-else-if="isSingleAngleAlgo" class="param-block">
              <div class="param-field">
              <div class="param-row">
                <div class="param-label-wrap">
                  <span class="param-label">半径步长（像素）</span>
                  <p class="param-hint">
                    沿真实方向角每次向外推进的距离。数值越小则生成的标签云越紧密。
                  </p>
                </div>
                <div class="slider-pad">
                  <el-slider
                    v-model="localSingle.radiusIncrement"
                    :min="1"
                    :max="30"
                    :step="1"
                    show-input
                    :show-input-controls="false"
                    @change="(v) => tryCommitSingle('radiusIncrement', v)"
                  />
                </div>
              </div>
              </div>
              <div class="param-field">
              <div class="param-row">
                <div class="param-label-wrap">
                  <span class="param-label">标签间距（像素）</span>
                  <p class="param-hint">同上，控制真实方向角上标签之间的空隙。</p>
                </div>
                <div class="slider-pad">
                  <el-slider
                    v-model="localSingle.overlapPadding"
                    :min="0"
                    :max="12"
                    :step="1"
                    show-input
                    :show-input-controls="false"
                    @change="(v) => tryCommitSingle('overlapPadding', v)"
                  />
                </div>
              </div>
              </div>
            </div>

            <div v-else class="param-block">
              <div class="param-field">
                <div class="param-row">
                  <div class="param-label-wrap">
                    <span class="param-label">螺线间距系数 b</span>
                    <p class="param-hint">
                      控制半径随角度增长快慢（r = a + b·θ 中的 b）。数值越大则同一圈上点越稀疏、标签云展开越快。
                    </p>
                  </div>
                  <div class="slider-pad">
                    <el-slider
                      v-model="localArch.spiralB"
                      :min="0.5"
                      :max="16"
                      :step="0.5"
                      show-input
                      :show-input-controls="false"
                      @change="(v) => tryCommitArch('spiralB', v)"
                    />
                  </div>
                </div>
              </div>
              <div class="param-field">
              <div class="param-row">
                <div class="param-label-wrap">
                  <span class="param-label">角步长（弧度）</span>
                  <p class="param-hint">
                    沿螺线前进的 θ 增量。越小采样越细、越易找到空位，但循环次数急剧上升。
                  </p>
                </div>
                <div class="arch-step-row">
                  <div class="slider-pad arch-step-slider">
                    <el-slider
                      v-model="localArch.angleStep"
                      :min="0.02"
                      :max="0.4"
                      :step="0.01"
                      :show-tooltip="true"
                      @change="(v) => tryCommitArch('angleStep', v)"
                    />
                  </div>
                  <el-input-number
                    v-model="localArch.angleStep"
                    :min="0.02"
                    :max="0.4"
                    :step="0.01"
                    :precision="2"
                    controls-position="right"
                    class="arch-step-input"
                    @change="(v) => tryCommitArch('angleStep', Number(v))"
                  />
                </div>
              </div>
              </div>
              <div class="param-field">
              <div class="param-row">
                <div class="param-label-wrap">
                  <span class="param-label">标签间距（像素）</span>
                  <p class="param-hint">螺线上各标签矩形之间的空隙。</p>
                </div>
                <div class="slider-pad">
                  <el-slider
                    v-model="localArch.overlapPadding"
                    :min="0"
                    :max="12"
                    :step="1"
                    show-input
                    :show-input-controls="false"
                    @change="(v) => tryCommitArch('overlapPadding', v)"
                  />
                </div>
              </div>
              </div>
            </div>
          </el-collapse-item>
        </el-collapse>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { ElMessageBox } from 'element-plus';
import { RefreshLeft } from '@element-plus/icons-vue';
import { usePoiStore, ALGORITHM_PARAM_DEFAULTS } from '@/stores/poiStore';

const poiStore = usePoiStore();
const algorithmType = ref(poiStore.algorithmSettings.algorithm || 'multi-angle');
/** 单击展开/收起；仅一个面板，展示当前所选算法的参数 */
const paramCollapse = ref([]);

const isMultiAngleAlgo = computed(() => algorithmType.value === 'multi-angle');
const isSingleAngleAlgo = computed(() => algorithmType.value === 'single-angle');

const paramPanelTitle = computed(() => {
  switch (algorithmType.value) {
    case 'multi-angle':
      return '多角度径向移位 — 参数调节';
    case 'single-angle':
      return '单角度径向移位 — 参数调节';
    default:
      return '阿基米德螺线 — 参数调节';
  }
});

const RISK_MSG =
  '该取值会明显增加布局时的尝试次数，可能导致界面短暂卡顿或无响应。是否仍要应用并重新摆布标签云？';

const localMulti = reactive({ ...ALGORITHM_PARAM_DEFAULTS.multiAngle });
const localSingle = reactive({ ...ALGORITHM_PARAM_DEFAULTS.singleAngle });
const localArch = reactive({ ...ALGORITHM_PARAM_DEFAULTS.archimedean });

function blockMatchesDefaults(current, defaults) {
  for (const key of Object.keys(defaults)) {
    const a = current[key];
    const b = defaults[key];
    if (typeof a === 'number' && typeof b === 'number') {
      if (Math.abs(a - b) > 1e-6) return false;
    } else if (a !== b) return false;
  }
  return true;
}

const isCurrentAlgoAtDefaults = computed(() => {
  const s = poiStore.algorithmSettings;
  if (algorithmType.value === 'multi-angle') {
    return blockMatchesDefaults(s.multiAngle, ALGORITHM_PARAM_DEFAULTS.multiAngle);
  }
  if (algorithmType.value === 'single-angle') {
    return blockMatchesDefaults(s.singleAngle, ALGORITHM_PARAM_DEFAULTS.singleAngle);
  }
  return blockMatchesDefaults(s.archimedean, ALGORITHM_PARAM_DEFAULTS.archimedean);
});

function restoreCurrentAlgorithmDefaults() {
  if (algorithmType.value === 'multi-angle') {
    poiStore.updateAlgorithmSettings({
      multiAngle: { ...ALGORITHM_PARAM_DEFAULTS.multiAngle },
    });
  } else if (algorithmType.value === 'single-angle') {
    poiStore.updateAlgorithmSettings({
      singleAngle: { ...ALGORITHM_PARAM_DEFAULTS.singleAngle },
    });
  } else {
    poiStore.updateAlgorithmSettings({
      archimedean: { ...ALGORITHM_PARAM_DEFAULTS.archimedean },
    });
  }
}

function syncLocalsFromStore() {
  const s = poiStore.algorithmSettings;
  if (s.multiAngle) Object.assign(localMulti, s.multiAngle);
  if (s.singleAngle) Object.assign(localSingle, s.singleAngle);
  if (s.archimedean) Object.assign(localArch, s.archimedean);
}

watch(
  () => poiStore.algorithmSettings,
  () => {
    syncLocalsFromStore();
  },
  { deep: true, immediate: true },
);

watch(
  () => poiStore.algorithmSettings.algorithm,
  (newAlgorithm) => {
    if (newAlgorithm && algorithmType.value !== newAlgorithm) {
      algorithmType.value = newAlgorithm;
    }
  },
  { immediate: true },
);

function isRiskyMulti(key, value) {
  if (key === 'angleStep' && value < 2) return true;
  if (key === 'radiusIncrement' && value < 2) return true;
  return false;
}

function isRiskySingle(key, value) {
  return key === 'radiusIncrement' && value < 2;
}

function isRiskyArch(key, value) {
  return key === 'angleStep' && value < 0.05;
}

async function tryCommitMulti(key, value) {
  const prev = poiStore.algorithmSettings.multiAngle[key];
  const num = Number(value);
  if (!isRiskyMulti(key, num)) {
    poiStore.updateAlgorithmSettings({ multiAngle: { [key]: num } });
    return;
  }
  try {
    await ElMessageBox.confirm(RISK_MSG, '性能提示', {
      confirmButtonText: '应用并重绘',
      cancelButtonText: '取消',
      type: 'warning',
    });
    poiStore.updateAlgorithmSettings({ multiAngle: { [key]: num } });
  } catch {
    localMulti[key] = prev;
  }
}

async function tryCommitSingle(key, value) {
  const prev = poiStore.algorithmSettings.singleAngle[key];
  const num = Number(value);
  if (!isRiskySingle(key, num)) {
    poiStore.updateAlgorithmSettings({ singleAngle: { [key]: num } });
    return;
  }
  try {
    await ElMessageBox.confirm(RISK_MSG, '性能提示', {
      confirmButtonText: '应用并重绘',
      cancelButtonText: '取消',
      type: 'warning',
    });
    poiStore.updateAlgorithmSettings({ singleAngle: { [key]: num } });
  } catch {
    localSingle[key] = prev;
  }
}

async function tryCommitArch(key, value) {
  const prev = poiStore.algorithmSettings.archimedean[key];
  const num = Number(value);
  if (Number.isNaN(num)) return;
  if (!isRiskyArch(key, num)) {
    poiStore.updateAlgorithmSettings({ archimedean: { [key]: num } });
    return;
  }
  try {
    await ElMessageBox.confirm(RISK_MSG, '性能提示', {
      confirmButtonText: '应用并重绘',
      cancelButtonText: '取消',
      type: 'warning',
    });
    poiStore.updateAlgorithmSettings({ archimedean: { [key]: num } });
  } catch {
    localArch[key] = prev;
  }
}

const handleAlgorithmChange = () => {
  poiStore.updateAlgorithmSettings({
    algorithm: algorithmType.value,
  });
};
</script>

<style lang="scss" scoped>
@use '@/assets/styles/mobile-layout-mixin.scss' as *;

.algorithm-panel {
  --algo-accent: #4c6ef5;
  --algo-accent-soft: rgba(76, 110, 245, 0.12);
  --algo-surface: #ffffff;
  --algo-muted: #64748b;
  --algo-border: #e2e8f0;
  --algo-text: #1e293b;

  min-height: calc(100vh - 160px);
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 0;
  background: linear-gradient(165deg, #eef1f8 0%, #f4f6fb 45%, #f8fafc 100%);
}

.config-section {
  background: var(--algo-surface);
  border-radius: 12px;
  border: 1px solid var(--algo-border);
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.04),
    0 8px 24px rgba(15, 23, 42, 0.06);
  overflow: visible;
}

.section-header {
  padding: 18px 22px 16px;
  background: linear-gradient(180deg, #fbfcfe 0%, #f8fafc 100%);
  border-bottom: 1px solid var(--algo-border);
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px 12px;
}

.section-title {
  font-size: 16px;
  font-weight: 650;
  letter-spacing: -0.02em;
  color: var(--algo-text);
}

.section-desc {
  font-size: 12px;
  color: var(--algo-muted);
  font-weight: 400;
  margin-left: 4px;
}

.section-content {
  padding: 22px 22px 24px;
}

.algo-toolbar {
  margin-bottom: 18px;
}

.algo-toolbar__field {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  max-width: 320px;
}

.algo-toolbar__label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--algo-muted);
}

.algo-select {
  width: 100%;
}

.algo-select :deep(.el-input__wrapper) {
  border-radius: 8px;
  box-shadow: 0 0 0 1px var(--algo-border) inset;
  transition: box-shadow 0.2s ease;
}

.algo-select :deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #cbd5e1 inset;
}

.algo-select :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px var(--algo-accent) inset;
}

.algorithm-desc {
  margin-bottom: 22px;
  padding: 14px 16px 14px 18px;
  background: linear-gradient(90deg, var(--algo-accent-soft) 0%, #f8fafc 8%, #f1f5f9 100%);
  border-radius: 10px;
  border: 1px solid var(--algo-border);
  border-left: 3px solid var(--algo-accent);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.desc-text {
  margin: 0;
  font-size: 13px;
  color: #475569;
  line-height: 1.65;
}

.param-collapse {
  border: none;
  --el-collapse-border-color: transparent;
}

.collapse-title-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding-right: 4px;
}

.collapse-title-text {
  font-weight: 650;
  font-size: 14px;
  letter-spacing: -0.01em;
  color: var(--algo-text);
}

.reset-defaults-btn {
  flex-shrink: 0;
  font-weight: 500;
}

.reset-icon {
  margin-right: 4px;
  vertical-align: middle;
}

.param-collapse :deep(.el-collapse-item__header) {
  font-weight: 600;
  font-size: 14px;
  color: var(--algo-text);
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  padding: 0 14px 0 16px;
  border-radius: 10px;
  border: 1px solid var(--algo-border);
  margin-bottom: 10px;
  min-height: 48px;
  height: auto;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.param-collapse :deep(.el-collapse-item__header:hover) {
  border-color: #cbd5e1;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
}

.param-collapse :deep(.el-collapse-item__arrow) {
  color: var(--algo-muted);
}

.param-collapse :deep(.el-collapse-item__wrap) {
  border-bottom: none;
}

.param-collapse :deep(.el-collapse-item__content) {
  padding: 4px 2px 12px;
  overflow: visible;
}

.param-field {
  padding: 14px 16px 16px;
  background: #fafbfd;
  border: 1px solid #e8ecf1;
  border-radius: 10px;
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.9) inset;
  transition: border-color 0.2s ease;
}

.param-field:hover {
  border-color: #dce3ec;
}

.param-field :deep(.el-slider__button) {
  border-color: var(--algo-accent);
}

.param-field :deep(.el-slider__bar) {
  background: linear-gradient(90deg, #5c7cfa 0%, var(--algo-accent) 100%);
}

/* 为滑块手柄留出水平空间，避免在最小值处被裁成半圆 */
.slider-pad {
  padding: 6px 14px;
  margin: 0 -4px;
  overflow: visible;
  box-sizing: border-box;
}

.slider-pad :deep(.el-slider) {
  width: 100%;
}

.slider-pad :deep(.el-slider__runway) {
  margin: 0 10px;
}

.arch-step-slider {
  flex: 1;
  min-width: 0;
}

.param-block {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 2px 0 10px;
}

.param-row {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.param-label-wrap {
  max-width: 100%;
}

.param-label {
  font-size: 14px;
  color: var(--algo-text);
  font-weight: 600;
  letter-spacing: -0.01em;
}

.param-hint {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--algo-muted);
  line-height: 1.55;
}

.arch-step-row {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.arch-step-row .arch-step-slider {
  align-self: center;
}

.arch-step-input {
  width: 120px;
}

.arch-step-input :deep(.el-input__wrapper) {
  border-radius: 8px;
}

@include mobile-layout {
  .algorithm-panel {
    min-height: 0;
    height: auto;
  }

  .config-section {
    flex-shrink: 0;
    overflow: visible;
  }

  .section-desc {
    margin-left: 0;
    width: 100%;
  }

  .collapse-title-bar {
    flex-wrap: wrap;
    align-items: flex-start;
  }

  .algo-toolbar__field {
    max-width: none;
  }
}
</style>
