// 获取当前活跃标签页
export const getCurrentTab = async () => {
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
export const sendToContentScript = async (message: any, frameId?: number) => {
  try {
    const tab = await getCurrentTab()

    if (!tab.id) {
      throw new Error('无效的标签ID')
    }

    // 改用Promise方式发送消息
    return await browser.tabs.sendMessage(tab.id!, message, { frameId })
  } catch (error) {
    console.error('向内容脚本发送消息失败:', error)
    throw error
  }
}

// // 创建房间
// const createRoom = async () => {
//   try {
//     loading.value = true // 显示加载状态

//     console.log('开始创建房间，当前inRoom值:', inRoom.value)

//     // 生成房间ID
//     const newRoomId = generateRoomId()
//     const tab = await getCurrentTab()
//     // 直接让内容脚本处理创建房间的逻辑
//     const response = await sendToContentScript(
//       {
//         action: 'create_room',
//         roomId: newRoomId,
//         controlMode: controlMode.value,
//       },
//       0,
//     )

//     // 处理响应
//     if (response && response.success) {
//       // 更新本地状态
//       roomId.value = response.roomId
//       roomInfo.value = response.roomInfo
//       isHost.value = response.isHost
//       inRoom.value = true

//       if (response.roomInfo && response.roomInfo.controlMode) {
//         roomControlMode.value = response.roomInfo.controlMode
//       }

//       console.log('房间创建完成，当前状态:', {
//         inRoom: inRoom.value,
//         roomId: roomId.value,
//         isHost: isHost.value,
//       })
//     } else {
//       console.error('创建房间失败:', response?.error || response)
//     }
//   } catch (error) {
//     console.error('创建房间失败:', error)
//     // 可以在这里添加错误提示UI
//   } finally {
//     loading.value = false // 隐藏加载状态
//   }
// }

// // 加入房间
// const joinRoom = async () => {
//   if (!roomIdToJoin.value) return

//   try {
//     loading.value = true // 显示加载状态

//     console.log('开始加入房间，当前inRoom值:', inRoom.value)

//     // 直接让内容脚本处理加入房间的逻辑
//     const response = await sendToContentScript({
//       action: 'join_room',
//       roomId: roomIdToJoin.value,
//     })

//     // 处理响应
//     if (response && response.success) {
//       // 更新UI状态
//       roomId.value = response.roomId
//       roomInfo.value = response.roomInfo
//       isHost.value = response.isHost
//       inRoom.value = true

//       if (response.roomInfo && response.roomInfo.controlMode) {
//         roomControlMode.value = response.roomInfo.controlMode
//       }

//       console.log('房间加入完成，当前状态:', {
//         inRoom: inRoom.value,
//         roomId: roomId.value,
//         isHost: isHost.value,
//       })
//     } else {
//       console.error('加入房间失败:', response?.error || '未知错误')
//     }
//   } catch (error) {
//     console.error('加入房间失败:', error)
//     // 可以在这里添加错误提示UI
//   } finally {
//     loading.value = false // 隐藏加载状态
//   }
// }

// // 退出房间
// const leaveRoom = async () => {
//   try {
//     loading.value = true // 显示加载状态

//     // 发送退出消息到内容脚本
//     const response = await sendToContentScript({
//       action: 'leave_room',
//     })

//     if (!response.success) {
//       console.error('退出房间失败:', response?.error || '未知错误')
//       throw new Error('退出房间失败')
//     }
//     // 重置所有状态变量
//     inRoom.value = false
//     roomId.value = ''
//     isHost.value = false
//     roomInfo.value = null
//     roomControlMode.value = ControlMode.HOST_ONLY

//     console.log('成功退出房间，UI已重置')
//   } catch (error) {
//     console.error('退出房间失败:', error)
//     // 可以在这里添加错误提示UI
//   } finally {
//     loading.value = false // 隐藏加载状态
//   }
// }

// // 更改控制模式
// const changeControlMode = async () => {
//   if (!isHost.value || !roomId.value) return

//   try {
//     // 发送更改控制模式消息到内容脚本
//     const message = {
//       type: MessageType.CONTROL_MODE_CHANGE,
//       roomId: roomId.value,
//       senderId: await getUserId(),
//       data: {
//         controlMode: roomControlMode.value,
//       },
//       timestamp: Date.now(),
//     }

//     await sendToContentScript({
//       action: 'ws_send',
//       message,
//     })
//   } catch (error) {
//     console.error('更改控制模式失败:', error)
//     // 可以在这里添加错误提示UI
//   }
// }

// // 检查状态
// const checkState = async () => {
//   try {
//     loading.value = true

//     // 刷新页面支持状态
//     await checkCurrentPageSupport()

//     // 获取房间信息
//     await getRoomInfoFromContentScript()
//   } catch (error) {
//     console.error('检查状态失败:', error)
//   } finally {
//     loading.value = false
//   }
// }
