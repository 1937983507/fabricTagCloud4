<template>
  <div class="app-shell">
    <HeaderBar
      ref="headerRef"
      :show-tutorial-icon="!showHelpPage && !showFeedbackPage"
      @navigate="handleNavigate"
      @start-tutorial="restartIntro"
    />
    <HelpPage
      v-if="showHelpPage && !showFeedbackPage"
      class="app-overlay-page"
      @navigate="handleNavigate"
    />
    <FeedbackPage
      v-if="showFeedbackPage && !showHelpPage"
      class="app-overlay-page"
      @navigate="handleNavigate"
    />
    <div
      v-show="!showHelpPage && !showFeedbackPage"
      class="app-home-stack"
    >
      <div class="app-body">
        <SideMenu
          :active-panel="activePanel"
          @change-panel="handleChangePanel"
          @navigate="handleNavigate"
        />
        <div
          ref="workspaceSheetRoot"
          class="workspace"
          :class="{
            'workspace--mobile-sheet': isMobile,
            'workspace--sheet-dragging': workspaceSheetDragging,
          }"
          :style="workspaceSheetStyle"
        >
          <div
            v-if="isMobile"
            class="workspace-sheet-handle"
            @pointerdown="onWorkspaceSheetHandlePointerDown"
          >
            <span class="workspace-sheet-handle__bar" aria-hidden="true" />
            <span class="workspace-sheet-handle__text"></span>
          </div>
          <div class="workspace-sheet-body">
            <PoiContent ref="poiContentRef" v-show="activePanel === 'content'" />
            <TypefacePanel v-show="activePanel === 'typeface'" />
            <ColorPanel v-show="activePanel === 'color'" />
            <AlgorithmPanel v-show="activePanel === 'algorithm'" />
          </div>
        </div>
        <SplitterBar />
        <TagCloudCanvas ref="tagCloudCanvasRef" />
      </div>
      <FooterBar @navigate="handleNavigate" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import introJs from 'intro.js';
import 'intro.js/minified/introjs.min.css';
import HeaderBar from '@/components/layout/HeaderBar.vue';
import FooterBar from '@/components/layout/FooterBar.vue';
import SideMenu from '@/components/layout/SideMenu.vue';
import PoiContent from '@/components/content/PoiContent.vue';
import TypefacePanel from '@/components/typeface/TypefacePanel.vue';
import ColorPanel from '@/components/color/ColorPanel.vue';
import AlgorithmPanel from '@/components/algorithm/AlgorithmPanel.vue';
import TagCloudCanvas from '@/components/tagcloud/TagCloudCanvas.vue';
import SplitterBar from '@/components/common/SplitterBar.vue';
import HelpPage from '@/components/help/HelpPage.vue';
import FeedbackPage from '@/components/feedback/FeedbackPage.vue';
import { recordPageVisit } from '@/utils/statistics';
import { useMobileLayout } from '@/composables/useMobileLayout';
import { useWorkspaceBottomSheet } from '@/composables/useWorkspaceBottomSheet';

const { isMobile } = useMobileLayout();
const {
  rootEl: workspaceSheetRoot,
  dragging: workspaceSheetDragging,
  sheetStyle: workspaceSheetStyle,
  onHandlePointerDown: onWorkspaceSheetHandlePointerDown,
} = useWorkspaceBottomSheet(isMobile);

const activePanel = ref('content');
const headerRef = ref(null);
const poiContentRef = ref(null);
const tagCloudCanvasRef = ref(null);
const showHelpPage = ref(false);
const showFeedbackPage = ref(false);

const showHomeWorkspace = computed(
  () => !showHelpPage.value && !showFeedbackPage.value,
);

watch(
  showHomeWorkspace,
  (visible) => {
    if (!visible) return;
    nextTick(() => {
      requestAnimationFrame(() => {
        tagCloudCanvasRef.value?.relayoutAfterShow?.();
        // PoiContent 在「字体/配色/算法」下为 display:none，此时容器宽高为 0，
        // 对高德 map.resize() 会破坏底图与覆盖物；仅在实际展示「内容」面板时再调整地图。
        if (activePanel.value === 'content') {
          poiContentRef.value?.relayoutMap?.();
        }
      });
    });
  },
  { flush: 'post' },
);

watch(
  activePanel,
  (panel) => {
    if (panel !== 'content') return;
    nextTick(() => {
      requestAnimationFrame(() => {
        poiContentRef.value?.relayoutMap?.();
      });
    });
  },
  { flush: 'post' },
);

let firstIntroStarted = false;
let currentIntro = null;

// localStorage key for tutorial preference
const TUTORIAL_DISABLED_KEY = 'fabricTagCloud_tutorialDisabled';

// Check if tutorial should be disabled
const shouldDisableTutorial = () => {
  return localStorage.getItem(TUTORIAL_DISABLED_KEY) === 'true';
};

// Save tutorial preference
const saveTutorialPreference = (disabled) => {
  localStorage.setItem(TUTORIAL_DISABLED_KEY, disabled ? 'true' : 'false');
};

// Get current tutorial preference
const getTutorialPreference = () => {
  return localStorage.getItem(TUTORIAL_DISABLED_KEY) === 'true';
};

// Expose function to window for inline event handler
if (typeof window !== 'undefined') {
  window.__saveTutorialPreference = saveTutorialPreference;
  window.__getTutorialPreference = getTutorialPreference;
}

// Helper function to add checkbox to intro content
const addCheckboxToIntro = (content) => {
  // Always read from localStorage to get the latest value
  const isChecked = getTutorialPreference();
  const checkedAttr = isChecked ? 'checked' : '';
  // Inline onchange: immediately save to localStorage and sync all checkboxes
  const checkboxHtml = `<div style="margin-top:16px;padding-top:16px;border-top:1px solid #e2e8f0;text-align:left;"><label style="display:flex;align-items:center;cursor:pointer;font-size:13px;color:#64748b;"><input type="checkbox" class="tutorial-disable-checkbox" ${checkedAttr} style="margin-right:8px;cursor:pointer;width:16px;height:16px;" onchange="if(window.__saveTutorialPreference) { window.__saveTutorialPreference(this.checked); const allCb = document.querySelectorAll('.tutorial-disable-checkbox'); allCb.forEach(cb => cb.checked = this.checked); }" /><span>最近不再默认显示此引导</span></label></div>`;
  return content + checkboxHtml;
};

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

/** 底部导航单项（用于移动端引导分步高亮） */
const getSideMenuPanelElement = (panelKey) => {
  const el = document.querySelector(`.side-menu [data-intro-panel="${panelKey}"]`);
  if (el) return el;
  return getSideMenuElement();
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

/** 标签云工具入口：PC 为顶栏；移动端为画布左上角悬浮按钮 */
const getTagCloudToolsElement = () => {
  if (isMobile.value) {
    if (tagCloudCanvasRef.value?.$el) {
      const fab = tagCloudCanvasRef.value.$el.querySelector('[data-intro-target="tagcloud-mobile-fab"]');
      if (fab) return fab;
    }
    return document.querySelector('[data-intro-target="tagcloud-mobile-fab"]');
  }
  if (tagCloudCanvasRef.value?.$el) {
    const headEl = tagCloudCanvasRef.value.$el.querySelector('.panel-head');
    if (headEl) return headEl;
  }
  return document.querySelector('.tagcloud-panel .panel-head');
};

const getHeaderNavElement = () => {
  const pcNav = document.querySelector('[data-intro-target="header-nav-pc"]');
  if (pcNav) return pcNav;
  const mobileMenu = document.querySelector('[data-intro-target="header-nav-menu"]');
  if (mobileMenu) return mobileMenu;
  return getHeaderElement();
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
  return getHeaderNavElement();
};

const createIntro = () => {
  // Check if introJs is available
  if (!introJs || typeof introJs.tour !== 'function') {
    console.error('Intro.js is not properly loaded');
    throw new Error('Intro.js is not properly loaded');
  }

  const narrow = isMobile.value;

  const intro = introJs.tour();

  const stepNavIntro = narrow
    ? '<div style="line-height:1.6;"><strong style="font-size:16px;color:#1f2333;">菜单</strong><br/><span style="color:#64748b;">点击顶部<span style="color:#399ceb;">菜单图标</span>打开<strong>右侧栏</strong>：包含首页、帮助、意见反馈、关于我们，以及<strong>引导教程</strong>、<strong>论文（MDPI）</strong>、<strong>GitHub</strong>等入口（均为文字，便于识别）。</span></div>'
    : '<div style="line-height:1.6;"><strong style="font-size:16px;color:#1f2333;">顶部导航</strong><br/><span style="color:#64748b;">中间为<strong>首页、帮助、意见反馈、关于我们</strong>；右侧为<span style="color:#399ceb;">引导教程</span>、论文、GitHub 与登录。可随时点击<span style="color:#399ceb;">引导教程</span>重新查看本引导。</span></div>';

  const stepPanelIntroDesktop =
    '<div style="line-height:1.6;"><strong style="font-size:16px;color:#1f2333;">左侧配置栏</strong><br/><span style="color:#64748b;">在此切换<strong>内容、字体、配色、算法</strong>等面板，按顺序完善标签云展示效果。</span></div>';

  const stepMobileContentIntro =
    '<div style="line-height:1.65;"><strong style="font-size:16px;color:#1f2333;">内容</strong><br/><span style="color:#64748b;">底部「内容」用于<strong>地图、数据表与筛选</strong>：查看景点、周边筛选、表格分页等。上方深色区域为标签云预览；可上拖中间工作区调整露出高度。</span></div>';

  const stepMobileTypefaceIntro =
    '<div style="line-height:1.65;"><strong style="font-size:16px;color:#1f2333;">字体</strong><br/><span style="color:#64748b;">底部「字体」用于设置标签<strong>语言、字号、字重、字体库</strong>等文字显示效果。</span></div>';

  const stepMobileColorIntro =
    '<div style="line-height:1.65;"><strong style="font-size:16px;color:#1f2333;">配色</strong><br/><span style="color:#64748b;">底部「配色」用于设置<strong>背景、中心标签与标签文字</strong>的颜色与色带方案。</span></div>';

  const stepMobileAlgorithmIntro =
    '<div style="line-height:1.65;"><strong style="font-size:16px;color:#1f2333;">算法</strong><br/><span style="color:#64748b;">底部「算法」用于选择<strong>标签布局算法</strong>（如多角度径向移位、螺线等），影响标签排布方式。</span></div>';

  const stepMapIntro = narrow
    ? '<div style="line-height:1.6;"><strong style="font-size:16px;color:#1f2333;">地图</strong><br/><span style="color:#64748b;">在「内容」面板中查看地图；可清除绘制、使用<strong>周边筛选</strong>等（具体以当前布局为准）。</span></div>'
    : '<div style="line-height:1.6;"><strong style="font-size:16px;color:#1f2333;">地图展示</strong><br/><span style="color:#64748b;">查看景点分布；使用<strong>地图框选</strong>在地图上绘制区域筛选数据，或使用<strong>周边筛选、检索定位</strong>等工具。</span></div>';

  const stepTableIntro = narrow
    ? '<div style="line-height:1.6;"><strong style="font-size:16px;color:#1f2333;">数据表</strong><br/><span style="color:#64748b;">在「内容」面板下方查看地名、城市、数值/排名等；支持显示全部或所选、分页浏览。</span></div>'
    : '<div style="line-height:1.6;"><strong style="font-size:16px;color:#1f2333;">数据详情</strong><br/><span style="color:#64748b;">查看景点数据列表（地名、城市、排名等），支持显示模式与分页。</span></div>';

  const stepTagToolsIntro = narrow
    ? '<div style="line-height:1.6;"><strong style="font-size:16px;color:#1f2333;">标签云选项</strong><br/><span style="color:#64748b;">点击标签云画布<strong>左上角</strong>悬浮按钮，可调整显示精度、排名/时间、<strong>导出图片</strong>等。</span></div>'
    : '<div style="line-height:1.6;"><strong style="font-size:16px;color:#1f2333;">标签云工具栏</strong><br/><span style="color:#64748b;">在标签云区域上方可调整显示精度、排名与通行时间、<strong>导出图片</strong>等。</span></div>';

  const stepCanvasIntro = narrow
    ? '<div style="line-height:1.6;"><strong style="font-size:16px;color:#1f2333;">标签云画布</strong><br/><span style="color:#64748b;">标签云绘制在此区域；窄屏下右侧缩放条默认隐藏，可在画布上缩放、拖移查看。</span></div>'
    : '<div style="line-height:1.6;"><strong style="font-size:16px;color:#1f2333;">标签云画布</strong><br/><span style="color:#64748b;">系统在此渲染标签云；可使用<strong>右侧工具栏</strong>进行缩放、漫游等操作。</span></div>';

  const stepDoneIntro = narrow
    ? '<div style="text-align:center;line-height:1.6;"><div style="font-size:20px;margin-bottom:12px;">✨ 引导完成！</div><div style="color:#64748b;margin-bottom:16px;">需要再看一遍：打开顶部<span style="color:#399ceb;">菜单</span>，在侧栏中点击<span style="color:#399ceb;">「引导教程」</span>。</div><div style="font-size:12px;color:#94a3b8;margin-top:12px;">祝您使用愉快！</div></div>'
    : '<div style="text-align:center;line-height:1.6;"><div style="font-size:20px;margin-bottom:12px;">✨ 引导完成！</div><div style="color:#64748b;margin-bottom:16px;">需要再看一遍：打开顶部<span style="color:#399ceb;">菜单</span>，在侧栏中点击<span style="color:#399ceb;">「引导教程」</span>。</div><div style="font-size:12px;color:#94a3b8;margin-top:12px;">祝您使用愉快！</div></div>';

  const welcomeIntro = addCheckboxToIntro(
    '<div style="text-align:center;padding:8px 0;"><div style="margin-bottom:12px;"><img src="/img/logo.png" alt="Logo" style="height:40px;object-fit:contain;" /></div><div style="font-size:16px;font-weight:600;color:#1f2333;margin-bottom:8px;">欢迎来到地名标签云网站！</div><div style="font-size:13px;color:#64748b;">让我们带您浏览主要功能，快速上手使用。</div></div>',
  );

  /** 移动端：欢迎 → 菜单 → 内容 / 字体 / 配色 / 算法 各一步 → 完成 */
  const stepsMobile = [
    { intro: welcomeIntro },
    { element: getHeaderNavElement(), intro: addCheckboxToIntro(stepNavIntro) },
    { element: getSideMenuPanelElement('content'), intro: addCheckboxToIntro(stepMobileContentIntro) },
    { element: getSideMenuPanelElement('typeface'), intro: addCheckboxToIntro(stepMobileTypefaceIntro) },
    { element: getSideMenuPanelElement('color'), intro: addCheckboxToIntro(stepMobileColorIntro) },
    { element: getSideMenuPanelElement('algorithm'), intro: addCheckboxToIntro(stepMobileAlgorithmIntro) },
    { element: getTutorialButtonElement(), intro: addCheckboxToIntro(stepDoneIntro) },
  ];

  const stepsDesktop = [
    { intro: welcomeIntro },
    { element: getHeaderNavElement(), intro: addCheckboxToIntro(stepNavIntro) },
    { element: getSideMenuElement(), intro: addCheckboxToIntro(stepPanelIntroDesktop) },
    { element: getMapElement(), intro: addCheckboxToIntro(stepMapIntro) },
    { element: getTableElement(), intro: addCheckboxToIntro(stepTableIntro) },
    { element: getTagCloudToolsElement(), intro: addCheckboxToIntro(stepTagToolsIntro) },
    { element: getCanvasElement(), intro: addCheckboxToIntro(stepCanvasIntro) },
    { element: getTutorialButtonElement(), intro: addCheckboxToIntro(stepDoneIntro) },
  ];

  const steps = narrow ? stepsMobile : stepsDesktop;
  
  intro.addSteps(steps);

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

  // Helper function to sync all checkboxes from localStorage
  const syncAllCheckboxes = () => {
    // Always read latest value from localStorage
    const isDisabled = getTutorialPreference();
    const checkboxes = document.querySelectorAll('.tutorial-disable-checkbox');
    checkboxes.forEach((checkbox) => {
      // Update checkbox state from localStorage
      checkbox.checked = isDisabled;
      // Add event listener if not already attached
      if (!checkbox.hasAttribute('data-listener-attached')) {
        checkbox.setAttribute('data-listener-attached', 'true');
        checkbox.addEventListener('change', (e) => {
          // Immediately save to localStorage when user clicks
          saveTutorialPreference(e.target.checked);
          // Immediately sync all checkboxes
          const allCheckboxes = document.querySelectorAll('.tutorial-disable-checkbox');
          allCheckboxes.forEach((cb) => {
            cb.checked = e.target.checked;
          });
        });
      }
    });
  };
  
  // Sync checkboxes when step changes - always read from localStorage
  // Use multiple attempts to ensure DOM is fully rendered
  if (typeof intro.onchange === 'function') {
    intro.onchange(() => {
      // Use requestAnimationFrame to ensure browser has rendered
      requestAnimationFrame(() => {
        nextTick(() => {
          syncAllCheckboxes();
          // Also try after a short delay to catch any late rendering
          setTimeout(() => {
            syncAllCheckboxes();
          }, 100);
        });
      });
    });
  }
  
  // Also sync checkboxes when intro starts (for the first step)
  // Use onstart if available, otherwise sync will happen on first step change
  if (typeof intro.onstart === 'function') {
    intro.onstart(() => {
      nextTick(() => {
        syncAllCheckboxes();
        setTimeout(() => {
          syncAllCheckboxes();
        }, 50);
      });
    });
  }
  
  // Use MutationObserver to catch tooltip rendering and sync checkboxes
  let syncTimeout = null;
  const observer = new MutationObserver((mutations) => {
    // Debounce to avoid too frequent updates
    if (syncTimeout) {
      clearTimeout(syncTimeout);
    }
    syncTimeout = setTimeout(() => {
      // Check if tooltip exists and has checkbox
      const tooltip = document.querySelector('.introjs-tooltip');
      if (tooltip) {
        const checkbox = tooltip.querySelector('.tutorial-disable-checkbox');
        if (checkbox) {
          // Sync from localStorage
          const isDisabled = getTutorialPreference();
          checkbox.checked = isDisabled;
          // Ensure listener is attached
          if (!checkbox.hasAttribute('data-listener-attached')) {
            checkbox.setAttribute('data-listener-attached', 'true');
            checkbox.addEventListener('change', (e) => {
              saveTutorialPreference(e.target.checked);
              const allCheckboxes = document.querySelectorAll('.tutorial-disable-checkbox');
              allCheckboxes.forEach((cb) => {
                cb.checked = e.target.checked;
              });
            });
          }
        }
      }
    }, 10);
  });
  
  // Start observing when intro starts
  intro.onComplete(() => {
    observer.disconnect();
    if (syncTimeout) {
      clearTimeout(syncTimeout);
    }
  });
  
  intro.onExit(() => {
    observer.disconnect();
    if (syncTimeout) {
      clearTimeout(syncTimeout);
    }
  });
  
  // Observe introjs tooltip container for changes
  const observeTooltip = () => {
    const tooltipContainer = document.querySelector('.introjs-tooltipReferenceLayer') || document.body;
    observer.observe(tooltipContainer, {
      childList: true,
      subtree: true,
      attributes: false,
    });
  };
  
  // Start observing after a short delay to ensure intro is initialized
  setTimeout(() => {
    observeTooltip();
  }, 100);

  intro.onComplete(() => {
    // Check checkbox state when completing (check any checkbox, they should all be in sync)
    const checkbox = document.querySelector('.tutorial-disable-checkbox');
    if (checkbox) {
      saveTutorialPreference(checkbox.checked);
    }
    firstIntroStarted = false;
    currentIntro = null;
  });

  intro.onExit(() => {
    // Check checkbox state when exiting (check any checkbox, they should all be in sync)
    const checkbox = document.querySelector('.tutorial-disable-checkbox');
    if (checkbox) {
      saveTutorialPreference(checkbox.checked);
    }
    firstIntroStarted = false;
    currentIntro = null;
  });

  return intro;
};

const restartIntro = () => {
  // Exit current intro if exists
  if (currentIntro) {
    try {
      if (typeof currentIntro.exit === 'function') {
        currentIntro.exit(true);
      } else if (typeof currentIntro.exitIntro === 'function') {
        currentIntro.exitIntro(true);
      }
    } catch (e) {
      console.warn('Error exiting current intro:', e);
    }
  }
  
  // Also try to exit any existing intro.js instance
  try {
    if (introJs && typeof introJs.exit === 'function') {
      introJs.exit(true);
    }
  } catch (e) {
    // Ignore errors
  }
  
  firstIntroStarted = false;
  currentIntro = null;
  
  // Wait a bit for cleanup, then start new intro
  setTimeout(() => {
    nextTick(() => {
      try {
        const intro = createIntro();
        currentIntro = intro;
        // Ensure intro.js is available
        if (!intro || typeof intro.start !== 'function') {
          console.error('Intro.js not properly initialized');
          return;
        }
        console.log('Starting intro.js tour...');
        intro.start();
      } catch (error) {
        console.error('Error starting intro:', error);
        firstIntroStarted = false;
        currentIntro = null;
      }
    });
  }, 200);
};

const initIntro = () => {
  // Check if user has disabled tutorial
  if (shouldDisableTutorial()) {
    return;
  }
  if (firstIntroStarted || showHelpPage.value || showFeedbackPage.value) return;
  firstIntroStarted = true;
  nextTick(() => {
    try {
      const intro = createIntro();
      currentIntro = intro;
      // Ensure intro.js is available
      if (!intro || typeof intro.start !== 'function') {
        console.error('Intro.js not properly initialized');
        firstIntroStarted = false;
        currentIntro = null;
        return;
      }
      intro.start();
    } catch (error) {
      console.error('Error starting intro:', error);
      firstIntroStarted = false;
      currentIntro = null;
    }
  });
};

onMounted(async () => {
  // 记录页面访问，等待完成后触发事件通知 FooterBar 更新
  try {
    await recordPageVisit();
    // 触发自定义事件，通知 FooterBar 访问已记录，可以更新统计数据
    window.dispatchEvent(new CustomEvent('page-visit-recorded'));
  } catch (error) {
    console.warn('记录页面访问失败:', error);
    // 即使失败也触发事件，让 FooterBar 可以加载现有数据
    window.dispatchEvent(new CustomEvent('page-visit-recorded'));
  }
  
  setTimeout(() => {
    if (!showHelpPage.value && !showFeedbackPage.value) {
      initIntro();
    }
  }, 500);
});
</script>

<style lang="scss" scoped>
@use '@/assets/styles/mobile-layout-mixin.scss' as *;

.app-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  position: relative;
}

.app-overlay-page {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

.app-home-stack {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
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
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.workspace .workspace-sheet-body {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.workspace .workspace-sheet-body > * {
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
}

/*
 * 宽屏：避免子面板被 height:100% 钉死，内部 flex 子块（如字体/配色卡片）被压扁重叠。
 * 子项随内容增高，由 workspace-sheet-body 纵向滚动。窄屏仍走下方 @media 规则。
 */
@media (min-width: 901px) {
  .workspace .workspace-sheet-body {
    overflow-x: hidden;
    overflow-y: auto;
  }

  .workspace .workspace-sheet-body > * {
    flex: 0 0 auto;
    height: auto;
    min-height: 0;
    max-height: none;
  }

  /*
   * 「内容」面板：仍需占满工作区高度，内部 work-grid 才能 1fr / 1fr 平分地图与表格。
   * 若与其它面板一样 height:auto，网格行高会随子项撑满视窗，破坏上下各半布局。
   */
  .workspace .workspace-sheet-body > .content-panel {
    flex: 1 1 auto;
    align-self: stretch;
    min-height: 0;
    height: 100%;
    max-height: none;
  }
}

/* 移动端：标签云占满主区域；底栏固定；workspace 为底部抽屉覆盖层（可完全收起） */
@include mobile-layout {
  .app-body {
    display: flex;
    flex-direction: column;
    grid-template-columns: unset;
    overflow: hidden;
    position: relative;
  }

  .app-body > .splitter {
    display: none;
  }

  .app-body > .tagcloud-panel {
    flex: 1 1 auto;
    min-height: 0;
    max-height: none;
    width: 100%;
    min-width: 0;
    position: relative;
    z-index: 1;
    padding-bottom: calc(56px + env(safe-area-inset-bottom, 0px) + 8px);
    box-sizing: border-box;
  }

  .app-body > .workspace.workspace--mobile-sheet {
    position: fixed;
    left: 0;
    right: 0;
    bottom: calc(56px + env(safe-area-inset-bottom, 0px));
    z-index: 260;
    width: 100% !important;
    max-width: none !important;
    min-width: 0 !important;
    /* 抽屉总高度：可高于默认露出的 1/4，便于上拖展开覆盖标签云 */
    height: min(92dvh, calc(100dvh - 48px));
    max-height: 92dvh;
    padding: 0;
    margin: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    border-radius: 16px 16px 0 0;
    box-shadow: 0 -10px 40px rgba(15, 23, 42, 0.2);
    background: #f7f9fc;
    flex: none;
    order: unset;
  }

  .app-body > .workspace.workspace--mobile-sheet.workspace--sheet-dragging {
    box-shadow: 0 -10px 48px rgba(15, 23, 42, 0.25);
  }

  .workspace-sheet-handle {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 10px 16px 8px;
    cursor: grab;
    touch-action: none;
    user-select: none;
    background: linear-gradient(180deg, #eef2f7 0%, #f7f9fc 100%);
    border-radius: 16px 16px 0 0;
    border-bottom: 1px solid rgba(31, 35, 51, 0.08);
  }

  .workspace-sheet-handle:active {
    cursor: grabbing;
  }

  .workspace-sheet-handle__bar {
    width: 40px;
    height: 4px;
    border-radius: 4px;
    background: rgba(31, 35, 51, 0.22);
  }

  .workspace-sheet-handle__text {
    font-size: 12px;
    color: #64748b;
    letter-spacing: 0.02em;
  }

  /*
   * 必须覆盖上方 .workspace .workspace-sheet-body 的规则（更高特异性），
   * 否则子面板仍被 height:100% + flex:1 压扁，字体/配色等纵向卡片会重叠。
   */
  .workspace .workspace-sheet-body {
    display: block;
    flex: 1 1 auto;
    min-height: 0;
    overflow-x: hidden;
    overflow-y: auto;
    padding: 0 14px 20px;
    -webkit-overflow-scrolling: touch;
  }

  .workspace .workspace-sheet-body > * {
    flex: 0 0 auto;
    height: auto;
    min-height: 0;
    max-height: none;
  }
}
</style>

