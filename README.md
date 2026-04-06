# 地名标签云（fabricTagCloud） V4.0

本项目作为一个面向地理信息可视化与空间数据分析的专业级可视化系统，将**多角度径向移位算法**和中心型标签云布局紧密耦合，为研究者和数据分析师提供"地图展示 → 数据筛选 → 标签云生成 → 样式定制"的一站式工作台。项目基于 **Fabric.js + Vue 3 + Pinia** 构建，采用**多角度径向移位算法**实现全局无压盖的标签云绘制，并支持多尺度渲染、实时参数联动、语言切换等高级功能，可应用于旅游景点分析、区域热点识别、地理教学演示、空间数据探索等场景。

---

## 🌐 项目在线访问

本项目已部署在线网站，用户可以直接通过浏览器访问体验完整功能：

🔗 [访问在线网站](https://www.hubutagcloud.cn/)

无需本地下载或安装，即可进行地名标签云的生成、样式调整、数据管理和多尺度展示。

---

## ✨ 特性总览

- **一体化交互流程**：顶部导航、左侧「内容 / 字体 / 配色 / 算法」面板、中间地图与数据表、右侧标签云画布协同布局；首次访问由 Intro.js 分步引导（可勾选「最近不再默认显示」）。
- **高德地图深度整合**：缩放、拖拽、地点检索；点状 / 热力图层切换；**右上角独立控件**切换标准 / 卫星底图；支持圆形 / 矩形 / 多边形框选筛选 POI。
- **周边筛选与检索定位**：将「周边筛选」「清除筛选」等与地图联动；周边筛选支持**基础版**（自动定位 + 半径 + 可选 POI 数量上限）与**高级版**（手动指定中心地名或经纬度）；多级兜底定位（浏览器 → 高德 → IP），失败时可手动输入。
- **数据管线**：默认从 `public/data/chinapoi.json`（紧凑列格式）加载，失败时可回退 CSV；支持在数据表中 **导入 CSV** 替换当前会话数据（列映射、数值语义、中英地名字段检测）；表格「显示全部 / 显示所选」仅影响列表展示，**标签云数据源**在存在地图筛选结果时始终与筛选结果一致。
- **布局算法可切换**（算法面板）：**多角度径向移位**、**单角度径向移位**、**阿基米德螺线**，切换后写入 Pinia，供重新生成标签云时使用。
- **多角度径向移位核心能力**：自适应范围扫描、最优步长偏移等，目标为全局无压盖绘制。
- **多尺度标签云**：粗略 / 精细显示，兼顾全局与局部。
- **字体与配色**：字体面板（语言、类别数量、字号梯度、字重、单一字体库）；配色面板（背景色、**中心标签颜色**、**复色色带 / 单色**切换、配色数量、分位数等离散方式）；参数实时驱动 Fabric 画布。
- **高级交互**：城市排名、驾车通行时间（高德路线能力）、图例悬浮高亮、标签详情、画布漫游与缩放。
- **导出**：标签云支持导出 **PNG / JPEG / SVG**，位图可指定导出宽高；适合汇报与配图。
- **响应式与移动端**：窄屏下标签云占主区域，地图与配置区以**底部抽屉**形式拖出；标签云工具在移动端以悬浮入口展开。
- **访问与生成统计（可选）**：通过 `VITE_STATS_API_URL` 对接后端，记录访问量等（详见 `src/utils/statistics.js`）；未配置或后端不可用时站点仍正常使用。

---

## 🛠 技术栈

- **构建工具**：Vite 5 + ESBuild（原生 ESM，秒级冷启动）
- **框架**：Vue 3  + Pinia（状态管理）
- **UI / 交互**：Element Plus、Intro.js、Sass
- **数据 & 可视化**：Fabric.js Canvas、自研 **多角度径向移位算法**、多尺度渲染模型
- **地图能力**：高德地图 JSAPI 2.0（AMapLoader，含 ToolBar/HeatMap/MassMarks/Driving 等插件）
- **其他工具**：
  - Axios（HTTP 请求）
  - Marked（Markdown 解析）
  - Lodash-es（工具函数）

依赖与脚本定义见 `package.json`。

---

## 📂 项目结构

```text
fabricTagCloud4/
├── public/
│   ├── data/               # 默认 POI：chinapoi.json（推荐）/ chinapoi.csv（备用）
│   └── img/                # 静态图、帮助文档配图
├── scripts/                # 例如 csv-to-json-optimized.py（数据转换）
├── src/
│   ├── assets/styles/      # 全局样式 (SCSS)、移动端混入
│   ├── components/
│   │   ├── algorithm/      # AlgorithmPanel：布局算法选择
│   │   ├── color/          # ColorPanel：背景、中心标签色、复色/单色、色带与离散方式
│   │   ├── common/         # SplitterBar 等
│   │   ├── content/        # PoiMap / PoiTable / PoiContent、ImportDataDialog（CSV 导入）
│   │   ├── feedback/       # FeedbackPage
│   │   ├── help/           # HelpPage + HELP.md（?raw 内联）
│   │   ├── layout/         # HeaderBar、FooterBar、SideMenu
│   │   ├── tagcloud/       # TagCloudCanvas：生成、多尺度、导出
│   │   └── typeface/       # TypefacePanel
│   ├── composables/        # useMobileLayout、useWorkspaceBottomSheet 等
│   ├── stores/poiStore.js  # POI、筛选、字体/配色/算法、导入元信息
│   ├── utils/statistics.js # 可选访问/生成统计 API
│   ├── App.vue / main.js
│   └── ...
├── doc/
├── help.md                 # 指向站内手册 HELP.md 的说明
├── vite.config.js
└── README.md
```

---

## 🚀 快速开始

1. **准备环境**
   - Node.js ≥ 18（Vite 官方推荐版本）
   - 配置高德 JSAPI 的 Referer 白名单，必要时替换 `PoiMap.vue` 中的 `key`

2. **安装依赖**

   ```bash
   npm install
   ```

3. **本地开发**

   ```bash
   npm run dev
   ```

   - 默认启动在 `http://localhost:5173`
   - 支持 Vite HMR，适合快速迭代前端面板

4. **生产构建 / 预览**

   ```bash
   npm run build
   npm run preview
   ```

5. **环境变量配置（可选）**

   如果需要自定义统计服务后端地址，创建 `.env` 文件：

   ```bash
   # 开发环境：使用 localhost
   VITE_STATS_API_URL=http://localhost:3001
   
   # 生产环境：留空使用相对路径（通过 Nginx 代理）
   # 或者设置为完整的后端地址
   VITE_STATS_API_URL=
   ```

   生产环境推荐使用相对路径 `/stats-api`，通过 Nginx 代理到后端服务。

---

## 🔧 核心模块说明

| 模块 | 功能摘要 |
| --- | --- |
| `src/App.vue` | 整体布局、侧栏四面板切换、帮助/反馈页切换、Intro.js 引导（含「不再显示」持久化）、移动端工作区抽屉。 |
| `src/components/content/PoiMap.vue` | 地图、框选筛选、热力/点图层、检索定位、周边筛选（基础/高级）、右上角底图切换、加载遮罩与悬浮地名等。 |
| `src/components/content/PoiTable.vue` | 表格展示、`visibleMode`、导入入口、与地图筛选联动。 |
| `src/components/content/ImportDataDialog.vue` | CSV 解析、列映射、导入后替换会话内 `poiList` 与 `importMeta`。 |
| `src/stores/poiStore.js` | JSON/CSV 加载、`tagCloudList` 与 `visibleList` 分离、字体/配色/算法、`applyImportedPoiData`。 |
| `src/components/algorithm/AlgorithmPanel.vue` | 多角度 / 单角度 / 阿基米德螺线算法选择与说明文案。 |
| `src/components/layout/SideMenu.vue` 等 | 侧栏切换面板；快捷「帮助」跳转站内手册。 |
| `src/components/tagcloud/TagCloudCanvas.vue` | Fabric 渲染、多尺度、排名/通行时间、PNG/JPEG/SVG 导出对话框。 |
| `src/utils/statistics.js` | 可选 `recordPageVisit` / `getStatistics` 等与 `VITE_STATS_API_URL` 配合。 |

---

## 📊 数据与地图资源

- `public/data/chinapoi.json`：默认 POI 主数据源（推荐；支持 `columns + data` 紧凑格式，见 `poiStore` 解析逻辑）。
- `public/data/chinapoi.csv`：备用数据源（将 `poiStore.js` 中 `DATA_SOURCE` 设为 `'csv'` 或 JSON 加载失败时回退）。
- `public/img/*.png`：演示图、Logo、帮助文档引用图。
- **地图 Key**：在 `PoiMap.vue` 中配置高德 Key，并在高德控制台配置 **JSAPI 安全密钥与 Referer 白名单**。
- **CSV 导入**：字段需包含地名与经纬度等；导入仅影响当前浏览器会话，**刷新页面恢复默认数据**。

---

## 🖼 效果展示

### PC 端页面

- **首页**
  ![首页](./public/img/首页.png)

- **渲染标签云**
  ![渲染标签云](./public/img/渲染标签云.png)

- **切换中文字体**：
  ![切换中文字体](./public/img/切换中文字体.png)

- **切换英文**：
  ![切换英文](./public/img/切换英文.png)

- **切换背景色与配色**：
  ![切换背景色与配色](./public/img/切换背景色与配色.png)

- **算法切换（阿基米德螺线算法）**：
  ![阿基米德螺线算法](./public/img/阿基米德螺线算法.png)

- **多尺度渲染（精细显示）**：
  ![精细显示](./public/img/精细显示.png)

- **显示排名与通行时间**：
  ![显示排名与通行时间](./public/img/显示排名与通行时间.png)

### 移动端页面

- **移动端渲染效果**：
  ![移动端渲染效果](./public/img/标签云渲染（移动端）.png)


---

## 🧭 系统工作流

1. **地图与数据**：查看 POI（点/热力）、检索定位、必要时使用**周边筛选**（半径与中心）或**框选**筛选数据。
2. **（可选）导入自有数据**：在数据表区域使用 **导入 CSV**，完成列映射后替换当前会话数据。
3. **数据表**：编辑单元格、行选、显示全部或仅显示所选；注意标签云在存在地图筛选时以筛选结果为准。
4. **生成标签云**：点击「运行生成标签云」；可在 **算法** 面板预先选择布局算法后再生成。
5. **字体 / 配色**：调整语言、字号梯度、字重、字体；背景色、中心标签色、复色色带或单色模式、离散方式与档数。
6. **多尺度与标注**：粗略/精细显示；可选显示排名、通行时间。
7. **导出**：在标签云工具栏使用 **导出图片**（PNG/JPEG/SVG），按对话框设置尺寸。
8. **帮助与反馈**：顶部导航进入站内帮助（`HELP.md`）或意见反馈页。

更细的图文说明见 **`src/components/help/HELP.md`**（或根目录 **`help.md`** 中的入口说明）。

---

## 🧪 调试与测试建议

- 使用浏览器 DevTools 观察 `Pinia` Store 中的 `poiData`、`filteredPoiData`、`fontConfig`、`colorConfig`，确认数据筛选和配置结果。
- 建议在真实业务数据上线前，替换新的数据源，并在 `poiStore` 中增加字段映射。
- 使用 Vite 的 HMR 功能快速迭代样式面板和标签云渲染逻辑。

---

## 🔄 版本更新说明

### V4.0 主要变化

相比 V3.0 版本，V4.0 进行了全面的技术栈升级：

1. **框架升级**：从纯 JavaScript 重构为 Vue 3 + Composition API
2. **构建工具**：使用 Vite 替代传统构建方式，提升开发体验
3. **UI 组件**：集成 Element Plus，提供更现代化的界面
4. **状态管理**：使用 Pinia 统一管理应用状态
5. **代码组织**：采用组件化开发，提高代码可维护性和复用性
6. **开发体验**：支持热更新、更好的开发工具支持

### 功能兼容性

V4.0 保持了 V3.0 的所有核心功能，同时提供了更好的用户体验和代码维护性。

### TODO

- 进一步优化多角度径向移位算法（小标签落入缝隙等问题）。
- 色带智能推荐或预设场景模板。
- 扩展 AI 相关能力（如语音驱动筛选与生成流程）。
- 侧栏「快捷键」「隐藏」等入口仍为占位提示，可后续落地。

---

## 👥 团队介绍

我们是 **湖北大学制图组**，由资环学院的 **成晓强导师** 领导。团队研究方向涵盖两个核心领域：

1. **专业热点方向：时空大数据可视化**

   - 利用大数据技术与可视化方法，将地理信息、兴趣点数据与空间分析结果以直观方式呈现。
   - 通过交互式可视化工具（如地名标签云）辅助科研分析、教学演示和数据探索。

2. **专业新兴方向：泛地图学理论与方法**

   - 探索新型地图可视化方法，包括**隐喻地图**和**创新可视化技术**。
   - 致力于将传统地理制图与现代计算可视化结合，推动地图学理论与方法的创新发展。

团队成员来自 **地理学、资源与环境、计算机科学与技术** 等相关专业，我们欢迎本科生、研究生及相关科研人员加入，参与前沿研究、项目开发和学术交流。

实验室官网详细介绍请参阅：
🔗 [湖北大学制图组官网](https://www.hubutagcloud.cn/cxq-group/)

---

## 💬 用户参与与建议

我们非常欢迎广大用户参与 **fabricTagCloud** 的优化与发展，您的建议与反馈对我们至关重要。

您可以通过以下渠道与我们交流：

- **网站反馈模块**：在网站内填写反馈表单，提交功能或体验建议。
- **电子邮件联系**：向团队邮箱 1937983507@qq.com 发送意见或改进建议。
- **GitHub 提问**：在本项目 GitHub 仓库提交 issue，与团队直接交流和讨论。

我们期待您的宝贵意见，并将持续改进，让 fabricTagCloud 更加高效、直观、易用。

---

## 📜 许可

本项目仅供学习与课题组内部使用，禁止未经授权的商用。
