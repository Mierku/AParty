// 给background 或 iframe 发消息
export function sendMessagePromise(message: any): Promise<{ success: boolean; [key: string]: unknown }> {
  return new Promise((resolve, reject) => {
    browser.runtime.sendMessage(message, function (response) {
      if (browser.runtime.lastError) {
        // 处理可能发生的错误，例如接收方不存在或出现内部错误
        reject(browser.runtime.lastError)
      } else {
        resolve(response)
      }
    })
  })
}

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

export const sendToContentScript = async (message: any) => {
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
