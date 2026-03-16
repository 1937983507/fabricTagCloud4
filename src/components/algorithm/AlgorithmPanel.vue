<template>
  <section class="panel-card algorithm-panel">
    <!-- 算法选择 -->
    <div class="config-section">
      <div class="section-header">
        <span class="section-title">算法</span>
        <span class="section-desc">选择标签布局算法</span>
      </div>
      <div class="section-content">
        <div class="algorithm-item">
          <span class="label">布局算法：</span>
          <el-select 
            v-model="algorithmType" 
            placeholder="请选择算法" 
            style="width: 200px"
            @change="handleAlgorithmChange"
          >
            <el-option label="多角度径向移位算法" value="multi-angle" />
            <el-option label="单角度径向移位算法" value="single-angle" />
            <el-option label="阿基米德螺线算法" value="archimedean" />
          </el-select>
        </div>
        <div class="algorithm-desc">
          <p v-if="algorithmType === 'multi-angle'" class="desc-text">
            多角度径向移位算法：对于每个非中心地点标签，在标签与中心位置的真实角方向附近（±15度扇形区域）内，探寻可放置的空余位置。
          </p>
          <p v-if="algorithmType === 'single-angle'" class="desc-text">
            单角度径向移位算法：对于每个非中心地点标签，直接沿着标签与中心位置的真实角方向向外径向移动，直到找到可以放置的空余位置。
          </p>
          <p v-if="algorithmType === 'archimedean'" class="desc-text">
            阿基米德螺线算法：从中心出发沿着连续的螺旋曲线向外布局标签，使整体形状更接近传统词云的紧凑“云团”效果。
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, watch } from 'vue';
import { usePoiStore } from '@/stores/poiStore';

const poiStore = usePoiStore();
const algorithmType = ref(poiStore.algorithmSettings.algorithm || 'multi-angle');

// 算法选择改变
const handleAlgorithmChange = () => {
  poiStore.updateAlgorithmSettings({
    algorithm: algorithmType.value,
  });
};

// 监听算法设置变化，同步到本地状态
watch(
  () => poiStore.algorithmSettings.algorithm,
  (newAlgorithm) => {
    if (newAlgorithm && algorithmType.value !== newAlgorithm) {
      algorithmType.value = newAlgorithm;
    }
  },
  { immediate: true }
);
</script>

<style scoped>
.algorithm-panel {
  min-height: calc(100vh - 160px);
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 0px;
  background: #f5f7fa;
}

.config-section {
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  overflow: hidden;
}

.section-header {
  padding: 16px 20px;
  background: #fafbfc;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.section-desc {
  font-size: 12px;
  color: #909399;
  margin-left: 12px;
}

.section-content {
  padding: 20px;
}

.algorithm-item {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.label {
  font-size: 14px;
  color: #606266;
  min-width: 100px;
}

/* 算法描述 */
.algorithm-desc {
  margin-top: 16px;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 6px;
  border: 1px solid #e4e7ed;
}

.desc-text {
  margin: 0;
  font-size: 13px;
  color: #606266;
  line-height: 1.6;
}
</style>

