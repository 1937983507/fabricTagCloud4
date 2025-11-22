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
  background: linear-gradient(180deg, #0f1424 0%, #1a1e2e 100%);
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  min-height: 0;
  overflow: hidden;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
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
  gap: 8px;
  padding: 12px 10px;
  border-radius: 10px;
  background: transparent;
  color: rgba(255, 255, 255, 0.7);
  border: none;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  min-width: 0;
  max-width: 92px;
  position: relative;
  overflow: hidden;
}

.menu-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 0;
  background: linear-gradient(180deg, #399ceb, #57c6f1);
  border-radius: 0 3px 3px 0;
  transition: height 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.menu-item:hover {
  background: rgba(57, 156, 235, 0.1);
  color: rgba(255, 255, 255, 0.9);
  transform: translateX(2px);
}

.menu-item:hover::before {
  height: 60%;
}

.menu-item :deep(.el-icon) {
  font-size: 20px;
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.menu-item:hover :deep(.el-icon) {
  transform: scale(1.1);
}

.menu-item.active {
  background: linear-gradient(90deg, #399ceb, #57c6f1);
  color: #fff;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(57, 156, 235, 0.3);
}

.menu-item.active::before {
  height: 100%;
  width: 4px;
}

.menu-item.ghost {
  justify-content: center;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  padding: 8px;
}

.menu-item.ghost:hover {
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.7);
}
.footer-group {
  margin-top: auto;
  flex-direction: column;
  gap: 12px;
}
</style>

