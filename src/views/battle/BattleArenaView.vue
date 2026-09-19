<script setup lang="ts">
// 单设备竞技场的路由页（打机器人 / 两人一台）：刷新或直接打开地址时开一局，然后交给 Arena；退出回地图、换游戏回设置页
import { onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { hasGenerator } from '@/engine'
import { courseOfKp } from '@/engine/catalog'
import { useBattleStore, type LocalMode } from '@/stores/battle'
import Arena from '@/components/battle/Arena.vue'

const route = useRoute()
const router = useRouter()
const store = useBattleStore()

const kpId = String(route.params.kpId)
const mode: LocalMode = route.query.mode === 'duo' ? 'duo' : 'ai'
/** 直接打开地址时可带 ?skin= 指定游戏（截图 / 普查脚本用），不带就按章节 */
const skin = typeof route.query.skin === 'string' ? route.query.skin : undefined
const info = courseOfKp(kpId)
const mapPath = info ? `/s/${info.subject.id}/g/${info.grade.id}` : '/'
const setupPath = `/battle/new/${kpId}`

if (!info || !hasGenerator(kpId)) router.replace('/')
else if (!store.state || store.state.kpId !== kpId || store.mode !== mode) {
  // 刷新或直接打开地址：名字都还在就直接开一局，缺名字回设置页
  if (!store.prefs.names.me || (mode === 'duo' && !store.prefs.names.right)) router.replace(setupPath)
  else store.startLocal({ kpId, mode, skin })
}

function exit(): void {
  store.leave()
  router.push(mapPath)
}

function changeSkin(): void {
  store.leave()
  router.push(setupPath)
}

onBeforeUnmount(() => store.leave())
</script>

<template>
  <Arena v-if="store.state" @exit="exit" @change-skin="changeSkin" />
</template>
