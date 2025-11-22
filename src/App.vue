<template>
  <div class="app-shell">
    <HeaderBar ref="headerRef" @navigate="handleNavigate" />
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

const activePanel = ref('content');
const headerRef = ref(null);
const poiContentRef = ref(null);
const tagCloudCanvasRef = ref(null);

// 防止重复启动引导的标志
let firstIntroStarted = false;

const handleChangePanel = (panel) => {
  activePanel.value = panel;
};

const handleNavigate = (route) => {
  console.log('navigate to', route);
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
    // 获取元素，使用多种方式确保能找到
    const getHeaderElement = () => {
      if (headerRef.value?.$el) return headerRef.value.$el;
      return document.querySelector('header.header') || document.querySelector('.header');
    };

    const getMapElement = () => {
      if (poiContentRef.value?.$el) {
        const mapEl = poiContentRef.value.$el.querySelector('.map-wrapper');
        if (mapEl) return mapEl;
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
        const panelEl = tagCloudCanvasRef.value.$el.querySelector('.panel-head');
        if (panelEl) return panelEl;
      }
      return document.querySelector('.tagcloud-panel .panel-head');
    };

    const getCanvasElement = () => {
      if (tagCloudCanvasRef.value?.$el) {
        const canvasEl = tagCloudCanvasRef.value.$el.querySelector('canvas');
        if (canvasEl) return canvasEl;
      }
      return document.querySelector('.tagcloud-panel canvas');
    };

    // 第一个引导：主要功能介绍
    const intro = introJs.tour();
    // 使用 addSteps 方法添加步骤
    intro.addSteps([
      {
        intro: '欢迎来到地名标签云网站！让我们带您浏览主要功能。',
      },
      {
        element: getHeaderElement(),
        intro: '这是标签云网站的导航栏，您可在此处查看网站帮助、进行意见反馈等操作。',
      },
      {
        element: getMapElement(),
        intro: '您可以在地图展示窗口查看当前定位地图及景点数据。',
      },
      {
        element: getTableElement(),
        intro: '您可以在数据详情展示窗口查看所有的景点数据信息。',
      },
      {
        element: getTagCloudPanelElement(),
        intro: '您可以在此对标签云进行操作，包括显示排名、通行时间等操作。',
      },
      {
        element: getCanvasElement(),
        intro: '系统将会在此窗口显示标签云。',
      },
    ]);
    // 设置其他选项
    intro.setOptions({
      nextLabel: '下一步',
      prevLabel: '上一步',
      showStepNumbers: true,
      showProgress: true,
      exitOnOverlayClick: true,
      disableInteraction: false,
      exitOnEsc: true,
      keyboardNavigation: true,
      tooltipClass: 'customTooltipClass',
      highlightClass: 'customHighlightClass',
    });

    intro.start();
  });
};


onMounted(() => {
  // 延迟启动引导，确保所有组件都已渲染
  setTimeout(() => {
    initIntro();
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

