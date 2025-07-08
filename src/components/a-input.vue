<script setup lang="ts">
import { ref } from 'vue'
import aScrollbar from '@/components/a-scrollbar.vue'
const text = defineModel<string>({ type: String, default: '' })
const textareaRef = ref<HTMLTextAreaElement | null>(null)
function autoResize() {
  console.log('textareaRef.value', textareaRef.value)
  nextTick(() => {
    // 重置高度（重要！）
    textareaRef.value!.style.height = 'auto'
    // // 设置新高度（滚动高度+2px避免边框截断）
    console.log('textareaRef.value!.scrollHeight', textareaRef.value!.scrollHeight)
    const newHeight = Math.min(textareaRef.value!.scrollHeight + 2, 160) // 限制160px
    textareaRef.value!.style.height = newHeight + 'px'
  })
}

// 监听输入事件
watch(text, () => {
  autoResize()
})

// // 页面加载时初始化（处理预填充内容）
window.addEventListener('load', autoResize)
</script>

<template>
  <div class="a-input-block">
    <a-scrollbar class="a-input-wrapper">
      <textarea ref="textareaRef" class="auto-textarea" @keydown.enter.prevent v-model="text" />
    </a-scrollbar>
    <div class="temp-bottom">
      <slot name="bottom" />
    </div>
  </div>
</template>
<style lang="scss" scoped>
.a-input-block {
  display: grid;
  width: 100%;
  gap: 6px;
  border-radius: 8px;
  background: #333335;
}
.a-input-wrapper {
  width: 100%;
}
.auto-textarea {
  width: 100%;
  min-height: 60px; /* 初始最小高度 */
  padding: 12px;
  font-size: 16px;
  border: none;
  outline: none;
  background: transparent;
  color: var(--color-text-1);
  resize: none; /* 禁用默认缩放 */
  overflow-y: hidden; /* 隐藏滚动条 */
  overflow-wrap: break-word;
}
.temp-prefix {
  padding-left: 6px;
}
</style>
