const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  transpileDependencies: true,
  publicPath: process.env.PUBLIC_PATH || '/',
  devServer: {
    proxy: {
      '/api': {
        target: process.env.VUE_APP_API_PROXY_TARGET || 'http://localhost:3100',
        changeOrigin: true
      }
    }
  }
})
