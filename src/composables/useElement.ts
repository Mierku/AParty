import { ref, onMounted, onBeforeUnmount } from 'vue'

export function useElementSize(elRef: Ref<HTMLElement | null>) {
  const clientHeight = ref(0)
  const scrollHeight = ref(0)

  let observer: ResizeObserver | null = null

  const updateSize = () => {
    if (elRef.value) {
      clientHeight.value = elRef.value.clientHeight
      scrollHeight.value = elRef.value.scrollHeight
    }
  }

  onMounted(() => {
    if (elRef.value) {
      // 首次更新
      updateSize()

      // 创建观察器
      observer = new ResizeObserver((entries) => {
        console.log('resize', entries)
        for (const entry of entries) {
          clientHeight.value = entry.target.clientHeight
          scrollHeight.value = entry.target.scrollHeight
        }
      })

      observer.observe(elRef.value)
    }
  })

  onBeforeUnmount(() => {
    if (observer && elRef.value) {
      observer.unobserve(elRef.value)
      observer.disconnect()
    }
  })

  return {
    elRef,
    clientHeight,
    scrollHeight,
  }
}
