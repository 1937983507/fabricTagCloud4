<template>
  <div class="table-card">
    <div class="table-toolbar">
      <div class="table-actions">
        <el-button @click="poiStore.toggleEditMode">
          {{ poiStore.isEditable ? '锁定数据' : '编辑数据' }}
        </el-button>
        <el-tag effect="dark" type="info">
          ({{ poiStore.selectedCount }}/{{ poiStore.totalCount }} 已选择)
        </el-tag>
        <el-button-group>
          <el-button size="small" @click="poiStore.showAll()">显示全部</el-button>
          <el-button size="small" @click="poiStore.showSelected()">显示所选</el-button>
        </el-button-group>
        <el-tooltip content="切换全选 / 清空">
          <el-button size="small" @click="poiStore.toggleBulkSelect">
            <el-icon><RefreshRight /></el-icon>
          </el-button>
        </el-tooltip>
        <el-tooltip content="删除所选行">
          <el-button
            size="small"
            type="danger"
            plain
            :disabled="!poiStore.selectedCount"
            @click="poiStore.removeSelected"
          >
            <el-icon><Delete /></el-icon>
          </el-button>
        </el-tooltip>
      </div>
    </div>
    <el-table
      :data="pagedList"
      border
      :row-key="row => row.id"
      :default-selection="defaultSelection"
      @selection-change="handleSelection"
      :row-class-name="({ row }) => row.selected ? 'selected-row' : ''"
      style="flex: 1 1 auto; min-height: 0;"
    >
      <el-table-column type="selection" width="48" reserve-selection />
      <el-table-column prop="name" label="地名" min-width="120">
        <template #default="{ row }">
          <el-input
            v-if="poiStore.isEditable"
            v-model="row.name"
            @change="poiStore.updatePoi(row)"
          />
          <span v-else>{{ row.name }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="city" label="城市" width="120">
        <template #default="{ row }">
          <el-input
            v-if="poiStore.isEditable"
            v-model="row.city"
            @change="poiStore.updatePoi(row)"
          />
          <span v-else>{{ row.city }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="rank" label="排名" width="100">
        <template #default="{ row }">
          <el-input-number
            v-if="poiStore.isEditable"
            v-model="row.rank"
            :min="1"
            :max="999"
            @change="poiStore.updatePoi(row)"
          />
          <span v-else>{{ row.rank }}</span>
        </template>
      </el-table-column>
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
  </div>
</template>

<script setup>
import {
  Delete,
  RefreshRight,
} from '@element-plus/icons-vue';
import { computed, ref, watch } from 'vue';
import { usePoiStore } from '@/stores/poiStore';

const poiStore = usePoiStore();
const currentPage = ref(1);
const pageSize = ref(20);

const pagedList = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return poiStore.visibleList.slice(start, end);
});

const defaultSelection = computed(() =>
  pagedList.value.filter((row) => row.selected),
);

const handleSelection = (rows) => {
  poiStore.applySelection(rows.map((r) => r.id));
};

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

<style scoped>
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
</style>

