import { defineConfig } from 'wxt'

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  srcDir: 'src',
  server: {
    port: 3001,
  },

  manifest: () => ({
    name: 'Aparty 视频同步',
    description: '一个允许用户在不同浏览器上同步观看视频的扩展',
    permissions: ['storage', 'tabs', 'activeTab', 'webNavigation', 'identity', 'cookies'],

    host_permissions: ['*://*.bilibili.com/*', '*://*.youtube.com/*', 'http://localhost:3000/*'], // 用于本地开发],
    web_accessible_resources: [
      {
        resources: ['/ap-panel.html'],
        matches: ['<all_urls>'],
      },
    ],
  }),
})
