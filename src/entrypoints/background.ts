import { saveCurrentRoom, getCurrentRoom, getRoomInfo, getUserId, clearRoomInfo } from '../utils/storage'
import { RoomInfo } from '../utils/constants'
import websocketService from '@/utils/websocket'
import { sendToContentScript } from '@/utils/message'

// 定义接口
interface TabsRooms {
  [tabId: number]: string // 标签页ID -> 房间ID
}

interface RoomsInfo {
  [roomId: string]: RoomInfo // 房间ID -> 房间信息
}

// 存储标签页ID到房间ID的映射关系
const tabsRooms: TabsRooms = {}
// 存储房间信息
const roomsInfo: RoomsInfo = {}
// 管理back和content的长连接
let LongPort: Browser.runtime.Port[] = []
// 存储WebSocket消息监听器
const messageListeners: { [tabId: number]: (wsMessage: any) => void } = {}
// 存储重定向监听器
const redirectListeners: { [tabId: number]: (message: any) => void } = {}
// 存储URL变更监听器
const urlChangeListeners: { [tabId: number]: (message: any) => void } = {}
// 存储导航监听器
const navigationListeners: { [tabId: number]: (details: any) => void } = {}

// 后台脚本的主入口点
export default defineBackground(async () => {
  console.log('视频同步插件后台已启动')

  // 监听来自弹出和content窗口的消息
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    ;(async () => {
      console.log('后台收到消息:', message.type, sender)
      const tabId = sender?.tab?.id
      const type = message.type || message.action
      // 使用switch/case结构处理消息
      switch (type) {
        // 创建房间
        case 'CREATE_ROOM':
          if (!tabId) return true
          const { createRoomMessage } = message.data
          await websocketService.ensureConnected()
          console.log('创建房间:', createRoomMessage, message)
          // 如果消息来自内容脚本，获取标签页ID
          if (tabId) {
            // 保存标签页ID到房间ID的映射
            tabsRooms[tabId] = createRoomMessage.roomId
            console.log('标签页', tabId, '创建了房间', createRoomMessage.roomId)

            // 存储房间基本信息
            if (createRoomMessage.data) {
              roomsInfo[createRoomMessage.roomId] = createRoomMessage.data
            }
          }
          await websocketService.send(createRoomMessage)
          // await websocketService.on('redirect', (message) => {
          //   browser.tabs.update(tabId, { url: message.data.url })
          // })
          sendResponse({ success: true })
          break

        // 加入房间
        case 'JOIN_ROOM':
          if (!tabId) return true
          const { joinRoomMessage } = message.data
          console.log('加入房间:', joinRoomMessage.roomId)
          await websocketService.ensureConnected()
          // 使用函数顶部已声明的tabId
          // 如果消息来自内容脚本或popup，获取标签页ID
          if (tabId) {
            // 保存标签页ID到房间ID的映射
            tabsRooms[tabId] = joinRoomMessage.roomId
            console.log('标签页', tabId, '加入了房间', joinRoomMessage.roomId)
          }
          const { room: roomInfo } = await websocketService.send(joinRoomMessage)
          console.log('ws加入房间响应:', roomInfo)
          if (roomInfo) {
            roomsInfo[joinRoomMessage.roomId] = roomInfo
          }
          // 如果不是视频页面则重定向到视频页面
          if (roomInfo.url !== sender.tab?.url) {
            await browser.tabs.update(tabId, { url: roomInfo.url })
          }

          sendResponse({
            success: true,
            roomId: joinRoomMessage.roomId,
            roomInfo: roomsInfo[message.data.roomId],
            isHost: roomInfo ? roomInfo.host === joinRoomMessage.userId : false,
          })
          break

        // 检查当前房间
        case 'CHECK_ROOM':
          {
            // 如果消息来自内容脚本，获取标签页ID
            if (tabId && tabsRooms[tabId]) {
              const roomId = tabsRooms[tabId]
              const roomInfo = roomsInfo[roomId]
              const userId = await getUserId()

              sendResponse({
                inRoom: true,
                roomId,
                isHost: roomInfo ? roomInfo.host === userId : false,
                roomInfo,
              })
            } else {
              sendResponse({
                inRoom: false,
              })
            }
          }
          break

        // 退出房间
        case 'LEAVE_ROOM':
          {
            // 优先使用sender.tab获取标签页ID
            const leaveTabId = sender?.tab?.id

            // 如果消息来自内容脚本，获取标签页ID
            if (leaveTabId && tabsRooms[leaveTabId]) {
              const roomId = tabsRooms[leaveTabId]
              const userId = await getUserId()
              // 清除标签页到房间的映射
              delete tabsRooms[leaveTabId]
              await websocketService.send({
                type: MessageType.LEAVE_ROOM,
                roomId: roomId,
                senderId: userId,
              })
              console.log('标签页', leaveTabId, '离开了房间', roomId)

              // 断开长连接
              LongPort[leaveTabId].disconnect()
              delete LongPort[leaveTabId]
              // 注销websocket注册事件
              if (messageListeners[leaveTabId]) {
                websocketService.off(WS_EVENTS.MESSAGE, messageListeners[leaveTabId])
                delete messageListeners[leaveTabId]
              }
              // 检查是否所有标签页都已离开该房间
              const stillInRoom = Object.values(tabsRooms).includes(roomId)
              if (!stillInRoom && roomsInfo[roomId]) {
                // 如果没有标签页在此房间中，删除房间信息
                delete roomsInfo[roomId]
                console.log('房间', roomId, '已被删除，无人在内')
              }
              websocketService.disconnect()
              sendResponse({ success: true })
            }
          }
          break
        // 获取房间信息
        case 'GET_ROOM_INFO':
          {
            let roomId: string | undefined
            let roomInfo: RoomInfo | undefined

            // 1. 优先从sender获取tabId (内容脚本发送的请求)
            if (sender?.tab?.id && tabsRooms[sender.tab.id]) {
              roomId = tabsRooms[sender.tab.id]
              roomInfo = roomsInfo[roomId]
            }
            // 2. 通过消息中的tabId获取
            else if (message.data?.tabId && tabsRooms[message.data.tabId]) {
              roomId = tabsRooms[message.data.tabId]
              roomInfo = roomsInfo[roomId]
            }
            // 3. 通过房间ID直接获取
            else if (message.data?.roomId && roomsInfo[message.data.roomId]) {
              roomId = message.data.roomId
              roomInfo = roomsInfo[roomId]
            }

            if (roomId && roomInfo) {
              const userId = await getUserId()
              // 如果需要获取最新的房间信息，则从服务器获取
              if (message.data?.needUpdate) {
                const response = await websocketService.send({
                  type: MessageType.ROOM_INFO,
                  roomId: roomId,
                  senderId: userId,
                })
                if (response && 'room' in response) {
                  roomInfo = response.room
                  roomsInfo[roomId] = response.room
                }
              }

              const response: {
                success: boolean
                data: {
                  roomId: string
                  roomInfo: RoomInfo
                  isHost: boolean
                }
              } = {
                success: true,
                data: {
                  roomId,
                  roomInfo,
                  isHost: roomInfo.host === userId,
                },
              }
              sendResponse(response)
            } else {
              console.log('未找到房间信息')
              sendResponse({
                success: false,
                message: '未找到房间信息',
              })
            }
          }
          break
        // 作为中转站 转发给iframe
        case 'VIDEO_DETECT':
          {
            const { backgroundPort, roomId, isHost, videoData } = message.data
            const tabId = sender!.tab!.id!
            const frames = await browser.webNavigation.getAllFrames({ tabId })
            console.log('转发视频注册机:', message, frames)
            // 获取所有框架

            // 向每个框架单独发送消息
            const responses = await Promise.all(
              frames!.map((frame) =>
                browser.tabs.sendMessage(
                  tabId,
                  {
                    action: 'VIDEO_DETECT',
                    data: {
                      backgroundPort,
                      roomId,
                      isHost,
                      videoData,
                    },
                  },
                  { frameId: frame.frameId },
                ),
              ),
            )
            // 只返回成功的视频实例
            responses.forEach((response) => {
              if (response.success) {
                sendResponse({ success: true, video: response.video })
              }
            })
          }
          break
        //作为中转站 通知iframe清理视频注册机
        case 'CLEAN_VIDEO_MANAGER':
          {
            const { success } = await sendToContentScript({
              action: 'CLEAN_VIDEO_MANAGER',
            })
            sendResponse({ success })
          }
          break
        case 'UPDATE_ROOM_INFO_BG':
          {
            if (!tabId) return true
            const roomId = tabsRooms[tabId]
            const roomInfo = roomsInfo[roomId]
            if (roomId) {
              roomsInfo[roomId] = {
                ...roomInfo,
                ...message.data,
              }
              sendResponse({ success: true })
            } else {
              sendResponse({ success: false, message: '未找到房间信息' })
            }
          }
          break
        case 'VIDEO_STATUS':
          const { roomId, senderId } = message.data
          const response = await websocketService.send({
            type: MessageType.VIDEO_STATUS,
            senderId,
            roomId,
          })
          console.log('ws获取视频状态响应:', response)
          if (response) {
            sendResponse({ success: true, videoStatus: response })
          } else {
            sendResponse({ success: false, message: '获取视频状态失败' })
          }
          break
        case 'VIDEO_RECEIVE_EVENT':
          if (!tabId) return true
          console.log('注册websocket_video事件:', message, LongPort[tabId])
          // 创建监听器函数
          const messageListener = (wsMessage: any) => {
            console.log('发送视频控制事件: port', LongPort[tabId], message)
            LongPort[tabId].postMessage({
              type: 'VIDEO_CONTROL_EVENT',
              data: wsMessage,
            })
          }
          // 保存监听器引用
          messageListeners[tabId] = messageListener
          websocketService.on(WS_EVENTS.MESSAGE, messageListener)

          // 创建并保存重定向监听器
          const redirectListener = (message: any) => {
            browser.tabs.update(tabId, { url: message.data.url })
          }
          redirectListeners[tabId] = redirectListener
          websocketService.on('redirect', redirectListener)

          // 创建并保存URL变更监听器
          const urlChangeListener = (message: any) => {
            if (roomsInfo[message.roomId]) {
              roomsInfo[message.roomId] = {
                ...roomsInfo[message.roomId],
                url: message.data.url,
                site: message.data.site,
              }
              browser.tabs.update(tabId, { url: message.data.url })
            }
          }
          urlChangeListeners[tabId] = urlChangeListener
          websocketService.on('URL_CHANGE', urlChangeListener)

          // 创建并保存导航监听器
          const navigationListener = async (details: any) => {
            console.log('historyStateUpdated', details)
            // 先检查权限
            const { url, tabId: navTabId } = details
            if (tabsRooms[navTabId]) {
              const roomId = tabsRooms[navTabId]
              const roomInfo = roomsInfo[roomId]
              const userId = await getUserId()
              if (roomInfo.host === userId) {
                // 暂时用房主才能有权限控制视频url
                console.log('房主', roomInfo.host, '当前url', url)
                if (roomInfo.url !== url && isSupportedVideoPage(url)) {
                  console.log('准备发送')
                  browser.tabs.sendMessage(navTabId, { action: 'video_status', url }, async (response) => {
                    if (response.success) {
                      console.log('向后端发送url变更通知', response)
                      const { video } = response
                      websocketService.send({
                        type: MessageType.URL_CHANGE,
                        roomId,
                        senderId: await getUserId(),
                        data: {
                          url,
                          site: roomInfo.site,
                          ...video,
                        },
                      })
                    }
                  })
                }
              }
            }
          }
          navigationListeners[tabId] = navigationListener
          browser.webNavigation.onHistoryStateUpdated.addListener(navigationListener, { url: [{ hostSuffix: message.data.site.domain }] })

          sendResponse({ success: true })
          break
        case 'VIDEO_RECEIVE_EVENT_OFF':
          if (!tabId) {
            sendResponse({ success: false, message: '未找到标签页ID' })
            return true
          }
          // 使用保存的监听器引用来移除
          if (messageListeners[tabId]) {
            console.log('移除websocket_video事件:', messageListeners[tabId])
            websocketService.off(WS_EVENTS.MESSAGE, messageListeners[tabId])
            delete messageListeners[tabId]
          }
          // 移除重定向监听器
          if (redirectListeners[tabId]) {
            websocketService.off('redirect', redirectListeners[tabId])
            delete redirectListeners[tabId]
          }
          // 移除URL变更监听器
          if (urlChangeListeners[tabId]) {
            websocketService.off('URL_CHANGE', urlChangeListeners[tabId])
            delete urlChangeListeners[tabId]
          }
          // 移除导航监听器
          if (navigationListeners[tabId]) {
            browser.webNavigation.onHistoryStateUpdated.removeListener(navigationListeners[tabId])
            delete navigationListeners[tabId]
          }
          sendResponse({ success: true })
          break
        // 未知消息类型
        default:
          break
      }

      // 返回true表示异步响应
      return true
    })()
    return true
  })

  // 监听来自content窗口的消息(长连接 视频控制)
  browser.runtime.onConnect.addListener(function (port) {
    console.log('收到来自content窗口的长连接:', port)
    const tabId = port.sender?.tab?.id
    if (!tabId) return
    LongPort[tabId] = port
    console.log('LongPort', LongPort[tabId], tabId)
    port.onMessage.addListener(async function (message) {
      console.log('收到来自content窗口的消息:', message)
      switch (message.type) {
        case 'VIDEO_SEND_EVENT':
          console.log('收到来自content窗口的视频同步消息:', message)
          await websocketService.send(message.data)
          break
        default:
          break
      }
    })
    port.onDisconnect.addListener(() => {
      // 这里做清理，比如从全局数组移除这个port
      if (messageListeners[tabId]) {
        websocketService.off(WS_EVENTS.MESSAGE, messageListeners[tabId])
        delete messageListeners[tabId]
      }
      // 清理重定向监听器
      if (redirectListeners[tabId]) {
        websocketService.off('redirect', redirectListeners[tabId])
        delete redirectListeners[tabId]
      }
      // 清理URL变更监听器
      if (urlChangeListeners[tabId]) {
        websocketService.off('URL_CHANGE', urlChangeListeners[tabId])
        delete urlChangeListeners[tabId]
      }
      // 清理导航监听器
      if (navigationListeners[tabId]) {
        browser.webNavigation.onHistoryStateUpdated.removeListener(navigationListeners[tabId])
        delete navigationListeners[tabId]
      }
      delete LongPort[tabId]
      console.log('Port 已断开，做清理')
    })
  })

  // browser.webNavigation.onHistoryStateUpdated.addListener(
  //   async (details) => {
  //     console.log('historyStateUpdated', details)
  //     // 先检查权限
  //     const { url, tabId } = details
  //     if (tabsRooms[tabId]) {
  //       const roomId = tabsRooms[tabId]
  //       const roomInfo = roomsInfo[roomId]
  //       const userId = await getUserId()
  //       if (roomInfo.host === userId) {
  //         // 暂时用房主才能有权限控制视频url
  //         console.log('房主', roomInfo.host, '当前url', url)
  //         if (roomInfo.url !== url && isSupportedVideoPage(url)) {
  //           console.log('准备发送')
  //           browser.tabs.sendMessage(tabId, { action: 'video_status', url }, async (response) => {
  //             if (response.success) {
  //               console.log('向后端发送url变更通知', response)
  //               const { video } = response
  //               websocketService.send({
  //                 type: MessageType.URL_CHANGE,
  //                 roomId,
  //                 senderId: await getUserId(),
  //                 data: {
  //                   url,
  //                   site: roomInfo.site,
  //                   ...video,
  //                 },
  //               })
  //             }
  //           })
  //         }
  //       }
  //     }
  //   },
  //   { url: [{ hostSuffix: 'bilibili.com' }] },
  // )
  // browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
  //   if (changeInfo.url?.includes('bilibili.com')) {
  //     console.log('B站URL变化:', changeInfo.url)
  //   }
  // })
  // 监听URL变化 如果URL变化了且有视频 则更新房间信息(只对有权限的人才有用)
  // browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  //   if (tabsRooms[tabId] && changeInfo.url && changeInfo.status === 'complete') {
  //     const userId = await getUserId()
  //     const roomId = tabsRooms[tabId]
  //     const roomInfo = roomsInfo[roomId]
  //     if (roomInfo.host === userId) {
  //       // 暂时用房主才能有权限控制视频url
  //       if (roomInfo.url !== changeInfo.url && isSupportedVideoPage()) {
  //         roomsInfo[roomId] = {
  //           ...roomInfo,
  //           url: changeInfo.url,
  //         }
  //       }
  //     }
  //   }
  // })

  // 监听标签页关闭事件，自动离开房间
  browser.tabs.onRemoved.addListener(async (tabId) => {
    if (tabsRooms[tabId]) {
      const roomId = tabsRooms[tabId]
      const userId = await getUserId()
      // 清除标签页到房间的映射
      delete tabsRooms[tabId]
      console.log('标签页', tabId, '已关闭，自动离开房间', roomId)
      await websocketService.send({
        type: MessageType.LEAVE_ROOM,
        roomId: roomId,
        senderId: userId,
      })
      if (messageListeners[tabId]) {
        websocketService.off(WS_EVENTS.MESSAGE, messageListeners[tabId])
        delete messageListeners[tabId]
      }
      // 清理重定向监听器
      if (redirectListeners[tabId]) {
        websocketService.off('redirect', redirectListeners[tabId])
        delete redirectListeners[tabId]
      }
      // 清理URL变更监听器
      if (urlChangeListeners[tabId]) {
        websocketService.off('URL_CHANGE', urlChangeListeners[tabId])
        delete urlChangeListeners[tabId]
      }
      // 清理导航监听器
      if (navigationListeners[tabId]) {
        browser.webNavigation.onHistoryStateUpdated.removeListener(navigationListeners[tabId])
        delete navigationListeners[tabId]
      }
      // 检查是否所有标签页都已离开该房间
      const stillInRoom = Object.values(tabsRooms).includes(roomId)
      if (!stillInRoom && roomsInfo[roomId]) {
        // 如果没有标签页在此房间中，删除房间信息
        delete roomsInfo[roomId]
        console.log('房间', roomId, '已被删除')
      }
      websocketService.disconnect()
      LongPort[tabId].disconnect()
      delete LongPort[tabId]
    }
  })
})
