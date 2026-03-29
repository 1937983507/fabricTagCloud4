import { ref, onMounted } from 'vue';

/** 与全局样式、各组件 @media 断点保持一致 */
export const MOBILE_BREAKPOINT_PX = 900;

function getQuery() {
  return `(max-width: ${MOBILE_BREAKPOINT_PX}px)`;
}

function minLayoutWidth() {
  if (typeof window === 'undefined') return 9999;
  const inner = window.innerWidth || 0;
  const client = document.documentElement?.clientWidth || inner;
  const vv = window.visualViewport?.width || inner;
  return Math.min(inner, client, vv);
}

/**
 * 优先 matchMedia；部分机型自带浏览器视口/meta 异常时再结合宽度、触控特征与 UA 兜底。
 */
function computeIsMobile() {
  if (typeof window === 'undefined') return false;

  if (window.matchMedia(getQuery()).matches) return true;

  const minW = minLayoutWidth();
  if (minW <= MOBILE_BREAKPOINT_PX) return true;

  const touchPoints = typeof navigator !== 'undefined' ? navigator.maxTouchPoints || 0 : 0;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const noHover = window.matchMedia('(hover: none)').matches;
  if (touchPoints > 0 && (coarse || noHover) && minW <= 1024) return true;

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
  const uaLooksMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|MiuiBrowser/i.test(
      ua,
    );
  if (uaLooksMobile && minW <= 1280) return true;

  return false;
}

function applyLayoutClass(mobile) {
  if (typeof document === 'undefined') return;
  document.body.classList.toggle('layout-mobile', mobile);
}

/** 全应用共享一份状态与一组监听器 */
const isMobile = ref(
  typeof window !== 'undefined' ? computeIsMobile() : false,
);

let mql;
let listenersBound = false;

function sync() {
  if (typeof window === 'undefined') return;
  const next = computeIsMobile();
  isMobile.value = next;
  applyLayoutClass(next);
}

function bindListeners() {
  if (listenersBound || typeof window === 'undefined') return;
  listenersBound = true;
  mql = window.matchMedia(getQuery());
  mql.addEventListener('change', sync);
  window.addEventListener('resize', sync);
  window.visualViewport?.addEventListener('resize', sync);
  window.visualViewport?.addEventListener('scroll', sync);
}

/**
 * 窄屏布局判断（触控手机 / 小窗），用于折叠地图、数据表等。
 * PC 宽屏始终为 false。
 */
export function useMobileLayout() {
  onMounted(() => {
    bindListeners();
    sync();
  });

  return { isMobile };
}
