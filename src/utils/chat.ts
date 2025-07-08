import { sendMessagePromise } from './message'

interface ChatMessage {
  senderId: string
  content: string
  msgType: string
  timestamp: number
  Thumbnail: string | null
}
function connectChat() {
  return sendMessagePromise({ type: 'CHAT_CONNECT' })
}
function chatToBackground(message: ChatMessage) {
  return sendMessagePromise({ type: 'CHAT', data: message })
}

export { connectChat, chatToBackground }
