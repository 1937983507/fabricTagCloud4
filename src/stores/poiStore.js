import { defineStore } from 'pinia';
import axios from 'axios';

// 数据源配置：'json' 使用JSON格式（更快），'csv' 使用CSV格式（备用）
const DATA_SOURCE = 'json'; // 可以改为 'csv' 切换回CSV模式

const CSV_DATA_URL = `${import.meta.env.BASE_URL}data/chinapoi.csv`;
const JSON_DATA_URL = `${import.meta.env.BASE_URL}data/chinapoi.json`;

export const usePoiStore = defineStore('poiStore', {
  state: () => ({
    poiList: [],
    visibleMode: 'all',
    isEditable: false,
    selectedIds: [],
    selectionCenter: null,
    selectionGeometry: null,
    hasDrawing: false, // 是否有绘制覆盖物
    fontSettings: {
      levelCount: 5,
      fontSizes: [64, 52, 44, 36, 28, 24, 20],
      fontFamily: '等线',
      fontWeight: '700',
      language: 'zh', // 语言选择：'zh' 中文，'en' 英文
    },
    colorSettings: {
      background: '#0c1024',
      // 默认使用第四个配色方案（5类的第四个方案，索引3）
      palette: ['rgb(240,249,232)', 'rgb(186,228,188)', 'rgb(123,204,196)', 'rgb(67,162,202)', 'rgb(8,104,172)'],
      inverted: false,
      discreteMethod: 'quantile',
      discreteCount: 5,
    },
  }),
  getters: {
    totalCount: (state) => state.poiList.length,
    selectedCount: (state) => state.selectedIds.length,
    visibleList: (state) => {
      if (state.visibleMode === 'selected') {
        return state.poiList.filter((poi) =>
          state.selectedIds.includes(poi.id),
        );
      }
      return state.poiList;
    },
    selectedPOIs: (state) =>
      state.poiList.filter((poi) => state.selectedIds.includes(poi.id)),
  },
  actions: {
    /**
     * 加载默认数据（根据配置自动选择JSON或CSV）
     */
    async loadDefaultData() {
      if (DATA_SOURCE === 'json') {
        try {
          await this.loadDefaultDataFromJSON();
        } catch (error) {
          console.warn('[poiStore] JSON加载失败，尝试使用CSV:', error);
          // JSON加载失败时，自动回退到CSV
          await this.loadDefaultDataFromCSV();
        }
      } else {
        await this.loadDefaultDataFromCSV();
      }
    },

    /**
     * 从JSON文件加载数据（推荐，性能更好）
     */
    async loadDefaultDataFromJSON() {
      try {
        console.info('[poiStore] 开始从JSON加载数据...');
        const startTime = performance.now();
        
        const response = await axios.get(JSON_DATA_URL, {
          responseType: 'json',
        });
        
        const rawData = response.data;
        if (!Array.isArray(rawData)) {
          throw new Error('JSON数据格式错误：期望数组格式');
        }
        
        this.poiList = rawData.map((item, index) => ({
          id: item.id !== undefined ? item.id : index,
          name: item.name || '',
          name_en: item.name_en || '',
          city: item.city || '',
          rank: item.rank || 0,
          rankInCity: item.rankInCity || 0,
          lng: item.lng || 0,
          lat: item.lat || 0,
          fontSize: this.fontSettings.fontSizes[index % this.fontSettings.fontSizes.length],
          fontColor: this.colorSettings.palette[index % this.colorSettings.palette.length],
          typeface: this.fontSettings.fontFamily,
          selected: false,
        }));

        this.selectedIds = [];
        
        const loadTime = ((performance.now() - startTime) / 1000).toFixed(2);
        console.info(`[poiStore] JSON数据加载完成，共 ${this.poiList.length} 条，耗时 ${loadTime} 秒`);
      } catch (error) {
        console.error('[poiStore] JSON数据加载失败:', error);
        throw error;
      }
    },

    /**
     * 从CSV文件加载数据（备用方案，保留原有逻辑）
     */
    async loadDefaultDataFromCSV() {
      try {
        console.info('[poiStore] 开始从CSV加载数据...');
        const startTime = performance.now();
        
        const response = await axios.get(CSV_DATA_URL, {
          responseType: 'arraybuffer',
        });
        const decoderCandidates = ['gb18030', 'gbk', 'utf-8'];
        let text = null;
        for (const encoding of decoderCandidates) {
          try {
            text = new TextDecoder(encoding, { fatal: false }).decode(response.data);
            if (text && text.trim()) {
              console.info('[poiStore] 使用解码格式', encoding);
              break;
            }
          } catch (decodeError) {
            console.warn('[poiStore] TextDecoder 无法使用', encoding, decodeError);
          }
        }
        if (!text) {
          throw new Error('无法解码 POI 数据');
        }
        const lines = text.split('\n');
        this.poiList = [];

        for (let i = 1; i < lines.length; i++) {
          const currentLine = lines[i].split(',');
          if (currentLine.length < 6) continue;

          const pname = currentLine[0];
          const X_gcj02 = parseFloat(currentLine[1]);
          const Y_gcj02 = parseFloat(currentLine[2]);
          const city = currentLine[3];
          const rankInCity = parseInt(currentLine[4]);
          const rankInChina = parseInt(currentLine[5]);
          const name_en = currentLine.length >= 7 ? currentLine[6].trim() : ''; // 读取英文名，如果不存在则为空字符串

          this.poiList.push({
            id: i - 1,
            name: pname,
            name_en: name_en,
            city: city,
            rank: rankInChina,
            rankInCity: rankInCity,
            lng: X_gcj02,
            lat: Y_gcj02,
            fontSize: this.fontSettings.fontSizes[(i - 1) % this.fontSettings.fontSizes.length],
            fontColor: this.colorSettings.palette[(i - 1) % this.colorSettings.palette.length],
            typeface: this.fontSettings.fontFamily,
            selected: false,
          });
        }

        this.selectedIds = [];
        
        const loadTime = ((performance.now() - startTime) / 1000).toFixed(2);
        console.info(`[poiStore] CSV数据加载完成，共 ${this.poiList.length} 条，耗时 ${loadTime} 秒`);
      } catch (error) {
        console.error('[poiStore] CSV数据加载失败:', error);
        throw error;
      }
    },
    toggleEditMode() {
      this.isEditable = !this.isEditable;
    },
    toggleSelect(id) {
      if (this.selectedIds.includes(id)) {
        this.selectedIds = this.selectedIds.filter((item) => item !== id);
      } else {
        this.selectedIds = [...this.selectedIds, id];
      }
      this.poiList = this.poiList.map((poi) => ({
        ...poi,
        selected: this.selectedIds.includes(poi.id),
      }));
    },
    applySelection(ids) {
      this.selectedIds = [...ids];
      this.poiList = this.poiList.map((poi) => ({
        ...poi,
        selected: this.selectedIds.includes(poi.id),
      }));
    },
    showAll() {
      this.visibleMode = 'all';
    },
    showSelected() {
      this.visibleMode = 'selected';
    },
    toggleBulkSelect() {
      if (!this.poiList.length) return;
      if (this.selectedIds.length === this.poiList.length) {
        this.applySelection([]);
      } else {
        this.applySelection(this.poiList.map((poi) => poi.id));
      }
    },
    removeSelected() {
      if (!this.selectedIds.length) return;
      this.poiList = this.poiList.filter(
        (poi) => !this.selectedIds.includes(poi.id),
      );
      this.selectedIds = [];
    },
    updatePoi(updated) {
      this.poiList = this.poiList.map((poi) =>
        poi.id === updated.id ? { ...poi, ...updated } : poi,
      );
    },
    updateFontLevel(payload) {
      this.fontSettings = {
        ...this.fontSettings,
        ...payload,
      };
      this.poiList = this.poiList.map((poi, index) => ({
        ...poi,
        fontSize: this.fontSettings.fontSizes[index % this.fontSettings.fontSizes.length],
        typeface: this.fontSettings.fontFamily,
        fontWeight: this.fontSettings.fontWeight,
      }));
    },
    updateColorSettings(payload) {
      this.colorSettings = {
        ...this.colorSettings,
        ...payload,
      };
      this.poiList = this.poiList.map((poi, index) => ({
        ...poi,
        fontColor: this.colorSettings.palette[index % this.colorSettings.palette.length],
      }));
    },
    setSelectionContext(context) {
      this.selectionCenter = context?.center ?? null;
      this.selectionGeometry = context?.geometry ?? null;
    },
    setHasDrawing(hasDrawing) {
      this.hasDrawing = hasDrawing;
    },
    clearTagCloud() {
      // 清除标签云状态，触发TagCloudCanvas清除
      this.hasDrawing = false;
    },
  },
});

