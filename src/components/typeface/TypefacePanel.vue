<template>
  <section class="panel-card typeface-panel">
    <!-- 语言选择 -->
    <div class="config-section">
      <div class="section-header">
        <span class="section-title">语言</span>
        <span class="section-desc">选择标签显示的语言</span>
      </div>
      <div class="section-content">
        <el-tooltip
          :disabled="!poiStore.languageSwitchDisabled"
          content="当前数据仅含中文或仅含英文地名，无法切换显示语言"
          placement="top"
        >
          <el-select
            v-model="localSettings.language"
            style="width: 200px"
            :disabled="poiStore.languageSwitchDisabled"
            @change="handleLanguageChange"
          >
            <el-option label="中文" value="zh" />
            <el-option label="English" value="en" />
          </el-select>
        </el-tooltip>
      </div>
    </div>

    <!-- 中心标签显示模式 -->
    <div class="config-section">
      <div class="section-header">
        <span class="section-title">中心标签</span>
        <span class="section-desc">选择中心位置的显示方式</span>
      </div>
      <div class="section-content">
        <el-select
          v-model="localSettings.centerLabelMode"
          style="width: 200px"
          @change="handleCenterLabelModeChange"
        >
          <el-option label="最近地点名" value="nearest" />
          <el-option label="中心位置" value="center" />
        </el-select>
      </div>
    </div>

    <!-- 标签层级设置 -->
    <div class="config-section">
      <div class="section-header">
        <span class="section-title">标签层级</span>
      </div>
      <div class="section-content">
        <div class="level-selector">
          <span class="label">标签级数：</span>
          <el-select
            v-model="localSettings.levelCount"
            style="width: 140px"
            @change="handleLevelChange"
          >
            <el-option
              v-for="count in 5"
              :key="count + 2"
              :label="`${count + 2} 级标签`"
              :value="count + 2"
            />
          </el-select>
        </div>
      </div>
    </div>

    <!-- 字号大小 -->
    <div class="config-section">
      <div class="section-header">
        <span class="section-title">字号大小</span>
        <span class="section-desc">设置各级标签的字体大小</span>
      </div>
      <div class="section-content">
        <div class="font-size-grid">
          <div
            v-for="(label, index) in levelLabels"
            :key="label"
            class="font-size-item"
          >
            <span class="font-size-label">{{ label }}</span>
            <el-input-number
              v-model="localSizes[index]"
              :min="16"
              :max="120"
              :step="2"
              @change="handleSizeChange"
              style="width: 120px"
            />
            <span class="font-size-unit">px</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 字重选择 -->
    <div class="config-section">
      <div class="section-header">
        <span class="section-title">字重选择</span>
        <span class="section-desc">设置标签的字体粗细</span>
      </div>
      <div class="section-content">
        <el-select
          v-model="localSettings.fontWeight"
          style="width: 200px"
          @change="handleWeightChange"
        >
          <el-option label="Thin 100" value="100" />
          <el-option label="Light 300" value="300" />
          <el-option label="Regular 400" value="400" />
          <el-option label="Medium 500" value="500" />
          <el-option label="Semibold 600" value="600" />
          <el-option label="Bold 700" value="700" />
          <el-option label="Extra Bold 800" value="800" />
          <el-option label="Black 900" value="900" />
        </el-select>
      </div>
    </div>

    <!-- 字体库 -->
    <div class="config-section">
      <div class="section-header">
        <span class="section-title">字体库</span>
        <span class="section-desc">选择标签使用的字体</span>
      </div>
      <div class="section-content">
        <div class="font-gallery">
          <button
            v-for="font in filteredFonts"
            :key="font"
            class="font-chip"
            :style="{ fontFamily: font }"
            :class="{ active: poiStore.fontSettings.fontFamily === font }"
            @click="handleFamilyChange(font)"
          >
            <span class="font-name">{{ font }}</span>
            <span 
              v-if="poiStore.fontSettings.fontFamily === font" 
              class="font-active-badge"
            >
              使用中
            </span>
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { usePoiStore } from '@/stores/poiStore';

const poiStore = usePoiStore();

const levelLabels = computed(() =>
  Array.from({ length: poiStore.fontSettings.levelCount }, (_, index) => `第 ${index + 1} 级`),
);

const localSettings = reactive({
  language: poiStore.fontSettings.language || 'zh',
  levelCount: poiStore.fontSettings.levelCount,
  fontWeight: poiStore.fontSettings.fontWeight,
  centerLabelMode: poiStore.fontSettings.centerLabelMode || 'nearest',
});

const localSizes = ref(
  poiStore.fontSettings.fontSizes.slice(0, poiStore.fontSettings.levelCount),
);

// 中文字体列表
const chineseFonts = [
  '等线', '等线 Light', '方正舒体', '方正姚体', '仿宋', '黑体',
  '华文彩云', '华文仿宋', '华文琥珀', '华文楷体', '华文隶书', '华文宋体', 
  '华文细黑', '华文新魏', '华文行楷', '华文中宋', '楷体', '隶书', 
  '宋体', '微软雅黑', '微软雅黑 Light', '新宋体', '幼圆', '思源黑体'
];

// 英文字体列表（参考 tagCloud_voronoi 项目）
const englishFonts = [
  'Arial', 'Inter', 'Times New Roman', 'Courier New', 'Comic Sans MS',
  'Impact', 'Trebuchet MS', 'Palatino', 'Helvetica', 'Lucida Console', 
  'Century Gothic', 'Franklin Gothic', 'Baskerville',
];

// 根据语言过滤字体
const filteredFonts = computed(() => {
  return localSettings.language === 'zh' ? chineseFonts : englishFonts;
});

// 初始化时，如果字体不在对应语言的字体列表中，设置默认字体
const currentLanguage = poiStore.fontSettings.language || 'zh';
const availableFonts = currentLanguage === 'zh' ? chineseFonts : englishFonts;
if (!availableFonts.includes(poiStore.fontSettings.fontFamily)) {
  const defaultFont = currentLanguage === 'zh' ? '等线' : 'Arial';
  poiStore.updateFontLevel({ fontFamily: defaultFont });
}

watch(
  () => poiStore.fontSettings.language,
  (lang) => {
    if (localSettings.language !== lang) localSettings.language = lang;
  },
);

// 监听语言变化，自动设置默认字体
watch(
  () => localSettings.language,
  (newLanguage) => {
    const defaultFont = newLanguage === 'zh' ? '等线' : 'Arial';
    // 如果当前字体不在对应语言的字体列表中，则切换到默认字体
    const availableFonts = newLanguage === 'zh' ? chineseFonts : englishFonts;
    if (!availableFonts.includes(poiStore.fontSettings.fontFamily)) {
      poiStore.updateFontLevel({ fontFamily: defaultFont });
    }
  }
);

// 使用防抖优化响应速度
let levelChangeTimer = null;
const handleLevelChange = () => {
  if (levelChangeTimer) clearTimeout(levelChangeTimer);
  levelChangeTimer = setTimeout(() => {
    localSizes.value = poiStore.fontSettings.fontSizes.slice(0, localSettings.levelCount);
    poiStore.updateFontLevel({
      levelCount: localSettings.levelCount,
      fontSizes: [...poiStore.fontSettings.fontSizes],
    });
  }, 100);
};

let sizeChangeTimer = null;
const handleSizeChange = () => {
  if (sizeChangeTimer) clearTimeout(sizeChangeTimer);
  sizeChangeTimer = setTimeout(() => {
    const merged = [...poiStore.fontSettings.fontSizes];
    for (let i = 0; i < localSizes.value.length; i += 1) {
      merged[i] = localSizes.value[i];
    }
    poiStore.updateFontLevel({
      fontSizes: merged,
    });
  }, 100);
};

const handleWeightChange = () => {
  poiStore.updateFontLevel({
    fontWeight: localSettings.fontWeight,
  });
};

const handleFamilyChange = (font) => {
  poiStore.updateFontLevel({
    fontFamily: font,
  });
};

const handleLanguageChange = () => {
  const newLanguage = localSettings.language;
  const availableFonts = newLanguage === 'zh' ? chineseFonts : englishFonts;
  const defaultFont = newLanguage === 'zh' ? '等线' : 'Arial';
  
  // 如果当前字体不在新语言的字体列表中，则切换到默认字体
  const updatePayload = { language: newLanguage };
  if (!availableFonts.includes(poiStore.fontSettings.fontFamily)) {
    updatePayload.fontFamily = defaultFont;
  }
  
  poiStore.updateFontLevel(updatePayload);
  // 语言变化需要重新编译数据并重绘（TagCloudCanvas.vue 中的 watch 会自动处理）
};

watch(
  () => poiStore.importMeta,
  () => {
    if (!poiStore.languageSwitchDisabled) return;
    const forced = poiStore.importMeta?.nameLanguageAvailability === 'enOnly' ? 'en' : 'zh';
    if (localSettings.language === forced) return;
    localSettings.language = forced;
    handleLanguageChange();
  },
  { deep: true },
);

const handleCenterLabelModeChange = () => {
  poiStore.updateFontLevel({
    centerLabelMode: localSettings.centerLabelMode,
  });
  // 中心标签模式变化需要重新绘制（TagCloudCanvas.vue 中的 watch 会自动处理）
};
</script>

<style lang="scss" scoped>
@use '@/assets/styles/mobile-layout-mixin.scss' as *;
.typeface-panel {
  min-height: calc(100vh - 160px);
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 0px;
  background: #f5f7fa;
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

.level-selector {
  display: flex;
  align-items: center;
  gap: 12px;
}

.label {
  font-size: 14px;
  color: #606266;
  min-width: 80px;
}

.font-size-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.font-size-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.font-size-label {
  min-width: 60px;
  font-size: 14px;
  color: #606266;
}

.font-size-unit {
  font-size: 12px;
  color: #909399;
}

.font-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
  margin-top: 0;
  max-height: 300px;
  overflow-y: auto;
  padding: 4px;
}

.font-chip {
  position: relative;
  border-radius: 8px;
  border: 2px solid #e4e7ed;
  padding: 12px 16px;
  cursor: pointer;
  background: #fff;
  transition: all 0.15s;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.font-chip:hover {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.15);
  transform: translateY(-1px);
}

.font-chip.active {
  border-color: #409eff;
  background: #ecf5ff;
  box-shadow: 0 2px 12px rgba(64, 158, 255, 0.25);
}

.font-name {
  font-size: 14px;
  color: #303133;
  font-weight: 500;
}

.font-active-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  font-size: 10px;
  padding: 2px 6px;
  background: #409eff;
  color: #fff;
  border-radius: 10px;
  font-weight: 500;
}

/* 宽屏：与 App.vue workspace 配合，防止纵向 flex 子项被压扁重叠（不影响 ≤900px） */
@media (min-width: 901px) {
  .typeface-panel {
    height: auto;
    min-height: 0;
  }

  .config-section {
    flex-shrink: 0;
  }
}

@include mobile-layout {
  .typeface-panel {
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

  .section-content :deep(.el-select) {
    width: 100% !important;
    max-width: 100%;
  }

  .level-selector {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .font-size-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .font-size-item {
    flex-wrap: wrap;
  }

  .font-gallery {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    max-height: 260px;
    gap: 8px;
  }

  .font-chip {
    padding: 10px 12px;
  }
}
</style>
