<script setup lang="ts">
import bubble from '@/components/chat/bubble.vue'
interface ChatItem {
  id: number
  text: string
}

const props = defineProps<{
  chatList: ChatItem[] // 直接使用类型，无需运行时声明
}>()
</script>
<template>
  <div class="chat-area">
    <div class="chat-area-list">
      <div class="chat-message flex self-right" v-for="item in chatList" :key="item.id">
        <div class="avatar">
          <img src="https://img.yzcdn.cn/vant/cat.jpeg" alt="" />
        </div>
        <bubble>
          {{ item.text }}
        </bubble>
      </div>
      <div class="chat-message flex self-left">
        <div class="avatar">
          <img src="https://img.yzcdn.cn/vant/cat.jpeg" alt="" />
        </div>
        <bubble type="others">
          {{ '哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈' }}
        </bubble>
      </div>
    </div>
  </div>
</template>
<style lang="scss" scoped>
.i-icon {
  line-height: 24px;
  height: 24px;
}
.chat-area {
  background: var(--color-bg-2);
  padding: 12px;
  width: 100%;
  min-height: 100%;
}
.chat-area-list {
  display: grid;

  gap: 24px;
}

.self-right {
  flex-direction: row-reverse;
  margin-left: 66px;
}
.self-left {
  flex-direction: row;
  margin-right: 66px;
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
