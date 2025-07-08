<script setup lang="ts">
import { ref, inject, type Ref } from 'vue'
import Logo from '@/components/icon/logo.vue'
import DropdownSelector from '@/components/dropdown-selector.vue'
import { getCurrentTab, sendToContentScript } from '@/utils/popup'
import { generateRoomId } from '@/utils/storage'

const loading = inject('loading') as Ref<boolean>

const inRoom = inject('inRoom') as Ref<boolean>
const roomId = inject('roomId') as Ref<string>
const isHost = inject('isHost') as Ref<boolean>
const roomInfo = inject('roomInfo') as Ref<any>
const controlMode = inject('controlMode') as Ref<string>
const roomIdToJoin = inject('roomIdToJoin') as Ref<string>
const roomControlMode = inject('roomControlMode') as Ref<string>
const componentId = inject('componentId') as Ref<number>

// 控制模式选项数组（支持多选）
const selectedModes = ref<string[]>(['HOST_ONLY']) // 默认选中仅房主控制

// 下拉框选项
const controlOptions = [
  { value: 'HOST_ONLY', label: '仅房主控制' },
  { value: 'INTERACTIVE_DISABLED', label: '互动禁止控制' },
]

// 处理控制模式选择变化
const handleControlModeChange = (newModes: string[]) => {
  selectedModes.value = newModes
  // 更新主控制模式（用于创建房间时的兼容性）
  controlMode.value = newModes.length > 0 ? newModes[0] : 'HOST_ONLY'
}

// 创建房间
const createRoom = async () => {
  try {
    console.log('createRoom', loading)
    loading.value = true // 显示加载状态

    console.log('开始创建房间，当前inRoom值:', inRoom.value)

    // 生成房间ID
    const newRoomId = generateRoomId()
    const tab = await getCurrentTab()
    // 直接让内容脚本处理创建房间的逻辑
    const response = await sendToContentScript(
      {
        action: 'create_room',
        roomId: newRoomId,
        controlMode: controlMode.value,
      },
      0,
    )

    // 处理响应
    if (response && response.success) {
      // 更新本地状态
      roomId.value = response.roomId
      roomInfo.value = response.roomInfo
      isHost.value = response.isHost
      inRoom.value = true

      if (response.roomInfo && response.roomInfo.controlMode) {
        roomControlMode.value = response.roomInfo.controlMode
      }

      console.log('房间创建完成，当前状态:', {
        inRoom: inRoom.value,
        roomId: roomId.value,
        isHost: isHost.value,
      })
    } else {
      console.error('创建房间失败:', response?.error || response)
    }
  } catch (error) {
    console.error('创建房间失败:', error)
    // 可以在这里添加错误提示UI
  } finally {
    loading.value = false // 隐藏加载状态
  }
}

// 加入房间
const joinRoom = async () => {
  componentId.value = 2 // 加入房间组件
  //   if (!roomIdToJoin.value) return

  //   try {
  //     loading.value = true // 显示加载状态

  //     console.log('开始加入房间，当前inRoom值:', inRoom.value)

  //     // 直接让内容脚本处理加入房间的逻辑
  //     const response = await sendToContentScript({
  //       action: 'join_room',
  //       roomId: roomIdToJoin.value,
  //     })

  //     // 处理响应
  //     if (response && response.success) {
  //       // 更新UI状态
  //       roomId.value = response.roomId
  //       roomInfo.value = response.roomInfo
  //       isHost.value = response.isHost
  //       inRoom.value = true

  //       if (response.roomInfo && response.roomInfo.controlMode) {
  //         roomControlMode.value = response.roomInfo.controlMode
  //       }

  //       console.log('房间加入完成，当前状态:', {
  //         inRoom: inRoom.value,
  //         roomId: roomId.value,
  //         isHost: isHost.value,
  //       })
  //     } else {
  //       console.error('加入房间失败:', response?.error || '未知错误')
  //     }
  //   } catch (error) {
  //     console.error('加入房间失败:', error)
  //     // 可以在这里添加错误提示UI
  //   } finally {
  //     loading.value = false // 隐藏加载状态
  //   }
}
</script>

<template>
  <div class="inner">
    <logo size="82" :color="'#fff'"></logo>
    <div class="buttons">
      <div class="button-wrapper">
        <button class="button" @click="createRoom">Get Start</button>

        <div class="control-selector">
          <dropdown-selector title="创建房间" :options="controlOptions" v-model="selectedModes" @update:modelValue="handleControlModeChange" placeholder="未选择" />
        </div>
      </div>
      <button class="button" @click="joinRoom">Join Room</button>
      <!-- 
      <div class="divider"></div> -->
    </div>
  </div>
</template>

<style scoped lang="scss">
.inner {
  padding-top: 24px;
  display: flex;
  height: 100%;
  flex-direction: column;
  gap: 4px;
  align-items: center;
}

.divider {
  width: 2px;
  height: 24px;
  background-color: #fff;
}
.button-wrapper {
  display: flex;

  position: relative;
}
.buttons {
  width: auto;
  position: relative;
  flex-direction: column;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 16px;
  font-size: #fff;
}
.button {
  color: #e1e1e1;
  font-weight: 800;
  cursor: pointer;
  border: none;
  background: none;
  text-transform: uppercase;
  transition-timing-function: cubic-bezier(0.25, 0.8, 0.25, 1);
  transition-duration: 400ms;
  transition-property: color;

  &:nth-child(1) {
    transform: translateX(0%);
    font-size: 22px;
  }
  &:nth-child(2) {
    transform: translateX(0%);
    font-size: 18px;
  }

  &:focus,
  &:hover {
    color: #fff;
  }
  &:focus:after,
  &:hover:after {
    width: 100%;
    left: 0%;
  }
  &:after {
    content: '';
    pointer-events: none;
    bottom: -2px;
    left: 50%;
    position: absolute;
    width: 0%;
    height: 2px;
    background-color: #fff;
    transition-timing-function: cubic-bezier(0.25, 0.8, 0.25, 1);
    transition-duration: 400ms;
    transition-property: width, left;
  }
}
// 控制选择器定位样式
.control-selector {
  position: absolute;
  right: -24px;
  top: 50%;
  transform: translateY(-50%);
}
</style>
