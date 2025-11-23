<template>
  <div class="help-page" ref="helpPageRef">
    <div class="container">
      <!-- 左侧导航 -->
      <div class="sidebar sidebar-left">
        <h3>用户手册</h3>
        <ul>
          <li v-for="item in navItems" :key="item.id">
            <a
              :href="`#${item.id}`"
              :class="{ active: activeNavId === item.id }"
              @click.prevent="handleNavClick(item.id)"
            >
              {{ item.title }}
            </a>
            <ul v-if="item.children && item.children.length > 0">
              <li v-for="child in item.children" :key="child.id">
                <a
                  :href="`#${child.id}`"
                  :class="{ active: activeNavId === child.id }"
                  @click.prevent="handleNavClick(child.id)"
                >
                  {{ child.title }}
                </a>
              </li>
            </ul>
          </li>
        </ul>
      </div>

      <!-- 主要内容 -->
      <div class="main-content">
        <div class="main-content-pages" ref="contentRef">
          <div
            v-for="section in sections"
            :key="section.id"
            :id="section.id"
            class="main-content-page"
            :style="{ display: activeSectionId === section.id ? 'block' : 'none' }"
          >
            <div class="page-title" v-if="section.title">
              <h1>{{ section.title }}</h1>
              <span v-if="section.updateTime">最后更新时间：{{ section.updateTime }}</span>
            </div>
            <div
              class="markdown-content"
              v-html="section.content"
              @click="handleImageClick"
            ></div>
          </div>
        </div>
      </div>

      <!-- 右侧栏目 -->
      <div class="sidebar sidebar-right">

        <h3>本页目录</h3>
        <ul id="aContent">
          <li v-for="item in currentToc" :key="item.id">
            <a
              :href="`#${item.id}`"
              :class="{ active: activeTocId === item.id }"
              @click.prevent="scrollToSection(item.id)"
            >
              {{ item.title }}
            </a>
          </li>
        </ul>
      </div>
    </div>
    <FooterBar class="help-footer" @navigate="handleNavigate" />
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed, watch, nextTick } from 'vue';
import { marked } from 'marked';
import HELP_MD from '../../../HELP.md?raw';
import FooterBar from '@/components/layout/FooterBar.vue';

const emit = defineEmits(['navigate']);

const handleNavigate = (route) => {
  emit('navigate', route);
};

// 导航项配置
const navItems = ref([
  { id: 'introduction', title: '概述' },
  { id: 'getting-started', title: '快速上手' },
  {
    id: 'primer',
    title: '入门教程',
    children: [
      { id: 'mapDisplay', title: '地图显示模块' },
      { id: 'dataManagement', title: '数据管理模块' },
      { id: 'tagCloudGeneration', title: '标签云生成模块' },
      { id: 'fontChange', title: '字体交互模块' },
      { id: 'colourChange', title: '配色交互模块' },
      { id: 'remainingInteractive', title: '其余交互功能' },
    ],
  },
  { id: 'commonProblems', title: '常见问题' },
  { id: 'updateLog', title: '更新日志' },
  { id: 'relatedDownloads', title: '相关下载' },
  { id: 'video', title: '视频专区' },
]);

const activeNavId = ref('introduction');
const activeSectionId = ref('introduction');
const sections = ref([]);
const contentRef = ref(null);
const helpPageRef = ref(null);
const currentToc = ref([]);
const activeTocId = ref('');
const showFooter = ref(false);

// 反馈相关
const rating = ref(0);
const hoverRating = ref(0);
const showFeedbackBad = ref(false);
const showFeedbackGood = ref(false);
const selectedFeedbackBad = ref([]);
const selectedFeedbackGood = ref([]);
const feedbackBadText = ref('');
const feedbackGoodText = ref('');

const feedbackBadItems = [
  { value: 1, label: '内容错误' },
  { value: 2, label: '内容看不懂' },
  { value: 3, label: '缺少图片示例' },
  { value: 4, label: '找不到内容，没更新' },
  { value: 5, label: '其他' },
];

const feedbackGoodItems = [
  { value: 6, label: '内容简单易懂' },
  { value: 7, label: '图片示例清晰' },
  { value: 9, label: '阅读体验舒适' },
  { value: 10, label: '其他' },
];

// 预处理 Markdown，提取图片的 scale 信息并存储
const preprocessMarkdown = (content) => {
  // 存储图片 scale 信息的映射：src -> scale（存储多种可能的路径格式）
  const imageScaleMap = new Map();
  
  // 匹配图片语法：![alt](url "title") 或 ![alt](url "scale:50%")
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)(?:\s+"([^"]+)")?\)/g;
  let match;
  
  while ((match = imageRegex.exec(content)) !== null) {
    const alt = match[1];
    let url = match[2].trim();
    const title = match[3] || '';
    
    // 检查 title 中是否包含 scale 信息
    if (title.includes('scale:')) {
      const scaleMatch = title.match(/scale:(\d+)%/);
      if (scaleMatch) {
        const scaleValue = scaleMatch[1] + '%';
        
        // 存储多种可能的路径格式，以便后续匹配
        imageScaleMap.set(url, scaleValue);
        
        // 如果路径是相对路径，也存储处理后的绝对路径
        if (url.startsWith('/img/')) {
          imageScaleMap.set(url, scaleValue);
        } else if (url.startsWith('img/')) {
          imageScaleMap.set('/' + url, scaleValue);
          imageScaleMap.set(url, scaleValue);
        } else if (!url.startsWith('/') && !url.startsWith('http')) {
          imageScaleMap.set('/img/' + url, scaleValue);
          imageScaleMap.set(url, scaleValue);
        }
      }
    }
  }
  
  return { processedContent: content, imageScaleMap };
};

// 解析 Markdown 内容
const parseMarkdown = () => {
  const lines = HELP_MD.split('\n');
  const parsedSections = [];
  let currentSection = null;
  let currentContent = [];
  let sectionId = '';
  let isInPrimer = false; // 标记是否在"入门教程"章节中

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // 检测一级标题（##）
    if (line.startsWith('## ') && !line.startsWith('###')) {
      // 保存上一个 section
      if (currentSection) {
        const content = currentContent.join('\n');
        const { processedContent, imageScaleMap } = preprocessMarkdown(content);
        currentSection.content = processMarkdownContent(marked.parse(processedContent), imageScaleMap);
        parsedSections.push(currentSection);
      }

      // 创建新的 section
      const title = line.replace('## ', '');
      sectionId = getSectionId(title);
      isInPrimer = title === '入门教程';
      
      currentSection = {
        id: sectionId,
        title: title,
        content: '',
        updateTime: '',
      };
      currentContent = [];

      // 检查下一行是否是更新时间
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        if (nextLine.includes('最后更新时间')) {
          // 提取更新时间，支持多种格式
          const timeMatch = nextLine.match(/最后更新时间[：:]\s*(.+)/);
          if (timeMatch) {
            currentSection.updateTime = timeMatch[1].replace(/\*\*/g, '').trim();
            i++; // 跳过这一行
          }
        }
      }
    } 
    // 检测三级标题（###），如果在"入门教程"中，将其作为独立的 section
    else if (line.startsWith('### ') && isInPrimer) {
      // 如果当前是"入门教程"主章节，先保存它
      if (currentSection && currentSection.id === 'primer') {
        const content = currentContent.join('\n').trim();
        if (content) {
          const { processedContent, imageScaleMap } = preprocessMarkdown(content);
          currentSection.content = processMarkdownContent(marked.parse(processedContent), imageScaleMap);
        } else {
          // 如果"入门教程"主章节没有内容，创建一个提示
          currentSection.content = '<p>请查看下方的子章节了解详细内容。</p>';
        }
        parsedSections.push(currentSection);
      } else if (currentSection) {
        // 保存上一个子章节
        const content = currentContent.join('\n');
        const { processedContent, imageScaleMap } = preprocessMarkdown(content);
        currentSection.content = processMarkdownContent(marked.parse(processedContent), imageScaleMap);
        parsedSections.push(currentSection);
      }

      // 创建新的子 section
      let title = line.replace('### ', '');
      // 移除开头的编号（如 "1. "、"2. " 等）
      title = title.replace(/^\d+\.\s*/, '').trim();
      sectionId = getSectionId(title);
      
      // 获取"入门教程"的更新时间
      const primerSection = parsedSections.find(s => s.id === 'primer');
      const updateTime = primerSection?.updateTime || '';
      
      currentSection = {
        id: sectionId,
        title: title,
        content: '',
        updateTime: updateTime,
      };
      currentContent = [];
      isInPrimer = true; // 继续保持在"入门教程"中
    } 
    else if (line.startsWith('---')) {
      // 分隔符，跳过
      continue;
    } else {
      currentContent.push(lines[i]);
    }
  }

  // 保存最后一个 section
  if (currentSection) {
    const content = currentContent.join('\n');
    const { processedContent, imageScaleMap } = preprocessMarkdown(content);
    currentSection.content = processMarkdownContent(marked.parse(processedContent), imageScaleMap);
    parsedSections.push(currentSection);
  }

  return parsedSections;
};

// 处理 Markdown 内容，修复图片路径等
const processMarkdownContent = (html, imageScaleMap = new Map()) => {
  if (typeof document === 'undefined') {
    // 服务端渲染时直接返回
    return html;
  }

  // 创建临时 DOM 来操作 HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  // 修复图片路径并设置缩放
  const images = tempDiv.querySelectorAll('img');
  images.forEach((img) => {
    const originalSrc = img.getAttribute('src');
    if (originalSrc) {
      // 从 imageScaleMap 中获取 scale 值（先使用原始路径查找）
      let scaleValue = '50%'; // 默认50%
      
      // 尝试从 map 中获取（使用原始 src）
      if (imageScaleMap.has(originalSrc)) {
        scaleValue = imageScaleMap.get(originalSrc);
      } else {
        // 也检查 title 属性（作为备用方案）
        const title = img.getAttribute('title');
        if (title && title.includes('scale:')) {
          const scaleMatch = title.match(/scale:(\d+)%/);
          if (scaleMatch) {
            scaleValue = `${scaleMatch[1]}%`;
          }
        }
      }
      
      // 处理路径转换
      let src = originalSrc;
      if (src.startsWith('../img/')) {
        src = src.replace('../img/', '/img/');
      } else if (src.startsWith('img/')) {
        src = '/' + src;
      } else if (!src.startsWith('/') && !src.startsWith('http')) {
        src = '/img/' + src;
      }
      
      // 如果原始路径没找到，尝试用处理后的路径查找
      if (scaleValue === '50%' && imageScaleMap.has(src)) {
        scaleValue = imageScaleMap.get(src);
      }
      
      img.setAttribute('src', src);
      
      // 设置图片样式 - 使用 width 而不是 maxWidth
      img.style.width = scaleValue;
      img.style.height = 'auto';
      img.style.maxWidth = ''; // 清除 maxWidth，使用 width 控制
      img.style.maxHeight = ''; // 清除 maxHeight
      
      // 添加响应式样式类
      img.classList.add('markdown-image');
    }
  });

  // 修复链接路径
  const links = tempDiv.querySelectorAll('a');
  links.forEach((link) => {
    let href = link.getAttribute('href');
    if (href && href.startsWith('../')) {
      // 保持相对路径，但可能需要调整
      // 对于文档链接，可以保持原样或转换为绝对路径
    }
  });

  return tempDiv.innerHTML;
};

// 根据标题生成 section ID
const getSectionId = (title) => {
  // 移除可能的编号前缀
  const cleanTitle = title.replace(/^\d+\.\s*/, '').trim();
  
  const idMap = {
    '概述': 'introduction',
    '快速上手': 'getting-started',
    '入门教程': 'primer',
    '地图显示模块': 'mapDisplay',
    '数据管理模块': 'dataManagement',
    '标签云生成模块': 'tagCloudGeneration',
    '字体交互模块': 'fontChange',
    '配色交互模块': 'colourChange',
    '其余交互功能': 'remainingInteractive',
    '常见问题': 'commonProblems',
    '更新日志': 'updateLog',
    '相关下载': 'relatedDownloads',
    '视频专区': 'video',
  };
  
  // 先尝试精确匹配
  if (idMap[cleanTitle]) {
    return idMap[cleanTitle];
  }
  
  // 尝试模糊匹配（包含关系）
  for (const [key, value] of Object.entries(idMap)) {
    if (cleanTitle.includes(key) || key.includes(cleanTitle)) {
      return value;
    }
  }
  
  // 默认处理
  return cleanTitle.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
};

// 生成目录
const generateToc = (sectionId) => {
  const section = sections.value.find((s) => s.id === sectionId);
  if (!section) {
    currentToc.value = [];
    return;
  }

  // 等待 DOM 更新后，从实际显示的 DOM 中提取标题
  nextTick(() => {
    const currentSection = document.getElementById(sectionId);
    if (!currentSection) {
      currentToc.value = [];
      return;
    }

    const markdownContent = currentSection.querySelector('.markdown-content');
    if (!markdownContent) {
      currentToc.value = [];
      return;
    }

    const h2Elements = markdownContent.querySelectorAll('h2');
    const h3Elements = markdownContent.querySelectorAll('h3');
    const h4Elements = markdownContent.querySelectorAll('h4');

    const tocItems = [];
    let index = 0;

    // 处理 h2 标题
    h2Elements.forEach((h2) => {
      const id = `section-${sectionId}-h2-${index}`;
      h2.id = id;
      tocItems.push({
        id: id,
        title: h2.textContent,
        level: 2,
      });
      index++;
    });

    // 处理 h3 标题
    if (h2Elements.length > 0) {
      h3Elements.forEach((h3) => {
        const id = `section-${sectionId}-h3-${index}`;
        h3.id = id;
        tocItems.push({
          id: id,
          title: h3.textContent,
          level: 3,
        });
        index++;
      });
    } else {
      h3Elements.forEach((h3) => {
        const id = `section-${sectionId}-h3-${index}`;
        h3.id = id;
        tocItems.push({
          id: id,
          title: h3.textContent,
          level: 3,
        });
        index++;
      });
    }

    // 如果没有 h2 和 h3，使用 h4 作为目录项
    if (h2Elements.length === 0 && h3Elements.length === 0 && h4Elements.length > 0) {
      h4Elements.forEach((h4) => {
        const id = `section-${sectionId}-h4-${index}`;
        h4.id = id;
        tocItems.push({
          id: id,
          title: h4.textContent,
          level: 4,
        });
        index++;
      });
    }

    currentToc.value = tocItems;
  });
};

// 导航点击处理
const handleNavClick = (id) => {
  activeNavId.value = id;
  activeSectionId.value = id;
  showFooter.value = false; // 切换 section 时隐藏 footer
  
  // 立即重置滚动位置
  if (helpPageRef.value) {
    helpPageRef.value.scrollTop = 0;
  }
  
  nextTick(() => {
    const section = document.getElementById(id);
    if (section && helpPageRef.value) {
      // 再次确保滚动位置为0
      helpPageRef.value.scrollTop = 0;
      generateToc(id);
      // 重置目录高亮
      if (currentToc.value.length > 0) {
        activeTocId.value = currentToc.value[0].id;
      } else {
        activeTocId.value = '';
      }
    }
  });
};

// 滚动到指定 section
const scrollToSection = (id) => {
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' });
    activeTocId.value = id;
  }
};

// 处理图片点击（在新窗口打开）
const handleImageClick = (e) => {
  if (e.target.tagName === 'IMG') {
    window.open(e.target.src, '_blank');
  }
};

// 评分变化处理
const handleRatingChange = () => {
  if (rating.value <= 2) {
    showFeedbackBad.value = true;
    showFeedbackGood.value = false;
  } else {
    showFeedbackBad.value = false;
    showFeedbackGood.value = true;
  }
};

// 切换反馈选项
const toggleFeedbackBad = (value) => {
  const index = selectedFeedbackBad.value.indexOf(value);
  if (index > -1) {
    selectedFeedbackBad.value.splice(index, 1);
  } else {
    selectedFeedbackBad.value.push(value);
  }
};

const toggleFeedbackGood = (value) => {
  const index = selectedFeedbackGood.value.indexOf(value);
  if (index > -1) {
    selectedFeedbackGood.value.splice(index, 1);
  } else {
    selectedFeedbackGood.value.push(value);
  }
};

// 提交反馈
const submitFeedback = (type, withDetails) => {
  const feedback = {
    type: type,
    rating: rating.value,
    selected: type === 'bad' ? selectedFeedbackBad.value : selectedFeedbackGood.value,
    text: type === 'bad' ? feedbackBadText.value : feedbackGoodText.value,
    withDetails: withDetails,
  };
  console.log('Feedback submitted:', feedback);
  alert('感谢反馈！！');
  resetFeedback();
};

// 取消反馈
const cancelFeedback = () => {
  resetFeedback();
};

// 重置反馈
const resetFeedback = () => {
  rating.value = 0;
  showFeedbackBad.value = false;
  showFeedbackGood.value = false;
  selectedFeedbackBad.value = [];
  selectedFeedbackGood.value = [];
  feedbackBadText.value = '';
  feedbackGoodText.value = '';
};

// 创建工单
const handleCreateTicket = () => {
  // 这里可以跳转到反馈页面或打开反馈对话框
  console.log('Create ticket');
};

// 监听滚动，更新目录高亮
const handleScroll = () => {
  if (!helpPageRef.value) return;

  const scrollTop = helpPageRef.value.scrollTop;
  const scrollHeight = helpPageRef.value.scrollHeight;
  const clientHeight = helpPageRef.value.clientHeight;
  
  // 检查是否滚动到底部（留出一些余量，考虑 footer 高度）
  const isAtBottom = scrollTop + clientHeight >= scrollHeight - 100;
  showFooter.value = isAtBottom;

  const currentSection = document.getElementById(activeSectionId.value);
  if (!currentSection) return;

  const markdownContent = currentSection.querySelector('.markdown-content');
  if (!markdownContent) return;

  // 获取所有标题元素（h2, h3, h4），从实际 DOM 中获取
  const allHeadings = [
    ...markdownContent.querySelectorAll('h2[id]'),
    ...markdownContent.querySelectorAll('h3[id]'),
    ...markdownContent.querySelectorAll('h4[id]'),
  ];

  if (allHeadings.length === 0) return;

  // 找到当前应该高亮的标题
  let activeHeadingId = null;
  const offset = 200; // 偏移量，让标题在视口上方一点时就开始高亮（考虑 header 高度）

  // 从下往上查找，找到第一个位置在视口上方或附近的标题
  for (let i = allHeadings.length - 1; i >= 0; i--) {
    const heading = allHeadings[i];
    const rect = heading.getBoundingClientRect();
    const containerRect = helpPageRef.value.getBoundingClientRect();
    
    // 计算标题相对于滚动容器的位置
    const headingTop = rect.top - containerRect.top + scrollTop;
    
    // 如果标题在视口上方或附近（考虑偏移）
    if (headingTop <= scrollTop + offset) {
      activeHeadingId = heading.id;
      break;
    }
  }

  // 如果滚动到顶部，高亮第一个标题
  if (scrollTop < 50 && allHeadings.length > 0) {
    activeHeadingId = allHeadings[0].id;
  }

  // 如果滚动到底部，高亮最后一个标题
  if (isAtBottom && allHeadings.length > 0) {
    activeHeadingId = allHeadings[allHeadings.length - 1].id;
  }

  if (activeHeadingId) {
    activeTocId.value = activeHeadingId;
  }
};

onMounted(() => {
  // 解析 Markdown
  sections.value = parseMarkdown();

  // 设置默认激活的 section
  if (sections.value.length > 0) {
    activeSectionId.value = sections.value[0].id;
    activeNavId.value = sections.value[0].id;
    nextTick(() => {
      generateToc(sections.value[0].id);
      // 设置默认高亮第一个目录项
      if (currentToc.value.length > 0) {
        activeTocId.value = currentToc.value[0].id;
      }
    });
  }

  // 添加滚动监听
  nextTick(() => {
    if (helpPageRef.value) {
      helpPageRef.value.addEventListener('scroll', handleScroll, { passive: true });
      // 初始触发一次，检查是否在底部
      handleScroll();
    }
  });

  // 配置 marked 选项
  marked.setOptions({
    breaks: true,
    gfm: true,
    // 确保加粗、斜体等格式正常工作
    pedantic: false,
    sanitize: false,
    smartLists: true,
    smartypants: false,
  });
});

// 监听 activeSectionId 变化，重置滚动位置
watch(activeSectionId, (newId, oldId) => {
  if (newId !== oldId && helpPageRef.value) {
    // 切换section时重置滚动位置
    helpPageRef.value.scrollTop = 0;
    showFooter.value = false;
    // 等待DOM更新后重新生成目录
    nextTick(() => {
      generateToc(newId);
      // 重置目录高亮
      setTimeout(() => {
        if (currentToc.value.length > 0) {
          activeTocId.value = currentToc.value[0].id;
        } else {
          activeTocId.value = '';
        }
        handleScroll(); // 触发一次滚动检查
      }, 100);
    });
  }
});

// 在组件卸载时清理
onBeforeUnmount(() => {
  if (helpPageRef.value) {
    helpPageRef.value.removeEventListener('scroll', handleScroll);
  }
});
</script>

<style scoped lang="scss">
.help-page {
  width: 100%;
  height: calc(100vh - 64px); /* 减去 HeaderBar 的高度 */
  background-color: #ffffff;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  justify-content: flex-start; /* 从顶部开始 */
  align-items: center; /* 居中显示 */
  position: relative;
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

// 确保内容区域不被压缩
.help-page > .container {
  flex: 0 0 auto; /* 不压缩，根据内容自动扩展 */
}

.container {
  position: relative;
  display: flex;
  max-width: 1400px; /* 限制最大宽度 */
  width: 100%;
  background: #ffffff;
  margin: 0 auto; /* 居中 */
  padding-bottom: 120px; /* 为 footer 留出足够空间 */
}

/* 左右侧导航栏 */
.sidebar {
  position: sticky;
  top: 0;
  align-self: flex-start;
  display: block;
  overflow-y: auto;
  background-color: #ffffff;
  max-height: calc(100vh - 64px);
  scrollbar-width: thin;
  scrollbar-color: rgba(31, 35, 51, 0.1) transparent;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(31, 35, 51, 0.1);
    border-radius: 3px;
    
    &:hover {
      background: rgba(31, 35, 51, 0.2);
    }
  }
}

.sidebar-left {
  width: 250px;
  padding: 40px;
  font-size: 20px;
  flex-shrink: 0;
}

.sidebar-left h3 {
  margin: 0 0 20px 0;
  font-size: 20px;
  font-weight: 600;
}

.sidebar-left ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.sidebar-left ul li {
  margin-bottom: 10px;
}

.sidebar-left a {
  font-size: 15px;
  padding: 5px 0px 5px 15px;
  border-radius: 10px;
  text-decoration: none;
  color: #000000;
  display: block;
  transition: all 0.2s;
}

.sidebar-left a:hover {
  color: #007bff;
  background-color: rgba(0, 123, 255, 0.1);
}

.sidebar-left a.active {
  font-weight: 700;
  background-color: rgb(238, 243, 255);
  color: rgb(26, 102, 255);
}

.sidebar-left ul ul {
  margin-top: 5px;
  margin-left: 20px;
}

.sidebar-right {
  flex: 1; /* 占用剩余空间 */
  max-width: 300px;
  padding: 20px;
  flex-shrink: 0;
}

.sidebar-right h3 {
  font-size: 15px;
  font-weight: 600;
  margin: 20px 0 10px 0;
}

.sidebar-right ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.sidebar-right a {
  padding: 5px 0px 5px 10px;
  border-left: 3px solid rgb(255, 255, 255);
  font-size: 15px;
  font-weight: 300;
  text-decoration: none;
  color: #000000;
  display: block;
  transition: all 0.2s;
}

.sidebar-right a:hover {
  color: #007bff;
  border-left-color: #007bff;
}

.sidebar-right a.active {
  color: #007bff;
  border-left-color: #007bff;
  font-weight: 500;
}

/* 主要内容 */
.main-content {
  flex: 0 0 65%;
  overflow: visible; /* 允许内容溢出，由外层控制滚动 */
  background: #ffffff;
  line-height: 35px;
  padding: 40px;
  display: flex;
  flex-direction: column;
  min-height: min-content; /* 根据内容自动调整高度 */
}

.main-content-pages {
  max-width: 100%;
  width: 100%;
  overflow: visible; /* 移除内部滚动，由外层控制 */
  min-height: min-content; /* 根据内容自动调整高度 */
}

.main-content-page {
  padding: 10px 50px 20px 0px;
}

.page-title {
  border-bottom: 1px solid rgb(215, 215, 215);
  padding-bottom: 30px;
  margin-bottom: 30px;
}

.page-title h1 {
  margin: 0 0 10px 0;
  font-size: 32px;
  font-weight: 600;
}

.page-title span {
  font-size: 14px;
  color: #666;
  font-weight: normal; /* 普通字体，不加粗 */
}

.markdown-content {
  line-height: 1.8;
  color: #333;

  :deep(h2) {
    font-size: 24px;
    font-weight: 600;
    margin: 40px 0 20px 0;
    padding-top: 20px;
    border-top: 1px solid #eee;
  }

  :deep(h3) {
    font-size: 20px;
    font-weight: 600;
    margin: 30px 0 15px 0;
  }

  :deep(p) {
    margin: 15px 0;
    line-height: 1.8;
  }

  :deep(img),
  :deep(.markdown-image) {
    /* 默认样式，但如果图片有内联样式则会被覆盖 */
    height: auto;
    margin: 20px auto; /* 上下 20px，左右自动（居中） */
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    cursor: pointer;
    transition: transform 0.2s;
    display: block; /* block 元素配合 margin: auto 实现居中 */
  }
  
  /* 如果没有设置 width，则默认使用 50% */
  :deep(img:not([style*="width"])),
  :deep(.markdown-image:not([style*="width"])) {
    width: 50%;
  }

  :deep(img:hover),
  :deep(.markdown-image:hover) {
    transform: scale(1.02);
  }

  :deep(ul),
  :deep(ol) {
    margin: 15px 0;
    padding-left: 30px;
  }

  :deep(li) {
    margin: 8px 0;
  }

  :deep(a) {
    color: #007bff;
    text-decoration: none;
  }

  :deep(a:hover) {
    text-decoration: underline;
  }

  :deep(code) {
    background-color: #f4f4f4;
    padding: 2px 6px;
    border-radius: 3px;
    font-family: 'Courier New', monospace;
    font-size: 0.9em;
  }

  :deep(pre) {
    background-color: #f4f4f4;
    padding: 15px;
    border-radius: 5px;
    overflow-x: auto;
    margin: 20px 0;
  }

  :deep(blockquote) {
    border-left: 4px solid #007bff;
    padding-left: 20px;
    margin: 20px 0;
    color: #666;
    font-style: italic;
  }

  /* 加粗文本样式 */
  :deep(strong),
  :deep(b) {
    font-weight: 600;
    color: #1f2333;
  }
}

/* 反馈区域 */
.star_help {
  width: 100%;
  text-align: center;
  padding: 20px;
  border-radius: 10px;
  margin-bottom: 28px;
  background: rgb(251, 251, 251);
  cursor: default;
}

.star_title {
  font-size: 15px;
  font-weight: 600;
  margin-top: 10px;
}

.star_tips {
  font-size: 12px;
  margin-top: 10px;
  display: flex;
  justify-content: space-between;
}

.stars {
  display: flex;
  justify-content: space-between;
  margin: 10px 0;
}

.stars input[type='radio'] {
  display: none;
}

.stars label {
  font-size: 26px;
  cursor: pointer;
  color: #ccc;
  transition: color 0.3s ease;
  user-select: none;
}

.stars label.active,
.stars label:hover {
  color: orange;
}

.star_feedback {
  margin-top: 15px;
  text-align: left;
}

.a_feedback_list {
  background: rgb(242, 242, 242);
  border: 1px solid rgb(242, 242, 242);
  border-radius: 10px;
  font-size: 12px;
  text-align: left;
  padding: 5px 0px 5px 15px;
  margin-top: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.a_feedback_list.selected {
  color: #007bff;
  border: 1px solid #007bff;
  background: rgba(0, 123, 255, 0.1);
}

.a_feedback_list:hover {
  border-color: #007bff;
}

.feedback_text {
  margin-top: 5px;
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 12px;
  resize: vertical;
}

.feedback_xp_des {
  margin-top: 10px;
  font-size: 13px;
}

.feedback_xp_ctrl {
  margin-top: 10px;
  display: flex;
  gap: 10px;
}

.feedback_xp_ctrl button {
  flex: 1;
  padding: 8px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.ctrl_submit_bee,
.ctrl_submit_xp,
.ctrl_submit {
  background: #007bff;
  color: white;
}

.ctrl_submit_bee:hover,
.ctrl_submit_xp:hover,
.ctrl_submit:hover {
  background: #0056b3;
}

.ctrl_cancel {
  background: #6c757d;
  color: white;
}

.ctrl_cancel:hover {
  background: #5a6268;
}

#create-ticket {
  margin-top: 10px;
  font-size: 12px;
}

#create-ticket a {
  color: #007bff;
  text-decoration: none;
}

#create-ticket a:hover {
  text-decoration: underline;
}

.help-footer {
  width: 100%;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
}
</style>

