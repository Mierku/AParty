<script setup lang="ts">
import FormInput from '@/components/Form/input.vue'
import { inject, type Ref } from 'vue'
import { Return } from '@icon-park/vue-next'
const componentId = inject('componentId') as Ref<number>
function goBack() {
  componentId.value = 0
}
</script>

<template>
  <div class="inner">
    <div class="return-container">
      <return class="return" theme="filled" size="18" fill="#fff" strokeLinejoin="bevel" @click="goBack"></return>
    </div>
    <form-input label="Room Id" placeholder="Please enter room ID" />
    <div class="buttons">
      <button class="button">Join Room</button>
      <!-- <button class="button">Back</button> -->
    </div>
  </div>
</template>
<style lang="scss" scoped>
.inner {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
  justify-content: center;
  align-items: center;
}
.return-container {
  position: absolute;
  top: 0;
  right: 0;
  display: flex;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 3px;
  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
}
.return {
  display: flex;

  // align-self: flex-end;
  // margin-left: 24px;
  // margin-top: 24px;
}
.buttons {
  display: flex;
  gap: 16px;
  margin-top: 24px;

  .button {
    color: #fff;
    font-size: 16px;
    font-weight: 600;
    border-radius: 7px;
    width: 240px;
    height: 40px;
    background: linear-gradient(135deg, #f33232 0%, #ffa8c5 25%, #e9a11b 50%, #2cf7a9 75%, #1df3e8 100%);

    background-size: 400% 100%;
    transition: transform 0.3s, box-shadow 0.3s;
  }
}

@keyframes button-gradient {
  0%,
  100% {
    /* 首尾一致 */
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 100%;
  }
}

.button:hover {
  animation: button-gradient 16s ease-in-out infinite alternate; /* 无限循环动画 */
  transform: translateY(-3px); /* 悬浮轻微上浮 */
  box-shadow: 0 6px 16px rgba(224, 176, 255, 0.3); /* 柔光投影增强立体感 */
}
</style>
