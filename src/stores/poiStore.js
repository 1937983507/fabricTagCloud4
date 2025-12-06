import { defineStore } from 'pinia';
import axios from 'axios';

const DATA_URL = `${import.meta.env.BASE_URL}data/chinapoi.csv`;

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
    async loadDefaultData() {
      try {
        const response = await axios.get(DATA_URL, {
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
      } catch (error) {
        console.error('加载数据失败:', error);
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

