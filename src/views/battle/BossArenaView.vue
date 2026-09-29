<script setup lang="ts">
// 打怪兽单设备竞技场的路由页（M6）：刷新或直接打开地址时按地址开一局（?mode=solo|ai|duo&v=coop|versus&t=60|90|120），然后交给 BossArena；
// 退出 / 不玩了回地图；「下一章」换成本册下一个知识点接着打（App 给这个路由的 key 固定，视图不重挂、全屏不退）；「再练一遍」去练习页。
// 模板单根（.boss-page 壳）、根上不放 HTML 注释：App 的 <Transition> 只给单根做过渡
import { onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { hasGenerator } from '@/engine'
import { courseOfKp, mapPathOf, practicePathOf } from '@/engine/catalog'
import { isDurationS, type DurationS, type TimedVariant } from '@/battle/timed'
import type { LocalBossMode } from '@/battle/boss'
import { useBattleStore } from '@/stores/battle'
import { useBossStore } from '@/stores/boss'
import BossArena from '@/components/battle/boss/BossArena.vue'

const route = useRoute()
const router = useRouter()
const store = useBossStore()
const battle = useBattleStore()

const kpId = String(route.params.kpId)
const mode: LocalBossMode = route.query.mode === 'duo' ? 'duo' : route.query.mode === 'ai' ? 'ai' : 'solo'
const variant: TimedVariant = route.query.v === 'versus' ? 'versus' : 'coop'
const t = Number(route.query.t)
const durationS: DurationS = isDurationS(t) ? t : battle.prefs.boss.durationS
const info = courseOfKp(kpId)
const mapPath = (): string => mapPathOf(store.state?.kpId ?? kpId)
if (!info || !hasGenerator(kpId)) router.replace('/')
// 刷新或直接打开地址：直接开一局（设置页点「开始」时已经开好了就不重开）
else if (!store.state || store.state.kpId !== kpId || store.mode !== mode) store.startLocal({ kpId, mode, variant, durationS })

function exit(): void {
  const to = mapPath()
  store.leave()
  router.push(to)
}

function practice(id: string): void {
  const to = practicePathOf(id)
  store.leave()
  router.push(to)
}

/** 下一章：同样的人、玩法、时长，换知识点重新开一局；地址跟着换但不重挂载 */
function nextChapter(next: string): void {
  const s = store.state
  store.startLocal({ kpId: next, mode, variant: s?.variant ?? variant, durationS: s ? ((s.durationMs / 1000) as DurationS) : durationS, boss: s?.boss })
  void router.replace({ path: `/boss/local/${next}`, query: route.query })
}

onBeforeUnmount(() => store.leave())
</script>

<template>
  <div class="boss-page">
    <BossArena v-if="store.state" @exit="exit" @next="nextChapter" @practice="practice" />
  </div>
</template>

<style scoped>
.boss-page {
  display: contents;
}
</style>
