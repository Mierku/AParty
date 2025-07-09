/**
 * 使用 Auth Token 从后端 API 获取完整的会话信息
 * @param {string} token - 从 Cookie 中获取的 JWT
 * @returns {Promise<object|null>} - 包含用户信息的会话对象
 */
export async function getSessionInfo(token: string) {
  if (!token) {
    console.log('Token 不可用，无法获取会话信息。')
    return null
  }

  try {
    // 调用我们刚刚创建的 API 端点
    const response = await fetch('http://localhost:3000/api/auth/session', {
      headers: {
        // 核心步骤：将 Token 作为 Bearer Token 放入 Authorization 请求头
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      // 如果 Token 无效或过期，服务器会返回 401
      throw new Error(`API 调用失败，状态码: ${response.status}`)
    }

    const session = await response.json()
    console.log('成功获取会话信息:', session)
    // 返回的 session 对象结构类似于: { user: { id: '...', name: '...', email: '...' } }
    return session
  } catch (error) {
    console.error('获取会话信息失败:', error)
    return null
  }
}
