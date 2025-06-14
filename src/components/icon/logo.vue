<script setup lang="ts">
const props = defineProps<{
  size?: string
  color?: string
}>()
</script>

<template>
  <span>
    <svg :width="size" :height="size" viewBox="0 0 28 26" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M27.6979 23.8347H21.1705L14.0992 11.5867L7.02795 23.8347H0.50061L14.0992 0.281006L27.6979 23.8347Z" fill="white" />
      <path d="M14.0992 18.8099L17.0909 23.9918H11.1075L14.0992 18.8099Z" fill="white" />
    </svg>
  </span>
</template>
