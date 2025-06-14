<script setup lang="ts">
defineProps({
  fill: {
    type: String,
    default: '#4EA1FF',
  },
  size: {
    type: Number,
    default: 15,
  },
  type: {
    type: String,
    default: 'right',
  },
})
</script>
<template>
  <svg :class="type" :width="size" :height="size" viewBox="0 0 8 8" :fill="fill" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M3.14975 1.24895C3.52312 0.530393 4.55109 0.530393 4.92447 1.24895L7.17502 5.58015C7.52093 6.24584 7.03786 7.04123 6.28767 7.04123H1.78655C1.03635 7.04123 0.553292 6.24584 0.899197 5.58015L3.14975 1.24895Z"
    />
  </svg>
</template>
<style lang="scss" scoped>
.right {
  transform: rotate(90deg);
}
.left {
  transform: rotate(-90deg);
}
</style>
