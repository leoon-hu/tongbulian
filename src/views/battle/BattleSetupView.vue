<script setup lang="ts">
// 对战设置页（B27）：跟谁打（打机器人 / 两人一台 / 各用各的）→ 开始；机器人快慢、选游戏、改名字都在页头「⚙️ 配置」的面板里，页面默认不展示；
// 没输过名字的设备点「开始」才问一次（B17），问完直接开始。「各用各的」（B19 / B20）：建房间 → 二维码页，别人扫码进来（输口令进房的「🔑 加入对战」在全局顶栏，不在这里）。
// 选中哪张「跟谁打」的卡，卡下面出一行对应的说明（B27）；页面打开读「跟谁打？」+ 当前那张卡的说明，换卡读那张的说明，建房出错读错误提示（B39a）
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { createRng, hasGenerator } from '@/engine'
import { courseOfKp } from '@/engine/catalog'
import { kpTitleKey, lang, ui } from '@/engine/i18n'
import { hush, sayKeys } from '@/engine/voice'
import { enterArenaFullscreen } from '@/battle/fullscreen'
import { AUTOCREATE_KEY, remember, takeIntent } from '@/engine/update'
import { chapterSkin, resolveSkin } from '@/battle/skins'
import { useBattleStore, type BattleMode, type LocalMode } from '@/stores/battle'
import { FATAL_ERRORS, useRoomStore } from '@/stores/room'
import PageHeader from '@/components/ui/PageHeader.vue'
import RubyText from '@/components/ui/RubyText.vue'
import BigButton from '@/components/ui/BigButton.vue'
import ConfigSheet from '@/components/battle/ConfigSheet.vue'
import NameSheet from '@/components/battle/NameSheet.vue'
import ModeIcon from '@/components/battle/ModeIcon.vue'

const route = useRoute()
const router = useRouter()
const store = useBattleStore()
const room = useRoomStore()

const kpId = String(route.params.kpId)
const info = courseOfKp(kpId)
const ready = info !== undefined && hasGenerator(kpId)
if (!ready) router.replace('/')
const mapPath = info ? `/s/${info.subject.id}/g/${info.grade.id}` : '/'

const mode = ref<BattleMode>('ai')
/** 多设备（B46）：这个地址有没有对战服务（file:// 打开就没有） */
const online = computed(() => room.available)
/** 正在改谁的名字（NameSheet 打开时） */
const asking = ref<'me' | 'right' | null>(null)
const names = computed(() => store.prefs.names)
/** 「⚙️ 配置」面板 */
const config = ref(false)
/** 这一次用的游戏：默认按章节排到的那个（B36），配置里换了只影响这一次 */
const skin = ref(chapterSkin(kpId))
/** 点了「开始」但还缺名字：问完接着开始 */
let pendingStart = false

function saveName(name: string): void {
  const which = asking.value
  if (!which) return
  store.setName(which, name)
  asking.value = null
  if (pendingStart) {
    pendingStart = false
    start()
  }
}
function cancelName(): void {
  asking.value = null
  pendingStart = false
}

// ── 多设备（B19）：建房间 → 拿到快照就进大厅；连不上服务 CREATE_TIMEOUT_MS 后提示并放开按钮 ──
const CREATE_TIMEOUT_MS = 8000
const creating = ref(false)
/** 建房失败的原因：服务器给的错误，或 'connect'（连不上） */
const roomError = ref<string | null>(null)
let createTimer: ReturnType<typeof setTimeout> | null = null
function stopCreating(): void {
  creating.value = false
  if (createTimer) clearTimeout(createTimer)
  createTimer = null
}
watch(
  () => room.code,
  (c) => {
    if (creating.value && c && room.snapshot) {
      stopCreating()
      router.push(`/battle/${c}`)
    }
  },
)
watch(
  () => room.error,
  (e) => {
    if (creating.value && e && FATAL_ERRORS.includes(e)) {
      if (e === 'version' && room.updating) {
        // 本页版本旧了：页面正在自己更新重载（B43），重载后接着建房；按钮先写「正在更新…」
        remember(AUTOCREATE_KEY, kpId)
        if (createTimer) clearTimeout(createTimer)
        createTimer = null
        return
      }
      stopCreating()
      room.leave()
      roomError.value = e
    }
  },
)
// 自动更新没成功（同版本已重载过）：按平常的错误处理
watch(
  () => room.updating,
  (u) => {
    if (!u && creating.value && room.error === 'version') {
      stopCreating()
      room.leave()
      roomError.value = 'version'
    }
  },
)
onMounted(() => {
  // 上一次点「建房间」时页面更新重载了：接着建（B43），马上就走、不读提示
  if (takeIntent(AUTOCREATE_KEY) === kpId && online.value) {
    mode.value = 'online'
    createRoom()
    return
  }
  // 切页动画后再开口（与练习页读题一样）
  sayKeys(['battle.who', `battle.mode.${mode.value}.desc`], lang.value, 350)
})
watch(mode, (m) => {
  if (!creating.value) sayKeys([`battle.mode.${m}.desc`], lang.value)
})
watch(roomError, (e) => {
  if (e) sayKeys([e === 'connect' ? 'room.connect.slow' : `room.error.${e}`], lang.value)
})
function createRoom(): void {
  if (creating.value) return
  roomError.value = null
  creating.value = true
  room.create(kpId, resolveSkin(skin.value, createRng()))
  createTimer = setTimeout(() => {
    if (!creating.value) return
    stopCreating()
    room.leave()
    roomError.value = 'connect'
  }, CREATE_TIMEOUT_MS)
}
onBeforeUnmount(() => {
  // 建房还没回来就离开了：断掉，别留一个没人的房间
  if (creating.value) room.leave()
  if (createTimer) clearTimeout(createTimer)
  // 离开页面停声（提示语别跟到下一页；竞技场的倒数在这之后才开口）
  hush()
})

function start(): void {
  // 从来没输过名字：现在问，问完接着开始（B17 / B18）
  if (!names.value.me) {
    pendingStart = true
    asking.value = 'me'
    return
  }
  if (mode.value === 'online') {
    createRoom()
    return
  }
  if (mode.value === 'duo' && !names.value.right) {
    pendingStart = true
    asking.value = 'right'
    return
  }
  store.startLocal({ kpId, mode: mode.value as LocalMode, skin: skin.value })
  // 在这个手势里试着全屏 + 横屏锁（B30）：只有触屏设备，电脑不自动全屏
  enterArenaFullscreen()
  router.push({ path: `/battle/local/${kpId}`, query: { mode: mode.value } })
}
</script>

<template>
  <div v-if="info" class="setup">
    <PageHeader :back="mapPath">
      <template #title>
        <span class="kp-icon">⚔️</span>
        <RubyText :text="{ k: 'battle.title' }" />
        <span class="kp-name">{{ info.kp.icon }} <RubyText :text="{ k: kpTitleKey(info.kp) }" /></span>
      </template>
      <template #actions>
        <button type="button" class="config-btn" @click="config = true">{{ ui('battle.config') }}</button>
        <RouterLink class="howto" to="/help#rules">{{ ui('help.howto') }}</RouterLink>
      </template>
    </PageHeader>

    <section class="block">
      <h2 class="label"><RubyText :text="{ k: 'battle.who' }" /></h2>
      <div class="modes">
        <button type="button" class="mode" :class="{ on: mode === 'ai' }" @click="mode = 'ai'">
          <ModeIcon mode="ai" />
          <RubyText :text="{ k: 'battle.mode.ai' }" />
        </button>
        <button type="button" class="mode" :class="{ on: mode === 'duo' }" @click="mode = 'duo'">
          <ModeIcon mode="duo" />
          <RubyText :text="{ k: 'battle.mode.duo' }" />
        </button>
        <button type="button" class="mode" :class="{ on: mode === 'online', soon: !online }" :disabled="!online" @click="mode = 'online'">
          <ModeIcon mode="online" />
          <RubyText :text="{ k: 'battle.mode.online' }" />
          <small v-if="!online">{{ ui('room.unavailable') }}</small>
        </button>
      </div>
      <p class="mode-desc" :key="mode"><RubyText :text="{ k: `battle.mode.${mode}.desc` }" /></p>
    </section>

    <div class="start">
      <BigButton color="green" class="start-btn" :disabled="creating" @click="start">
        <RubyText :text="{ k: mode === 'online' ? (creating ? (room.updating ? 'room.updating' : 'room.connecting') : 'room.create') : 'battle.start' }" />
      </BigButton>
      <p v-if="roomError" class="room-error" role="alert">
        <RubyText :text="{ k: roomError === 'connect' ? 'room.connect.slow' : `room.error.${roomError}` }" />
      </p>
    </div>


    <ConfigSheet v-if="config" v-model:skin="skin" @close="config = false" @rename="(w) => (asking = w)" />
    <NameSheet
      v-if="asking"
      :initial="asking === 'right' ? names.right : names.me"
      :taken="asking === 'right' ? [names.me] : [names.right]"
      @save="saveName"
      @close="cancelName"
    />
  </div>
</template>

<style scoped>
.room-error {
  flex-basis: 100%;
  margin: 8px 0 0;
  text-align: center;
  color: var(--c-primary-dark);
  font-weight: 700;
}
.start {
  flex-wrap: wrap;
}
.howto,
.config-btn {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 0 14px;
  border-radius: 999px;
  background: var(--c-card);
  box-shadow: var(--shadow-card);
  color: var(--c-text);
  font-weight: 700;
  font-size: var(--fs-sm);
  text-decoration: none;
  white-space: nowrap;
}
.config-btn {
  margin-right: 8px;
}
/* 选中的模式下面一行说明（B27） */
.mode-desc {
  margin: 12px 4px 0;
  font-size: var(--fs-sm);
  font-weight: 700;
  line-height: 1.7;
  color: var(--c-text-light);
  animation: fade-in 0.25s ease-out;
}
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
}
/* 窄屏（手机竖屏）放不下页头的键：整块换到标题下面一行、靠右，标题不再被挤成竖排 */
@media (max-width: 640px) {
  .setup :deep(.page-header) {
    flex-wrap: wrap;
  }
  .setup :deep(.page-header .actions) {
    flex-basis: 100%;
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 8px;
  }
  .config-btn {
    margin-right: 0;
  }
}
.setup {
  max-width: 840px;
  margin: 0 auto;
  padding-bottom: 32px;
}
.kp-icon {
  flex: none;
}
.kp-name {
  font-size: var(--fs-md);
  font-weight: 700;
  color: var(--c-text-light);
  margin-left: 6px;
}
.block {
  padding: 8px 16px;
}
.label {
  font-size: var(--fs-md);
  color: var(--c-primary-dark);
  margin-bottom: 10px;
}
.modes {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.mode {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-height: var(--tap-min);
  padding: 14px 8px;
  border-radius: var(--radius-lg);
  background: var(--c-card);
  box-shadow: var(--shadow-card);
  border: 3px solid transparent;
  font-size: var(--fs-md);
  font-weight: 800;
  color: var(--c-text);
  transition: transform 0.08s ease;
}
.mode:not(:disabled):active {
  transform: scale(0.96);
}
.mode.on {
  border-color: var(--c-primary);
  background: #fff3e6;
}
.mode.soon {
  opacity: 0.55;
  cursor: not-allowed;
  border: 2px dashed var(--c-locked);
  box-shadow: none;
  background: var(--c-bg);
}
.mode.soon small {
  font-size: var(--fs-sm);
  font-weight: 400;
  color: var(--c-text-light);
}
/* 三张卡的示意图（ModeIcon）：一台 / 两台手机，卡越宽图越大，最大 132px */
.mode :deep(.mode-pic) {
  margin-bottom: 2px;
}
.start {
  display: flex;
  justify-content: center;
  padding: 16px;
}
.start-btn {
  min-width: 220px;
  font-size: var(--fs-xl);
}
</style>
