interface ChatMessageData {
  type: string
  roomId: string
  senderId: string
  data: ChatMessage
}

interface ChatMessage {
  content: string
  msgType: string
  timestamp: number
  Thumbnail: string | null // 缩略图
}
interface ChatMessageItem extends ChatMessage {
  msgId: string
  senderId: string
  status?: 1 | 2 | 3 // 1: 发送中 2: 发送成功 3: 发送失败
}
interface ChatMessageResponse {
  success: boolean
  status: 'success' | 'error'
  message: string
}
