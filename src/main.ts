import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from '@/router'
import App from '@/App.vue'
import { useSettingsStore } from '@/stores/settings'
import { useInstallStore } from '@/stores/install'
import { unlockAudio } from '@/engine/audio'
import { setupPageTracking } from '@/engine/analytics'
import '@/styles/tokens.css'
import '@/styles/themes.css'
import '@/styles/base.css'

// 任何一次触摸 / 按键都顺手解锁音频（iOS / Safari 要在用户手势里恢复 AudioContext），之后读题不再受限
document.addEventListener('pointerdown', unlockAudio, { capture: true, passive: true })
document.addEventListener('keydown', unlockAudio, { capture: true, passive: true })

const app = createApp(App)
app.use(createPinia())
// 启动即初始化设置：应用持久化的语言，深链直达非首页也能生效
useSettingsStore()
// 安装提示（F16）：先挂 beforeinstallprompt / appinstalled 再挂载，Chrome 页面加载后很快就发，挂晚了就漏
useInstallStore().setup()
app.use(router)
app.mount('#app')
// 访问统计（N7）：翻页由路由上报（房间号不进统计库、返回键不记两次）；没加统计标签时什么都不做
setupPageTracking(router)
