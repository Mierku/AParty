import { VideoSyncManager, isSupportedVideoPage, getCurrentSite, isSupportedCreatePage } from '../utils/videoController'
import { getUserId } from '../utils/storage'
import { MessageType } from '../utils/constants'
import websocketService, { sendMessage, Message } from '../utils/websocket'
import { sendMessagePromise } from '@/utils/message'
import { HtmlPublicPath } from 'wxt/browser'

async function createChatPanel(ctx: any) {
  const ui = await createIframeUi(ctx, {
    page: `/ap-panel.html` as HtmlPublicPath,
    position: 'overlay',
    anchor: 'body',
    zIndex: 9999,
    onMount: (wrapper, iframe) => {
      console.log('IFrame 已挂载:', iframe, wrapper)
      // Add styles to the iframe like width
      iframe.style.border = 'none'
      iframe.style.width = '100%'
      iframe.style.height = '100%'
      wrapper.style.position = 'fixed'
      wrapper.style.top = '0'
      wrapper.style.right = '0'
      wrapper.style.width = '360px'
      wrapper.style.height = '100vh'
    },
  })

  // Show UI to user
  ui.mount()
  console.log('UI.mount() 已调用')
}
// 内容脚本的主入口点
export default defineContentScript({
  // matches: ['*://*.bilibili.com/*', '*://*.youtube.com/*'],
  matches: ['<all_urls>'],

  async main(ctx) {
    console.log('视频同步插件已加载')

    // observeUrlChanges(handleUrlChange)
    // 存储视频同步管理器实例，以便后续清理
    let videoSyncManager: VideoSyncManager | null = null
    let currentRoomId: string | null = null
    let isHost: boolean = false
    // let currentDomain: string | null = getCurrentSite()?.domain || null
    // let backgroundPort: globalThis.Browser.runtime.Port | null = null
    // 创建视频管理器的辅助函数
    // const createVideoManager = async (
    //   backgroundPort: globalThis.Browser.runtime.Port,
    //   roomId?: string,
    //   host?: boolean,
    //   videoStatus?: { currentTime: number; isPlaying: boolean; lastUpdate: number },
    // ): Promise<VideoSyncManager | null> => {
    //   // 如果页面不支持视频同步，直接返回
    //   if (!isSupportedVideoPage()) {
    //     console.log('当前页面不支持视频同步')
    //     return null
    //   }

    //   if (videoSyncManager) {
    //     console.log('清理旧的视频同步管理器实例和websocket注册事件')
    //     videoSyncManager.cleanup()
    //   }

    //   // 创建新实例
    //   console.log('创建新的视频同步管理器实例', roomId ? `，房间ID: ${roomId}` : '')

    //   // 更新当前状态
    //   if (roomId) {
    //     currentRoomId = roomId
    //     isHost = host || false
    //   }
    //   if (videoStatus) {
    //     videoSyncManager = new VideoSyncManager(backgroundPort, roomId, host, videoStatus)
    //   } else {
    //     videoSyncManager = new VideoSyncManager(backgroundPort, roomId, host)
    //   }

    //   return videoSyncManager
    // }
    async function isInRoom() {
      const response = await sendMessagePromise({
        type: 'GET_ROOM_INFO',
      })

      if (!response.success) return
      console.log('收到房间信息 isInRoom:', response)

      const { roomInfo } = response.data
      // 是否是视频页面( 导入到目标页面  刷新页面 自主进入其他页面)

      if (isSupportedVideoPage()) {
        // 有视频
        if (roomInfo.url === window.location.href) {
          // 有视频且是同一个页面

          const videoData = await sendMessagePromise({
            type: 'VIDEO_STATUS',
            data: {
              roomId: roomInfo.roomId,
              senderId: roomInfo.senderId,
            },
          })
          if (!videoData.success) return
          console.log('收到视频状态:', videoData)
          // 创建视频管理器
          await sendMessagePromise({
            action: 'VIDEO_DETECT',
            data: {
              // backgroundPort,
              roomId: roomInfo.roomId,
              isHost: roomInfo.isHost,
              videoData,
            },
          })
          // 创建聊天面板
          createChatPanel(ctx)
          // createVideoManager(backgroundPort, roomInfo.roomId, roomInfo.isHost, videoData.videoStatus)
        } else {
          // 有视频是不同的页面

          // 如果房主是当前用户 则通知跳转
          if (roomInfo.host === roomInfo.senderId) {
            // 则通知更新
            await sendMessagePromise({
              action: 'VIDEO_DETECT',
              data: {
                // backgroundPort,
                roomId: roomInfo.roomId,
                isHost: roomInfo.isHost,
              },
            })
            // 创建聊天面板
            createChatPanel(ctx)
            // createVideoManager(backgroundPort, roomInfo.roomId, roomInfo.isHost)
            // 刷新进的新房间
            await sendMessagePromise({
              type: 'URL_SEND_UPDATED',
              data: {
                url: roomInfo.url,
                video: videoSyncManager!.getCurrentVideo(),
              },
            })
          }
        }
      }
    }

    await isInRoom()
    // 提供API给popup 页background面调用
    browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
      ;(async () => {
        // 使用action字段标识操作类型
        const action = request.action || request.type
        console.log('收到来自popup的消息:', request)
        // 使用switch/case替代if/else结构
        switch (action) {
          // 处理WebSocket连接请求
          case 'ws_connect':
            await websocketService.ensureConnected()
            sendResponse({ success: true, connected: true })
            break

          // 发送WebSocket消息
          case 'ws_send':
            try {
              await websocketService.ensureConnected()
              await websocketService.send(request.message)
              sendResponse({ success: true })
            } catch (error) {
              console.error('发送WebSocket消息失败:', error)
              sendResponse({ success: false, error: String(error) })
            }
            break

          // 加入房间
          case 'join_room':
            try {
              console.log('-------- 开始加入房间流程 --------')
              console.log(`准备加入房间: ${request.roomId}, 当前状态: roomId=${currentRoomId}, isHost=${isHost}`)

              // 确保连接

              // 获取房间ID和用户ID
              const roomId = request.roomId
              const userId = await getUserId()
              const joinRoomMessage = {
                type: MessageType.JOIN_ROOM,
                roomId: roomId,
                senderId: userId,
              }
              console.log(`用户(${userId})尝试加入房间(${roomId})`)

              // 先向后台发送加入房间消息
              console.log('向后台发送加入房间消息...')
              // 加入房间 返回房间信息
              const response = await sendMessagePromise({
                type: 'JOIN_ROOM',
                data: {
                  joinRoomMessage,
                },
              })
              if (!response.success) return
              // 建立长连接
              // backgroundPort = backgroundPortListener()
              // 获取视频状态 用于初始化
              const videoData = await sendMessagePromise({
                type: 'VIDEO_STATUS',
                data: {
                  roomId: roomId,
                  senderId: userId,
                },
              })
              console.log('收到视频状态:', videoData)
              if (!videoData.success) return
              // 创建聊天面板
              createChatPanel(ctx)
              // 创建视频管理器
              await sendMessagePromise({
                action: 'VIDEO_DETECT',
                data: {
                  // backgroundPort,
                  roomId,
                  isHost: false,
                  videoData,
                },
              })
              // await createVideoManager(backgroundPort, roomId, false, videoData.videoStatus)
              // 返回给popup
              sendResponse({
                success: true,
                roomInfo: response.roomInfo,
                roomId: roomId,
                isHost: response.isHost,
              })
              console.log('收到后台响应:', response)
              return true // 标记为异步响应
            } catch (error) {
              console.error('加入房间初始化错误:', error)
              sendResponse({ success: false, error: String(error) })
              console.log('-------- 加入房间流程失败(初始化阶段) --------')
            }
            break

          // 创建房间
          case 'create_room':
            try {
              const { roomId, controlMode } = request
              // 获取房间信息
              const userId = await getUserId()
              // 创建房间信息对象
              let newRoomInfo = {}
              console.log('创建房间信息:', request)
              // 如果没有提供完整信息，则在此处创建
              if (!request.roomInfo || Object.keys(request.roomInfo).length === 0) {
                // 获取当前URL
                const url = window.location.href

                // 获取当前网站信息
                const site = getCurrentSite()
                // backgroundPort = backgroundPortListener()

                // 初始化视频管理器
                const { video, success } = await sendMessagePromise({
                  action: 'VIDEO_DETECT',
                  data: {
                    // backgroundPort,
                    roomId,
                    isHost: true,
                  },
                })
                // await createVideoManager(backgroundPort, roomId, true)
                // const video = videoSyncManager!.getCurrentVideo()
                console.log('当前视频状态:', video)
                // 创建房间信息
                newRoomInfo = {
                  roomId,
                  host: userId,
                  url,
                  site: site ? site.domain : '',
                  controlMode,
                  participants: [userId],
                  video,
                }
              }
              const createRoomMessage = {
                type: MessageType.CREATE_ROOM,
                roomId,
                senderId: userId,
                data: newRoomInfo,
                timestamp: Date.now(),
              }
              const response = await sendMessagePromise({
                type: 'CREATE_ROOM',
                data: {
                  createRoomMessage,
                },
              })

              if (!response.success) return
              // 创建聊天面板
              createChatPanel(ctx)
              // 返回成功结果给popup
              sendResponse({
                success: true,
                roomId,
                roomInfo: newRoomInfo,
                isHost: true,
              })

              return true // 标记为异步响应
            } catch (error) {
              console.error('创建房间失败:', error)
              sendResponse({ success: false, error: String(error) })
            }
            break

          // 离开房间
          case 'leave_room':
            try {
              const response = await sendMessagePromise({
                type: 'LEAVE_ROOM',
              })
              if (!response.success) throw new Error('离开房间失败')
              // 更新当前状态
              currentRoomId = null
              isHost = false
              // 清理资源
              await sendMessagePromise({
                action: 'CLEAN_VIDEO_MANAGER',
              })

              sendResponse({ success: true })
            } catch (error) {
              console.error('离开房间失败:', error)
              sendResponse({ success: false, error: String(error) })
            }
            break

          // 初始化同步 (从background.ts发来的)
          // case 'INIT_SYNC':
          //   console.log('初始化视频同步')
          //   // 只有收到初始化同步消息才创建视频管理器
          //   if (isSupportedVideoPage()) {
          //     // 使用无参构造，让VideoSyncManager自己从后台获取信息
          //     await createVideoManager(backgroundPort)
          //     sendResponse({ success: true })
          //   } else {
          //     sendResponse({
          //       success: false,
          //       message: '当前页面不支持视频同步',
          //     })
          //   }
          //   break
          // 获取房间信息
          // case 'get_room_info':
          //   try {
          //     // 先从本地状态检查，如果currentRoomId有值，直接确认在房间中
          //     if (currentRoomId) {
          //       console.log('从本地状态确认在房间中:', currentRoomId)
          //       sendResponse({
          //         success: true,
          //         inRoom: true,
          //         roomId: currentRoomId,
          //         isHost: isHost,
          //       })
          //       return true
          //     }

          //     // 如果本地没有状态，从后台脚本获取当前标签页的房间信息
          //     browser.runtime.sendMessage(
          //       {
          //         type: 'GET_ROOM_INFO',
          //         data: {}, // 不需要传递tabId，后台会从sender获取
          //       },
          //       (response) => {
          //         if (response && response.success) {
          //           // 从后台获取成功，更新本地状态
          //           currentRoomId = response.roomId || null
          //           isHost = response.isHost || false

          //           // 返回房间信息给popup
          //           sendResponse({
          //             success: true,
          //             roomInfo: response.roomInfo,
          //             inRoom: true,
          //             roomId: response.roomId,
          //             isHost: response.isHost || false,
          //           })
          //         } else {
          //           // 明确不在房间中
          //           currentRoomId = null
          //           isHost = false
          //           sendResponse({
          //             success: true,
          //             inRoom: false,
          //             message: '未找到房间信息',
          //           })
          //         }
          //       },
          //     )
          //     return true // 标记为异步响应
          //   } catch (error) {
          //     console.error('获取房间信息失败:', error)
          //     sendResponse({
          //       success: false,
          //       inRoom: false,
          //       error: String(error),
          //     })
          //   }
          //   break
          // case 'video_status':
          //   {
          //     const video = videoSyncManager?.getCurrentVideo()
          //     if (video) {
          //       sendResponse({
          //         success: true,
          //         video,
          //       })
          //     } else {
          //       sendResponse({ success: false, message: '视频管理器未初始化' })
          //     }
          //   }
          //   break
          // 处理URL更新消息
          case 'URL_UPDATED':
            try {
              console.log('收到URL更新消息:', request.data)

              // 获取当前URL和目标URL
              const currentUrl = window.location.href
              const targetUrl = request.data.url

              // 如果已经在目标URL，不需要跳转
              if (currentUrl === targetUrl) {
                console.log('已经在目标URL上，无需跳转')
                sendResponse({ success: true, noAction: true })
                return
              }

              // 确保是在支持的页面上才跳转
              if (isSupportedCreatePage()) {
                console.log('跳转到新URL:', targetUrl)
                // 延迟执行跳转，确保响应已发送
                setTimeout(() => {
                  window.location.href = targetUrl
                }, 100)
                sendResponse({ success: true })
              } else {
                console.log('当前页面不支持跳转')
                sendResponse({
                  success: false,
                  message: '当前页面不支持视频同步',
                })
              }
            } catch (error) {
              console.error('处理URL更新失败:', error)
              sendResponse({
                success: false,
                error: String(error),
              })
            }
            break

          // 处理未知消息类型
          default:
            console.log('未知消息类型:', action)
            // sendResponse({ success: false, message: '未知消息类型' })
            break
        }

        // 确保消息处理完毕后返回true，表明我们使用了异步处理
        return true
      })()
      return true
    })
  },
})
