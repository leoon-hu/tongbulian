<script setup lang="ts">
// 单设备竞技场的路由页（打机器人 / 两人一台）：刷新或直接打开地址时开一局，然后交给 Arena；退出 / 不玩了回地图。
// 「下一章」：同样的人、同一模式换成本册下一个知识点接着打——地址换成新知识点，但 App 给这个路由的 key 固定，视图不重挂、竞技场不重开、全屏不退。
// 模板单根（.arena-page 壳，退出时 state 变 null 也留着）、根上不放 HTML 注释：App 的 <Transition> 只给单根做过渡
import { onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { hasGenerator } from '@/engine'
import { courseOfKp, mapPathOf, practicePathOf } from '@/engine/catalog'
import { useBattleStore, type LocalMode } from '@/stores/battle'
import Arena from '@/components/battle/Arena.vue'

const route = useRoute()
const router = useRouter()
const store = useBattleStore()

const kpId = String(route.params.kpId)
const mode: LocalMode = route.query.mode === 'duo' ? 'duo' : 'ai'
/** 幽灵对手（B67）：地址带 ?ghost=1 就用上一次的记录当对手（没有记录时自然还是机器人） */
const ghost = route.query.ghost === '1'
/** 直接打开地址时可带 ?skin= 指定游戏（截图 / 普查脚本用），不带就按章节 */
const skin = typeof route.query.skin === 'string' ? route.query.skin : undefined
const info = courseOfKp(kpId)
/** 回地图：按当前这一局的知识点算（「下一章」跨到下册也回下册） */
const mapPath = (): string => mapPathOf(store.state?.kpId ?? kpId)
const setupPath = `/battle/new/${kpId}`

if (!info || !hasGenerator(kpId)) router.replace('/')
else if (!store.state || store.state.kpId !== kpId || store.mode !== mode) {
  // 刷新或直接打开地址：名字都还在就直接开一局，缺名字回设置页
  if (!store.prefs.names.me || (mode === 'duo' && !store.prefs.names.right)) router.replace(setupPath)
  else store.startLocal({ kpId, mode, skin, ghost })
}

function exit(): void {
  const to = mapPath()
  store.leave()
  router.push(to)
}

/** 再练一遍（B69）：结果页里点的，离开竞技场去这个知识点的练习页 */
function practice(kpId: string): void {
  const to = practicePathOf(kpId)
  store.leave()
  router.push(to)
}

/** 下一章（B9）：换知识点重新开一局（游戏按那一章排到的），地址跟着换但不重挂载 */
function nextChapter(next: string): void {
  const useGhost = ghost && store.hasGhost(next)
  store.startLocal({ kpId: next, mode, ghost: useGhost })
  void router.replace({ path: `/battle/local/${next}`, query: useGhost ? { mode, ghost: '1' } : { mode } })
}

onBeforeUnmount(() => store.leave())
</script>

<template>
  <div class="arena-page">
    <Arena v-if="store.state" @exit="exit" @next="nextChapter" @practice="practice" />
  </div>
</template>

<style scoped>
.arena-page {
  display: contents;
}
</style>
