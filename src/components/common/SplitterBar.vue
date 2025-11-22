<template>
  <div class="splitter" title="收缩侧边栏">
    <span>⋮</span>
  </div>
</template>

<style scoped>
.splitter {
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: col-resize;
  color: #9ca3af;
  user-select: none;
  background-color: #f0f3f9;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}
</style>

