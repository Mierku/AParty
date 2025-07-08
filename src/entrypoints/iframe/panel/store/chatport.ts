import { defineStore } from 'pinia'

export const useChatPortStore = defineStore('chatPort', () => {
  const port = ref<Browser.runtime.Port | null>(null)

  function setPort(newPort: Browser.runtime.Port) {
    port.value = newPort
    console.log('setPort', port.value)
  }
  function deletePort() {
    port.value = null
  }
  function sendPortMessage(message: any) {
    console.log('sendPortMessage', port.value)
    port.value?.postMessage(message)
  }
  function onMessage(callback: (message: any, port: Browser.runtime.Port) => void) {
    console.log('onMessage', port.value)
    port.value?.onMessage.addListener(callback)
  }
  function onDisconnect(callback: () => void) {
    port.value?.onDisconnect.addListener(callback)
  }
  return { port, setPort, deletePort, sendPortMessage, onMessage, onDisconnect }
})

// export const useCounterStore = defineStore('counter', () => {
//   const count = ref(0)
//   const name = ref('Eduardo')
//   const doubleCount = computed(() => count.value * 2)
//   function increment() {
//     count.value++
//   }

//   return { count, name, doubleCount, increment }
// })
