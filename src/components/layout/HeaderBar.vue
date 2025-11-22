<template>
  <header class="header">
    <div class="logo-area">
      <img src="/img/logo.png" alt="Logo" class="logo-img" />
    </div>
    <div class="nav-actions">
      <el-button
        v-for="item in navButtons"
        :key="item.key"
        :data-intro-tutorial="item.key === 'tutorial' ? 'tutorial-btn' : undefined"
        size="small"
        text
        @click="handleNavClick(item.key)"
      >
        {{ item.label }}
      </el-button>
    </div>
    <div class="user-area">
      <a
        href="https://github.com/1937983507/fabricTagCloud4"
        target="_blank"
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
      <el-button type="primary" round>登录 / 注册</el-button>
    </div>
  </header>
</template>

<script setup>
const navButtons = [
  { key: 'home', label: '首页' },
  { key: 'file', label: '文件' },
  { key: 'save', label: '保存' },
  { key: 'upload', label: '上传到云端' },
  { key: 'share', label: '分享' },
  { key: 'help', label: '帮助' },
  { key: 'tutorial', label: '引导教程' },
  { key: 'feedback', label: '意见反馈' },
  { key: 'about', label: '关于我们' },
];

const emit = defineEmits(['navigate', 'start-tutorial']);

const handleNavClick = (key) => {
  if (key === 'tutorial') {
    emit('start-tutorial');
  } else {
    emit('navigate', key);
  }
};
</script>

<style scoped>
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
}

.logo-img {
  height: 48px;
  object-fit: contain;
  transition: transform 0.3s ease;
}

.logo-img:hover {
  transform: scale(1.05);
}

.logo-dot {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: linear-gradient(180deg, #57c6f1, #399ceb);
  color: #fff;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.title {
  margin: 0;
  font-weight: 700;
  font-size: 20px;
}

.subtitle {
  margin: 0;
  font-size: 12px;
  color: #9ca3af;
}

.nav-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 2px;
}

.nav-actions :deep(.el-button) {
  font-size: 14px;
  font-weight: 500;
  height: 100%;
  padding: 0 16px;
  border-radius: 6px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  color: #64748b;
  position: relative;
}

.nav-actions :deep(.el-button:hover) {
  color: #1f2333;
  background-color: rgba(57, 156, 235, 0.08);
  transform: translateY(-1px);
}

.nav-actions :deep(.el-button:active) {
  transform: translateY(0);
}

.user-area {
  display: flex;
  align-items: center;
  gap: 16px;
  height: 100%;
}

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

.github-link:hover {
  color: #399ceb;
  background-color: rgba(57, 156, 235, 0.08);
  transform: translateY(-2px);
}

.user-area :deep(.el-button) {
  height: 40px;
  padding: 0 20px;
  font-weight: 500;
  border-radius: 8px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 4px rgba(57, 156, 235, 0.2);
}

.user-area :deep(.el-button:hover) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(57, 156, 235, 0.3);
}

.user-area :deep(.el-button:active) {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(57, 156, 235, 0.2);
}
</style>

