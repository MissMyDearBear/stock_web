import { createApp } from 'vue'
import App from './App.vue'
import router from './router' // 引入上面的路由配置
// 1. 引入 Element Plus
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

const app = createApp(App)
app.use(router) // 必须使用 router
// 2. 告诉 Vue 使用 Element Plus
app.use(ElementPlus)
app.mount('#app')