<script setup lang="ts">
const props = defineProps<{
  label?: string
  placeholder: string
}>()
</script>
<template>
  <div class="input-box">
    <div v-if="label" class="input-label">
      <span>{{ label }}</span>
    </div>
    <div class="input-inner-wrapper">
      <div class="input-inner">
        <input required="true" :placeholder="placeholder" type="text" class="message-input" />
      </div>
      <slot name="suffix"></slot>
    </div>
  </div>
</template>
<style scoped>
.input-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.input-inner-wrapper {
  overflow: hidden;
  width: fit-content;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #2d2d2d;
  border-radius: 10px;
  border: 1px solid rgb(63, 63, 63);
}
.input-inner {
  height: 100%;
  padding: 0 15px;
}
.input-inner-wrapper:focus-within {
  border: 1px solid rgb(110, 110, 110);
}

.message-input {
  width: 200px;
  height: 100%;
  background-color: transparent;
  outline: none;
  border: none;

  color: white;
}
</style>
