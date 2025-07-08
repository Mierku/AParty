<template>
  <div class="dropdown-container" ref="dropdownRef" @click.stop>
    <div class="dropdown-trigger" @click="toggleDropdown">
      <Left class="down-icon" theme="filled" size="18" fill="#fff" strokeLinejoin="bevel" :class="{ rotated: showDropdown }" />
    </div>

    <!-- 上拉框内容 -->
    <div class="dropdown-content" v-show="showDropdown">
      <div class="dropdown-header">
        <span class="dropdown-title">{{ title }}</span>
      </div>
      <div class="dropdown-options">
        <div v-for="option in options" :key="option.value" class="dropdown-option" :class="{ active: isSelected(option.value) }" @click="toggleSelection(option.value)">
          <span class="option-label">{{ option.label }}</span>
          <span class="option-check" v-if="isSelected(option.value)">✓</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Down, Left } from '@icon-park/vue-next'

// 定义选项接口
interface Option {
  value: string
  label: string
}

// 定义组件props
interface Props {
  title?: string
  options: Option[]
  modelValue: string[]
  placeholder?: string
}

// 定义组件emits
interface Emits {
  (e: 'update:modelValue', value: string[]): void
}

// 获取props和emits
const props = withDefaults(defineProps<Props>(), {
  title: '请选择',
  placeholder: '未选择',
})

const emit = defineEmits<Emits>()

// 下拉框显示状态
const showDropdown = ref(false)

// 切换下拉框显示状态
const toggleDropdown = () => {
  showDropdown.value = !showDropdown.value
}

// 切换选中状态（复选框模式）
const toggleSelection = (value: string) => {
  const currentSelection = [...props.modelValue]
  const index = currentSelection.indexOf(value)

  if (index > -1) {
    // 如果已选中，则取消选中
    currentSelection.splice(index, 1)
  } else {
    // 如果未选中，则添加选中
    currentSelection.push(value)
  }

  // 触发更新事件
  emit('update:modelValue', currentSelection)
}

// 检查某个值是否被选中
const isSelected = (value: string) => {
  return props.modelValue.includes(value)
}

// 获取当前组件的引用
const dropdownRef = ref<HTMLElement | null>(null)

// 点击外部关闭下拉框
const handleClickOutside = (event: Event) => {
  const target = event.target as HTMLElement
  if (dropdownRef.value && !dropdownRef.value.contains(target)) {
    showDropdown.value = false
  }
}

// 组件挂载时添加全局点击监听
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

// 组件卸载时移除监听
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped lang="scss">
// 下拉框样式
.dropdown-container {
  position: relative;
  z-index: 1000;
}

.dropdown-trigger {
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 3px;
  transition: all 0.2s ease;

  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
}

.down-icon {
  transition: transform 0.3s ease;

  &.rotated {
    transform: rotate(90deg);
  }
}

.dropdown-content {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: 8px;
  min-width: 200px;
  background: rgba(30, 30, 30, 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  overflow: hidden;
  animation: dropupFadeIn 0.3s ease;
}

@keyframes dropupFadeIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.dropdown-header {
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
}

.dropdown-title {
  display: block;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
}

.dropdown-current {
  display: block;
  color: #e1e1e1;
  font-size: 12px;
  opacity: 0.8;
}

.dropdown-options {
  padding: 4px 0;
}

.dropdown-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 32px;
  padding: 0 16px;
  line-height: 32px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }

  &.active {
    background-color: rgba(255, 255, 255, 0.15);

    .option-label {
      color: #fff;
      font-weight: 600;
    }
  }
}

.option-label {
  color: #e1e1e1;
  font-size: 14px;
  transition: color 0.2s ease;
}

.option-check {
  color: #fff;
  font-size: 16px;
  font-weight: bold;
}
.i-icon.i-icon-left.down-icon {
  display: flex;
}
</style>
