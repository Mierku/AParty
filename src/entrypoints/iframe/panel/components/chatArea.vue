<script setup lang="ts">
import bubble from '@/components/chat/bubble.vue'

const props = defineProps<{
  chatList: ChatMessageItem[] // 直接使用类型，无需运行时声明
}>()
const senderId = inject('senderId')
</script>
<template>
  <div class="chat-area">
    <div class="chat-area-list">
      <div class="chat-message flex" v-for="item in chatList" :key="item.timestamp" :class="{ 'self-right': item.senderId === senderId, 'self-left': item.senderId !== senderId }">
        <div class="avatar">
          <img src="https://img.yzcdn.cn/vant/cat.jpeg" alt="" />
        </div>
        <bubble :type="item.senderId === senderId ? 'self' : 'others'" :status="item.status">
          {{ item.content }}
        </bubble>
      </div>
      <!-- <div class="chat-message flex self-right">
        <div class="avatar">
          <img src="https://img.yzcdn.cn/vant/cat.jpeg" alt="" />
        </div>
        <bubble>
          {{ '哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈' }}
        </bubble>
      </div> -->
    </div>
  </div>
</template>
<style lang="scss" scoped>
.i-icon {
  line-height: 24px;
  height: 24px;
}
.chat-area {
  width: 100%;
  min-height: 100%;

  padding: 12px;
}
.chat-area-list {
  display: grid;
  gap: 24px;
}

.self-right {
  flex-direction: row-reverse;

  :deep(.text-bubble) {
    max-width: 57vw;
  }
}
.self-left {
  flex-direction: row;
  :deep(.text-bubble) {
    max-width: 57vw;
  }
}

.avatar {
  height: 42px;
  width: 42px;
  border-radius: 50%;
  flex-shrink: 0;
  overflow: hidden;
  img {
    width: 100%;
    height: 100%;
  }
}
</style>
