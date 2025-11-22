# fabricTagCloud4

使用 Vue 3 + Element Plus + Vite 重构的地名标签云平台。功能覆盖原有 `fabricTagCloud3` 的主体布局，包括：

- 顶部导航与侧边功能区
- 高德地图 POI 分布与交互式数据表
- 字体/配色控制面板
- 基于 Fabric.js 动态渲染的标签云画布

## 环境准备（请在项目根目录执行）

```bash
# 1. 安装依赖
npm install

# 2. 启动开发环境
npm run dev

# 3. 打包生产资源
npm run build
```

> 说明：若首次运行 Vite，请确保已安装 Node.js 18+。如需自定义端口，可在 `vite.config.js` 中调整。

## 关键目录

- `src/components`：按功能拆分的 Vue 组件，包含地图、表格、字体、配色与标签云模块
- `src/stores/poiStore.js`：Pinia 数据层，统一管理 POI 数据、选中状态、字体与配色配置
- `public/data/sample-poi.json`：示例数据，可替换为实际的 POI 数据集

## 下一步扩展建议

- 将 `fabricTagCloud3/json` 中的完整数据迁移到 `public/data`
- 根据实际需求扩展登录、帮助、反馈等页面，可使用 Vue Router 进行多页路由管理
- 接入真实的上传/下载与服务器交互逻辑，完善“文件/保存/分享”等导航功能

