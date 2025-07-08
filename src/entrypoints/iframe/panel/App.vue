<script setup lang="ts">
import { Home, Close, Peoples, SettingOne, Share, OffScreen } from '@icon-park/vue-next'
import { ref } from 'vue'
import iconLogo from '@/components/icon/logo.vue'
import chatArea from './components/chatArea.vue'
import chatFooter from './components/chatFooter.vue'
import aScrollbar from '@/components/a-scrollbar.vue'
import { useChatPortStore } from './store/chatport'
import { connectChat, chatToBackground } from '@/utils/chat'

const scrollRef = ref<InstanceType<typeof aScrollbar>>()
const chatFooterRef = ref<InstanceType<typeof chatFooter>>()
const chatText = ref('')
const chatList = ref<ChatMessageItem[]>([])
const senderId = ref('')
// 生成消息ID
const generateMsgId = () => `${Date.now()}_${Math.floor(Math.random() * 10000)}`
// 新增：消息状态更新函数（复用逻辑）
const updateMessageStatus = (msgId: string, newStatus: 1 | 2 | 3) => {
  chatList.value = chatList.value.map((msg) => (msg.msgId === msgId ? { ...msg, status: newStatus } : msg))
}

async function sendMessage(text: string) {
  const chatMessage: ChatMessageItem = {
    msgId: generateMsgId(),
    senderId: senderId.value, // 判断是否是当前用户
    content: chatText.value, // 消息内容
    msgType: 'TEXT', // 消息类型
    timestamp: Date.now(), // 消息时间
    Thumbnail: null, // 消息缩略图
    status: 1, // 消息状态
  }
  chatList.value = [...chatList.value, chatMessage]
  // 发送消息后清空输入框
  chatText.value = ''
  scrollRef.value?.updateToBottom()

  // 发送消息到background
  const { success, status, message } = await chatToBackground(chatMessage)
  if (success) {
    updateMessageStatus(chatMessage.msgId, 2)
    console.log('发送消息成功', status, message)
  } else {
    updateMessageStatus(chatMessage.msgId, 3)
    console.error('发送消息失败', message)
  }
}

onMounted(async () => {
  // 初始化
  const userId = await getUserId()
  senderId.value = userId
  // 连接聊天
  connectChat()

  browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    ;(async () => {
      const chatMessage = message as ChatMessageData
      console.log('收到chatPortStore的message', chatMessage)
      switch (chatMessage.type) {
        case 'CHAT':
          chatList.value = [...chatList.value, { senderId: chatMessage.senderId, ...chatMessage.data }]
          break
        default:
          break
      }
      return true
    })()
    return true
  })
})

provide('senderId', senderId)
</script>
<template>
  <div class="ap-area">
    <div class="ap-header">
      <div class="ap-section">
        <div class="grid">
          <div class="icon-box">
            <icon-logo size="24" />
          </div>
        </div>
        <div class="grid">
          <off-screen theme="outline" size="20" fill="#fff" strokeLinejoin="bevel" strokeLinecap="square" />
          <setting-one theme="outline" size="20" fill="#fff" strokeLinejoin="bevel" strokeLinecap="square" />
        </div>
      </div>
      <div class="ap-section">
        <div class="grid">
          <div class="icon-box">
            <peoples theme="outline" size="20" fill="#fff" strokeLinejoin="bevel" strokeLinecap="square" />
            <span class="peoples-count">3</span>
          </div>
          <share theme="outline" size="20" fill="#fff" strokeLinejoin="bevel" strokeLinecap="square" />
        </div>
      </div>
    </div>
    <a-scrollbar ref="scrollRef" class="ap-main" :smooth="true" color="rgba(255,255,255,1)">
      <chat-area :chatList="chatList" />
    </a-scrollbar>
    <chat-footer ref="chatFooterRef" class="ap-footer" v-model="chatText" @send="sendMessage" />
  </div>
</template>

<style lang="scss" scoped>
.ap-area {
  display: flex;
  flex-direction: column;
  background: var(--color-bg-1);
  width: 100%;
  height: 100vh;
}
// header
.ap-header {
  display: grid;
  gap: 10px;
  padding: 12px;
  background: var(--color-bg-1);
  .ap-section {
    &:nth-child(1) {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    &:nth-child(2) {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
  }
}
.ap-main {
  flex: 1;
  border-radius: 8px 8px 0 0;
  overflow: hidden;
  background: var(--color-bg-2);
}
.icon-box {
  display: flex;
  gap: 4px;
  height: 21px;
  line-height: 21px;

  .peoples-count {
    font-size: 14px;
    margin-left: 4px;
  }
}
.grid {
  display: flex;
  align-items: center;
  gap: 10px;
}
</style>
