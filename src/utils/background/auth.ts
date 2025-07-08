// 这个函数用于获取 Auth.js 的会话 Token
async function getAuthToken() {
  const url = 'http://localhost:3000' // 或者您的线上域名

  // Auth.js v5+ 默认的 Cookie 名称
  // 如果是生产环境 (HTTPS), Cookie 名称可能是 "__Secure-authjs.session-token"
  // 如果是开发环境 (HTTP), Cookie 名称是 "authjs.session-token"
  // 您可以在浏览器的开发者工具中确认确切的名称
  const cookieName = 'authjs.session-token'

  try {
    // 使用 chrome.cookies API 获取 Cookie
    const cookie = await browser.cookies.get({
      url: url,
      name: cookieName,
    })

    if (cookie) {
      console.log('成功获取到 Auth Token:', cookie.value)
      return cookie.value // 这就是 JWT
    } else {
      console.log('未找到指定的 Cookie。用户可能未登录。')
      return null
    }
  } catch (error) {
    console.error('获取 Cookie 时出错:', error)
    return null
  }
}
