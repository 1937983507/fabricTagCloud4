<template>
  <div class="feedback-page">
    <div class="feedback-container">
      <div class="page-header">
        <h1 class="page-title">意见反馈</h1>
        <p class="page-subtitle">我们重视您的每一个建议和反馈</p>
      </div>

      <div class="contact-info-section">
        <div class="contact-card">
          <div class="card-header">
            <div class="icon-wrapper wechat-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
              </svg>
            </div>
            <div class="method-info">
              <h3 class="method-title">微信联系</h3>
              <p class="method-desc">扫码添加客服微信，即时沟通</p>
            </div>
          </div>
          <div class="card-content">
            <div class="qr-wrapper">
              <img src="/img/vx.png" alt="客服微信二维码" class="wechat-qr" />
              <div class="qr-overlay">
                <div class="qr-tips">长按识别二维码</div>
              </div>
            </div>
            <div class="contact-number">
              <span class="number-label">微信号：</span>
              <span class="number-value">13859211947</span>
              <button class="copy-btn" @click="copyWechat" title="复制微信号">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div class="contact-card">
          <div class="card-header">
            <div class="icon-wrapper email-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>
            <div class="method-info">
              <h3 class="method-title">邮箱联系</h3>
              <p class="method-desc">发送邮件至客服邮箱，详细描述您的问题</p>
            </div>
          </div>
          <div class="card-content">
            <div class="email-wrapper">
              <div class="email-address">
                <span class="email-label">客服邮箱：</span>
                <span class="email-value">1937983507@qq.com</span>
                <button class="copy-btn" @click="copyEmail" title="复制邮箱">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                </button>
              </div>
              <a href="mailto:1937983507@qq.com" class="email-link">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
                立即发送邮件
              </a>
            </div>
          </div>
        </div>

        <div class="response-info">
          <div class="info-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <p class="info-text">
            <strong>响应时间：</strong>我们将在 <span class="highlight">24 小时内</span> 给予答复，感谢您的使用与支持。
          </p>
        </div>
      </div>
    </div>
    <FooterBar class="feedback-footer" />
  </div>
</template>

<script setup>
import { ElMessage } from 'element-plus';
import FooterBar from '@/components/layout/FooterBar.vue';

const copyWechat = async () => {
  try {
    await navigator.clipboard.writeText('13859211947');
    ElMessage.success('微信号已复制到剪贴板');
  } catch (err) {
    ElMessage.error('复制失败，请手动复制');
  }
};

const copyEmail = async () => {
  try {
    await navigator.clipboard.writeText('1937983507@qq.com');
    ElMessage.success('邮箱地址已复制到剪贴板');
  } catch (err) {
    ElMessage.error('复制失败，请手动复制');
  }
};
</script>

<style scoped lang="scss">
.feedback-page {
  width: 100%;
  height: calc(100vh - 64px);
  background: linear-gradient(180deg, #f7f9fc 0%, #ffffff 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: rgba(31, 35, 51, 0.2) transparent;
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(31, 35, 51, 0.2);
    border-radius: 4px;
    
    &:hover {
      background: rgba(31, 35, 51, 0.3);
    }
  }
}

.feedback-container {
  max-width: 900px;
  width: 100%;
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 60px 20px 40px;
  min-height: min-content;
}

.page-header {
  text-align: center;
  margin-bottom: 48px;
}

.page-title {
  font-size: 36px;
  font-weight: 700;
  color: #1f2333;
  margin: 0 0 12px 0;
  background: linear-gradient(180deg, #1f2333 0%, #399ceb 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.page-subtitle {
  font-size: 16px;
  color: #64748b;
  margin: 0;
  font-weight: 400;
}

.contact-info-section {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.contact-card {
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(31, 35, 51, 0.08);
  border: 1px solid rgba(31, 35, 51, 0.08);
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  &:hover {
    box-shadow: 0 8px 24px rgba(31, 35, 51, 0.12);
    transform: translateY(-2px);
  }
}

.card-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px 24px 20px;
  border-bottom: 1px solid rgba(31, 35, 51, 0.08);
  background: linear-gradient(180deg, #fafbfc 0%, #ffffff 100%);
}

.icon-wrapper {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  svg {
    width: 28px;
    height: 28px;
  }
}

.wechat-icon {
  background: linear-gradient(180deg, #07c160, #06ad56);
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(7, 193, 96, 0.3);
  
  &:hover {
    transform: scale(1.05);
    box-shadow: 0 6px 16px rgba(7, 193, 96, 0.4);
  }
}

.email-icon {
  background: linear-gradient(180deg, #399ceb, #2d8cd9);
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(57, 156, 235, 0.3);
  
  &:hover {
    transform: scale(1.05);
    box-shadow: 0 6px 16px rgba(57, 156, 235, 0.4);
  }
}

.method-info {
  flex: 1;
}

.method-title {
  font-size: 20px;
  font-weight: 600;
  color: #1f2333;
  margin: 0 0 6px 0;
}

.method-desc {
  font-size: 14px;
  color: #64748b;
  margin: 0;
  line-height: 1.5;
}

.card-content {
  padding: 24px;
}

.qr-wrapper {
  position: relative;
  display: inline-block;
  margin-bottom: 20px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(31, 35, 51, 0.1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  &:hover {
    box-shadow: 0 8px 24px rgba(31, 35, 51, 0.15);
    transform: scale(1.02);
  }
  
  &:hover .qr-overlay {
    opacity: 1;
  }
}

.wechat-qr {
  display: block;
  width: 220px;
  height: 220px;
  object-fit: contain;
  background: #ffffff;
}

.qr-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
  border-radius: 12px;
}

.qr-tips {
  color: #ffffff;
  font-size: 14px;
  font-weight: 500;
  text-align: center;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  backdrop-filter: blur(4px);
}

.contact-number {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: linear-gradient(180deg, #f7f9fc 0%, #ffffff 100%);
  border-radius: 12px;
  border: 1px solid rgba(31, 35, 51, 0.08);
}

.number-label,
.email-label {
  font-size: 14px;
  color: #64748b;
  font-weight: 500;
}

.number-value,
.email-value {
  font-size: 16px;
  color: #1f2333;
  font-weight: 600;
  font-family: 'Courier New', monospace;
  flex: 1;
}

.copy-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: rgba(57, 156, 235, 0.1);
  color: #399ceb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  
  &:hover {
    background: rgba(57, 156, 235, 0.2);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(57, 156, 235, 0.2);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  svg {
    width: 16px;
    height: 16px;
  }
}

.email-wrapper {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.email-address {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: linear-gradient(180deg, #f7f9fc 0%, #ffffff 100%);
  border-radius: 12px;
  border: 1px solid rgba(31, 35, 51, 0.08);
}

.email-link {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 24px;
  background: linear-gradient(180deg, #57c6f1, #399ceb);
  color: #ffffff;
  border-radius: 12px;
  text-decoration: none;
  font-weight: 500;
  font-size: 15px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(57, 156, 235, 0.3);
  
  &:hover {
    background: linear-gradient(180deg, #399ceb, #2d8cd9);
    box-shadow: 0 6px 16px rgba(57, 156, 235, 0.4);
    transform: translateY(-2px);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  svg {
    width: 18px;
    height: 18px;
  }
}

.response-info {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 24px;
  background: linear-gradient(135deg, rgba(57, 156, 235, 0.08) 0%, rgba(87, 198, 241, 0.08) 100%);
  border-radius: 16px;
  border: 1px solid rgba(57, 156, 235, 0.2);
  margin-top: 8px;
}

.info-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(180deg, #57c6f1, #399ceb);
  color: #ffffff;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(57, 156, 235, 0.3);
  
  svg {
    width: 20px;
    height: 20px;
  }
}

.info-text {
  margin: 0;
  font-size: 15px;
  color: #1f2333;
  line-height: 1.7;
  flex: 1;
  
  strong {
    color: #1f2333;
    font-weight: 600;
  }
}

.highlight {
  color: #399ceb;
  font-weight: 600;
  background: linear-gradient(180deg, #57c6f1, #399ceb);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.feedback-footer {
  width: 100%;
  flex-shrink: 0;
  margin-top: 0;
}

// 响应式设计
@media (max-width: 768px) {
  .feedback-page {
    padding: 40px 16px 32px;
  }

  .page-title {
    font-size: 28px;
  }

  .page-subtitle {
    font-size: 14px;
  }

  .contact-card {
    border-radius: 12px;
  }

  .card-header {
    padding: 20px;
    flex-direction: column;
    text-align: center;
  }

  .icon-wrapper {
    width: 48px;
    height: 48px;
    
    svg {
      width: 24px;
      height: 24px;
    }
  }

  .method-title {
    font-size: 18px;
  }

  .card-content {
    padding: 20px;
  }

  .wechat-qr {
    width: 180px;
    height: 180px;
  }

  .contact-number,
  .email-address {
    flex-wrap: wrap;
    padding: 12px;
  }

  .email-link {
    padding: 12px 20px;
    font-size: 14px;
  }

  .response-info {
    padding: 20px;
    flex-direction: column;
    text-align: center;
  }
}
</style>
