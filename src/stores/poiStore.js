import { defineStore } from 'pinia';
import axios from 'axios';

const DATA_URL = '/data/china.json';

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
    },
    colorSettings: {
      background: '#0c1024',
      // 默认使用第三个配色方案（5类的第三个方案，索引2）
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
      const { data } = await axios.get(DATA_URL);
      // china.json是对象格式，需要转换为数组
      const dataArray = Object.values(data);
      this.poiList = dataArray.map((poi, index) => ({
        id: poi.pid ?? index + 1,
        name: poi.pname,
        city: poi.city,
        rank: poi.rankInChina ?? index + 1,
        lng: poi.X_gcj02,
        lat: poi.Y_gcj02,
        fontSize: poi.fontSize ?? this.fontSettings.fontSizes[index % 5],
        fontColor: poi.fontColor ?? this.colorSettings.palette[index % this.colorSettings.palette.length],
        typeface: this.fontSettings.fontFamily,
        selected: false,
      }));
      this.selectedIds = [];
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

