<template>
  <div class="table-card">
    <div class="table-toolbar">
      <div class="table-actions">
        <el-tag effect="dark" type="info">
          ({{ poiStore.selectedCount }}/{{ poiStore.totalCount }} 已选择)
        </el-tag>
        <el-button-group class="visible-mode-group">
          <el-button
            size="small"
            :type="poiStore.visibleMode === 'all' ? 'primary' : 'default'"
            @click="poiStore.showAll()"
          >
            显示全部
          </el-button>
          <el-button
            size="small"
            :type="poiStore.visibleMode === 'selected' ? 'primary' : 'default'"
            @click="poiStore.showSelected()"
          >
            显示所选
          </el-button>
        </el-button-group>
        <el-button
          v-if="!isMobile"
          size="small"
          type="success"
          plain
          @click="importDialogVisible = true"
        >
          导入数据
        </el-button>
      </div>
    </div>
    <el-table
      :data="pagedList"
      border
      :row-key="row => row.id"
      :row-class-name="({ row }) => row.selected ? 'selected-row' : ''"
      style="flex: 1 1 auto; min-height: 0;"
    >
      <el-table-column :prop="placeNameProp" :label="placeNameLabel" min-width="120" />
      <el-table-column v-if="showCityColumn" prop="city" label="城市" width="120" />
      <el-table-column prop="rank" :label="valueColumnLabel" width="100" />
    </el-table>
    <div class="table-pagination">
      <el-pagination
        background
        layout="total, prev, pager, next, sizes"
        :page-size="pageSize"
        :current-page="currentPage"
        :page-sizes="[10, 20, 30, 50]"
        :total="poiStore.visibleList.length"
        :pager-count="5"
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </div>
    <ImportDataDialog v-model="importDialogVisible" />
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { usePoiStore } from '@/stores/poiStore';
import { useMobileLayout } from '@/composables/useMobileLayout';
import ImportDataDialog from './ImportDataDialog.vue';

const poiStore = usePoiStore();
const { isMobile } = useMobileLayout();
const importDialogVisible = ref(false);
const currentPage = ref(1);
const pageSize = ref(20);

const pagedList = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return poiStore.visibleList.slice(start, end);
});

/** 默认数据始终显示城市列；CSV 导入且未映射城市列时隐藏 */
const showCityColumn = computed(() => {
  const m = poiStore.importMeta;
  if (m == null) return true;
  return m.hasCityColumn === true;
});

/** 导入后第三列为「数值」，默认数据仍为「排名」 */
const valueColumnLabel = computed(() =>
  poiStore.importMeta ? '数值' : '排名',
);

/** CSV 导入后地名列：仅中文 / 仅英文 / 双语默认中文；网站默认数据仍为「地名」+ name */
const placeNameProp = computed(() => {
  const m = poiStore.importMeta;
  if (!m) return 'name';
  return m.nameLanguageAvailability === 'enOnly' ? 'name_en' : 'name';
});

const placeNameLabel = computed(() => {
  const m = poiStore.importMeta;
  if (!m) return '地名';
  const a = m.nameLanguageAvailability;
  if (a === 'enOnly') return '英文地名';
  if (a === 'zhOnly') return '中文地名';
  return '中文地名';
});

const handleSizeChange = (size) => {
  pageSize.value = size;
  currentPage.value = 1;
};

const handlePageChange = (page) => {
  currentPage.value = page;
};

watch(
  () => poiStore.visibleList.length,
  () => {
    const maxPage = Math.max(1, Math.ceil(poiStore.visibleList.length / pageSize.value));
    if (currentPage.value > maxPage) currentPage.value = maxPage;
  },
);
</script>

<style lang="scss" scoped>
@use '@/assets/styles/mobile-layout-mixin.scss' as *;
.table-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.table-toolbar {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex-shrink: 0;
}

.table-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: nowrap;
}

.table-actions > * {
  flex-shrink: 1;
  min-width: 0;
}

.visible-mode-group :deep(.el-button--primary) {
  font-weight: 600;
}

.table-pagination {
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;
}

:deep(.el-pagination) {
  font-size: 12px;
}

:deep(.el-pagination .el-pagination__sizes) {
  width: 70px;
}

:deep(.el-pagination .el-select) {
  width: 70px;
}

:deep(.el-pagination .el-select .el-input__inner) {
  width: 70px;
  padding: 0 4px;
  font-size: 12px;
}

:deep(.el-pagination .el-pager li) {
  font-size: 12px;
  min-width: 28px;
  height: 28px;
  line-height: 28px;
}

:deep(.el-pagination .btn-prev),
:deep(.el-pagination .btn-next) {
  font-size: 12px;
  min-width: 28px;
  height: 28px;
  line-height: 28px;
}

:deep(.el-pagination .el-pagination__total) {
  font-size: 12px;
  height: 28px;
  line-height: 28px;
}

:deep(.selected-row) {
  background-color: rgba(57, 156, 235, 0.08);
}

:deep(.el-table) {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

:deep(.el-table__body-wrapper) {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
}

@include mobile-layout {
  .table-card {
    height: auto;
    max-height: min(52vh, 480px);
    min-height: 200px;
    flex: 1 1 auto;
  }
}
</style>

