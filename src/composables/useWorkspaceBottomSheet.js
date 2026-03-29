import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue';

function getAppBodyHeight() {
  if (typeof document === 'undefined') return 0;
  const el = document.querySelector('.app-body');
  return el?.clientHeight ?? 0;
}

/** 收起时最小露出高度（拖手条区域，保证可再次上拖展开） */
const MIN_PEEK_PX = 52;

/**
 * 移动端 workspace 底部抽屉：
 * - translateY：0 为完全展开，数值越大越向下收起；
 * - 默认收起后约露出主内容区高度的 1/5（不少于 MIN_PEEK_PX），不完全滑出视区；
 * - 松手后保持当前位置，仅做边界钳制（0～maxTranslate）。
 */
export function useWorkspaceBottomSheet(isMobile) {
  const rootEl = ref(null);
  const translateY = ref(0);
  const dragging = ref(false);
  let maxTranslate = 0;
  let dragStartY = 0;
  let dragStartTranslate = 0;

  const mainAreaHeight = ref(0);

  function updateMainAreaHeight() {
    mainAreaHeight.value = getAppBodyHeight();
  }

  /**
   * @param {number} sheetHeight 抽屉元素当前高度（px）
   */
  function getPeekPx(sheetHeight = 0) {
    const mainH = mainAreaHeight.value || getAppBodyHeight();
    let peek = mainH > 0 ? Math.max(MIN_PEEK_PX, mainH * 0.2) : MIN_PEEK_PX;
    if (sheetHeight > 0) {
      const maxPeek = Math.max(MIN_PEEK_PX, sheetHeight - 32);
      peek = Math.min(peek, maxPeek);
    }
    return peek;
  }

  function measure() {
    const el = rootEl.value;
    if (!el) return;
    const h = el.getBoundingClientRect().height;
    const peek = getPeekPx(h);
    maxTranslate = Math.max(0, h - peek);
    if (translateY.value > maxTranslate) {
      translateY.value = maxTranslate;
    }
  }

  function onWindowPointerMove(e) {
    if (!dragging.value) return;
    measure();
    const dy = e.clientY - dragStartY;
    let next = dragStartTranslate + dy;
    next = Math.max(0, Math.min(maxTranslate, next));
    translateY.value = next;
  }

  function onWindowPointerUp() {
    if (!dragging.value) return;
    dragging.value = false;
    window.removeEventListener('pointermove', onWindowPointerMove);
    window.removeEventListener('pointerup', onWindowPointerUp);
    window.removeEventListener('pointercancel', onWindowPointerUp);
    measure();
    translateY.value = Math.max(0, Math.min(maxTranslate, translateY.value));
  }

  function onHandlePointerDown(e) {
    if (!isMobile.value) return;
    e.preventDefault();
    updateMainAreaHeight();
    measure();
    dragging.value = true;
    dragStartY = e.clientY;
    dragStartTranslate = translateY.value;
    window.addEventListener('pointermove', onWindowPointerMove);
    window.addEventListener('pointerup', onWindowPointerUp);
    window.addEventListener('pointercancel', onWindowPointerUp);
  }

  watch(
    isMobile,
    (m) => {
      nextTick(() => {
        if (!m) {
          translateY.value = 0;
          dragging.value = false;
          return;
        }
        updateMainAreaHeight();
        measure();
        translateY.value = maxTranslate;
      });
    },
    { immediate: true },
  );

  watch(rootEl, () => {
    if (isMobile.value) {
      nextTick(() => {
        updateMainAreaHeight();
        measure();
        if (translateY.value > maxTranslate) translateY.value = maxTranslate;
      });
    }
  });

  const resizeObserver = new ResizeObserver(() => {
    if (isMobile.value) {
      updateMainAreaHeight();
      measure();
      if (translateY.value > maxTranslate) translateY.value = maxTranslate;
    }
  });

  watch(
    rootEl,
    (el, prev) => {
      if (prev) resizeObserver.unobserve(prev);
      if (el) resizeObserver.observe(el);
    },
    { immediate: true, flush: 'post' },
  );

  onMounted(() => {
    updateMainAreaHeight();
    window.addEventListener('resize', updateMainAreaHeight);
    window.addEventListener('orientationchange', updateMainAreaHeight);
  });

  onBeforeUnmount(() => {
    resizeObserver.disconnect();
    window.removeEventListener('resize', updateMainAreaHeight);
    window.removeEventListener('orientationchange', updateMainAreaHeight);
  });

  const sheetStyle = computed(() => {
    if (!isMobile.value) {
      return {};
    }
    return {
      transform: `translateY(${translateY.value}px)`,
      transition: dragging.value
        ? 'none'
        : 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
    };
  });

  return {
    rootEl,
    translateY,
    dragging,
    sheetStyle,
    onHandlePointerDown,
    measureSheet: measure,
  };
}
