<template>
  <footer class="footer">
    <div class="footer-content">
      <div class="footer-main">
        <div class="footer-links">
          <a href="#home">首页</a>
          <span class="divider">|</span>
          <a href="#help">帮助</a>
          <span class="divider">|</span>
          <a href="#feedback">意见反馈</a>
          <span class="divider">|</span>
          <a href="#about">关于我们</a>
        </div>
        <div class="footer-copyright">
          <span>Copyright © 2024 地名标签云 hubutagcloud.cn All Rights Reserved. 备案号:</span>
          <a href="https://beian.miit.gov.cn/" target="_blank" class="icp-link">鄂ICP备2024043287号-1</a>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup>
// Footer component
</script>

<style scoped>
.footer {
  background: linear-gradient(180deg, #1a1e2e 0%, #1f2333 100%);
  color: #fff;
  padding: 12px 32px;
  margin-top: auto;
  flex-shrink: 0;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.footer-content {
  max-width: 1400px;
  margin: 0 auto;
}

.footer-main {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 12px;
}

.footer-links {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
}

.footer-links a {
  color: rgba(255, 255, 255, 0.75);
  text-decoration: none;
  transition: all 0.2s ease;
  padding: 2px 0;
  position: relative;
}

.footer-links a:hover {
  color: #57c6f1;
}

.footer-links a::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 0;
  height: 1px;
  background: #57c6f1;
  transition: width 0.2s ease;
}

.footer-links a:hover::after {
  width: 100%;
}

.divider {
  color: rgba(255, 255, 255, 0.25);
  font-size: 12px;
}

.footer-copyright {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 4px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.65);
  text-align: center;
}

.icp-link {
  color: rgba(255, 255, 255, 0.65);
  text-decoration: none;
  transition: color 0.2s ease;
}

.icp-link:hover {
  color: #57c6f1;
}

@media (max-width: 768px) {
  .footer-main {
    gap: 10px;
  }
  
  .footer-copyright {
    font-size: 11px;
  }
}
</style>

