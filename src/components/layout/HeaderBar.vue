<template>
  <header class="header">
    <div class="logo-area">
      <img src="/img/logo.png" alt="Logo" class="logo-img" />
    </div>
    <div class="nav-actions">
      <el-button
        v-for="item in navButtons"
        :key="item.key"
        size="small"
        text
        @click="$emit('navigate', item.key)"
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
  { key: 'feedback', label: '意见反馈' },
  { key: 'about', label: '关于我们' },
];
</script>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 32px;
  height: 56px;
  background: #fff;
  box-shadow: 0 8px 30px rgba(31, 35, 51, 0.08);
  flex-shrink: 0;
}

.logo-area {
  display: flex;
  align-items: center;
  gap: 16px;
}

.logo-img {
  /* width: 50px; */
  height: 50px;
  object-fit: contain;
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
  gap: 4px;
}

.nav-actions :deep(.el-button) {
  font-size: 15px;
  font-weight: 500;
}

.user-area {
  display: flex;
  align-items: center;
  gap: 12px;
}

.github-link {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1f2333;
  text-decoration: none;
  transition: color 0.2s;
}

.github-link:hover {
  color: #399ceb;
}
</style>

