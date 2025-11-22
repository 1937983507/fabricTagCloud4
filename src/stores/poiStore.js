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
    fontSettings: {
      levelCount: 5,
      fontSizes: [64, 52, 44, 36, 28, 24, 20],
      fontFamily: 'Source Han Sans',
      fontWeight: '600',
    },
    colorSettings: {
      background: '#0c1024',
      palette: ['#4F8DF5', '#45C4F9', '#F4B740', '#F8684A', '#9A6BFF'],
      inverted: false,
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
  },
});

