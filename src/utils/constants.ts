export interface SupportedSite {
  name: string
  domain: string
  createPattern: string // 可以创建房间的网址模式
  injectPatterns: string[] // 可以注入视频控制的网址模式数组
}

export const SUPPORTED_SITES: SupportedSite[] = [
  {
    name: '哔哩哔哩',
    domain: 'bilibili.com',
    createPattern: '*://*.bilibili.com/*',
    // 一般是视频页面
    injectPatterns: ['*://*.bilibili.com/video/*', '*://*.bilibili.com/bangumi/*'],
  },
  {
    name: 'YouTube',
    domain: 'youtube.com',
    createPattern: '*://*.youtube.com/*',
    injectPatterns: ['*://*.youtube.com/watch*'],
  },
  {
    name: 'ntdm',
    domain: 'ntdm8.com',
    createPattern: '*://*.ntdm8.com/*',
    injectPatterns: ['*://*.ntdm8.com/play/*'],
  },
  {
    name: 'iyinghua',
    domain: 'iyinghua.com',
    createPattern: '*://*.iyinghua.com/*',
    injectPatterns: ['*://*.iyinghua.com/v/*'],
  },
]

// 消息类型
export enum MessageType {
  CREATE_ROOM = 'CREATE_ROOM',
  JOIN_ROOM = 'JOIN_ROOM',
  LEAVE_ROOM = 'LEAVE_ROOM',
  SYNC_VIDEO = 'SYNC_VIDEO',
  VIDEO_STATUS = 'VIDEO_STATUS',
  PLAY = 'PLAY',
  PAUSE = 'PAUSE',
  SEEK = 'SEEK',
  SYNC = 'SYNC',
  CONTROL_MODE_CHANGE = 'CONTROL_MODE_CHANGE',
  ROOM_INFO = 'ROOM_INFO',
  REDIRECT = 'REDIRECT',
  USER_JOIN = 'USER_JOIN',
  USER_LEAVE = 'USER_LEAVE',
  URL_CHANGE = 'URL_CHANGE',
  URL_SEND_UPDATED = 'URL_SEND_UPDATED',
}

// 控制模式
export enum ControlMode {
  HOST_ONLY = 'HOST_ONLY', // 仅房主控制
  ALL = 'ALL', // 所有人都可以控制
}

// 房间状态
export interface RoomInfo {
  roomId: string
  host: string // 房主ID
  url: string // 当前视频URL
  site: string // 当前网站
  controlMode: ControlMode
  participants: string[] // 参与者IDs
  currentTime?: number // 当前视频时间
  isPlaying?: boolean // 当前是否正在播放
  lastUpdate?: number // 最后更新时间
}

// WebSocket事件类型
export const WS_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  MESSAGE: 'message',
  ERROR: 'error',
}
