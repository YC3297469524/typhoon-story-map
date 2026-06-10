<template>
  <div id="app">
    <LeafletMap />
  </div>
</template>

<script>
import LeafletMap from './components/Leaflet.vue'

export default {
  name: 'App',
  components: {
    LeafletMap
  }
}
</script>

<style>
#app {
  font-family: 'Microsoft YaHei', 'PingFang SC', 'Noto Sans SC', system-ui, -apple-system, 'Segoe UI', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  width: 100%;
  height: 100vh;
  margin: 0;
}
</style>
