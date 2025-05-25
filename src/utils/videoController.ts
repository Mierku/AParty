import { MessageType, SUPPORTED_SITES, WS_EVENTS } from './constants'
import { getCurrentRoom, getUserId, getRoomInfo } from './storage'

// 定义视频控制器接口
export interface VideoController {
  play(): void
  pause(): void
  seekTo(time: number): void
  getCurrentTime(): number
  isPlaying(): boolean
  getDuration(): number
  initVideoStatus(video: { currentTime: number; isPlaying: boolean; lastUpdate: number }): void
}

// 不同网站的视频控制器实现
class BilibiliController implements VideoController {
  private video: HTMLVideoElement | null = null

  constructor() {
    this.findVideoElement()
  }

  private findVideoElement(): void {
    this.video = document.querySelector('video')
    console.log('找到视频元素:', this.video)
  }
  initVideoStatus(video: { currentTime: number; isPlaying: boolean; lastUpdate: number }): void {
    console.log('正在初始化视频状态:', video, video.currentTime)

    if (video.isPlaying) {
      console.log('初始化到播放')
      this.video!.currentTime = video.currentTime + (Date.now() - video.lastUpdate) / 1000
      this.video!.play()
    } else {
      console.log('初始化到停止')
      this.video!.currentTime = video.currentTime
      this.video!.pause()
    }
  }
  play(): void {
    if (this.video) {
      this.video.play()
    }
  }

  pause(): void {
    if (this.video) {
      this.video.pause()
    }
  }

  seekTo(time: number): void {
    if (this.video) {
      this.video.currentTime = time
    }
  }

  getCurrentTime(): number {
    return this.video ? this.video.currentTime : 0
  }

  isPlaying(): boolean {
    return this.video ? !this.video.paused : false
  }

  getDuration(): number {
    return this.video ? this.video.duration : 0
  }
}

class YouTubeController implements VideoController {
  private video: HTMLVideoElement | null = null

  constructor() {
    this.findVideoElement()
  }

  private findVideoElement(): void {
    this.video = document.querySelector('video')
  }
  initVideoStatus(video: { currentTime: number; isPlaying: boolean; lastUpdate: number }): void {
    this.video!.currentTime = video.currentTime
    if (video.isPlaying) {
      this.video!.currentTime = video.currentTime + (Date.now() - video.lastUpdate) / 1000
      this.video!.play()
    } else {
      this.video!.currentTime = video.currentTime
      this.video!.pause()
    }
  }
  play(): void {
    if (this.video) {
      this.video.play()
    }
  }

  pause(): void {
    if (this.video) {
      this.video.pause()
    }
  }

  seekTo(time: number): void {
    if (this.video) {
      this.video.currentTime = time
    }
  }

  getCurrentTime(): number {
    return this.video ? this.video.currentTime : 0
  }

  isPlaying(): boolean {
    return this.video ? !this.video.paused : false
  }

  getDuration(): number {
    return this.video ? this.video.duration : 0
  }
}

// 工厂函数，根据当前网站创建对应的控制器
export const createVideoController = (): VideoController | null => {
  const url = window.location.href

  if (url.includes('bilibili.com')) {
    return new BilibiliController()
  } else if (url.includes('youtube.com')) {
    return new YouTubeController()
  }

  return null
}

// 视频同步管理器
export class VideoSyncManager {
  private controller: VideoController | null = null
  private roomId: string | null = null
  private isHost: boolean = false
  private roomInfo: any = null
  private messageHandler: ((message: any) => void) | null = null
  private playHandler: ((event: Event) => Promise<void>) | null = null
  private pauseHandler: ((event: Event) => Promise<void>) | null = null
  private seekedHandler: ((event: Event) => Promise<void>) | null = null
  private backgroundPort: globalThis.Browser.runtime.Port | null = null
  private eventLock: number = 0

  // 添加延迟补偿相关属性
  private networkLatency: number = 0

  constructor(
    backgroundPort: globalThis.Browser.runtime.Port,
    initialRoomId?: string,
    isInitialHost?: boolean,
    initialVideoStatus?: {
      currentTime: number
      isPlaying: boolean
      lastUpdate: number
    },
  ) {
    // 创建视频控制器
    this.controller = createVideoController()
    this.backgroundPort = backgroundPort
    console.log('设置backgroundPort监听器')

    this.backgroundPort.onMessage.addListener((message) => {
      console.log('收到来自background的消息:', message)
      if (this.messageHandler && message.type === 'VIDEO_CONTROL_EVENT') {
        this.messageHandler(message.data)
      }
    })
    // 检查视频控制器是否成功创建
    if (!this.controller) {
      console.error('无法创建视频控制器，当前页面可能不支持')
      return
    }

    // 初始化视频状态(注册前 初始化视频状态 对于加入房间或者刷新的房间的人有用)
    console.log('初始化视频状态:', initialVideoStatus)
    if (initialVideoStatus) {
      this.eventLock = 2
      this.controller.initVideoStatus(initialVideoStatus)
    }
    // 注册视频事件监控
    if (initialRoomId) {
      console.log('初始化视频同步管理器，房间ID:', initialRoomId)
      // 如果外部传入了roomId，直接使用
      this.roomId = initialRoomId
      this.isHost = isInitialHost || false
      this.initializeWithRoomId()
    } else {
      console.log('初始化视频同步管理器，房间ID:', initialRoomId)
      // 否则尝试从后台获取
      this.initialize()
    }
  }

  // 获取当前房间ID
  public getRoomId(): string | null {
    return this.roomId
  }

  // 使用指定的房间ID初始化
  private async initializeWithRoomId(): Promise<void> {
    if (!this.controller || !this.roomId) {
      console.error('无法初始化视频控制器或房间ID无效')
      return
    }

    console.log('初始化视频同步，房间ID:', this.roomId)

    // 获取房间详细信息
    // await this.fetchRoomInfo()

    // 监听视频控制消息
    this.setupMessageListeners()

    // 监听视频元素的事件
    this.setupVideoEventListeners()

    console.log('视频同步管理器已初始化')
  }

  // 获取房间详细信息
  private async fetchRoomInfo(): Promise<void> {
    if (!this.roomId) return

    return new Promise((resolve) => {
      sendMessagePromise({
        type: 'GET_ROOM_INFO',
        data: { roomId: this.roomId },
      }).then((response) => {
        console.log('获取房间信息:', response)
        if (response && response.success && response.roomInfo) {
          // 更新房主状态（如果未明确指定）
          if (this.isHost === undefined) {
            getUserId().then((userId) => {
              this.isHost = response.roomInfo.host === userId
            })
            console.log('成功获取房间信息:', this.roomId)
          }
          console.warn('获取房间信息失败:', response?.message || '未知错误')

          resolve()
        }
      })
    })
    //   browser.runtime.sendMessage(
    //     {
    //       type: 'GET_ROOM_INFO',
    //       data: { roomId: this.roomId },
    //     },
    //       if (response && response.success && response.roomInfo) {
    //         this.roomInfo = response.roomInfo

    //         // 更新房主状态（如果未明确指定）
    //         if (this.isHost === undefined) {
    //           getUserId().then((userId) => {
    //             this.isHost = this.roomInfo.host === userId
    //           })
    //         }

    //         console.log('成功获取房间信息:', this.roomId)
    //       } else {
    //         console.warn('获取房间信息失败:', response?.message || '未知错误')
    //       }
    //       resolve()
    //     },
    //   )
    // })
  }

  // 从后台获取房间信息并初始化
  private async initialize(): Promise<void> {
    if (!this.controller) {
      console.error('无法初始化视频控制器')
      return
    }

    // 从后台获取当前房间信息
    return new Promise((resolve) => {
      browser.runtime.sendMessage(
        {
          type: 'GET_ROOM_INFO',
          data: {},
        },
        async (response) => {
          if (response && response.success && response.roomId) {
            this.roomId = response.roomId

            const userId = await getUserId()
            this.isHost = response.roomInfo && response.roomInfo.host === userId

            // 初始化视频同步
            await this.initializeWithRoomId()
            console.log('成功初始化视频同步管理器，房间ID:', this.roomId)
          } else {
            console.log('未加入任何房间，不初始化同步')
          }
          resolve()
        },
      )
    })
  }

  // 设置消息监听器
  private setupMessageListeners(): void {
    this.messageHandler = (message: any) => {
      if (!this.controller || !this.roomId || message.roomId !== this.roomId) {
        return
      }
      console.log('MessageType', message.type, message.data)
      const { currentTime, lastUpdate, isPlaying } = message.data
      // 计算网络延迟（使用目标客户端时间戳减去源客户端时间戳）
      if (lastUpdate) {
        const now = Date.now()
        this.networkLatency = now - lastUpdate
      }
      switch (message.type) {
        case MessageType.PLAY:
          // 如果是播放事件，先跳转到目标时间点（加上延迟补偿）
          if (message.data && currentTime !== undefined) {
            const targetTime = currentTime
            const latencyCompensation = this.calculateLatencyCompensation(targetTime)
            console.log(`播放补偿: 原始时间=${targetTime}, 补偿后=${latencyCompensation}, 延迟=${this.networkLatency}ms`)
            this.eventLock++
            this.controller.seekTo(latencyCompensation)
          }
          this.eventLock++
          this.controller.play()
          break
        case MessageType.PAUSE:
          // 如果是暂停事件，检查时间差
          if (message.data && currentTime !== undefined) {
            const targetTime = currentTime
            const newCurrentTime = this.controller.getCurrentTime()
            const timeDiff = Math.abs(newCurrentTime - targetTime)

            if (timeDiff > 1) {
              // 如果时间差超过1秒，先跳转到目标时间点
              console.log(`暂停跳转: 当前时间=${currentTime}, 目标时间=${targetTime}`)
              this.eventLock++
              this.controller.seekTo(targetTime)
            }
          }
          this.eventLock++
          this.controller.pause()
          break
        case MessageType.SEEK:
          // 计算延迟补偿后的时间
          this.eventLock++
          if (!isPlaying) {
            this.controller.seekTo(currentTime)
          } else {
            const targetTime = currentTime
            const latencyCompensation = this.calculateLatencyCompensation(targetTime)
            console.log(`跳转补偿: 原始时间=${targetTime}, 补偿后=${latencyCompensation}, 延迟=${this.networkLatency}ms`)

            this.controller.seekTo(latencyCompensation)
          }
          break
        case MessageType.URL_CHANGE:
          this.handleUrlChange(message.data)
          break
      }
    }
    // this.backgroundPort?.postMessage({
    //   type: 'VIDEO_RECEIVE_EVENT',
    // })
    sendMessagePromise({
      type: 'VIDEO_RECEIVE_EVENT',
      data: {
        site: getCurrentSite(),
      },
    })
  }

  // 计算延迟补偿
  private calculateLatencyCompensation(targetTime: number): number {
    // 如果延迟超过1秒，不进行补偿
    if (this.networkLatency > 1000) {
      return targetTime
    }

    // 计算补偿时间（假设视频播放速度是1倍速）
    const compensationSeconds = this.networkLatency / 1000
    return targetTime + compensationSeconds
  }

  // 处理URL变更消息
  private async handleUrlChange(data: { url: string; site: string }): Promise<void> {
    console.log('收到URL变更消息:', data)
    await sendMessagePromise({
      type: 'UPDATE_ROOM_INFO_BG',
      data: {
        url: data.url,
        site: data.site,
      },
    })
    // 如果当前不是视频页面，忽略该消息
    if (!isSupportedVideoPage()) {
      console.log('当前页面不是视频页面，忽略URL变更')
      return
    }

    // 获取当前URL和目标URL
    const currentUrl = window.location.href
    const targetUrl = data.url

    // 如果已经在目标URL，不需要跳转
    if (currentUrl === targetUrl) {
      console.log('已经在目标URL上，无需跳转')
      return
    }

    // 执行跳转
    console.log(`跳转到新视频: ${targetUrl}`)
    window.location.href = targetUrl
  }

  // 设置视频事件监听器
  private setupVideoEventListeners(): void {
    if (!this.controller) {
      return
    }

    // 获取视频元素
    const videoElement = document.querySelector('video')
    if (!videoElement) {
      return
    }

    // 创建处理函数
    this.playHandler = async () => {
      console.log('playHandler', this.eventLock)
      if (this.eventLock > 0 || !this.roomId) {
        this.eventLock--
        return
      }

      try {
        const currentTime = this.controller!.getCurrentTime()
        console.log('发送播放消息, 时间:', currentTime, this.backgroundPort)
        this.backgroundPort?.postMessage({
          type: 'VIDEO_SEND_EVENT',
          data: {
            type: MessageType.PLAY,
            roomId: this.roomId,
            senderId: await getUserId(),
            data: {
              currentTime,
              lastUpdate: Date.now(),
              isPlaying: this.controller!.isPlaying(),
            },
          },
        })
      } catch (error) {
        console.error('发送播放消息失败:', error)
      }
    }

    this.pauseHandler = async () => {
      console.log('pauseHandler', this.eventLock)
      if (this.eventLock > 0 || !this.roomId) {
        this.eventLock--
        return
      }

      try {
        const currentTime = this.controller!.getCurrentTime()
        console.log('发送暂停消息, 时间:', currentTime)
        this.backgroundPort?.postMessage({
          type: 'VIDEO_SEND_EVENT',
          data: {
            type: MessageType.PAUSE,
            roomId: this.roomId,
            senderId: await getUserId(),
            data: {
              currentTime,
              lastUpdate: Date.now(),
              isPlaying: this.controller!.isPlaying(),
            },
          },
        })
      } catch (error) {
        console.error('发送暂停消息失败:', error)
      }
    }

    this.seekedHandler = async () => {
      console.log('seekedHandler', this.eventLock)
      if (this.eventLock > 0 || !this.roomId) {
        this.eventLock--
        return
      }

      const currentTime = this.controller!.getCurrentTime()

      try {
        console.log('发送跳转消息, 时间:', currentTime)
        this.backgroundPort?.postMessage({
          type: 'VIDEO_SEND_EVENT',
          data: {
            type: MessageType.SEEK,
            roomId: this.roomId,
            senderId: await getUserId(),
            data: {
              currentTime,
              lastUpdate: Date.now(),
              isPlaying: this.controller!.isPlaying(),
            },
          },
        })
      } catch (error) {
        console.error('发送跳转消息失败:', error)
      }
    }

    // 添加监听器
    videoElement.addEventListener('play', this.playHandler)
    videoElement.addEventListener('pause', this.pauseHandler)
    videoElement.addEventListener('seeked', this.seekedHandler)
  }
  public getCurrentVideo() {
    return {
      currentTime: this.controller!.getCurrentTime(),
      isPlaying: this.controller!.isPlaying(),
      lastUpdate: Date.now(),
    }
  }

  // 清理资源
  public async cleanup(): Promise<void> {
    // // 停止同步间隔
    // this.stopSyncInterval();

    // 移除WebSocket消息监听器
    if (this.messageHandler) {
      // this.backgroundPort?.postMessage({
      //   type: 'VIDEO_RECEIVE_EVENT_OFF',
      //   data: this.messageHandler,
      // })
      console.log('cleanup: 移除WebSocket消息监听器')
      const response = await sendMessagePromise({
        type: 'VIDEO_RECEIVE_EVENT_OFF',
      })

      this.messageHandler = null
    }

    // 移除视频事件监听器
    const videoElement = document.querySelector('video')
    if (videoElement) {
      if (this.playHandler) {
        videoElement.removeEventListener('play', this.playHandler)
        this.playHandler = null
      }
      if (this.pauseHandler) {
        videoElement.removeEventListener('pause', this.pauseHandler)
        this.pauseHandler = null
      }
      if (this.seekedHandler) {
        videoElement.removeEventListener('seeked', this.seekedHandler)
        this.seekedHandler = null
      }
    }
    // 移除backgroundPort监听
    this.backgroundPort = null
    console.log('视频同步管理器资源已清理')
  }
  public setBackgroundPort(port: globalThis.Browser.runtime.Port): void {
    this.backgroundPort = port
  }
}

// 检查当前URL是否是支持的视频页面
export const isSupportedVideoPage = (currentUrl?: string): boolean => {
  let url
  if (!currentUrl) {
    url = window.location.href
  } else {
    url = currentUrl
  }

  for (const site of SUPPORTED_SITES) {
    for (const pattern of site.injectPatterns) {
      if (new RegExp(pattern.replace(/\*/g, '.*')).test(url)) {
        return true
      }
    }
  }

  return false
}

// 检查当前URL是否是允许创建房间的页面
export const isSupportedCreatePage = (): boolean => {
  const url = window.location.href

  for (const site of SUPPORTED_SITES) {
    if (new RegExp(site.createPattern.replace(/\*/g, '.*')).test(url)) {
      return true
    }
  }

  return false
}

// 获取当前网站信息
export const getCurrentSite = (): { name: string; domain: string } | null => {
  const url = window.location.href

  for (const site of SUPPORTED_SITES) {
    if (url.includes(site.domain)) {
      return { name: site.name, domain: site.domain }
    }
  }

  return null
}
function reject() {
  throw new Error('Function not implemented.')
}
