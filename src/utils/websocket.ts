import { MessageType, RoomInfo, WS_EVENTS } from './constants'
import { getUserId, saveRoomInfo } from './storage'
import { io, Socket } from 'socket.io-client'

// 消息接口
export interface Message {
  type: MessageType
  roomId: string
  senderId: string
  data?: any
  timestamp?: number
}

// 事件监听器类型
type EventListener = (data: any) => void

// 服务器配置
const SERVER_URL = 'http://localhost:3004' // 根据实际部署地址修改

// 实际WebSocket服务
class RealWebSocketService {
  private socket: Socket | null = null
  private listeners: Map<string, EventListener[]> = new Map()
  private connected: boolean = false
  private reconnecting: boolean = false
  private currentRoomId: string | null = null

  // 连接到服务器
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // 创建Socket.IO连接
        this.socket = io(SERVER_URL, {
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          // 添加CORS配置
          withCredentials: false,
          transports: ['websocket'],
          // 增加ping和timeout参数，解决连接不稳定问题
          timeout: 20000,
          autoConnect: true,
        })

        // 连接成功事件
        this.socket.on('connect', () => {
          console.log('已连接到WebSocket服务器', this.socket?.id)
          this.connected = true
          this.triggerEvent(WS_EVENTS.CONNECT, null)
          resolve()
        })

        // 断开连接事件
        this.socket.on('disconnect', (reason) => {
          console.log(`与WebSocket服务器断开连接，原因: ${reason}，时间: ${new Date().toISOString()}`)
          console.log(`断开时连接状态：socket.id=${this.socket?.id}, connected=${this.connected}, currentRoomId=${this.currentRoomId}`)
          this.connected = false
          this.triggerEvent(WS_EVENTS.DISCONNECT, { reason })
        })

        // 连接错误事件
        this.socket.on('connect_error', (error) => {
          console.error(`WebSocket连接错误: ${error.message}，时间: ${new Date().toISOString()}`)
          this.triggerEvent(WS_EVENTS.ERROR, { message: error.message })
        })

        // 重连尝试事件
        this.socket.on('reconnect_attempt', (attemptNumber: number) => {
          console.log(`正在尝试重新连接 (${attemptNumber})...，时间: ${new Date().toISOString()}`)
          this.reconnecting = true
        })

        // 重连成功事件
        this.socket.on('reconnect', () => {
          console.log('已重新连接到WebSocket服务器')
          this.reconnecting = false
          this.connected = true

          // 如果之前在房间中，尝试重新加入
          this.rejoinRoomAfterReconnect()
        })

        // 重连失败事件
        this.socket.on('reconnect_failed', () => {
          console.error('无法重新连接到WebSocket服务器')
          this.reconnecting = false
          this.triggerEvent(WS_EVENTS.ERROR, { message: '重连失败' })
          reject(new Error('重连失败'))
        })

        // 监听服务器消息
        this.setupServerListeners()
      } catch (error) {
        console.error('WebSocket连接错误:', error)
        reject(error)
      }
    })
  }

  // 断开连接
  disconnect(): void {
    if (this.socket) {
      console.log(`手动断开WebSocket连接，原因: 主动调用disconnect，时间: ${new Date().toISOString()}`)
      console.log(`断开前连接状态：socket.id=${this.socket.id}, connected=${this.connected}, currentRoomId=${this.currentRoomId}`)
      console.trace('断开连接调用堆栈')
      this.socket.disconnect()
      this.connected = false
      this.triggerEvent(WS_EVENTS.DISCONNECT, { reason: '手动断开' })
    } else {
      console.log('WebSocket已经断开连接，无需再次断开')
    }
  }

  // 重连后重新加入房间
  private async rejoinRoomAfterReconnect(): Promise<void> {
    if (!this.currentRoomId) {
      console.log('无房间ID，不需要重新加入')
      return
    }

    console.log(`尝试重新加入房间: ${this.currentRoomId}`)
    try {
      const userId = await getUserId()
      await this.send({
        type: MessageType.JOIN_ROOM,
        roomId: this.currentRoomId,
        senderId: userId,
      })
      console.log(`重新加入房间成功: ${this.currentRoomId}`)
    } catch (error) {
      console.error(`重新加入房间失败: ${this.currentRoomId}`, error)
    }
  }

  // 设置服务器消息监听
  private setupServerListeners(): void {
    if (!this.socket) return

    // 监听服务器发送的房间信息
    this.socket.on(MessageType.ROOM_INFO, (message: Message) => {
      console.log('收到房间信息:', message)
      // 保存房间信息到存储
      if (message.data) {
        // 如果包含房间ID，保存当前房间ID
        if (message.data.roomId) {
          this.currentRoomId = message.data.roomId
        }

        // 保存房间详情
        saveRoomInfo(message.data)
      }

      this.triggerEvent(WS_EVENTS.MESSAGE, message)
    })

    // 监听重定向消息
    this.socket.on(MessageType.REDIRECT, (message: Message) => {
      console.log('收到重定向消息:', message)
      this.triggerEvent('redirect', message)
    })

    // 监听URL变更消息
    this.socket.on(MessageType.URL_CHANGE, (message: Message) => {
      console.log('收到URL变更消息:', message)
      this.triggerEvent(WS_EVENTS.MESSAGE, message)
    })

    // 监听播放控制消息
    this.socket.on(MessageType.PLAY, (message: Message) => {
      console.log('收到播放消息:', message)
      this.triggerEvent(WS_EVENTS.MESSAGE, message)
    })

    // 监听暂停控制消息
    this.socket.on(MessageType.PAUSE, (message: Message) => {
      console.log('收到暂停消息:', message)
      this.triggerEvent(WS_EVENTS.MESSAGE, message)
    })

    // 监听跳转控制消息
    this.socket.on(MessageType.SEEK, (message: Message) => {
      console.log('收到跳转消息:', message)
      this.triggerEvent(WS_EVENTS.MESSAGE, message)
    })

    // 监听用户加入消息
    this.socket.on(MessageType.USER_JOIN, (message: Message) => {
      console.log('收到用户加入消息:', message)
      this.triggerEvent(WS_EVENTS.MESSAGE, message)
    })

    // 监听用户离开消息
    this.socket.on(MessageType.USER_LEAVE, (message: Message) => {
      console.log('收到用户离开消息:', message)
      this.triggerEvent(WS_EVENTS.MESSAGE, message)
    })
    // 监听用户离开消息
    this.socket.on(MessageType.CHAT, (message: Message) => {
      console.log('收到聊天消息:', message)
      this.triggerEvent(WS_EVENTS.CHAT, message)
    })
    // 监听错误消息
    this.socket.on('error', (error: any) => {
      console.error('WebSocket错误:', error)
      this.triggerEvent(WS_EVENTS.ERROR, error)
    })

    // 监听聊天信息
    this.socket.on(MessageType.CHAT, (message: Message) => {
      console.log('收到聊天信息:', message)
      // 保存房间信息到存储
      if (message.data) {
        // 如果包含房间ID，保存当前房间ID
        if (message.data.roomId) {
          this.currentRoomId = message.data.roomId
        }

        // 保存房间详情
        saveRoomInfo(message.data)
      }

      this.triggerEvent(WS_EVENTS.MESSAGE, message)
    })
  }

  // 添加一次性事件监听方法
  once(event: string, callback: EventListener): void {
    const wrappedCallback: EventListener = (data: any) => {
      // 执行一次后自动移除
      this.off(event, wrappedCallback)
      callback(data)
    }

    // 添加包装后的回调
    this.on(event, wrappedCallback)
  }

  // 确保连接状态
  async ensureConnected(): Promise<void> {
    // 添加额外的日志
    const startTime = Date.now()
    console.log(`[${new Date(startTime).toISOString()}] WebSocket连接检查，当前状态:`, this.connected ? '已连接' : this.reconnecting ? '正在重连' : this.socket ? '已创建但未连接' : '未初始化')

    try {
      if (!this.connected && !this.socket) {
        console.log(`[${new Date().toISOString()}] WebSocket未连接，开始建立连接...`)
        await this.connect()
        console.log(`[${new Date().toISOString()}] 连接建立完成，耗时: ${Date.now() - startTime}ms`)
      } else if (this.socket && !this.connected && !this.reconnecting) {
        console.log(`[${new Date().toISOString()}] WebSocket已创建但未连接，尝试重新连接...`)
        // 不要重新创建Socket实例，只需要重新连接
        this.socket.connect()

        // 等待连接建立或超时
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            if (!this.connected) {
              console.error(`[${new Date().toISOString()}] WebSocket重新连接超时`)
              reject(new Error('WebSocket重新连接超时'))
            }
          }, 5000)

          const connectedHandler = () => {
            clearTimeout(timeout)
            this.socket?.off('connect', connectedHandler)
            console.log(`[${new Date().toISOString()}] 重新连接成功，耗时: ${Date.now() - startTime}ms`)
            resolve()
          }

          this.socket?.once('connect', connectedHandler)
        })
      } else if (this.reconnecting) {
        console.log(`[${new Date().toISOString()}] WebSocket正在重连中，等待重连完成...`)
        // 等待重连完成或超时
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            if (!this.connected) {
              console.error(`[${new Date().toISOString()}] WebSocket重连超时`)
              reject(new Error('WebSocket重连超时'))
            }
          }, 5000)

          const reconnectedHandler = () => {
            clearTimeout(timeout)
            console.log(`[${new Date().toISOString()}] 重连完成，耗时: ${Date.now() - startTime}ms`)
            resolve()
          }

          this.once(WS_EVENTS.CONNECT, reconnectedHandler)
        })
      } else {
        console.log(`[${new Date().toISOString()}] WebSocket已连接，Socket.id: ${this.socket?.id}`)
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] 确保WebSocket连接时发生错误:`, error)
      throw error
    }

    // 最终连接状态检查
    console.log(`[${new Date().toISOString()}] 最终连接状态: connected=${this.connected}, socketId=${this.socket?.id}, 总耗时: ${Date.now() - startTime}ms`)
  }

  // 发送消息
  async send(message: Message): Promise<void> {
    // 记录发送之前的状态
    const initialState = {
      connected: this.connected,
      reconnecting: this.reconnecting,
      hasSocket: !!this.socket,
      socketId: this.socket?.id,
      currentRoomId: this.currentRoomId,
      messageType: message.type,
    }
    console.log(`准备发送消息 [${message.type}]，当前状态:`, initialState)

    // 确保连接状态
    try {
      await this.ensureConnected()
    } catch (error) {
      console.error(`确保连接状态失败 [${message.type}]:`, error)
      throw error
    }

    // 添加时间戳
    if (!message.timestamp) {
      message.timestamp = Date.now()
    }

    // 存储当前房间ID（用于重连）并记录状态变化
    const oldRoomId = this.currentRoomId
    if (message.type === MessageType.CREATE_ROOM || message.type === MessageType.JOIN_ROOM) {
      this.currentRoomId = message.roomId
      console.log(`设置currentRoomId: ${oldRoomId} -> ${this.currentRoomId}, 消息类型: ${message.type}`)
    } else if (message.type === MessageType.LEAVE_ROOM) {
      console.log(`清除currentRoomId: ${this.currentRoomId} -> null, 消息类型: ${message.type}`)
      this.currentRoomId = null
    }

    // 使用Socket.IO发送事件
    return new Promise((resolve, reject) => {
      console.log(`开始发送消息: ${message.type} 到房间: ${message.roomId}`, this.socket)

      this.socket?.emit(message.type, message, (response: any) => {
        if (response && response.success) {
          console.log(`消息发送成功: ${message.type}`, response)
          // 检查特殊消息类型，可能需要额外处理
          if (message.type === MessageType.JOIN_ROOM) {
            console.log(`用户(${message.senderId})已成功加入房间${message.roomId}，当前连接状态：connected=${this.connected}`)
          }
          resolve(response.data)
        } else {
          console.error(`消息发送失败: ${message.type}`, response)
          this.triggerEvent(WS_EVENTS.ERROR, response)
          reject(new Error(response?.error || '发送失败'))
        }
      })
    })
  }

  // 添加事件监听器
  on(event: string, callback: EventListener): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)?.push(callback)
  }

  // 移除事件监听器
  off(event: string, callback: EventListener): void {
    if (!this.listeners.has(event)) {
      return
    }

    const eventListeners = this.listeners.get(event)
    if (!eventListeners) return

    const index = eventListeners.indexOf(callback)
    if (index !== -1) {
      eventListeners.splice(index, 1)
    }
  }

  // 触发事件 LongPort
  private triggerEvent(event: string, data: any): void {
    if (!this.listeners.has(event)) {
      return
    }

    const eventListeners = this.listeners.get(event)
    if (!eventListeners) return

    for (const listener of eventListeners) {
      listener(data)
    }
  }

  // 添加获取连接状态的方法
  isConnected(): boolean {
    return this.connected
  }

  // 添加获取当前房间ID的方法
  getCurrentRoomId(): string | null {
    return this.currentRoomId
  }
}

// 创建WebSocket服务实例
const websocketService = new RealWebSocketService()

// 发送消息的辅助函数（添加节流控制）
export const sendMessage = throttle(
  async (type: MessageType, roomId: string, data?: any): Promise<void> => {
    const userId = await getUserId()

    const message: Message = {
      type,
      roomId,
      senderId: userId,
      data,
      timestamp: Date.now(),
    }

    await websocketService.send(message)
  },
  500, // 限制500ms内只能发送一次相同类型的消息
)

// 节流函数实现
function throttle(func: Function, limit: number) {
  let lastCall = 0
  return function (...args: any[]) {
    const now = Date.now()
    if (now - lastCall >= limit) {
      lastCall = now
      return func(...args)
    }
  }
}

export default websocketService
