<template>
  <div class="app-shell">
    <HeaderBar @navigate="handleNavigate" />
    <div class="app-body">
      <SideMenu
        :active-panel="activePanel"
        @change-panel="handleChangePanel"
      />
      <div class="workspace">
        <PoiContent v-show="activePanel === 'content'" />
        <TypefacePanel v-show="activePanel === 'typeface'" />
        <ColorPanel v-show="activePanel === 'color'" />
      </div>
      <SplitterBar />
      <TagCloudCanvas />
    </div>
    <FooterBar />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import HeaderBar from '@/components/layout/HeaderBar.vue';
import FooterBar from '@/components/layout/FooterBar.vue';
import SideMenu from '@/components/layout/SideMenu.vue';
import PoiContent from '@/components/content/PoiContent.vue';
import TypefacePanel from '@/components/typeface/TypefacePanel.vue';
import ColorPanel from '@/components/color/ColorPanel.vue';
import TagCloudCanvas from '@/components/tagcloud/TagCloudCanvas.vue';
import SplitterBar from '@/components/common/SplitterBar.vue';

const activePanel = ref('content');

const handleChangePanel = (panel) => {
  activePanel.value = panel;
};

const handleNavigate = (route) => {
  console.log('navigate to', route);
};
</script>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  position: relative;
}

.app-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  display: grid;
  grid-template-columns: 108px 1fr 12px 68vw;
  background-color: #fff;
}

.workspace {
  padding: 24px 0px 24px 24px;
  background: #f7f9fc;
  overflow-y: auto;
  min-height: 0;
  height: 100%;
}

.workspace > * {
  display: block;
  height: 100%;
}
</style>

