<template>
  <div class="container">
    <h1>CocoParty 视频同步</h1>

    <div v-if="loading" class="loading">加载中...</div>

    <div v-else-if="!inRoom && !supportedSite" class="info-box">
      <p>当前网站不支持创建房间</p>
      <p class="site-note">请前往支持的视频网站：</p>
      <ul>
        <li>哔哩哔哩 (bilibili.com)</li>
        <li>YouTube (youtube.com)</li>
      </ul>
      <button @click="checkState" class="btn btn-debug">检查状态</button>
    </div>

    <div v-else-if="!inRoom" class="room-controls">
      <div class="create-room">
        <h2>创建房间</h2>
        <div v-if="isVideoPage" class="site-info">
          <p>
            当前视频: <span class="site-name">{{ currentUrl }}</span>
          </p>
        </div>
        <div class="control-option">
          <label>
            <input type="radio" v-model="controlMode" value="HOST_ONLY" />
            仅房主控制视频
          </label>
          <label>
            <input type="radio" v-model="controlMode" value="ALL" />
            所有人都可控制视频
          </label>
        </div>
        <button @click="createRoom" class="btn btn-primary">创建房间</button>
      </div>

      <div class="divider">或</div>

      <div class="join-room">
        <h2>加入房间</h2>
        <input type="text" v-model="roomIdToJoin" placeholder="输入房间ID" />
        <button @click="joinRoom" class="btn btn-secondary" :disabled="!roomIdToJoin">加入房间</button>
      </div>
      <button @click="checkState" class="btn btn-debug">检查状态</button>
    </div>

    <div v-else class="room-info">
      <h2>房间信息</h2>
      <p>
        房间ID: <span class="room-id">{{ roomId }}</span>
      </p>
      <p>
        你的身份:
        <span class="host-status">{{ isHost ? '房主' : '参与者' }}</span>
      </p>
      <p v-if="roomInfo">
        控制模式:
        <span>{{ roomInfo.controlMode === 'HOST_ONLY' ? '仅房主控制' : '所有人可控制' }}</span>
      </p>
      <p v-if="roomInfo">
        参与人数: <span>{{ roomInfo.participants?.length || 1 }}</span>
      </p>

      <div v-if="isHost" class="host-controls">
        <h3>房主控制</h3>
        <div class="control-option">
          <label>
            <input type="radio" v-model="roomControlMode" value="HOST_ONLY" @change="changeControlMode" />
            仅房主控制视频
          </label>
          <label>
            <input type="radio" v-model="roomControlMode" value="ALL" @change="changeControlMode" />
            所有人都可控制视频
          </label>
        </div>
      </div>

      <button @click="leaveRoom" class="btn btn-danger">退出房间</button>
      <button @click="checkState" class="btn btn-debug">检查状态</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ControlMode, MessageType, SUPPORTED_SITES, RoomInfo } from '../../utils/constants'
import { generateRoomId, getUserId } from '../../utils/storage'
// 响应类型定义
interface RoomInfoResponse {
  success: boolean
  roomInfo?: RoomInfo
  inRoom: boolean
  roomId?: string
  isHost?: boolean
  message?: string
  error?: string
}

// 后台响应类型
interface BackgroundResponse {
  inRoom: boolean
  roomId?: string
  isHost?: boolean
  roomInfo?: RoomInfo
  success?: boolean
  message?: string
}

// 状态
const loading = ref(true)
const inRoom = ref(false)
const roomId = ref('')
const isHost = ref(false)
const roomInfo = ref<RoomInfo | null>(null)
const controlMode = ref(ControlMode.HOST_ONLY)
const roomIdToJoin = ref('')
const roomControlMode = ref(ControlMode.HOST_ONLY)
const currentUrl = ref('')
const supportedSite = ref(false)
const isVideoPage = ref(false)

// 辅助函数：基于URL检查是否支持创建房间
const checkSupportedCreatePageByUrl = (url: string): boolean => {
  for (const site of SUPPORTED_SITES) {
    if (new RegExp(site.createPattern.replace(/\*/g, '.*')).test(url)) {
      return true
    }
  }
  return false
}

// 辅助函数：基于URL检查是否支持视频页面
const checkSupportedVideoPageByUrl = (url: string): boolean => {
  for (const site of SUPPORTED_SITES) {
    for (const pattern of site.injectPatterns) {
      if (new RegExp(pattern.replace(/\*/g, '.*')).test(url)) {
        return true
      }
    }
  }
  return false
}

// 辅助函数：基于URL获取当前站点信息
const getCurrentSiteByUrl = (url: string): { name: string; domain: string } | null => {
  for (const site of SUPPORTED_SITES) {
    if (url.includes(site.domain)) {
      return { name: site.name, domain: site.domain }
    }
  }
  return null
}

// 检查当前页面是否支持视频功能
const checkCurrentPageSupport = async (): Promise<void> => {
  try {
    const tabs = await browser.tabs.query({
      active: true,
      currentWindow: true,
    })
    if (tabs && tabs.length > 0 && tabs[0].url) {
      currentUrl.value = tabs[0].url
      isVideoPage.value = checkSupportedVideoPageByUrl(tabs[0].url)
      supportedSite.value = checkSupportedCreatePageByUrl(tabs[0].url)
    }
  } catch (error) {
    console.error('检查视频页面失败:', error)
    isVideoPage.value = false
    supportedSite.value = false
  }
}

// 从内容脚本获取房间信息
const getRoomInfoFromContentScript = async (): Promise<boolean> => {
  try {
    // 获取当前标签页
    const tab = await getCurrentTab()
    if (!tab || !tab.id) {
      console.log('无法获取当前标签页')
      return false
    }

    // // 使用Promise包装以处理超时情况
    // try {
    //   const response = await Promise.race([
    //     // 改用Promise方式发送消息
    //     browser.tabs.sendMessage(tab.id!, { action: 'get_room_info' }),
    //     // 3秒超时
    //     new Promise<RoomInfoResponse>((_, reject) => setTimeout(() => reject(new Error('获取房间信息超时')), 3000)),
    //   ])

    //   // 优先使用内容脚本的inRoom字段判断
    //   if (response && response.success) {
    //     // 如果明确标记了inRoom为true或有房间信息
    //     if (response.inRoom === true || response.roomInfo) {
    //       // 更新房间信息
    //       inRoom.value = true
    //       roomId.value = response.roomId || ''

    //       // 如果有房间信息，更新详细信息
    //       if (response.roomInfo) {
    //         roomInfo.value = { ...response.roomInfo }
    //         if (response.roomInfo.controlMode) {
    //           roomControlMode.value = response.roomInfo.controlMode
    //         }
    //       }

    //       isHost.value = response.isHost || false
    //       console.log('确认用户在房间中:', roomId.value)
    //       return true
    //     } else {
    //       // 如果明确标记了不在房间中
    //       inRoom.value = false
    //       roomId.value = ''
    //       isHost.value = false
    //       roomInfo.value = null
    //       roomControlMode.value = ControlMode.HOST_ONLY
    //       console.log('确认用户不在房间中')
    //       return true
    //     }
    //   } else {
    //     // 如果内容脚本返回不在房间中
    //     inRoom.value = false
    //     roomId.value = ''
    //     isHost.value = false
    //     roomInfo.value = null
    //     roomControlMode.value = ControlMode.HOST_ONLY
    //     console.log('内容脚本确认用户不在房间中')
    //     return true
    //   }
    // } catch (error) {
    //   console.log('从内容脚本获取房间信息失败:', error)

    // 尝试直接从后台获取信息
    try {
      // 改用Promise方式发送消息
      const backResponse = await browser.runtime.sendMessage({
        type: 'GET_ROOM_INFO',
        data: { tabId: tab.id },
      })

      if (backResponse.success) {
        const { roomId: oldRoomId, roomInfo: oldRoomInfo, isHost: oldIsHost } = backResponse.data
        // 更新房间信息
        inRoom.value = true
        roomId.value = oldRoomId || ''
        roomInfo.value = oldRoomInfo || null

        if (oldRoomInfo && oldRoomInfo.controlMode) {
          roomControlMode.value = oldRoomInfo.controlMode
        }

        isHost.value = oldIsHost || false
        console.log('从后台确认用户在房间中:', roomId.value)
        return true
      } else {
        // 不在房间中
        inRoom.value = false
        roomId.value = ''
        isHost.value = false
        roomInfo.value = null
        roomControlMode.value = ControlMode.HOST_ONLY
        console.log('从后台确认用户不在房间中')
        return true
      }
    } catch (backError) {
      console.error('从后台获取房间信息失败:', backError)
      return false
    }
  } catch (error) {
    console.log('获取房间信息失败:', error)
    return false
  }
}

// 页面加载时检查状态
onMounted(async () => {
  try {
    // 检查当前网站是否支持创建房间
    await checkCurrentPageSupport()

    // 获取当前标签页的房间信息
    await getRoomInfoFromContentScript()

    // 设置定期检查房间状态，确保UI与实际状态同步
    // 每10秒从内容脚本获取一次最新状态（原为3秒，太频繁可能导致连接问题）
    const intervalId = setInterval(async () => {
      if (document.visibilityState === 'visible') {
        await getRoomInfoFromContentScript()
      }
    }, 10000)

    // 当popup关闭时清除定时器
    window.addEventListener('beforeunload', () => {
      clearInterval(intervalId)
    })
  } catch (error) {
    console.error('初始化错误:', error)
    // 出错时设置默认状态
    inRoom.value = false
  } finally {
    // 无论如何都完成加载
    loading.value = false
  }
})

// 获取当前活跃标签页
const getCurrentTab = async () => {
  const tabs = await browser.tabs.query({
    active: true,
    currentWindow: true,
  })

  if (!tabs || tabs.length === 0) {
    throw new Error('无法获取当前标签页')
  }

  return tabs[0]
}

// 发送消息到内容脚本
const sendToContentScript = async (message: any) => {
  try {
    const tab = await getCurrentTab()

    if (!tab.id) {
      throw new Error('无效的标签ID')
    }

    // 改用Promise方式发送消息
    return await browser.tabs.sendMessage(tab.id!, message)
  } catch (error) {
    console.error('向内容脚本发送消息失败:', error)
    throw error
  }
}

// 创建房间
const createRoom = async () => {
  try {
    loading.value = true // 显示加载状态

    console.log('开始创建房间，当前inRoom值:', inRoom.value)

    // 生成房间ID
    const newRoomId = generateRoomId()
    const tab = await getCurrentTab()
    // 直接让内容脚本处理创建房间的逻辑
    const response = await sendToContentScript({
      action: 'create_room',
      roomId: newRoomId,
      controlMode: controlMode.value,
    })

    // 处理响应
    if (response && response.success) {
      // 更新本地状态
      roomId.value = response.roomId
      roomInfo.value = response.roomInfo
      isHost.value = response.isHost
      inRoom.value = true

      if (response.roomInfo && response.roomInfo.controlMode) {
        roomControlMode.value = response.roomInfo.controlMode
      }

      console.log('房间创建完成，当前状态:', {
        inRoom: inRoom.value,
        roomId: roomId.value,
        isHost: isHost.value,
      })
    } else {
      console.error('创建房间失败:', response?.error || '未知错误')
    }
  } catch (error) {
    console.error('创建房间失败:', error)
    // 可以在这里添加错误提示UI
  } finally {
    loading.value = false // 隐藏加载状态
  }
}

// 加入房间
const joinRoom = async () => {
  if (!roomIdToJoin.value) return

  try {
    loading.value = true // 显示加载状态

    console.log('开始加入房间，当前inRoom值:', inRoom.value)

    // 直接让内容脚本处理加入房间的逻辑
    const response = await sendToContentScript({
      action: 'join_room',
      roomId: roomIdToJoin.value,
    })

    // 处理响应
    if (response && response.success) {
      // 更新UI状态
      roomId.value = response.roomId
      roomInfo.value = response.roomInfo
      isHost.value = response.isHost
      inRoom.value = true

      if (response.roomInfo && response.roomInfo.controlMode) {
        roomControlMode.value = response.roomInfo.controlMode
      }

      console.log('房间加入完成，当前状态:', {
        inRoom: inRoom.value,
        roomId: roomId.value,
        isHost: isHost.value,
      })
    } else {
      console.error('加入房间失败:', response?.error || '未知错误')
    }
  } catch (error) {
    console.error('加入房间失败:', error)
    // 可以在这里添加错误提示UI
  } finally {
    loading.value = false // 隐藏加载状态
  }
}

// 退出房间
const leaveRoom = async () => {
  try {
    loading.value = true // 显示加载状态

    // 发送退出消息到内容脚本
    const response = await sendToContentScript({
      action: 'leave_room',
    })

    if (!response.success) {
      console.error('退出房间失败:', response?.error || '未知错误')
      throw new Error('退出房间失败')
    }
    // 重置所有状态变量
    inRoom.value = false
    roomId.value = ''
    isHost.value = false
    roomInfo.value = null
    roomControlMode.value = ControlMode.HOST_ONLY

    console.log('成功退出房间，UI已重置')
  } catch (error) {
    console.error('退出房间失败:', error)
    // 可以在这里添加错误提示UI
  } finally {
    loading.value = false // 隐藏加载状态
  }
}

// 更改控制模式
const changeControlMode = async () => {
  if (!isHost.value || !roomId.value) return

  try {
    // 发送更改控制模式消息到内容脚本
    const message = {
      type: MessageType.CONTROL_MODE_CHANGE,
      roomId: roomId.value,
      senderId: await getUserId(),
      data: {
        controlMode: roomControlMode.value,
      },
      timestamp: Date.now(),
    }

    await sendToContentScript({
      action: 'ws_send',
      message,
    })
  } catch (error) {
    console.error('更改控制模式失败:', error)
    // 可以在这里添加错误提示UI
  }
}

// 检查状态
const checkState = async () => {
  try {
    loading.value = true

    // 刷新页面支持状态
    await checkCurrentPageSupport()

    // 获取房间信息
    await getRoomInfoFromContentScript()
  } catch (error) {
    console.error('检查状态失败:', error)
  } finally {
    loading.value = false
  }
}
</script>

<style>
.container {
  width: 350px;
  padding: 16px;
  font-family: 'Arial', sans-serif;
}

h1 {
  font-size: 18px;
  text-align: center;
  margin-bottom: 16px;
  color: #333;
}

h2 {
  font-size: 16px;
  margin-bottom: 12px;
  color: #444;
}

.loading {
  text-align: center;
  margin: 24px 0;
}

.info-box {
  background-color: #f8f9fa;
  border-radius: 4px;
  padding: 12px;
  margin-bottom: 12px;
}

.site-note {
  margin-bottom: 4px;
  font-weight: bold;
}

.room-controls {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.create-room,
.join-room {
  background-color: #f8f9fa;
  border-radius: 4px;
  padding: 12px;
}

.site-info {
  background-color: #e6f7ff;
  border-radius: 4px;
  padding: 8px;
  margin-bottom: 12px;
  font-size: 14px;
}

.site-name {
  font-weight: bold;
  word-break: break-all;
}

.control-option {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.divider {
  text-align: center;
  position: relative;
  margin: 8px 0;
}

.divider::before,
.divider::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 40%;
  height: 1px;
  background-color: #ddd;
}

.divider::before {
  left: 0;
}

.divider::after {
  right: 0;
}

input[type='text'] {
  width: 100%;
  padding: 8px;
  box-sizing: border-box;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-bottom: 12px;
}

.btn {
  width: 100%;
  padding: 8px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.btn-primary {
  background-color: #1890ff;
  color: white;
}

.btn-secondary {
  background-color: #52c41a;
  color: white;
}

.btn-danger {
  background-color: #ff4d4f;
  color: white;
  margin-top: 16px;
}

.btn:disabled {
  background-color: #d9d9d9;
  cursor: not-allowed;
}

.room-info {
  background-color: #f8f9fa;
  border-radius: 4px;
  padding: 12px;
}

.room-id {
  font-weight: bold;
  color: #1890ff;
}

.host-status {
  font-weight: bold;
  color: #52c41a;
}

.host-controls {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #eee;
}

.host-controls h3 {
  font-size: 14px;
  margin-bottom: 8px;
}

.btn-debug {
  background-color: #8c8c8c;
  color: white;
  font-size: 12px;
  padding: 4px;
  margin-top: 10px;
}
</style>
