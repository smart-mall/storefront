import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { router } from './router'
import { pinia } from './store'

const app = createApp(App)

// 顺序不能反：router 安装时会立刻发起首次导航，而路由守卫里要用 pinia 的 store，
// 所以 pinia 必须先装好
app.use(pinia)
app.use(router)

app.mount('#app')
