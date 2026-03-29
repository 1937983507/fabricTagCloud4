<template>
  <header class="header">
    <div class="logo-area">
      <img src="/img/logo.png" alt="Logo" class="logo-img" />
    </div>

    <!-- PC：中间导航文字按钮 + 右侧图标 -->
    <template v-if="!isMobile">
      <div class="nav-actions nav-actions--desktop" data-intro-target="header-nav-pc">
        <el-button
          v-for="item in navButtons"
          :key="item.key"
          size="small"
          text
          @click="handleNavClick(item.key)"
        >
          {{ item.label }}
        </el-button>
      </div>
      <div class="user-area user-area--desktop">
        <a
          v-if="showTutorialIcon"
          href="#"
          class="tutorial-icon-link icon-link"
          title="引导教程"
          data-intro-tutorial="tutorial-btn"
          @click.prevent="handleTutorialClick"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
        </a>
        <a
          href="https://www.mdpi.com/2220-9964/12/9/360"
          target="_blank"
          rel="noopener noreferrer"
          class="icon-link"
          title="论文"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            <path d="M10 7h6" />
            <path d="M10 11h6" />
            <path d="M10 15h4" />
          </svg>
        </a>
        <a
          href="https://github.com/1937983507/fabricTagCloud4"
          target="_blank"
          rel="noopener noreferrer"
          class="github-link"
          title="GitHub"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path
              d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"
            />
          </svg>
        </a>
        <el-button type="primary" round @click="handleLoginClick">登录 / 注册</el-button>
      </div>
    </template>

    <!-- 移动端：菜单图标 + 抽屉集成全部入口 -->
    <template v-else>
      <div class="header-right">
        <div class="nav-actions nav-actions--mobile">
          <el-button
            circle
            text
            class="nav-menu-trigger"
            data-intro-target="header-nav-menu"
            aria-label="打开菜单"
            @click="navDrawerOpen = true"
          >
            <el-icon class="nav-menu-trigger__icon"><MenuIcon /></el-icon>
          </el-button>
          <el-drawer
            v-model="navDrawerOpen"
            direction="rtl"
            size="min(88vw, 300px)"
            title="网站导航"
            class="header-nav-drawer"
          >
            <nav class="nav-drawer-list" aria-label="网站导航">
              <button
                v-for="item in navButtons"
                :key="item.key"
                type="button"
                class="nav-drawer-link"
                @click="onNavDrawerPick(item.key)"
              >
                {{ item.label }}
              </button>
              <div class="nav-drawer-divider" role="presentation" />
              <button
                v-if="showTutorialIcon"
                type="button"
                class="nav-drawer-link"
                data-intro-tutorial="tutorial-btn"
                @click="onDrawerTutorial"
              >
                引导教程
              </button>
              <a
                href="https://www.mdpi.com/2220-9964/12/9/360"
                target="_blank"
                rel="noopener noreferrer"
                class="nav-drawer-link nav-drawer-link--anchor"
                @click="navDrawerOpen = false"
              >
                论文（MDPI）
              </a>
              <a
                href="https://github.com/1937983507/fabricTagCloud4"
                target="_blank"
                rel="noopener noreferrer"
                class="nav-drawer-link nav-drawer-link--anchor"
                @click="navDrawerOpen = false"
              >
                GitHub 开源仓库
              </a>
            </nav>
          </el-drawer>
        </div>
        <div class="user-area user-area--mobile">
          <el-button type="primary" round @click="handleLoginClick">登录 / 注册</el-button>
        </div>
      </div>
    </template>
  </header>
</template>

<script setup>
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { Menu as MenuIcon } from '@element-plus/icons-vue';
import { useMobileLayout } from '@/composables/useMobileLayout';

defineProps({
  showTutorialIcon: {
    type: Boolean,
    default: true,
  },
});

const { isMobile } = useMobileLayout();

const navButtons = [
  { key: 'home', label: '首页' },
  { key: 'help', label: '帮助' },
  { key: 'feedback', label: '意见反馈' },
  { key: 'about', label: '关于我们' },
];

const navDrawerOpen = ref(false);

const emit = defineEmits(['navigate', 'start-tutorial']);

const handleNavClick = (key) => {
  emit('navigate', key);
};

const onNavDrawerPick = (key) => {
  navDrawerOpen.value = false;
  handleNavClick(key);
};

const handleTutorialClick = () => {
  emit('start-tutorial');
};

const onDrawerTutorial = () => {
  navDrawerOpen.value = false;
  emit('start-tutorial');
};

const handleLoginClick = () => {
  ElMessage.info('该功能正在开发中，敬请期待！');
};
</script>

<style lang="scss" scoped>
@use '@/assets/styles/mobile-layout-mixin.scss' as *;
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  height: 64px;
  background: linear-gradient(180deg, #ffffff 0%, #fafbfc 100%);
  box-shadow: 0 2px 8px rgba(31, 35, 51, 0.06), 0 1px 2px rgba(31, 35, 51, 0.04);
  border-bottom: 1px solid rgba(31, 35, 51, 0.06);
  flex-shrink: 0;
  position: relative;
  z-index: 100;
}

.logo-area {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
  min-width: 0;
}

.logo-img {
  height: 48px;
  object-fit: contain;
  transition: transform 0.3s ease;
}

.logo-img:hover {
  transform: scale(1.05);
}

/* —— PC 中间导航 —— */
.nav-actions--desktop {
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  gap: 2px;
  height: 100%;
}

.nav-actions--desktop :deep(.el-button) {
  font-size: 14px;
  font-weight: 500;
  height: auto;
  min-height: 36px;
  padding: 0 16px;
  border-radius: 6px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  color: #64748b;
  position: relative;
}

.nav-actions--desktop :deep(.el-button:hover) {
  color: #1f2333;
  background-color: rgba(57, 156, 235, 0.08);
  transform: translateY(-1px);
}

.nav-actions--desktop :deep(.el-button:active) {
  transform: translateY(0);
}

/* —— PC 右侧 —— */
.user-area--desktop {
  display: flex;
  align-items: center;
  gap: 16px;
  height: 100%;
  flex-shrink: 0;
}

.icon-link,
.github-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  color: #64748b;
  text-decoration: none;
  border-radius: 8px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  background: transparent;
}

.icon-link:hover,
.github-link:hover {
  color: #399ceb;
  background-color: rgba(57, 156, 235, 0.08);
  transform: translateY(-2px);
}

.user-area--desktop :deep(.el-button) {
  height: 40px;
  padding: 0 20px;
  font-weight: 500;
  border-radius: 8px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 4px rgba(57, 156, 235, 0.2);
}

.user-area--desktop :deep(.el-button:hover) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(57, 156, 235, 0.3);
}

.user-area--desktop :deep(.el-button:active) {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(57, 156, 235, 0.2);
}

/* —— 移动端：右侧菜单 —— */
.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
  flex-shrink: 0;
  padding-right: 6px;
}

.nav-actions--mobile {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  height: 100%;
  gap: 2px;
}

.nav-actions--mobile :deep(.nav-menu-trigger.el-button) {
  height: 40px;
  min-height: 40px;
  padding: 0;
  flex-shrink: 0;
}

.nav-menu-trigger {
  width: 40px;
  height: 40px;
  padding: 0;
  color: #475569;
}

.nav-menu-trigger:hover {
  color: #399ceb;
  background: rgba(57, 156, 235, 0.1) !important;
}

.nav-menu-trigger__icon {
  font-size: 22px;
}

.user-area--mobile :deep(.el-button--primary) {
  display: none;
}

.nav-drawer-divider {
  height: 1px;
  margin: 12px 0;
  background: rgba(31, 35, 51, 0.08);
  border: none;
}

.nav-drawer-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 4px 0 12px;
}

.nav-drawer-link {
  display: block;
  width: 100%;
  margin: 0;
  padding: 14px 16px;
  border: none;
  border-radius: 10px;
  background: transparent;
  text-align: left;
  font-size: 15px;
  font-weight: 500;
  color: #1f2333;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.nav-drawer-link:hover {
  background: rgba(57, 156, 235, 0.08);
  color: #399ceb;
}

.nav-drawer-link:active {
  background: rgba(57, 156, 235, 0.14);
}

.nav-drawer-link--anchor {
  text-decoration: none;
  color: #1f2333;
  box-sizing: border-box;
}

.nav-drawer-link--anchor:hover {
  color: #399ceb;
}

@include mobile-layout {
  .header {
    padding: 0 8px 0 12px;
    height: 56px;
  }

  .logo-img {
    height: 40px;
  }
}
</style>
