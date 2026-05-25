<template>
  <section class="panel-card content-panel">
    <div class="work-grid">
      <PoiMap ref="poiMapRef" />
      <PoiTable />
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted, defineExpose } from 'vue';
import { usePoiStore } from '@/stores/poiStore';
import PoiMap from './PoiMap.vue';
import PoiTable from './PoiTable.vue';

const poiStore = usePoiStore();
const poiMapRef = ref(null);

onMounted(() => {
  if (!poiStore.poiList.length) {
    poiStore.loadDefaultData();
  }
});

defineExpose({
  relayoutMap() {
    poiMapRef.value?.relayoutMap?.();
  },
});
</script>

<style lang="scss" scoped>
@use '@/assets/styles/mobile-layout-mixin.scss' as *;
.content-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  flex-shrink: 0;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.work-grid {
  display: grid;
  grid-template-rows: 1fr 1fr;
  gap: 20px;
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
  overflow: hidden;
}

.work-grid > * {
  min-height: 0;
  overflow: hidden;
  height: 100%;
}

@include mobile-layout {
  .content-panel {
    padding: 12px;
    min-height: 0;
    overflow: hidden;
  }

  .work-grid {
    display: flex;
    flex-direction: column;
    gap: 14px;
    /* 保持占满 workspace 可滚动区，由内部纵向滚动 */
    flex: 1 1 auto;
    min-height: 0;
    height: 100%;
    overflow-x: hidden;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }

  .work-grid > * {
    flex: 0 0 auto;
    width: 100%;
    min-height: 0;
    height: auto;
    max-height: none;
    overflow: visible;
  }

  /* 表格块：在剩余空间内滚动，勿再 height:100% 叠到地图区 */
  .work-grid > :last-child {
    flex: 1 1 auto;
    min-height: 200px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
}
</style>
