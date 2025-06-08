import { VideoSyncManager, isSupportedVideoPage, getCurrentSite, isSupportedCreatePage } from '../utils/videoController'
import { getUserId } from '../utils/storage'
import { MessageType } from '../utils/constants'
import websocketService, { sendMessage, Message } from '../utils/websocket'
import { sendMessagePromise } from '@/utils/message'

// 内容脚本的主入口点
export default defineContentScript({
  // matches: ['*://*.bilibili.com/*', '*://*.youtube.com/*'],
  matches: ['<all_urls>'],
  allFrames: true,
  async main() {
    console.log('iframe同步插件已加载')
    let videoSyncManager: VideoSyncManager | null = null
    let currentRoomId: string | null = null
    let isHost: boolean = false
    const createVideoManager = async (
      backgroundPort: globalThis.Browser.runtime.Port,
      roomId?: string,
      host?: boolean,
      videoStatus?: { currentTime: number; isPlaying: boolean; lastUpdate: number },
    ): Promise<VideoSyncManager | null> => {
      // // 如果页面不支持视频同步，直接返回
      // if (!isSupportedVideoPage()) {
      //   console.log('当前页面不支持视频同步')
      //   return null
      // }

      if (videoSyncManager) {
        console.log('清理旧的视频同步管理器实例和websocket注册事件')
        videoSyncManager.cleanup()
      }

      // 创建新实例
      console.log('创建新的视频同步管理器实例', roomId ? `，房间ID: ${roomId}` : '')

      // 更新当前状态
      if (roomId) {
        currentRoomId = roomId
        isHost = host || false
      }
      if (videoStatus) {
        videoSyncManager = VideoSyncManager.create(backgroundPort, roomId, host, videoStatus)
      } else {
        videoSyncManager = VideoSyncManager.create(backgroundPort, roomId, host)
      }

      return videoSyncManager
    }
    // 存储视频同步管理器实例，以便后续清理
    browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
      ;(async () => {
        // 使用action字段标识操作类型
        const action = request.action || request.type
        // 使用switch/case替代if/else结构
        switch (action) {
          case 'VIDEO_DETECT':
            {
              const backgroundPort = backgroundPortListener()
              console.log('收到视频检测消息:', request.data)
              const { roomId, isHost, videoData } = request.data

              await createVideoManager(backgroundPort, roomId, isHost, videoData?.videoStatus)
              console.log('videoSyncManager', videoSyncManager)
              if (videoSyncManager) {
                const video = videoSyncManager!.getCurrentVideo()
                console.log('视频同步管理器实例:', video)
                console.log(window.self === window.top)
                // sendResponse({ success: true, video })
                sendResponse({ success: true, video })
                // return true
              } else {
                sendResponse({ success: false, video: null })
                // return true
              }
            }
            break
          case 'CLEAN_VIDEO_MANAGER':
            {
              if (videoSyncManager) {
                videoSyncManager.cleanup()
                videoSyncManager = null
              }
              sendResponse({ success: true })
            }
            break
          // 不需要回信息 不然多个脚本回信息会干扰创建房间
          default:
            break
        }

        // 确保消息处理完毕后返回true，表明我们使用了异步处理
        return true
      })()
      return true
    })

    function backgroundPortListener() {
      return browser.runtime.connect({ name: 'keep-alive' })
    }
  },
})
