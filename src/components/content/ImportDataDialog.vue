<template>
  <el-dialog
    v-model="visible"
    title="导入 CSV 数据"
    width="720px"
    destroy-on-close
    class="import-data-dialog"
    @closed="onClosed"
  >
    <div class="import-body">
      <div class="sample-block">
        <div class="sample-header">
          <p class="hint-title">示例字段格式</p>
          <a
            class="sample-download"
            :href="sampleCsvUrl"
            download="示例数据.csv"
          >
            示例数据下载
          </a>
        </div>
        <img
          class="sample-img"
          :src="sampleImgUrl"
          alt="CSV 列表示例"
        />
        <p class="hint-text">
          中文地名、英文地名至少映射一列；经度、纬度、数值列为必填映射；城市为可选项。
        </p>
      </div>

      <el-upload
        :key="uploadKey"
        class="upload-block"
        drag
        :auto-upload="false"
        :show-file-list="true"
        :limit="1"
        accept=".csv,text/csv"
        @change="onFileChange"
      >
        <el-icon class="el-icon--upload"><upload-filled /></el-icon>
        <div class="el-upload__text">将 CSV 拖到此处，或<em>点击选择</em></div>
      </el-upload>

      <div v-if="headers.length" class="options-grid">
        <div class="opt-row">
          <span class="opt-label">文件编码</span>
          <div class="encoding-wrap">
            <el-select v-model="encoding" style="width: 200px" @change="onEncodingManualChange">
              <el-option label="UTF-8" value="utf-8" />
              <el-option label="GB18030" value="gb18030" />
              <el-option label="GBK" value="gbk" />
            </el-select>
            <span v-if="encodingAutoTried" class="encoding-hint">上传时已按内容在 UTF-8 / GB18030 / GBK 中自动择优，若仍有乱码请手动切换</span>
          </div>
        </div>
        <div class="opt-row">
          <span class="opt-label">坐标系</span>
          <el-select v-model="crs" style="width: 280px">
            <el-option label="GCJ-02（国测局 / 高德等）" value="gcj02" />
            <el-option label="WGS84（GPS 原始）" value="wgs84" />
            <el-option label="BD-09（百度）" value="bd09" />
          </el-select>
        </div>
      </div>

      <div v-if="headers.length" class="mapping-section">
        <p class="section-label">字段映射</p>
        <div class="mapping-grid">
          <div class="map-row">
            <span>中文地点名</span>
            <el-select v-model="mapZh" placeholder="不映射" clearable style="width: 100%">
              <el-option
                v-for="(h, i) in headers"
                :key="'zh' + i"
                :label="h || `(列${i + 1})`"
                :value="i"
              />
            </el-select>
          </div>
          <div class="map-row">
            <span>英文地点名</span>
            <el-select v-model="mapEn" placeholder="不映射" clearable style="width: 100%">
              <el-option
                v-for="(h, i) in headers"
                :key="'en' + i"
                :label="h || `(列${i + 1})`"
                :value="i"
              />
            </el-select>
          </div>
          <div class="map-row">
            <span>城市</span>
            <el-select v-model="mapCity" placeholder="不映射" clearable style="width: 100%">
              <el-option
                v-for="(h, i) in headers"
                :key="'city' + i"
                :label="h || `(列${i + 1})`"
                :value="i"
              />
            </el-select>
          </div>
          <div class="map-row">
            <span class="req">经度</span>
            <el-select v-model="mapLng" placeholder="必选" style="width: 100%">
              <el-option
                v-for="(h, i) in headers"
                :key="'lng' + i"
                :label="h || `(列${i + 1})`"
                :value="i"
              />
            </el-select>
          </div>
          <div class="map-row">
            <span class="req">纬度</span>
            <el-select v-model="mapLat" placeholder="必选" style="width: 100%">
              <el-option
                v-for="(h, i) in headers"
                :key="'lat' + i"
                :label="h || `(列${i + 1})`"
                :value="i"
              />
            </el-select>
          </div>
          <div class="map-row">
            <span class="req">数值</span>
            <el-select v-model="mapVal" placeholder="必选" style="width: 100%">
              <el-option
                v-for="(h, i) in headers"
                :key="'v' + i"
                :label="h || `(列${i + 1})`"
                :value="i"
              />
            </el-select>
          </div>
          <div v-if="mapVal != null" class="map-row value-semantics-row">
            <span>数值含义</span>
            <el-radio-group v-model="valueSemantics" class="semantics-radios">
              <el-radio label="rank">排名（数值越小，字号越大）</el-radio>
              <el-radio label="score">热度等（数值越大，字号越大）</el-radio>
            </el-radio-group>
          </div>
        </div>
      </div>

      <div v-if="previewRows.length" class="preview-section">
        <p class="section-label">数据预览（前 {{ previewRows.length }} 条有效行，最多 5 条）</p>
        <el-table :data="previewRows" border size="small" max-height="220">
          <el-table-column prop="name" label="中文地名" min-width="100" show-overflow-tooltip />
          <el-table-column prop="name_en" label="英文地名" min-width="100" show-overflow-tooltip />
          <el-table-column v-if="mapCity != null" prop="city" label="城市" width="100" show-overflow-tooltip />
          <el-table-column prop="lng" label="经度" width="100" />
          <el-table-column prop="lat" label="纬度" width="100" />
          <el-table-column prop="rank" label="数值" width="80" />
        </el-table>
      </div>
    </div>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button
        type="primary"
        :disabled="!canImport"
        :loading="importing"
        @click="doImport"
      >
        导入并替换当前数据
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { UploadFilled } from '@element-plus/icons-vue';
import { usePoiStore, applyImportedPoiData } from '@/stores/poiStore';
import { parseCsvText } from '@/utils/csvParse';
import { guessColumnMapping } from '@/utils/csvColumnGuess';
import { detectBestCsvEncoding } from '@/utils/csvEncodingDetect';
import { toGcj02 } from '@/utils/coordTransform';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue']);

const poiStore = usePoiStore();

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
});

const sampleImgUrl = `${import.meta.env.BASE_URL}img/示例数据.png`;
const sampleCsvUrl = `${import.meta.env.BASE_URL}data/示例数据.csv`;

const fileBuffer = ref(null);
const rawText = ref('');
const encoding = ref('utf-8');
const encodingAutoTried = ref(false);
const headers = ref([]);
const dataRows = ref([]);
const crs = ref('gcj02');
const valueSemantics = ref('rank');

const mapZh = ref(null);
const mapEn = ref(null);
const mapCity = ref(null);
const mapLng = ref(null);
const mapLat = ref(null);
const mapVal = ref(null);

const importing = ref(false);
const uploadKey = ref(0);

function decodeBuffer(buf, enc) {
  try {
    return new TextDecoder(enc, { fatal: false }).decode(buf);
  } catch {
    return new TextDecoder('utf-8', { fatal: false }).decode(buf);
  }
}

function applyGuess() {
  const h = headers.value;
  if (!h.length) return;
  const g = guessColumnMapping(h);
  mapZh.value = g.zh >= 0 ? g.zh : null;
  mapEn.value = g.en >= 0 ? g.en : null;
  mapCity.value = g.city >= 0 ? g.city : null;
  mapLng.value = g.lng >= 0 ? g.lng : null;
  mapLat.value = g.lat >= 0 ? g.lat : null;
  mapVal.value = g.value >= 0 ? g.value : null;
}

function parseText(text) {
  const { headers: h, rows } = parseCsvText(text);
  headers.value = h;
  dataRows.value = rows;
  applyGuess();
}

function redecodeFile() {
  if (!fileBuffer.value) return;
  rawText.value = decodeBuffer(fileBuffer.value, encoding.value);
  parseText(rawText.value);
}

function onEncodingManualChange() {
  encodingAutoTried.value = false;
  redecodeFile();
}

function onFileChange(uploadFile) {
  const raw = uploadFile.raw;
  if (!raw) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    fileBuffer.value = e.target.result;
    const detected = detectBestCsvEncoding(fileBuffer.value);
    encoding.value = detected;
    encodingAutoTried.value = true;
    redecodeFile();
  };
  reader.readAsArrayBuffer(raw);
}

function buildPoiList() {
  const rows = dataRows.value;
  const zhI = mapZh.value;
  const enI = mapEn.value;
  const cityI = mapCity.value;
  const lngI = mapLng.value;
  const latI = mapLat.value;
  const valI = mapVal.value;
  if (lngI == null || latI == null || valI == null) return [];

  const list = [];
  let id = 0;
  for (let r = 0; r < rows.length; r += 1) {
    const cells = rows[r];
    const nameZh = zhI != null ? String(cells[zhI] ?? '').trim() : '';
    const nameEn = enI != null ? String(cells[enI] ?? '').trim() : '';
    if (!nameZh && !nameEn) continue;
    const lngRaw = parseFloat(cells[lngI]);
    const latRaw = parseFloat(cells[latI]);
    if (!Number.isFinite(lngRaw) || !Number.isFinite(latRaw)) continue;
    const valRaw = parseFloat(cells[valI]);
    if (!Number.isFinite(valRaw)) continue;
    const [lng, lat] = toGcj02(lngRaw, latRaw, crs.value);
    const cityStr =
      cityI != null ? String(cells[cityI] ?? '').trim() : '';
    list.push({
      id: id++,
      name: nameZh,
      name_en: nameEn,
      city: cityStr,
      rank: valRaw,
      rankInCity: 0,
      lng,
      lat,
      selected: false,
    });
  }
  return list;
}

function inferNameAvailability(pois) {
  let hasZh = false;
  let hasEn = false;
  for (const p of pois) {
    if (p.name && String(p.name).trim()) hasZh = true;
    if (p.name_en && String(p.name_en).trim()) hasEn = true;
  }
  if (hasZh && hasEn) return 'both';
  if (hasZh) return 'zhOnly';
  if (hasEn) return 'enOnly';
  return null;
}

const previewRows = computed(() => {
  if (mapLng.value == null || mapLat.value == null || mapVal.value == null) return [];
  const zhI = mapZh.value;
  const enI = mapEn.value;
  if (zhI == null && enI == null) return [];
  const all = buildPoiList();
  return all.slice(0, 5);
});

const canImport = computed(() => {
  if (!headers.value.length || !dataRows.value.length) return false;
  if (mapLng.value == null || mapLat.value == null || mapVal.value == null) return false;
  if (mapZh.value == null && mapEn.value == null) return false;
  return buildPoiList().length > 0;
});

function doImport() {
  if (!canImport.value) {
    ElMessage.warning('请检查字段映射与数据');
    return;
  }
  const pois = buildPoiList();
  if (!pois.length) {
    ElMessage.error('没有有效数据行');
    return;
  }
  const availability = inferNameAvailability(pois);
  if (!availability) {
    ElMessage.error('每行至少需要中文或英文地名之一');
    return;
  }
  importing.value = true;
  try {
    applyImportedPoiData(poiStore, pois, {
      valueSemantics: valueSemantics.value,
      nameLanguageAvailability: availability,
      hasCityColumn: mapCity.value != null,
    });
    ElMessage.success(`已导入 ${pois.length} 条数据（刷新页面将恢复默认数据）`);
    visible.value = false;
  } finally {
    importing.value = false;
  }
}

function resetState() {
  uploadKey.value += 1;
  fileBuffer.value = null;
  rawText.value = '';
  headers.value = [];
  dataRows.value = [];
  mapZh.value = null;
  mapEn.value = null;
  mapCity.value = null;
  mapLng.value = null;
  mapLat.value = null;
  mapVal.value = null;
  encoding.value = 'utf-8';
  encodingAutoTried.value = false;
  crs.value = 'gcj02';
  valueSemantics.value = 'rank';
}

function onClosed() {
  resetState();
}

watch(visible, (v) => {
  if (v) {
    resetState();
  }
});
</script>

<style scoped>
.import-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 70vh;
  overflow-y: auto;
}

.sample-block {
  width: 100%;
  box-sizing: border-box;
  padding: 12px;
  background: #fafbfc;
  border-radius: 8px;
  border: 1px solid #ebeef5;
}

.sample-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.hint-title {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.sample-download {
  color: #409eff;
  text-decoration: none;
  font-size: 13px;
  white-space: nowrap;
}

.sample-download:hover {
  color: #66b1ff;
  text-decoration: underline;
}

.sample-img {
  width: 100%;
  max-width: 100%;
  height: auto;
  display: block;
  object-fit: contain;
  border-radius: 4px;
  border: 1px solid #e4e7ed;
}

.hint-text {
  margin: 8px 0 0;
  font-size: 12px;
  color: #909399;
  line-height: 1.5;
}

.upload-block {
  width: 100%;
}

.options-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.opt-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.opt-label {
  min-width: 72px;
  font-size: 13px;
  color: #606266;
}

.mapping-section .section-label,
.preview-section .section-label {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: #303133;
}

.mapping-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.map-row {
  display: grid;
  grid-template-columns: 100px 1fr;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #606266;
}

.map-row .req::before {
  content: '* ';
  color: #f56c6c;
}

.value-semantics-row {
  align-items: center;
}

.semantics-radios {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 20px;
}

.semantics-radios :deep(.el-radio) {
  margin-right: 0;
  height: auto;
  white-space: nowrap;
}

.encoding-wrap {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.encoding-hint {
  font-size: 12px;
  color: #909399;
  line-height: 1.4;
}

.preview-section {
  margin-top: 4px;
}
</style>
