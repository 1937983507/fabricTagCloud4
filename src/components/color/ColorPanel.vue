<template>
  <section class="panel-card color-panel">
    <header class="panel-head">
      <div class="toolbar-title">配色方案</div>
      <el-switch
        v-model="localSettings.inverted"
        active-text="颜色翻转"
        @change="applyInvert"
      />
    </header>

    <div class="color-item">
      <span>当前背景颜色：</span>
      <el-color-picker
        v-model="localSettings.background"
        @change="applyBackground"
        show-alpha
      />
      <span class="color-preview" :style="{ background: localSettings.background }"></span>
    </div>

    <el-divider content-position="left">背景方案</el-divider>
    <div class="background-grid">
      <button
        v-for="preset in backgroundPresets"
        :key="preset"
        class="color-chip"
        :class="{ active: localSettings.background === preset }"
        :style="{ background: preset }"
        @click="setBackground(preset)"
      />
    </div>

    <el-divider content-position="left">文字配色</el-divider>
    <div class="color-item spaced">
      <div>颜色离散数量：</div>
      <el-input-number v-model="levelCount" :min="3" :max="7" @change="resizePalette" />
    </div>
    <div class="color-item spaced">
      <div>颜色离散方式：</div>
      <el-select v-model="disperseMethod" placeholder="请选择" style="width: 200px">
        <el-option label="相等间隔" value="equal" />
        <el-option label="分位数" value="quantile" />
        <el-option label="自然间断点(Jenks)" value="jenks" />
        <el-option label="几何间隔" value="geometric" />
        <el-option label="标准差" value="stddev" />
      </el-select>
    </div>

    <div class="palette-grid">
      <div
        v-for="(color, index) in localPalette"
        :key="`${color}-${index}`"
      >
        <span>颜色 {{ index + 1 }}</span>
        <el-color-picker
          v-model="localPalette[index]"
          @change="applyPalette"
        />
        <span class="color-preview small" :style="{ background: color }"></span>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, watch } from 'vue';
import { usePoiStore } from '@/stores/poiStore';

const poiStore = usePoiStore();

const backgroundPresets = [
  '#030712',
  '#0F172A',
  '#111827',
  '#1E293B',
  '#F9FAFB',
  '#F1F5F9',
  '#E2E8F0',
];

const localSettings = ref({ ...poiStore.colorSettings });
const localPalette = ref([...poiStore.colorSettings.palette]);
const levelCount = ref(localPalette.value.length);
const disperseMethod = ref('equal');

watch(
  () => poiStore.colorSettings,
  (settings) => {
    localSettings.value = { ...settings };
    localPalette.value = [...settings.palette];
    levelCount.value = localPalette.value.length;
  },
  { deep: true },
);

const applyBackground = () => {
  poiStore.updateColorSettings({
    background: localSettings.value.background,
  });
};

const setBackground = (preset) => {
  localSettings.value.background = preset;
  applyBackground();
};

const applyPalette = () => {
  poiStore.updateColorSettings({
    palette: [...localPalette.value],
  });
};

const resizePalette = () => {
  const count = levelCount.value;
  if (count > localPalette.value.length) {
    const last = localPalette.value[localPalette.value.length - 1];
    while (localPalette.value.length < count) {
      localPalette.value.push(last);
    }
  } else if (count < localPalette.value.length) {
    localPalette.value.splice(count);
  }
  applyPalette();
};

const applyInvert = () => {
  localPalette.value.reverse();
  poiStore.updateColorSettings({
    inverted: localSettings.value.inverted,
    palette: [...localPalette.value],
  });
};
</script>

<style scoped>
.color-panel {
  min-height: calc(100vh - 160px);
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.color-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.color-item.spaced {
  justify-content: space-between;
}

.color-chip {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  border: 2px solid transparent;
  cursor: pointer;
}

.color-chip.active {
  border-color: #399ceb;
}

.color-preview {
  width: 48px;
  height: 24px;
  border-radius: 6px;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.color-preview.small {
  width: 32px;
}

.background-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(48px, 1fr));
  gap: 12px;
}

.palette-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}
</style>

