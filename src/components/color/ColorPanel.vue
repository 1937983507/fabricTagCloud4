<template>
  <section class="panel-card color-panel">
    <!-- 背景配色 -->
    <div class="config-section">
      <div class="section-header">
        <span class="section-title">背景配色：</span>
         <el-switch
         class="dark-bg-switch"
            v-model="isDarkBackground"
            active-text="暗"
            inactive-text="明"
          />
        <span class="section-desc">设置标签云的背景颜色</span>
      </div>
      <div class="section-content">
        <div class="color-item">
          <span class="label">当前背景颜色：</span>
         
          <span class="color-preview" :style="{ background: localSettings.background }"></span>
        </div>
      </div>
    </div>

    <!-- 中心标签配色 -->
    <div class="config-section">
      <div class="section-header">
        <span class="section-title">中心标签配色</span>
        <span class="section-desc">设置中心标签的文字颜色</span>
      </div>
      <div class="section-content">
        <div class="color-item">
          <span class="label">当前中心标签颜色：</span>
          <el-color-picker
            v-model="localSettings.centerLabelColor"
            @change="handleCenterLabelColorChange"
            @active-change="handleCenterLabelColorChange"
            show-alpha
          />
          <span class="color-preview" :style="{ background: localSettings.centerLabelColor }"></span>
        </div>
      </div>
    </div>

    <!-- 文字配色 -->
    <div class="config-section">
      <div class="section-header">
        <span class="section-title">文字配色</span>
        <span class="section-desc">设置标签文字的颜色方案</span>
      </div>
      <div class="section-content">
        <!-- 配色模式切换 -->
        <div class="color-item" style="margin-bottom: 16px;">
          <span class="label">配色模式：</span>
          <el-radio-group v-model="localSettings.colorMode" @change="handleColorModeChange" size="small">
            <el-radio-button label="single">单色</el-radio-button>
            <el-radio-button label="multi">复色</el-radio-button>
          </el-radio-group>
        </div>

        <!-- 单色模式 -->
        <div v-if="localSettings.colorMode === 'single'" class="color-item" style="margin-bottom: 8px;">
          <span class="label">单色：</span>
          <el-color-picker
            v-model="localSettings.singleColor"
            @change="handleSingleColorChange"
            @active-change="handleSingleColorChange"
            show-alpha
          />
          <span class="color-preview" :style="{ background: localSettings.singleColor }"></span>
        </div>

        <!-- 复色模式：当前色带展示 -->
        <div v-if="localSettings.colorMode === 'multi'" class="ribbon-preview-section">
          <div class="ribbon-header">
            <span class="label">当前色带：</span>
            <el-button 
              size="small" 
              @click="handleColorFlip"
              :icon="Refresh"
            >
              颜色翻转
            </el-button>
          </div>
          <div class="current-ribbon">
            <div
              v-for="(color, index) in currentRibbon"
              :key="`ribbon-${index}`"
              class="ribbon-color-editor-item"
            >
              <el-color-picker
                :model-value="localSettings.palette?.[index]"
                @active-change="(value) => handleRibbonColorInput(index, value, false)"
                @change="(value) => handleRibbonColorInput(index, value, true)"
                show-alpha
                size="small"
              />
              <div
                class="ribbon-color-item"
                :style="{ background: color }"
              ></div>
            </div>
          </div>
        </div>

        <!-- 复色模式：颜色离散设置 -->
        <div v-if="localSettings.colorMode === 'multi'" class="discrete-settings">
          <div class="color-item spaced">
            <div class="label">颜色离散数量：</div>
            <el-input-number 
              v-model="colorDiscreteCount" 
              :min="3" 
              :max="7" 
              @change="handleColorCountChange"
              style="width: 120px"
            />
          </div>
          <div class="color-item spaced">
            <div class="label">颜色离散方式：</div>
            <el-select 
              v-model="discreteMethod" 
              placeholder="请选择" 
              style="width: 200px"
              @change="handleDiscreteMethodChange"
            >
              <el-option label="相等间隔" value="equal" />
              <el-option label="分位数" value="quantile" />
              <el-option label="自然间断点(Jenks)" value="jenks" />
              <el-option label="几何间隔" value="geometric" />
              <el-option label="标准差" value="stddev" />
            </el-select>
          </div>
        </div>

        <!-- 复色模式：配色方案选择 -->
        <div v-if="localSettings.colorMode === 'multi'" class="scheme-selection">
          <div class="scheme-header">
            <span class="label">配色方案：</span>
            <span class="scheme-count">共 {{ availableRibbons.length }} 种方案</span>
          </div>
          <div class="ribbon-gallery">
            <div
              v-for="(scheme, index) in availableRibbons"
              :key="`ribbon-${index}`"
              class="ribbon-scheme-item"
              :class="{ active: currentRibbonIndex >= 0 && currentRibbonIndex === index }"
              @click="handleRibbonSchemeSelect(index)"
            >
              <div class="ribbon-scheme-colors">
                <div
                  v-for="(color, cIndex) in scheme"
                  :key="`scheme-${index}-${cIndex}`"
                  class="scheme-color-block"
                  :style="{ background: color }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, watch, computed, nextTick, onMounted } from 'vue';
import { usePoiStore } from '@/stores/poiStore';
import { Refresh } from '@element-plus/icons-vue';
import { ribbonColorSchemes } from './ribbonColorSchemes';

const poiStore = usePoiStore();

const localSettings = ref({ ...poiStore.colorSettings });
const colorDiscreteCount = ref(5);
const discreteMethod = ref('quantile');
const currentRibbonIndex = ref(2); // 默认使用第三个配色方案（索引2）
const centerLabelColorManual = ref(false);
const LIGHT_BG = '#ffffff';
const DARK_BG = '#000000';
const RECOMMENDED_SCHEME_COUNT = 5;
const LIGHT_RECOMMENDED_RIBBON_BASES = [
   ['rgb(210,11,99)', 'rgb(5,74,197)', 'rgb(137,7,142)', 'rgba(73,150,7,0.94)', 'rgba(116,47,219,0.95)', 'rgb(238,142,28)', 'rgb(0,150,160)'],
  ['rgb(42,118,190)', 'rgb(230,126,34)', 'rgb(39,174,96)', 'rgb(142,68,173)', 'rgb(192,57,43)', 'rgb(22,160,133)', 'rgb(127,140,141)'],
 
  ['rgb(182,42,56)', 'rgb(15,146,159)', 'rgb(194,152,27)', 'rgb(128,94,151)', 'rgb(38,110,69)', 'rgb(45,90,150)', 'rgb(150,92,48)'],
  ['rgb(224,77,115)', 'rgb(79,194,152)', 'rgb(172,132,216)', 'rgb(242,158,92)', 'rgb(72,179,202)', 'rgb(122,151,64)', 'rgb(184,85,64)'],
  ['rgb(15,82,186)', 'rgb(229,57,53)', 'rgb(46,204,113)', 'rgb(156,39,176)', 'rgb(245,127,23)', 'rgb(0,150,136)', 'rgb(96,125,139)'],
];
const DARK_RECOMMENDED_RIBBON_BASES = [
   ['rgb(250,143,164)', 'rgba(255,246,148,0.97)', 'rgb(247,177,253)', 'rgb(170,245,245)', 'rgb(91,238,72)', 'rgb(255,163,76)', 'rgb(86,148,255)'],
  ['rgba(255,71,71,0.93)', 'rgb(252,110,255)', 'rgb(254,247,124)', 'rgb(101,246,227)', 'rgb(175,163,252)', 'rgb(96,244,112)', 'rgb(255,166,72)'],
   ['rgb(85,180,255)', 'rgb(255,170,70)', 'rgb(90,220,150)', 'rgb(210,140,255)', 'rgb(255,115,120)', 'rgb(90,220,230)', 'rgb(255,220,105)'],
  ['rgb(105,190,245)', 'rgb(255,166,84)', 'rgb(118,224,168)', 'rgb(188,132,255)', 'rgb(255,214,94)', 'rgb(255,112,140)', 'rgb(98,218,226)'],
  ['rgb(242,98,106)', 'rgb(114,224,182)', 'rgb(216,176,233)', 'rgb(249,212,97)', 'rgb(125,172,203)', 'rgb(255,158,115)', 'rgb(165,220,130)'],
 
  
];

const getRecommendedRibbons = (isDark, count) => {
  const bases = isDark ? DARK_RECOMMENDED_RIBBON_BASES : LIGHT_RECOMMENDED_RIBBON_BASES;
  return bases.map((scheme) => scheme.slice(0, count));
};

const isDarkBackground = computed({
  get: () => localSettings.value.background === DARK_BG,
  set: (value) => {
    const background = value ? DARK_BG : LIGHT_BG;
    const centerLabelColor = value ? LIGHT_BG : DARK_BG;
    const shouldSwapRecommendedRibbon =
      localSettings.value.colorMode === 'multi' &&
      currentRibbonIndex.value >= 0 &&
      currentRibbonIndex.value < RECOMMENDED_SCHEME_COUNT;
    const nextRecommendedRibbon = shouldSwapRecommendedRibbon
      ? getRecommendedRibbons(value, colorDiscreteCount.value)[currentRibbonIndex.value]
      : null;
    localSettings.value.background = background;
    if (!centerLabelColorManual.value) {
      localSettings.value.centerLabelColor = centerLabelColor;
      poiStore.updateCenterLabelColor(centerLabelColor);
    }
    if (nextRecommendedRibbon) {
      localSettings.value.palette = nextRecommendedRibbon;
    }
    poiStore.updateBackgroundColor(background);
    if (nextRecommendedRibbon) {
      poiStore.updateColorSettingsLight({
        palette: nextRecommendedRibbon,
      });
    }
  },
});

// 当前色带
const currentRibbon = computed(() => {
  return localSettings.value.palette || [];
});

// 可用的色带方案（根据离散数量筛选）- 使用computed缓存
const availableRibbons = computed(() => {
  const count = colorDiscreteCount.value;
  const schemes = ribbonColorSchemes[count - 3] || [];
  const existingSchemes = schemes.map(scheme => scheme.map(c => `rgb(${c.join(',')})`));
  const recommendedSchemes = getRecommendedRibbons(isDarkBackground.value, count);
  return [...recommendedSchemes, ...existingSchemes];
});

// 初始化：根据当前palette找到对应的色带索引，如果没有匹配则使用第一个方案
watch(
  () => poiStore.colorSettings,
  (settings) => {
    localSettings.value = { ...settings };
    const newCount = settings.discreteCount || settings.palette?.length || 5;
    discreteMethod.value = settings.discreteMethod || 'quantile';
    
    // 如果颜色数量改变了，需要重新选择配色方案
    if (colorDiscreteCount.value !== newCount) {
      colorDiscreteCount.value = newCount;
      // 使用nextTick确保computed已更新
      nextTick(() => {
        if (availableRibbons.value.length > 0) {
          // 尝试找到匹配的色带索引
          const paletteStr = JSON.stringify(settings.palette?.map(c => {
            if (c.startsWith('rgb')) return c;
            if (c.startsWith('#')) {
              const hex = c.slice(1);
              const r = parseInt(hex.slice(0, 2), 16);
              const g = parseInt(hex.slice(2, 4), 16);
              const b = parseInt(hex.slice(4, 6), 16);
              return `rgb(${r},${g},${b})`;
            }
            return c;
          }) || []);
          
          const schemes = availableRibbons.value;
          const index = schemes.findIndex(scheme => {
            const schemeStr = JSON.stringify(scheme);
            return schemeStr === paletteStr;
          });
          
          if (index !== -1) {
            currentRibbonIndex.value = index;
          } else {
            // 如果没有匹配，使用第三个方案（索引2，如果存在）并更新store
            const defaultIndex = Math.min(2, availableRibbons.value.length - 1);
            currentRibbonIndex.value = defaultIndex;
            if (availableRibbons.value.length > 0) {
              poiStore.updateColorSettingsLight({
                palette: availableRibbons.value[defaultIndex],
                discreteCount: newCount,
              });
            }
          }
        }
      });
    } else {
      // 颜色数量没变，只尝试匹配索引
      nextTick(() => {
        if (settings.palette && settings.palette.length >= 3) {
          const paletteStr = JSON.stringify(settings.palette.map(c => {
            if (c.startsWith('rgb')) return c;
            if (c.startsWith('#')) {
              const hex = c.slice(1);
              const r = parseInt(hex.slice(0, 2), 16);
              const g = parseInt(hex.slice(2, 4), 16);
              const b = parseInt(hex.slice(4, 6), 16);
              return `rgb(${r},${g},${b})`;
            }
            return c;
          }));
          
          const schemes = availableRibbons.value;
          const index = schemes.findIndex(scheme => {
            const schemeStr = JSON.stringify(scheme);
            return schemeStr === paletteStr;
          });
          if (index !== -1) {
            currentRibbonIndex.value = index;
          }
        }
      });
    }
  },
  { immediate: true, deep: true }
);

// 背景色变化已由开关在 setter 中处理

// 中心标签颜色变化 - 立即更新
const handleCenterLabelColorChange = (color) => {
  if (!color) return;
  centerLabelColorManual.value = true;
  localSettings.value.centerLabelColor = color;
  poiStore.updateCenterLabelColor(color);
};

// 配色模式切换
const handleColorModeChange = (mode) => {
  localSettings.value.colorMode = mode;
  // 切换单色/复色只需要更新 colorSettings，让画布根据新模式刷新颜色即可
  // 不需要触发 poiList 的全量映射（否则切换会明显卡顿）
  poiStore.updateColorSettingsLight({
    colorMode: mode,
  });
};

// 单色模式颜色变化
const handleSingleColorChange = (color) => {
  if (!color) return;
  localSettings.value.singleColor = color;
  poiStore.updateSingleColor(color);
};

// 颜色翻转 - 使用防抖
let flipTimer = null;
const handleColorFlip = () => {
  if (flipTimer) clearTimeout(flipTimer);
  flipTimer = setTimeout(() => {
    const reversed = [...currentRibbon.value].reverse();
    localSettings.value.palette = reversed;
    poiStore.updateColorSettingsLight({
      palette: reversed,
      inverted: !localSettings.value.inverted,
    });
  }, 50);
};

// 颜色数量改变 - 使用防抖（保持当前选中的第 x 种色带，仅在新数量下列表更短时钳制索引）
let countChangeTimer = null;
const handleColorCountChange = () => {
  if (countChangeTimer) clearTimeout(countChangeTimer);
  countChangeTimer = setTimeout(() => {
    if (availableRibbons.value.length > 0) {
      const maxIndex = availableRibbons.value.length - 1;
      const preservedIndex = Math.min(Math.max(0, currentRibbonIndex.value), maxIndex);
      handleRibbonSchemeSelect(preservedIndex);
    }
  }, 100);
};

// 离散方式改变
const handleDiscreteMethodChange = () => {
  poiStore.updateColorSettings({
    discreteMethod: discreteMethod.value,
  });
};

// 配色方案选择 - 立即响应
const handleRibbonSchemeSelect = (index) => {
  currentRibbonIndex.value = index;
  const selectedScheme = availableRibbons.value[index];
  localSettings.value.palette = selectedScheme;
  poiStore.updateColorSettingsLight({
    palette: selectedScheme,
    discreteCount: colorDiscreteCount.value,
  });
};

let ribbonPaletteSyncTimer = null;
const commitRibbonPalette = (palette) => {
  poiStore.updatePalette(palette);
};

// 复色色带颜色输入：拖动时节流同步，确认时立即同步
const handleRibbonColorInput = (index, color, immediate = false) => {
  if (!color || localSettings.value.colorMode !== 'multi') return;
  const nextPalette = [...(localSettings.value.palette || [])];
  if (index < 0 || index >= nextPalette.length) return;
  nextPalette[index] = color;
  localSettings.value.palette = nextPalette;
  // 手动改色后取消预设方案高亮，直到用户再次选择预设方案
  currentRibbonIndex.value = -1;

  if (immediate) {
    if (ribbonPaletteSyncTimer) {
      clearTimeout(ribbonPaletteSyncTimer);
      ribbonPaletteSyncTimer = null;
    }
    commitRibbonPalette(nextPalette);
    return;
  }

  if (ribbonPaletteSyncTimer) clearTimeout(ribbonPaletteSyncTimer);
  ribbonPaletteSyncTimer = setTimeout(() => {
    commitRibbonPalette(nextPalette);
    ribbonPaletteSyncTimer = null;
  }, 50);
};

// 初始化时确保使用第三个配色方案（如果当前palette不匹配任何方案）
onMounted(() => {
  nextTick(() => {
    if (availableRibbons.value.length > 0) {
      const currentPalette = poiStore.colorSettings.palette || [];
      const paletteStr = JSON.stringify(currentPalette);
      const matched = availableRibbons.value.some((scheme, index) => {
        if (JSON.stringify(scheme) === paletteStr) {
          currentRibbonIndex.value = index;
          return true;
        }
        return false;
      });
      
      // 如果没有匹配的方案，使用第三个方案（索引2，如果存在）
      if (!matched) {
        const defaultIndex = Math.min(2, availableRibbons.value.length - 1);
        const defaultScheme = availableRibbons.value[defaultIndex];
        currentRibbonIndex.value = defaultIndex;
        poiStore.updateColorSettingsLight({
          palette: defaultScheme,
          discreteCount: colorDiscreteCount.value,
        });
      }
    }
  });
});
</script>

<style lang="scss" scoped>
@use '@/assets/styles/mobile-layout-mixin.scss' as *;
.color-panel {
  min-height: calc(100vh - 160px);
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 0px;
  background: #f5f7fa;
}
.dark-bg-switch{
  left:-80px
}
.config-section {
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  overflow: hidden;
}

.section-header {
  padding: 16px 20px;
  background: #fafbfc;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.section-desc {
  font-size: 12px;
  color: #909399;
  margin-left: 12px;
}

.section-content {
  padding: 20px;
}

.color-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.color-item.spaced {
  justify-content: space-between;
}

.label {
  font-size: 14px;
  color: #606266;
  min-width: 100px;
}

.color-preview {
  width: 48px;
  height: 24px;
  border-radius: 6px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  transition: background 0.2s;
}

/* 当前色带展示 */
.ribbon-preview-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.ribbon-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.current-ribbon {
  display: flex;
  gap: 4px;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
}

.ribbon-color-editor-item {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 6px;
}

.ribbon-color-item {
  flex: 1;
  min-width: 28px;
  height: 28px;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

/* 离散设置 */
.discrete-settings {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 20px;
  padding: 16px;
  background: #fafbfc;
  border-radius: 6px;
}

/* 配色方案选择 */
.scheme-selection {
  margin-top: 8px;
}

.scheme-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.scheme-count {
  font-size: 12px;
  color: #909399;
}

.ribbon-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  max-height: 400px;
  overflow-y: auto;
  padding: 4px;
}

.ribbon-scheme-item {
  padding: 12px;
  border: 2px solid #e4e7ed;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
  background: #fff;
}

.ribbon-scheme-item:hover {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);
  transform: translateY(-1px);
}

.ribbon-scheme-item.active {
  border-color: #409eff;
  background: #ecf5ff;
  box-shadow: 0 2px 12px rgba(64, 158, 255, 0.3);
}

.ribbon-scheme-colors {
  display: flex;
  gap: 2px;
  height: 40px;
}

.scheme-color-block {
  flex: 1;
  border-radius: 3px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  min-width: 8px;
}

@include mobile-layout {
  .color-panel {
    min-height: 0;
    height: auto;
    gap: 18px;
    padding: 12px 14px;
  }

  .config-section {
    border-radius: 10px;
    flex-shrink: 0;
    overflow: visible;
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    padding: 14px 16px;
  }

  .section-title {
    font-size: 15px;
    line-height: 1.3;
  }

  .section-desc {
    margin-left: 0;
    line-height: 1.45;
    font-size: 13px;
  }

  .section-content {
    padding: 18px 16px;
  }

  .color-item {
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 8px;
  }

  .color-item .label {
    min-width: 0;
    flex: 1 1 100%;
  }

  .section-content :deep(.el-select),
  .section-content :deep(.el-input-number) {
    width: 100% !important;
    max-width: 100%;
  }

  .ribbon-preview-section {
    margin-bottom: 12px;
  }

  .ribbon-header {
    flex-wrap: wrap;
    gap: 8px;
  }

  .current-ribbon {
    padding: 8px;
  }

  .ribbon-color-item {
    min-width: 0;
    height: 28px;
  }

  .ribbon-color-editor-item {
    gap: 6px;
  }

  .discrete-settings {
    padding: 12px;
    gap: 12px;
  }

  .ribbon-gallery {
    grid-template-columns: 1fr;
    gap: 10px;
    max-height: 280px;
  }

  .ribbon-scheme-item {
    padding: 10px;
  }
}
</style>
