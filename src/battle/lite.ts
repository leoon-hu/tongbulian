/**
 * 房间状态里全局顶栏 / 根组件要看的几样（N8）：单独放一个轻模块，App.vue 与 AppHeader 不用为了「🔑 加入对战」按钮
 * 和「在不在对战里」把整个房间 store（WebSocket、WebRTC、比赛状态机、机器人、音效、朗读清单）都拉进首页的入口分块。
 * 真值仍由 stores/room.ts 维护：它把自己的 inMatch / 当前知识点镜像到这里；joinOpen 就是同一个 ref。
 */
import { computed, ref } from 'vue'
import { socketUrl } from './socket'

/** 这个地址下有对战中继服务（file:// 没有） */
export const roomAvailable = computed(() => socketUrl() !== null)
/** 全局「加入对战」面板开着（顶栏按钮打开，App 渲染 JoinSheet） */
export const joinOpen = ref(false)
/** 多设备房间正在比赛（倒数 / 进行中 / 结果页）：根组件据此不画顶栏、不重载 */
export const roomInMatch = ref(false)
/** 房间当前的知识点（页面标题用） */
export const roomKpId = ref<string | null>(null)
