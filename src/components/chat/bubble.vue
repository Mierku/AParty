<script setup lang="ts">
import tri from '@/components/icon/tri.vue'
import { LoadingFour } from '@icon-park/vue-next'
defineProps({
  type: {
    type: String,
    default: 'self',
  },
  status: {
    type: Number,
    default: 2,
  },
})
</script>
<template>
  <div class="text-bubble" :class="type">
    <div class="text-bubble-content">
      <slot></slot>
      <tri :size="14" :type="type === 'self' ? 'right' : 'left'" :fill="type == 'self' ? '#4EA1FF' : '#ffffff'" class="tri" />
      <loading-four v-if="status === 1" class="loading" theme="outline" size="14" fill="#ffffff" :strokeWidth="5" strokeLinecap="square" />
      <check-one v-if="status === 2" theme="filled" size="24" fill="#00a040" strokeLinejoin="bevel" />
      <close-one v-if="status === 3" theme="filled" size="24" fill="#df0000" strokeLinejoin="bevel" />
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

  box-shadow: 0 10px 5px 0 rgba(0, 0, 0, 0.3);
  overflow-wrap: break-word;
  word-wrap: break-word;
  /* 消除亚像素差异 */
  text-rendering: geometricPrecision;
  .loading {
    position: absolute;
    display: flex;
    top: 50%;
    transform: translateY(-50%);
    animation: rotate 1.4s linear infinite; /* 无限旋转 */
    transform-origin: center;
  }
  &.self {
    margin-right: 15px;
    background: #4ea1ff;
    .tri {
      right: -10px;
    }
    .loading {
      left: -50%;
    }
  }

  &.others {
    margin-left: 15px;
    background: #fff;
    color: #000;
    .tri {
      left: -10px;
    }
    .loading {
      right: -50%;
    }
  }
}

@keyframes rotate {
  0% {
    transform: translateY(-50%) rotate(0deg);
  }
  100% {
    transform: translateY(-50%) rotate(360deg);
  }
}
</style>
