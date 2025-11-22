<template>
  <aside class="side-menu">
    <div class="menu-group">
      <button
        v-for="item in mainMenu"
        :key="item.key"
        class="menu-item"
        :class="{ active: activePanel === item.key }"
        @click="$emit('change-panel', item.key)"
      >
        <el-icon><component :is="item.icon" /></el-icon>
        <span>{{ item.label }}</span>
      </button>
    </div>
    <div class="menu-group footer-group">
      <button class="menu-item ghost">快捷键</button>
      <button class="menu-item ghost">帮助</button>
      <button class="menu-item ghost">隐藏</button>
    </div>
  </aside>
</template>

<script setup>
defineProps({
  activePanel: {
    type: String,
    default: 'content',
  },
});

import {
  BrushFilled,
  Collection,
  EditPen,
} from '@element-plus/icons-vue';

const mainMenu = [
  { key: 'content', label: '内容', icon: Collection },
  { key: 'typeface', label: '字体', icon: EditPen },
  { key: 'color', label: '配色', icon: BrushFilled },
];
</script>

<style scoped>
.side-menu {
  width: 108px;
  min-width: 108px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
  padding: 24px 8px 20px 8px;
  background: #101424;
  min-height: 0;
  overflow: hidden;
}

.menu-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.menu-item {
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;
  gap: 6px;
  padding: 8px 8px;
  border-radius: 8px;
  background: transparent;
  color: #f3f5ff;
  border: none;
  font-size: 15px;
  cursor: pointer;
  transition: .18s;
  min-width: 0;
  max-width: 92px;
}

.menu-item :deep(.el-icon) {
  font-size: 18px;
}

.menu-item.active {
  background: linear-gradient(90deg, #399ceb, #57c6f1);
  color: #fff;
  font-weight: 600;
}
.menu-item.ghost {
  justify-content: center;
  font-size: 13px;
  color: #9ca3af;
}
.footer-group {
  margin-top: auto;
  flex-direction: column;
  gap: 12px;
}
</style>

