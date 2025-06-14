<script setup lang="ts">
import { Home, Close, Peoples, SettingOne, Share, OffScreen } from '@icon-park/vue-next'
import { ref } from 'vue'
import iconLogo from '@/components/icon/logo.vue'
import chatArea from './components/chatArea.vue'
import chatFooter from './components/chatFooter.vue'
import aScrollbar from '@/components/a-scrollbar.vue'
const chatText = ref('')
const chatList = ref([])
function sendMessage(text: string) {
  chatList.value = [...chatList.value, { id: Date.now(), text }]
  chatText.value = ''
}
</script>
<template>
  <div class="ap-area">
    <div class="ap-header">
      <div class="ap-section">
        <div class="grid">
          <div class="icon-box">
            <icon-logo size="18" />
            <span class="logo-text">{{ '1231房间' }}</span>
          </div>
        </div>
        <div class="grid">
          <off-screen theme="outline" size="18" fill="#fff" strokeLinejoin="bevel" strokeLinecap="square" />
          <setting-one theme="outline" size="18" fill="#fff" strokeLinejoin="bevel" strokeLinecap="square" />
        </div>
      </div>
      <div class="ap-section">
        <div class="grid">
          <div class="icon-box">
            <peoples theme="outline" size="18" fill="#fff" strokeLinejoin="bevel" strokeLinecap="square" />
            <span class="peoples-count">3</span>
          </div>
          <share theme="outline" size="18" fill="#fff" strokeLinejoin="bevel" strokeLinecap="square" />
        </div>
      </div>
    </div>
    <a-scrollbar class="ap-main" :smooth="true" color="rgba(255,255,255,1)">
      <chat-area :chatList="chatList" />
    </a-scrollbar>
    <chat-footer class="ap-footer" v-model="chatText" @send="sendMessage" />
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
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 999;
  display: grid;
  height: 76px; // 52 + 24
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
  margin-top: 76px;
  border-radius: 8px 8px 0 0;
  overflow: hidden;
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
