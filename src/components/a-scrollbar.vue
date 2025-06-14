<template>
  <!-- 滚动容器 -->
  <div class="a-scrollbar" ref="container" @mouseenter="onMouseEnter" @mouseleave="onMouseLeave">
    <!-- 内容区域 -->
    <div class="a-scrollbar_area" ref="content" @scroll="handleContentScroll">
      <div class="a-scrollbar_inner" ref="innerContent">
        <slot></slot>
      </div>
    </div>

    <!-- 垂直滚动条 -->
    <div v-if="showVerticalBar" class="scrollbar-track vertical" @mousedown="startDrag($event, 'vertical')">
      <div
        :class="['scrollbar-thumb', scrollStatus]"
        :style="{
          height: thumbHeight + 'px',
          transform: `translateY(${thumbTop}px)`,
          background: color,
        }"
        @mousedown="startDrag($event, 'vertical')"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
// import { useElementSize } from '@/composables/useElement'
import { useElementSize } from '@vueuse/core'

const props = defineProps({
  // 滚动条颜色（默认半透明灰）
  color: { type: String, default: 'rgba(0,0,0,0.3)' },
  // 是否启用平滑滚动
  smooth: { type: Boolean, default: true },
  // 自动隐藏延时（毫秒）
  autoHideDelay: { type: Number, default: 1000 },
})

const container = ref<HTMLElement | null>(null)
const content = ref<HTMLElement | null>(null)
const innerContent = ref<HTMLElement | null>(null)
const scrollStatus = ref<'dispear' | 'normal' | 'hover' | 'drag'>('dispear')
const thumbHeight = ref(0)
const thumbTop = ref(0)
let dragStartY = 0
let startScrollTop = 0
let hideTimer: number | null = null

const { width, height } = useElementSize(innerContent)

// 计算是否需要显示垂直滚动条
const showVerticalBar = computed(() => {
  if (!content.value) return false

  return height.value > content.value.clientHeight
})

// 内容滚动事件处理
const handleContentScroll = () => {
  if (!content.value || !container.value) return
  // 计算滑块位置（比例同步）
  const scrollRatio = content.value.scrollTop / height.value
  thumbTop.value = scrollRatio * container.value.clientHeight
}

// 鼠标按下滑块时的处理
const startDrag = (e: MouseEvent, type: 'vertical') => {
  if (type !== 'vertical' || !content.value) return

  e.preventDefault()
  scrollStatus.value = 'drag'
  dragStartY = e.clientY
  startScrollTop = content.value.scrollTop

  // 添加全局事件监听
  document.addEventListener('mousemove', handleDrag)
  document.addEventListener('mouseup', stopDrag)
}

// 拖拽过程中的处理
const handleDrag = (e: MouseEvent) => {
  if (!content.value || !container.value) return
  const deltaY = e.clientY - dragStartY
  const dragRatio = deltaY / container.value.clientHeight

  // 根据拖拽距离计算内容滚动位置
  content.value.scrollTop = startScrollTop + dragRatio * height.value
}

// 停止拖拽的处理
const stopDrag = () => {
  scrollStatus.value = 'normal'
  document.removeEventListener('mousemove', handleDrag)
  document.removeEventListener('mouseup', stopDrag)
}

// 鼠标离开容器时的处理
const onMouseLeave = () => {
  scrollStatus.value = 'dispear'
}
// 鼠标离开容器时的处理
const onMouseEnter = () => {
  scrollStatus.value = 'normal'
}

// 计算滑块高度（根据内容比例）
const calculateThumbSize = () => {
  if (!content.value || !container.value) return

  // 核心比例公式[1,5](@ref)
  const visibleRatio = container.value.clientHeight / height.value
  thumbHeight.value = Math.max(30, visibleRatio * container.value.clientHeight)
}

// 监听内容变化（如动态加载）
watch(
  () => content.value?.scrollHeight,
  () => {
    calculateThumbSize()
    handleContentScroll()
  },
)

// 初始化
onMounted(() => {
  calculateThumbSize()
  // 添加ResizeObserver监听尺寸变化
  const resizeObserver = new ResizeObserver(() => {
    calculateThumbSize()
    handleContentScroll()
  })

  if (innerContent.value) {
    resizeObserver.observe(innerContent.value)
  }

  onBeforeUnmount(() => {
    resizeObserver.disconnect()
  })
})
</script>

<style scoped>
.a-scrollbar {
  position: relative;
  overflow: hidden;
  height: 100%;
  width: 100%;
}

.a-scrollbar_area {
  height: 100%;
  width: 100%;
  overflow-y: auto;
}

.a-scrollbar_inner::-webkit-scrollbar {
  display: none;
}

/* 隐藏原生滚动条 */
.a-scrollbar_area::-webkit-scrollbar {
  display: none;
}

.scrollbar-track {
  position: absolute;
  top: 0;
  right: 0;
  width: 12px; /* 苹果风格滚动条宽度 */
  height: 100%;
}

.scrollbar-thumb {
  position: absolute;
  top: 0;
  right: 0;
  width: 100%;
  transition: opacity 0.3s ease; /* 平滑过渡效果 */
  cursor: pointer;
  &.dispear {
    opacity: 0;
  }
  &.normal {
    opacity: 0.2;
  }
  &:hover {
    opacity: 0.4;
  }
  &.drag {
    opacity: 0.6 !important;
  }
}
</style>
