<script setup lang="ts">
import tri from '@/components/icon/tri.vue'
defineProps({
  type: {
    type: String,
    default: 'self',
  },
})
</script>
<template>
  <div class="text-bubble" :class="type">
    <div class="text-bubble-content">
      <slot></slot>
      <tri :size="14" :type="type === 'self' ? 'right' : 'left'" :fill="type == 'self' ? '#4EA1FF' : '#ffffff'" class="tri" />
    </div>
  </div>
</template>
<style lang="scss" scoped>
:deep(.tri) {
  position: absolute;
  z-index: 1;
  top: 12px;
}
.text-bubble {
  position: relative;
  border-radius: 8px;
  z-index: 100;
  padding: 12px;
  min-width: 60px;
  min-height: 20px;
  width: -moz-fit-content;
  width: -webkit-fit-content;
  width: fit-content;
  box-shadow: 0 10px 5px 0 rgba(0, 0, 0, 0.3);
  overflow-wrap: break-word;
  word-wrap: break-word;

  &.self {
    margin-right: 15px;
    background: #4ea1ff;
    .tri {
      right: -10px;
    }
  }

  &.others {
    margin-left: 15px;
    background: #fff;
    color: #000;
    .tri {
      left: -10px;
    }
  }
}
</style>
