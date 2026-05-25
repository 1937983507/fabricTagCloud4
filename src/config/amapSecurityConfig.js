/**
 * 高德要求：在加载 webapi.amap.com/maps 之前设置安全密钥（与 VITE_AMAP_KEY 配套）。
 * @amap/amap-jsapi-loader 当前不会把 securityJsCode 传给脚本，故必须依赖本文件 + main 入口最先 import。
 */
if (typeof window !== 'undefined') {
  window._AMapSecurityConfig = {
    securityJsCode: import.meta.env.VITE_AMAP_SECURITY_JS_CODE || '',
  };
}
