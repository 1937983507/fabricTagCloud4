<template>
  <footer class="footer">
    <div class="footer-content">
      <div class="footer-left">
        <div class="footer-brand">
          <img src="/img/logo.png" alt="Logo" class="footer-logo" />
          <div class="brand-info">
            <h3 class="brand-name">地名标签云</h3>
            <p class="brand-desc">专业的地点可视化平台</p>
          </div>
        </div>
      </div>
      
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
      
      <div class="footer-right">
        <div class="footer-social">
          <p class="social-title">联系我们</p>
          <div class="social-links">
            <a href="https://github.com/1937983507/fabricTagCloud4" target="_blank" class="social-link" title="GitHub">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
              </svg>
            </a>
            <div class="social-link-wrapper">
              <a href="#" class="social-link" title="微信">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                </svg>
              </a>
              <div class="qr-code-popup">
                <img src="/img/vx.png" alt="微信二维码" class="qr-code-img" />
              </div>
            </div>
          </div>
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
  background: #ffffff;
  color: #1f2333;
  padding: 12px 32px;
  margin-top: auto;
  flex-shrink: 0;
  border-top: 1px solid rgba(31, 35, 51, 0.08);
  box-shadow: 0 -2px 8px rgba(31, 35, 51, 0.04);
}

.footer-content {
  max-width: 1400px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 40px;
  align-items: center;
}

.footer-left {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
}

.footer-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 100%;
}

.footer-logo {
  height: 40px;
  object-fit: contain;
}

.brand-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.brand-name {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1f2333;
}

.brand-desc {
  margin: 0;
  font-size: 12px;
  color: #64748b;
}


.footer-main {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 12px;
}

.footer-right {
  display: flex;
  flex-direction: column;
  gap: 20px;
  align-items: flex-end;
}

.footer-links {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
}

.footer-links a {
  color: #64748b;
  text-decoration: none;
  transition: all 0.2s ease;
  padding: 2px 0;
  position: relative;
}

.footer-links a:hover {
  color: #399ceb;
}

.footer-links a::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 0;
  height: 1px;
  background: #399ceb;
  transition: width 0.2s ease;
}

.footer-links a:hover::after {
  width: 100%;
}

.divider {
  color: rgba(31, 35, 51, 0.25);
  font-size: 12px;
}

.footer-copyright {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: nowrap;
  gap: 4px;
  font-size: 12px;
  color: #64748b;
  text-align: center;
  white-space: nowrap;
}

.icp-link {
  color: #64748b;
  text-decoration: none;
  transition: color 0.2s ease;
}

.icp-link:hover {
  color: #399ceb;
}

.footer-social {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: flex-end;
}

.social-title {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  color: #1f2333;
}

.social-links {
  display: flex;
  gap: 12px;
  align-items: center;
}

.social-link-wrapper {
  position: relative;
}

.qr-code-popup {
  position: absolute;
  bottom: 100%;
  right: 0;
  margin-bottom: 12px;
  opacity: 0;
  visibility: hidden;
  transform: translateY(8px);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
  z-index: 1000;
}

.social-link-wrapper:hover .qr-code-popup {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
  pointer-events: auto;
}

.qr-code-img {
  width: 150px;
  height: 150px;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(31, 35, 51, 0.2);
  border: 4px solid #fff;
  background: #fff;
  display: block;
}

.qr-code-popup::after {
  content: '';
  position: absolute;
  bottom: -8px;
  right: 20px;
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-top: 8px solid #fff;
}

.social-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  color: #64748b;
  border-radius: 8px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  background: transparent;
}

.social-link:hover {
  color: #399ceb;
  background-color: rgba(57, 156, 235, 0.08);
  transform: translateY(-2px);
}


@media (max-width: 1200px) {
  .footer-content {
    grid-template-columns: 1fr;
    gap: 24px;
    text-align: center;
  }
  
  .footer-right {
    align-items: center;
  }
  
  .footer-social {
    align-items: center;
  }
}

@media (max-width: 768px) {
  .footer-main {
    gap: 10px;
  }
  
  .footer-copyright {
    font-size: 11px;
  }
  
  .footer-brand {
    justify-content: center;
  }
}
</style>

