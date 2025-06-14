import { defineConfig } from 'wxt'

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  srcDir: 'src',
  
  manifest: {
    name: 'CocoParty 视频同步',
    description: '一个允许用户在不同浏览器上同步观看视频的扩展',
    permissions: ['storage', 'tabs', 'activeTab', 'webNavigation'],
    host_permissions: ['*://*.bilibili.com/*', '*://*.youtube.com/*'],
    web_accessible_resources: [
      {
        resources: ['/ap-panel.html'],
        matches: ['<all_urls>'],
      },
    ],
  },
})
