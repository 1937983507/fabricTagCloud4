<template>
  <div class="app-shell">
    <HeaderBar
      ref="headerRef"
      @navigate="handleNavigate"
      @start-tutorial="restartIntro"
    />
    <HelpPage v-if="showHelpPage" />
    <template v-if="!showHelpPage">
      <div class="app-body">
        <SideMenu
          :active-panel="activePanel"
          @change-panel="handleChangePanel"
        />
        <div class="workspace">
          <PoiContent ref="poiContentRef" v-show="activePanel === 'content'" />
          <TypefacePanel v-show="activePanel === 'typeface'" />
          <ColorPanel v-show="activePanel === 'color'" />
        </div>
        <SplitterBar />
        <TagCloudCanvas ref="tagCloudCanvasRef" />
      </div>
      <FooterBar />
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';
import introJs from 'intro.js';
import 'intro.js/minified/introjs.min.css';
import HeaderBar from '@/components/layout/HeaderBar.vue';
import FooterBar from '@/components/layout/FooterBar.vue';
import SideMenu from '@/components/layout/SideMenu.vue';
import PoiContent from '@/components/content/PoiContent.vue';
import TypefacePanel from '@/components/typeface/TypefacePanel.vue';
import ColorPanel from '@/components/color/ColorPanel.vue';
import TagCloudCanvas from '@/components/tagcloud/TagCloudCanvas.vue';
import SplitterBar from '@/components/common/SplitterBar.vue';
import HelpPage from '@/components/help/HelpPage.vue';

const activePanel = ref('content');
const headerRef = ref(null);
const poiContentRef = ref(null);
const tagCloudCanvasRef = ref(null);
const showHelpPage = ref(false);

// 防止重复启动引导的标志
let firstIntroStarted = false;

const handleChangePanel = (panel) => {
  activePanel.value = panel;
};

const handleNavigate = (route) => {
  if (route === 'help') {
    showHelpPage.value = true;
  } else if (route === 'home') {
    showHelpPage.value = false;
  } else {
    console.log('navigate to', route);
  }
};

// 创建引导的公共函数
const createIntro = () => {
  // 获取元素，使用多种方式确保能找到
  const getHeaderElement = () => {
    if (headerRef.value?.$el) return headerRef.value.$el;
    return document.querySelector('header.header') || document.querySelector('.header');
  };

  const getMapElement = () => {
    // 直接定位到 map-wrapper 控件
    if (poiContentRef.value?.$el) {
      const mapEl = poiContentRef.value.$el.querySelector('.map-wrapper');
      if (mapEl) return mapEl;
    }
    return document.querySelector('.map-wrapper');
  };

  const getTableElement = () => {
    // 直接定位到 table-card 控件
    if (poiContentRef.value?.$el) {
      const tableEl = poiContentRef.value.$el.querySelector('.table-card');
      if (tableEl) return tableEl;
    }
    return document.querySelector('.table-card');
  };

  const getTutorialButtonElement = () => {
    // 定位到 header 中的"引导教程"按钮
    // 优先使用 data-intro-tutorial 属性
    const tutorialBtn = document.querySelector('[data-intro-tutorial="tutorial-btn"]');
    if (tutorialBtn) return tutorialBtn;
    
    // 备用方案1：在 headerRef 中查找
    if (headerRef.value?.$el) {
      const buttons = headerRef.value.$el.querySelectorAll('.nav-actions .el-button');
      for (const btn of buttons) {
        if (btn.textContent && btn.textContent.trim() === '引导教程') {
          return btn;
        }
      }
    }
    // 备用方案2：在整个文档中查找
    const allButtons = document.querySelectorAll('.header .nav-actions .el-button');
    for (const btn of allButtons) {
      if (btn.textContent && btn.textContent.trim() === '引导教程') {
        return btn;
      }
    }
    // 如果找不到，返回 header 元素作为后备
    return getHeaderElement();
  };

  const getTagCloudPanelElement = () => {
    if (tagCloudCanvasRef.value?.$el) {
      const panelEl = tagCloudCanvasRef.value.$el.querySelector('.panel-head');
      if (panelEl) return panelEl;
    }
    return document.querySelector('.tagcloud-panel .panel-head');
  };

  const getCanvasElement = () => {
    // 使用 canvas-wrapper 而不是 canvas 本身，避免被覆盖层遮挡
    if (tagCloudCanvasRef.value?.$el) {
      const wrapperEl = tagCloudCanvasRef.value.$el.querySelector('.canvas-wrapper');
      if (wrapperEl) return wrapperEl;
    }
    return document.querySelector('.tagcloud-panel .canvas-wrapper') || 
           document.querySelector('.tagcloud-panel canvas');
  };

  // 第一个引导：主要功能介绍
  const intro = introJs.tour();
  // 使用 addSteps 方法添加步骤
  intro.addSteps([
    {
      intro: '<div style="text-align: center; padding: 8px 0;"><div style="margin-bottom: 12px;"><img src="/img/logo.png" alt="Logo" style="height: 40px; object-fit: contain;" /></div><div style="font-size: 16px; font-weight: 600; color: #1f2333; margin-bottom: 8px;">欢迎来到地名标签云网站！</div><div style="font-size: 13px; color: #64748b;">让我们带您浏览主要功能，快速上手使用。</div></div>',
    },
    {
      element: getHeaderElement(),
      intro: '<div style="line-height: 1.6;"><strong style="font-size: 16px; color: #1f2333;">导航栏</strong><br/><span style="color: #64748b;">您可以在此处查看网站帮助、进行意见反馈等操作。点击右上角的<strong style="color: #399ceb;">"引导教程"</strong>按钮，可以随时重新查看本引导。</span></div>',
    },
    {
      element: getMapElement(),
      intro: '<div style="line-height: 1.6;"><strong style="font-size: 16px; color: #1f2333;">地图展示窗口</strong><br/><span style="color: #64748b;">您可以在此查看当前定位地图及景点数据。使用上方的"数据筛选"功能可以在地图上绘制区域来筛选数据。</span></div>',
    },
    {
      element: getTableElement(),
      intro: '<div style="line-height: 1.6;"><strong style="font-size: 16px; color: #1f2333;">数据详情窗口</strong><br/><span style="color: #64748b;">您可以在此查看所有的景点数据信息，包括地名、城市、排名等。支持编辑、筛选和批量操作。</span></div>',
    },
    {
      element: getTagCloudPanelElement(),
      intro: '<div style="line-height: 1.6;"><strong style="font-size: 16px; color: #1f2333;">标签云操作面板</strong><br/><span style="color: #64748b;">您可以在此对标签云进行操作，包括显示排名、通行时间、调整显示精度、导出图片等功能。</span></div>',
    },
    {
      element: getCanvasElement(),
      intro: '<div style="line-height: 1.6;"><strong style="font-size: 16px; color: #1f2333;">标签云画布</strong><br/><span style="color: #64748b;">系统将会在此窗口显示标签云。您可以使用右侧工具栏进行缩放、漫游等操作。</span></div>',
    },
    {
      element: getTutorialButtonElement(),
      intro: '<div style="text-align: center; line-height: 1.6;"><div style="font-size: 20px; margin-bottom: 12px;">✨ 引导完成！</div><div style="color: #64748b; margin-bottom: 16px;">您已经了解了主要功能。如需再次查看引导，请点击此<strong style="color: #399ceb;">"引导教程"</strong>按钮。</div><div style="font-size: 12px; color: #94a3b8;">祝您使用愉快！</div></div>',
    },
  ]);
  // 设置其他选项
  intro.setOptions({
    nextLabel: '下一步 →',
    prevLabel: '← 上一步',
    skipLabel: '跳过',
    doneLabel: '完成',
    showStepNumbers: true,
    showProgress: true,
    exitOnOverlayClick: true,
    disableInteraction: false,
    exitOnEsc: true,
    keyboardNavigation: true,
    tooltipClass: 'customTooltipClass',
    highlightClass: 'customHighlightClass',
    tooltipPosition: 'auto',
    scrollToElement: true,
    scrollPadding: 20,
    overlayOpacity: 0.4,
    tooltipRenderAsHtml: true,
  });

  // 添加完成回调
  intro.onComplete(() => {
    firstIntroStarted = false; // 允许再次启动
  });

  // 添加退出回调
  intro.onExit(() => {
    firstIntroStarted = false; // 允许再次启动
  });

  return intro;
};

// 重新启动引导（供外部调用）
const restartIntro = () => {
  // 重置标志，允许重新启动
  firstIntroStarted = false;
  nextTick(() => {
    const intro = createIntro();
    intro.start();
  });
};


// 初始化引导
const initIntro = () => {
  // 防止重复启动
  if (firstIntroStarted) {
    return;
  }
  firstIntroStarted = true;

  // 等待 DOM 渲染完成
  nextTick(() => {
    const intro = createIntro();
    intro.start();
  });
};


onMounted(() => {
  // 延迟启动引导，确保所有组件都已渲染
  // 只在非帮助页面时启动引导
  if (!showHelpPage.value) {
    setTimeout(() => {
      initIntro();
    }, 500);
  }
});
</script>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  position: relative;
}

.app-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  display: grid;
  grid-template-columns: 108px 1fr 12px 68vw;
  background: linear-gradient(180deg, #ffffff 0%, #f7f9fc 100%);
}

.workspace {
  padding: 24px 0px 24px 24px;
  background: #f7f9fc;
  /* overflow-y: auto; */
  min-height: 0;
  height: 100%;
}

.workspace > * {
  display: block;
  height: 100%;
}
</style>

