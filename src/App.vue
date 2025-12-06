<template>
  <div class="app-shell">
    <HeaderBar
      ref="headerRef"
      :show-tutorial-icon="!showHelpPage && !showFeedbackPage"
      @navigate="handleNavigate"
      @start-tutorial="restartIntro"
    />
    <HelpPage v-if="showHelpPage && !showFeedbackPage" @navigate="handleNavigate" />
    <FeedbackPage v-if="showFeedbackPage && !showHelpPage" @navigate="handleNavigate" />
    <template v-if="!showHelpPage && !showFeedbackPage">
      <div class="app-body">
        <SideMenu
          :active-panel="activePanel"
          @change-panel="handleChangePanel"
          @navigate="handleNavigate"
        />
        <div class="workspace">
          <PoiContent ref="poiContentRef" v-show="activePanel === 'content'" />
          <TypefacePanel v-show="activePanel === 'typeface'" />
          <ColorPanel v-show="activePanel === 'color'" />
        </div>
        <SplitterBar />
        <TagCloudCanvas ref="tagCloudCanvasRef" />
      </div>
      <FooterBar @navigate="handleNavigate" />
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
import FeedbackPage from '@/components/feedback/FeedbackPage.vue';

const activePanel = ref('content');
const headerRef = ref(null);
const poiContentRef = ref(null);
const tagCloudCanvasRef = ref(null);
const showHelpPage = ref(false);
const showFeedbackPage = ref(false);

let firstIntroStarted = false;

const handleChangePanel = (panel) => {
  activePanel.value = panel;
};

const handleNavigate = (route) => {
  if (route === 'help') {
    showHelpPage.value = true;
    showFeedbackPage.value = false;
  } else if (route === 'feedback') {
    showFeedbackPage.value = true;
    showHelpPage.value = false;
  } else if (route === 'home') {
    showHelpPage.value = false;
    showFeedbackPage.value = false;
  } else if (route === 'about') {
    // 跳转到关于我们页面
    window.open('https://hubutagcloud.cn/cxq-group/', '_blank');
  } else {
    console.log('navigate to', route);
  }
};

const getHeaderElement = () => {
  if (headerRef.value?.$el) return headerRef.value.$el;
  return document.querySelector('header.header');
};

const getSideMenuElement = () => {
  return document.querySelector('.side-menu');
};

const getMapElement = () => {
  if (poiContentRef.value?.$el) {
    const mapWrapper = poiContentRef.value.$el.querySelector('.map-wrapper');
    if (mapWrapper) return mapWrapper;
  }
  return document.querySelector('.map-wrapper');
};

const getTableElement = () => {
  if (poiContentRef.value?.$el) {
    const tableEl = poiContentRef.value.$el.querySelector('.table-card');
    if (tableEl) return tableEl;
  }
  return document.querySelector('.table-card');
};

const getTagCloudPanelElement = () => {
  if (tagCloudCanvasRef.value?.$el) {
    const headEl = tagCloudCanvasRef.value.$el.querySelector('.panel-head');
    if (headEl) return headEl;
  }
  return document.querySelector('.tagcloud-panel .panel-head');
};

const getCanvasElement = () => {
  if (tagCloudCanvasRef.value?.$el) {
    const wrapperEl = tagCloudCanvasRef.value.$el.querySelector('.canvas-wrapper');
    if (wrapperEl) return wrapperEl;
  }
  return document.querySelector('.tagcloud-panel .canvas-wrapper') || document.querySelector('.tagcloud-panel canvas');
};

const getTutorialButtonElement = () => {
  const tutorialBtn = document.querySelector('[data-intro-tutorial="tutorial-btn"]');
  if (tutorialBtn) return tutorialBtn;
  if (headerRef.value?.$el) {
    return headerRef.value.$el.querySelector('.tutorial-icon-link') || getHeaderElement();
  }
  return getHeaderElement();
};

const createIntro = () => {
  const intro = introJs.tour();
  intro.addSteps([
    {
      intro:
        '<div style="text-align:center;padding:8px 0;"><div style="margin-bottom:12px;"><img src="/img/logo.svg" alt="Logo" style="height:40px;object-fit:contain;" /></div><div style="font-size:16px;font-weight:600;color:#1f2333;margin-bottom:8px;">欢迎来到地名标签云网站！</div><div style="font-size:13px;color:#64748b;">让我们带您浏览主要功能，快速上手使用。</div></div>',
    },
    {
      element: getHeaderElement(),
      intro:
        '<div style="line-height:1.6;"><strong style="font-size:16px;color:#1f2333;">导航栏</strong><br/><span style="color:#64748b;">您可以在此处查看网站帮助、进行意见反馈等操作。点击右上角的<span style="color:#399ceb;">"引导教程"</span>图标，可以随时重新查看本引导。</span></div>',
    },
    {
      element: getSideMenuElement(),
      intro:
        '<div style="line-height:1.6;"><strong style="font-size:16px;color:#1f2333;">左侧面板</strong><br/><span style="color:#64748b;">您可以在此切换不同的配置面板，包括内容、字体、配色等设置，按照顺序逐步完善标签云的展示效果。</span></div>',
    },
    {
      element: getMapElement(),
      intro:
        '<div style="line-height:1.6;"><strong style="font-size:16px;color:#1f2333;">地图展示窗口</strong><br/><span style="color:#64748b;">您可以在此查看当前定位地图及景点数据。使用上方的"数据筛选"功能可以在地图上绘制区域来筛选数据。</span></div>',
    },
    {
      element: getTableElement(),
      intro:
        '<div style="line-height:1.6;"><strong style="font-size:16px;color:#1f2333;">数据详情窗口</strong><br/><span style="color:#64748b;">您可以在此查看所有的景点数据信息，包括地名、城市、排名等。支持编辑、筛选和批量操作。</span></div>',
    },
    {
      element: getTagCloudPanelElement(),
      intro:
        '<div style="line-height:1.6;"><strong style="font-size:16px;color:#1f2333;">标签云操作面板</strong><br/><span style="color:#64748b;">您可以在此对标签云进行操作，包括显示排名、通行时间、调整显示精度、导出图片等功能。</span></div>',
    },
    {
      element: getCanvasElement(),
      intro:
        '<div style="line-height:1.6;"><strong style="font-size:16px;color:#1f2333;">标签云画布</strong><br/><span style="color:#64748b;">系统将会在此窗口显示标签云。您可以使用右侧工具栏进行缩放、漫游等操作。</span></div>',
    },
    {
      element: getTutorialButtonElement(),
      intro:
        '<div style="text-align:center;line-height:1.6;"><div style="font-size:20px;margin-bottom:12px;">✨ 引导完成！</div><div style="color:#64748b;margin-bottom:16px;">您已经了解了主要功能。如需再次查看引导，请点击右上角的<span style="color:#399ceb;">"引导教程"</span>图标。</div><div style="font-size:12px;color:#94a3b8;">祝您使用愉快！</div></div>',
    },
  ]);

  intro.setOptions({
    nextLabel: '下一步 →',
    prevLabel: '← 上一步',
    skipLabel: '跳过',
    doneLabel: '完成',
    showStepNumbers: true,
    showProgress: true,
    disableInteraction: false,
    tooltipClass: 'customTooltipClass',
    highlightClass: 'customHighlightClass',
    scrollToElement: true,
    scrollPadding: 20,
    overlayOpacity: 0.4,
    tooltipPosition: 'auto',
    exitOnOverlayClick: true,
    exitOnEsc: true,
    keyboardNavigation: true,
    tooltipRenderAsHtml: true,
  });

  intro.onComplete(() => {
    firstIntroStarted = false;
  });

  intro.onExit(() => {
    firstIntroStarted = false;
  });

  return intro;
};

const restartIntro = () => {
  firstIntroStarted = false;
  nextTick(() => {
    const intro = createIntro();
    intro.start();
  });
};

const initIntro = () => {
  if (firstIntroStarted || showHelpPage.value || showFeedbackPage.value) return;
  firstIntroStarted = true;
  nextTick(() => {
    const intro = createIntro();
    intro.start();
  });
};

onMounted(() => {
  setTimeout(() => {
    if (!showHelpPage.value && !showFeedbackPage.value) {
      initIntro();
    }
  }, 500);
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

