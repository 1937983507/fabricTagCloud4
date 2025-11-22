<template>
  <section class="panel-card typeface-panel">
    <header class="panel-head">
      <div class="toolbar-title">字体样式</div>
      <el-select
        v-model="localSettings.levelCount"
        style="width: 140px"
        @change="applyLevelChange"
      >
        <el-option
          v-for="count in 5"
          :key="count + 2"
          :label="`${count + 2} 级标签`"
          :value="count + 2"
        />
      </el-select>
    </header>

    <el-divider content-position="left">字号大小</el-divider>
    <div class="font-size-grid">
      <div
        v-for="(label, index) in levelLabels"
        :key="label"
        class="font-size-item"
      >
        <span>{{ label }}</span>
        <el-input-number
          v-model="localSizes[index]"
          :min="16"
          :max="120"
          @change="applySizeChange"
        />
      </div>
    </div>

    <el-divider content-position="left">字重选择</el-divider>
    <el-select
      v-model="localSettings.fontWeight"
      style="width: 180px"
      @change="applyWeight"
    >
      <el-option label="Light 300" value="300" />
      <el-option label="Regular 400" value="400" />
      <el-option label="Medium 500" value="500" />
      <el-option label="Semibold 600" value="600" />
      <el-option label="Bold 700" value="700" />
      <el-option label="Black 900" value="900" />
    </el-select>

    <el-divider content-position="left">字体库</el-divider>
    <el-tabs v-model="activeFontTab" stretch>
      <el-tab-pane
        v-for="group in fontGroups"
        :key="group.key"
        :label="group.label"
        :name="group.key"
      >
        <div class="font-gallery">
          <button
            v-for="font in group.fonts"
            :key="font"
            class="font-chip"
            :style="{ fontFamily: font }"
            :class="{ active: poiStore.fontSettings.fontFamily === font }"
            @click="applyFamily(font)"
          >
            {{ font }}
          </button>
        </div>
      </el-tab-pane>
    </el-tabs>
  </section>
</template>

<script setup>
import { computed, reactive, ref } from 'vue';
import { usePoiStore } from '@/stores/poiStore';

const poiStore = usePoiStore();
const activeFontTab = ref('cn');

const levelLabels = computed(() =>
  Array.from({ length: poiStore.fontSettings.levelCount }, (_, index) => `第 ${index + 1} 级`),
);

const localSettings = reactive({
  levelCount: poiStore.fontSettings.levelCount,
  fontWeight: poiStore.fontSettings.fontWeight,
});

const localSizes = ref(
  poiStore.fontSettings.fontSizes.slice(0, poiStore.fontSettings.levelCount),
);

const fontGroups = [
  {
    key: 'cn',
    label: '中文',
    fonts: ['Source Han Sans', '思源黑体', '等线', '微软雅黑'],
  },
  {
    key: 'en',
    label: '英文',
    fonts: ['Inter', 'Montserrat', 'Roboto', 'Lato'],
  },
  { key: 'other', label: '其他', fonts: ['Cormorant Garamond', 'Playfair Display'] },
  { key: 'custom', label: '自定义', fonts: ['LXGW WenKai Screen', 'ZCOOL KuaiLe'] },
];

const applyLevelChange = () => {
  localSizes.value = poiStore.fontSettings.fontSizes.slice(0, localSettings.levelCount);
  poiStore.updateFontLevel({
    levelCount: localSettings.levelCount,
    fontSizes: [...poiStore.fontSettings.fontSizes],
  });
};

const applySizeChange = () => {
  const merged = [...poiStore.fontSettings.fontSizes];
  for (let i = 0; i < localSizes.value.length; i += 1) {
    merged[i] = localSizes.value[i];
  }
  poiStore.updateFontLevel({
    fontSizes: merged,
  });
};

const applyWeight = () => {
  poiStore.updateFontLevel({
    fontWeight: localSettings.fontWeight,
  });
};

const applyFamily = (font) => {
  poiStore.updateFontLevel({
    fontFamily: font,
  });
};
</script>

<style scoped>
.typeface-panel {
  min-height: calc(100vh - 160px);
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.font-size-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
}

.font-size-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.font-gallery {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 12px;
}

.font-chip {
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  padding: 8px 16px;
  cursor: pointer;
  background: #f7f8fc;
}

.font-chip.active {
  border-color: #399ceb;
  background: rgba(57, 156, 235, 0.15);
}
</style>

