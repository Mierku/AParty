<script setup lang="ts">
import { SmilingFace, Voice, Monitor, User } from '@icon-park/vue-next'
import aInput from '@/components/a-input.vue'

const chatText = defineModel<string>({ type: String, default: '' })
const emit = defineEmits<{
  (e: 'send', text: string): void
}>()
function sendMessage() {
  emit('send', chatText.value)
}
</script>
<template>
  <div class="chat-footer">
    <a-input v-model="chatText">
      <template #bottom>
        <div class="chat-operation">
          <div class="flex">
            <div class="click">
              <monitor theme="outline" size="24" fill="#ffffff" strokeLinejoin="bevel" strokeLinecap="square" />
            </div>
            <div class="click">
              <voice theme="outline" size="24" fill="#ffffff" strokeLinejoin="bevel" strokeLinecap="square" />
            </div>
          </div>
          <div class="flex">
            <div class="click">
              <smiling-face theme="outline" size="24" fill="#ffffff" strokeLinejoin="bevel" strokeLinecap="square" />
            </div>
            <button class="send-btn" @click="sendMessage">发送</button>
          </div>
        </div>
      </template>
    </a-input>
  </div>
</template>
<style lang="scss" scoped>
.chat-footer {
  background: var(--color-bg-2);
  display: flex;
  align-items: center;
  padding: 0 12px 24px 12px;
}
.chat-operation {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px;
}
.send-btn {
  background: rgba(255, 255, 255, 0.1);
  color: var(--color-text-1);
  border-radius: 4px;
  width: 56px;
  padding: 4px 0;
  text-align: center;
  transition: all 0.3s ease;
  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
}
</style>
