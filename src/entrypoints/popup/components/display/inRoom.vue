<script setup lang="ts">
import { inject, type Ref } from 'vue'
import { Copy } from '@icon-park/vue-next'
import FormInput from '@/components/Form/input.vue'
import { sendToContentScript } from '@/utils/message'
const componentId = inject('componentId') as Ref<number>
const loading = inject('loading') as Ref<boolean>
const inRoom = inject('inRoom') as Ref<boolean>
const roomId = inject('roomId') as Ref<string>
const isHost = inject('isHost') as Ref<boolean>
const roomInfo = inject('roomInfo') as Ref<any>
const controlMode = inject('controlMode') as Ref<string>
const roomIdToJoin = inject('roomIdToJoin') as Ref<string>
const roomControlMode = inject('roomControlMode') as Ref<string>
// 退出房间
async function leaveRoom() {
  try {
    loading.value = true // 显示加载状态

    // 发送退出消息到内容脚本
    const response = await sendToContentScript({
      action: 'leave_room',
    })

    if (!response.success) {
      console.error('退出房间失败:', response?.error || '未知错误')
      throw new Error('退出房间失败')
    }
    // 重置所有状态变量
    inRoom.value = false
    roomId.value = ''
    isHost.value = false
    roomInfo.value = null
    roomControlMode.value = ControlMode.HOST_ONLY

    console.log('成功退出房间，UI已重置')
  } catch (error) {
    console.error('退出房间失败:', error)
    // 可以在这里添加错误提示UI
  } finally {
    loading.value = false // 隐藏加载状态
  }
}
</script>

<template>
  <div class="inner">
    <form-input placeholder="邀请链接">
      <template #suffix>
        <div class="copy-container">
          <copy theme="filled" size="14" fill="#fff" strokeLinejoin="bevel" />
        </div>
      </template>
    </form-input>
    <button class="button" @click="leaveRoom()">Leave Room</button>
  </div>
</template>

<style scoped lang="scss">
.inner {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 32px;
}
.copy-container {
  width: 36px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
    cursor: pointer;
    width: 36px;
    height: 40px;
  }
}
.button {
  padding: 0 16px;
  height: 48px;
  border: 3px solid #e1e1e1;
  font-family: inherit;
  font-weight: 800;
  font-size: 18px;
  &:hover {
  }
}
</style>
