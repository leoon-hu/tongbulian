<script setup lang="ts">
// 对战设置页（B27）：跟谁打（打机器人 / 两人一台 / 各用各的）→ 开始；机器人快慢、选游戏、改名字都在页头「⚙️ 配置」的面板里，页面默认不展示；
// 没输过名字的设备点「开始」才问一次（B17），问完直接开始。「各用各的」（B19 / B20）：建房间 → 二维码页，别人扫码进来；
// 页头「🔑 加入对战」：输 6 位数字口令，服务器换成房间号 + 身份，再按链接的方式进房（B19）
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { createRng, hasGenerator } from '@/engine'
import { courseOfKp } from '@/engine/catalog'
import { kpTitleKey, ui } from '@/engine/i18n'
import { enterArenaFullscreen } from '@/battle/fullscreen'
import { chapterSkin, resolveSkin } from '@/battle/skins'
import { useBattleStore, type BattleMode, type LocalMode } from '@/stores/battle'
import { FATAL_ERRORS, useRoomStore } from '@/stores/room'
import PageHeader from '@/components/ui/PageHeader.vue'
import RubyText from '@/components/ui/RubyText.vue'
import BigButton from '@/components/ui/BigButton.vue'
import ConfigSheet from '@/components/battle/ConfigSheet.vue'
import NameSheet from '@/components/battle/NameSheet.vue'
import JoinSheet from '@/components/battle/JoinSheet.vue'
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
      stopCreating()
      room.leave()
      roomError.value = e
    }
  },
)
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
// ── 加入对战（B19）：输口令 → lookup → found 就按链接的方式进房；口令不对 / 连不上留在面板里提示 ──
const joining = ref(false)
const joinBusy = ref(false)
/** 面板里要显示的错误词条键 */
const joinError = ref<string | null>(null)
let joinTimer: ReturnType<typeof setTimeout> | null = null
function stopJoining(): void {
  joinBusy.value = false
  if (joinTimer) clearTimeout(joinTimer)
  joinTimer = null
}
function openJoin(): void {
  joinError.value = null
  joining.value = true
}
function closeJoin(): void {
  joining.value = false
  if (joinBusy.value) {
    stopJoining()
    room.leave()
  }
}
function join(pass: string): void {
  if (joinBusy.value) return
  joinError.value = null
  joinBusy.value = true
  room.lookup(pass)
  joinTimer = setTimeout(() => {
    if (!joinBusy.value) return
    stopJoining()
    room.leave()
    joinError.value = 'room.connect.slow'
  }, CREATE_TIMEOUT_MS)
}
watch(
  () => room.found,
  (f) => {
    if (joinBusy.value && f) {
      stopJoining()
      joining.value = false
      router.push({ path: `/battle/${f.code}`, query: { t: f.t } })
    }
  },
)
watch(
  () => room.error,
  (e) => {
    if (joinBusy.value && e && FATAL_ERRORS.includes(e)) {
      stopJoining()
      room.leave()
      joinError.value = e === 'noRoom' ? 'room.join.wrong' : `room.error.${e}`
    }
  },
)

onBeforeUnmount(() => {
  // 建房 / 查口令还没回来就离开了：断掉，别留一个没人的房间
  if (creating.value || joinBusy.value) room.leave()
  if (createTimer) clearTimeout(createTimer)
  if (joinTimer) clearTimeout(joinTimer)
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
        <button type="button" class="join-btn" :disabled="!online" @click="openJoin">🔑 {{ ui('room.join') }}</button>
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
    </section>

    <div class="start">
      <BigButton color="green" class="start-btn" :disabled="creating" @click="start">
        <RubyText :text="{ k: mode === 'online' ? (creating ? 'room.connecting' : 'room.create') : 'battle.start' }" />
      </BigButton>
      <p v-if="roomError" class="room-error" role="alert">
        <RubyText :text="{ k: roomError === 'connect' ? 'room.connect.slow' : `room.error.${roomError}` }" />
      </p>
    </div>


    <ConfigSheet v-if="config" v-model:skin="skin" @close="config = false" @rename="(w) => (asking = w)" />
    <JoinSheet v-if="joining" :busy="joinBusy" :error="joinError" @join="join" @close="closeJoin" />
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
.config-btn,
.join-btn {
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
.config-btn,
.join-btn {
  margin-right: 8px;
}
.join-btn:disabled {
  opacity: 0.45;
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
