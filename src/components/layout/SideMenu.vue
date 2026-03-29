<template>
  <aside class="side-menu">
    <div class="menu-group menu-group--main">
      <button
        v-for="item in mainMenu"
        :key="item.key"
        type="button"
        class="menu-item"
        :class="{ active: activePanel === item.key }"
        :data-intro-panel="item.key"
        @click="$emit('change-panel', item.key)"
      >
        <el-icon><component :is="item.icon" /></el-icon>
        <span>{{ item.label }}</span>
      </button>
    </div>
    <div class="menu-group footer-group">
      <button class="menu-item ghost" @click="handleShortcutClick">快捷键</button>
      <button class="menu-item ghost" @click="handleHelpClick">帮助</button>
      <button class="menu-item ghost" @click="handleHideClick">隐藏</button>
    </div>
  </aside>
</template>

<script setup>
import { ElMessage } from 'element-plus';

defineProps({
  activePanel: {
    type: String,
    default: 'content',
  },
});

const emit = defineEmits(['change-panel', 'navigate']);

import {
  BrushFilled,
  Collection,
  EditPen,
  Grid,
} from '@element-plus/icons-vue';

const mainMenu = [
  { key: 'content', label: '内容', icon: Collection },
  { key: 'typeface', label: '字体', icon: EditPen },
  { key: 'color', label: '配色', icon: BrushFilled },
  { key: 'algorithm', label: '算法', icon: Grid },
];

const handleShortcutClick = () => {
  ElMessage.info('该功能正在开发中，敬请期待！');
};

const handleHelpClick = () => {
  emit('navigate', 'help');
};

const handleHideClick = () => {
  ElMessage.info('该功能正在开发中，敬请期待！');
};
</script>

<style lang="scss" scoped>
@use '@/assets/styles/mobile-layout-mixin.scss' as *;
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

@include mobile-layout {
  .side-menu {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 300;
    width: 100% !important;
    min-width: 0 !important;
    height: auto;
    flex-direction: row;
    align-items: stretch;
    justify-content: center;
    overflow: hidden;
    padding: 6px 6px calc(6px + env(safe-area-inset-bottom, 0px));
    gap: 0;
    border-right: none;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 -6px 20px rgba(0, 0, 0, 0.18);
  }

  .footer-group {
    display: none !important;
  }

  .menu-group--main {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    width: 100%;
    max-width: 100%;
    gap: 4px;
    align-items: stretch;
  }

  .menu-item {
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 4px;
    max-width: none;
    min-width: 0;
    padding: 8px 4px;
    font-size: 11px;
  }

  .menu-item :deep(.el-icon) {
    font-size: 20px;
  }

  .menu-item.active {
    transform: none;
  }
}
</style>

