<template>
  <section class="panel-card content-panel">
    <div class="work-grid">
      <PoiMap />
      <PoiTable />
    </div>
  </section>
</template>

<script setup>
import { onMounted } from 'vue';
import { usePoiStore } from '@/stores/poiStore';
import PoiMap from './PoiMap.vue';
import PoiTable from './PoiTable.vue';

const poiStore = usePoiStore();

onMounted(() => {
  if (!poiStore.poiList.length) {
    poiStore.loadDefaultData();
  }
});
</script>

<style scoped>
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
</style>

