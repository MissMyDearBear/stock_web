import { createApp } from 'vue'
import App from './App.vue'
import router from './router' // 引入上面的路由配置

const app = createApp(App)
app.use(router) // 必须使用 router
app.mount('#app')