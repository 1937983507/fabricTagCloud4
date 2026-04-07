/**
 * 高德 JSAPI Loader 公共参数（Key 等来自环境变量，见项目根目录 .env.example）。
 */
export function getAmapLoaderConfig(extra = {}) {
  const key = import.meta.env.VITE_AMAP_KEY || '';
  const securityJsCode = import.meta.env.VITE_AMAP_SECURITY_JS_CODE || '';

  if (!key && import.meta.env.DEV) {
    console.warn(
      '[amap] 未设置 VITE_AMAP_KEY，地图与驾车路线能力不可用。请在 .env 中配置（参考 .env.example）。',
    );
  }

  const base = {
    key,
    version: '2.0',
    ...extra,
  };
  if (securityJsCode) {
    base.securityJsCode = securityJsCode;
  }
  return base;
}
