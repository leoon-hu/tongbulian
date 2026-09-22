<script setup lang="ts">
// 多设备房间（需求 B13–B25，2026-09-20 用户定的极简流程）：
//   建房的设备只观战、算主持人，页面上只有三个二维码（红队 / 蓝队 / 观战，各带链接与「复制」）和一句说明；
//   扫码进来的人先看「三方连接状态」窗口；红蓝两队都有人在线时服务器自动开始 → 竞技场（Arena）→ 结果。
//   一队有人进来后，建房的设备也能点「以另一队进入」自己上场，或「以观战方进入」到状态窗口只看（B20）。
// 房间的一切状态都来自服务器的快照（stores/room），这里只画；比赛部分由 stores/battle 的线上模式承接。
// 每换到一个画面就把上面的提示语读一遍（B39a）：二维码页的说明 / 「以另一队进入」提示、连接状态窗口的两句、连不上、致命错误、提示条；
//   问名字由 NameSheet 自己读，竞技场里由倒数 / 读题接手。
// 模板只能有一个根元素、根上不能放 HTML 注释：App 的 <Transition mode="out-in"> 只给单根做过渡，多根（开发模式保留注释也算）会让过渡卡住、下一页空白。
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { mapPathOf } from '@/engine/catalog'
import { lang, ui } from '@/engine/i18n'
import { hush, sayKeys } from '@/engine/voice'
import type { Member, Role, Team } from '@/battle/protocol'
import { useBattleStore } from '@/stores/battle'
import { FATAL_ERRORS, useRoomStore } from '@/stores/room'
import { useVoiceStore } from '@/stores/voice'
import Arena from '@/components/battle/Arena.vue'
import NameSheet from '@/components/battle/NameSheet.vue'
import VoiceButton from '@/components/battle/VoiceButton.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import BigButton from '@/components/ui/BigButton.vue'
import RubyText from '@/components/ui/RubyText.vue'

/** 连接超过这么久还没进房：提示检查网络（重连仍在后台继续） */
const SLOW_MS = 8000

const route = useRoute()
const router = useRouter()
const room = useRoomStore()
const battle = useBattleStore()
const voice = useVoiceStore()
// 开发时把 room / voice store 挂到 window 上：语音联调脚本（npm run voice:check）看连接状态与音量
if (import.meta.env.DEV && typeof window !== 'undefined') {
  ;(window as unknown as { __room?: unknown; __voice?: unknown }).__room = room
  ;(window as unknown as { __room?: unknown; __voice?: unknown }).__voice = voice
}

const code = String(route.params.code)
const ROLES: readonly Role[] = ['red', 'blue', 'watch']
const TEAMS: readonly Team[] = ['red', 'blue']
/** 链接里的身份（B20）：扫哪个码进哪队 */
const linkRole = ROLES.find((r) => r === route.query.t)

// 没有昵称先问（B17 / B21），问完再连
const asking = ref(!battle.prefs.names.me)
function connect(): void {
  if (room.code !== code || !room.snapshot) room.enter(code, linkRole)
}
onMounted(() => {
  if (!asking.value) connect()
})
function saveName(name: string): void {
  battle.setName('me', name)
  asking.value = false
  connect()
}

const snap = computed(() => room.snapshot)
const fatal = computed(() => (room.error && FATAL_ERRORS.includes(room.error) ? room.error : null))
const toast = computed(() => (room.error && !FATAL_ERRORS.includes(room.error) ? room.error : null))
const mapPath = computed(() => (snap.value ? mapPathOf(snap.value.kpId) : '/'))
const me = computed(() => room.me)
const myRole = computed<Role>(() => me.value?.role ?? 'watch')

// 连太久：提示检查网络
const slow = ref(false)
let slowTimer: ReturnType<typeof setTimeout> | null = null
watch(
  () => [snap.value, asking.value] as const,
  ([s, a]) => {
    if (slowTimer) clearTimeout(slowTimer)
    slowTimer = null
    slow.value = false
    if (!s && !a) slowTimer = setTimeout(() => (slow.value = true), SLOW_MS)
  },
  { immediate: true },
)

// ── 三个链接与二维码（B20）：观战的设备（建房的那台）才生成；二维码本机生成、按需加载库 ──
const base = computed(() => (typeof location === 'undefined' ? '' : location.href.split('#')[0]!))
const linkOf = (t: Role): string => `${base.value}#/battle/${code}?t=${t}`
const qrs = ref<Record<Role, string>>({ red: '', blue: '', watch: '' })
async function makeQrs(): Promise<void> {
  try {
    const mod = await import('qrcode')
    for (const t of ROLES) qrs.value[t] = await mod.toDataURL(linkOf(t), { width: 320, margin: 1 })
  } catch {
    /* 出不了码就只给链接 */
  }
}
watch(
  () => !!snap.value && myRole.value === 'watch',
  (show) => {
    if (show && !qrs.value.red) void makeQrs()
  },
  { immediate: true },
)
const copied = ref<string | null>(null)
let copiedTimer: ReturnType<typeof setTimeout> | null = null
async function copy(url: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(url)
    copied.value = url
    if (copiedTimer) clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => (copied.value = null), 2000)
  } catch {
    /* 没有剪贴板权限（http 局域网）：让用户长按地址 */
  }
}

const membersOf = (team: Team): Member[] => room.teamMembers(team)
/** 已经有人在线的那一队（B20：有了才出现「以另一队进入 / 以观战方进入」）；两队都有人时比赛已经自动开始，不会在这页 */
const joinedSide = computed<Team | undefined>(() => TEAMS.find((t) => membersOf(t).some((m) => m.online)))
const canEnter = (t: Team): boolean => !!joinedSide.value && joinedSide.value !== t && !membersOf(t).some((m) => m.online)
/** 建房的设备点了「以观战方进入」：离开二维码页到状态窗口（角色仍是观战），「显示二维码」回来 */
const entered = ref(false)
function enterTeam(t: Team): void {
  room.setTeam(t)
}
/** 这个身份的口令（B19），三位一组好念 */
const passOf = (t: Role): string => {
  const p = snap.value?.passcodes?.[t] ?? ''
  return p ? `${p.slice(0, 3)} ${p.slice(3)}` : ''
}
/** 名单文字：自己后面标「（我）」，开了语音的带 🎤（B57） */
const names = (ms: Member[]): string => ms.map((m) => `${m.clientId === room.you ? `${m.name}（${ui('room.me')}）` : m.name}${m.voice ? ' 🎤' : ''}`).join('、')

// ── 提示语朗读（B39a）：当前画面上的那几句，画面换了就读新的；同一画面不重复读 ──
const hint = computed<string[] | null>(() => {
  if (asking.value) return null
  if (fatal.value === 'version' && room.updating) return null
  if (fatal.value) return [`room.error.${fatal.value}`]
  if (!snap.value) return slow.value ? ['room.connect.slow'] : null
  if (room.inMatch) return null
  if (myRole.value === 'watch' && !entered.value) return joinedSide.value ? [`room.enter.hint.${joinedSide.value}`] : ['room.scan']
  return ['room.wait.title', 'room.wait.sub']
})
watch(
  () => hint.value?.join(' '),
  (h) => {
    if (h) sayKeys(h.split(' '), lang.value, 300)
  },
  { immediate: true },
)
// 提示条（这队满了 / 比赛已经开始…）：出现就读一遍
watch(toast, (e) => {
  if (e) sayKeys([`room.error.${e}`], lang.value)
})

function leave(): void {
  // 先记下地图地址：离开房间后快照没了，就不知道是哪个学科 / 年级了
  const to = mapPath.value
  room.leave()
  router.push(to)
}
// 有人点了「不玩了」（服务器关掉房间、发 closed）而我们正在结果页：三台设备一起回地图，不用再点「回去」（B9）
watch(fatal, (e) => {
  if (e === 'closed' && battle.state?.phase === 'ended') leave()
})
onBeforeUnmount(() => {
  if (copiedTimer) clearTimeout(copiedTimer)
  if (slowTimer) clearTimeout(slowTimer)
  // 离开这个页面（返回键 / 换地址）= 离开房间，释放座位（B25）；刷新页面走的是重连
  room.leave()
  hush()
})
</script>

<template>
  <div class="room-page">
  <NameSheet v-if="asking" @save="saveName" @close="leave" />

  <div v-else-if="fatal === 'version' && room.updating" class="room-msg">
    <p class="big">🔄</p>
    <p class="text"><RubyText :text="{ k: 'room.updating' }" /></p>
    <p class="dots big-dots" aria-hidden="true"><i /><i /><i /></p>
  </div>

  <div v-else-if="fatal" class="room-msg">
    <p class="big">😶</p>
    <p class="text"><RubyText :text="{ k: `room.error.${fatal}` }" /></p>
    <BigButton color="primary" @click="leave"><RubyText :text="{ k: 'room.back' }" /></BigButton>
  </div>

  <div v-else-if="!snap" class="room-msg">
    <p class="big">📶</p>
    <p class="text"><RubyText :text="{ k: room.status === 'reconnecting' ? 'room.reconnecting' : 'room.connecting' }" /></p>
    <p v-if="slow" class="slow"><RubyText :text="{ k: 'room.connect.slow' }" /></p>
    <BigButton color="ghost" @click="leave"><RubyText :text="{ k: 'room.back' }" /></BigButton>
  </div>

  <template v-else-if="room.inMatch">
    <Arena @exit="leave" />
    <p v-if="room.status === 'reconnecting'" class="netbar">📶 <RubyText :text="{ k: 'room.reconnecting' }" /></p>
    <p v-else-if="toast" class="netbar" role="status"><RubyText :text="{ k: `room.error.${toast}` }" /></p>
  </template>

  <div v-else-if="myRole === 'watch' && !entered" class="codes-page">
    <PageHeader :back="mapPath">
      <template #title>
        <span class="kp-icon">⚔️</span>
        <RubyText :text="{ k: 'room.title' }" />
      </template>
    </PageHeader>
    <p v-if="room.status === 'reconnecting'" class="netbar inline">📶 <RubyText :text="{ k: 'room.reconnecting' }" /></p>
    <p v-if="toast" class="toast" role="status"><RubyText :text="{ k: `room.error.${toast}` }" /></p>
    <p class="scan-hint"><RubyText :text="{ k: 'room.scan' }" /></p>
    <p v-if="joinedSide" class="enter-hint"><RubyText :text="{ k: `room.enter.hint.${joinedSide}` }" /></p>
    <div class="codes">
      <section v-for="t in TEAMS" :key="t" class="code-card" :class="t">
        <h2 class="code-title"><span>{{ t === 'red' ? '🔴' : '🔵' }}</span><RubyText :text="{ k: `battle.team.${t}` }" /></h2>
        <p class="pass"><RubyText :text="{ k: 'room.pass' }" /><b>{{ passOf(t) }}</b></p>
        <div class="qr-wrap">
          <img v-if="qrs[t]" :src="qrs[t]" :alt="ui(`battle.team.${t}`)" />
          <div v-else class="qr-empty">…</div>
        </div>
        <code class="url">{{ linkOf(t) }}</code>
        <div class="chips">
          <button type="button" class="chip copy" :class="{ done: copied === linkOf(t) }" @click="copy(linkOf(t))">
            <RubyText :text="{ k: copied === linkOf(t) ? 'room.copied' : 'room.copy' }" />
          </button>
          <button v-if="canEnter(t)" type="button" class="chip enter" @click="enterTeam(t)"><RubyText :text="{ k: `room.enter.${t}` }" /></button>
        </div>
        <p class="who" :class="{ some: membersOf(t).length }">
          <template v-if="membersOf(t).length">✓ <RubyText :text="{ k: 'room.joined' }" />：{{ names(membersOf(t)) }}</template>
          <template v-else><span class="dots" aria-hidden="true"><i /><i /><i /></span> <RubyText :text="{ k: 'room.waiting' }" /></template>
        </p>
      </section>
    </div>
    <section class="code-card watch">
      <h2 class="code-title"><span>👀</span><RubyText :text="{ k: 'room.watch' }" /></h2>
      <p class="pass"><RubyText :text="{ k: 'room.pass' }" /><b>{{ passOf('watch') }}</b></p>
      <div class="qr-wrap">
        <img v-if="qrs.watch" :src="qrs.watch" :alt="ui('room.watch')" />
        <div v-else class="qr-empty">…</div>
      </div>
      <code class="url">{{ linkOf('watch') }}</code>
      <div class="chips">
        <button type="button" class="chip copy" :class="{ done: copied === linkOf('watch') }" @click="copy(linkOf('watch'))">
          <RubyText :text="{ k: copied === linkOf('watch') ? 'room.copied' : 'room.copy' }" />
        </button>
        <button v-if="joinedSide" type="button" class="chip enter" @click="entered = true"><RubyText :text="{ k: 'room.enter.watch' }" /></button>
      </div>
      <p class="who">{{ ui('room.watchers', { n: room.watchers.length }) }}</p>
    </section>
    <div class="bar">
      <VoiceButton hint />
      <button type="button" class="chip leave" @click="leave"><RubyText :text="{ k: 'room.leave' }" /></button>
    </div>
  </div>

  <div v-else class="wait">
    <p v-if="room.status === 'reconnecting'" class="netbar inline">📶 <RubyText :text="{ k: 'room.reconnecting' }" /></p>
    <p v-if="toast" class="toast" role="status"><RubyText :text="{ k: `room.error.${toast}` }" /></p>
    <p class="wait-icon">⏳</p>
    <h2 class="wait-title"><RubyText :text="{ k: 'room.wait.title' }" /></h2>
    <p class="wait-sub"><RubyText :text="{ k: 'room.wait.sub' }" /></p>
    <ul class="sides">
      <li v-for="t in TEAMS" :key="t" :class="[t, { in: membersOf(t).length }]">
        <span class="side-name">{{ t === 'red' ? '🔴' : '🔵' }} <RubyText :text="{ k: `battle.team.${t}` }" /></span>
        <span class="side-who">{{ membersOf(t).length ? names(membersOf(t)) : ui('room.waitingSide') }}</span>
        <span v-if="membersOf(t).length" class="side-mark">✓</span>
        <span v-else class="dots" aria-hidden="true"><i /><i /><i /></span>
      </li>
      <li class="watch">
        <span class="side-name">👀 <RubyText :text="{ k: 'room.watch' }" /></span>
        <span class="side-who">{{ ui('room.watchers', { n: room.watchers.length }) }}</span>
      </li>
    </ul>
    <VoiceButton hint />
    <div class="chips">
      <button v-if="myRole === 'watch'" type="button" class="chip codes-btn" @click="entered = false"><RubyText :text="{ k: 'room.showCodes' }" /></button>
      <button type="button" class="chip leave" @click="leave"><RubyText :text="{ k: 'room.leave' }" /></button>
    </div>
  </div>
  </div>
</template>

<style scoped>
.room-page {
  display: contents;
}
/* 口令（B19）：每张卡的链接下面，数字大一点、三位一组 */
.pass {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin: 0;
  font-size: var(--fs-sm);
  font-weight: 700;
  color: var(--c-text-light);
}
.pass b {
  font-size: 30px;
  letter-spacing: 2px;
  font-variant-numeric: tabular-nums;
  color: var(--c-text);
}
/* 等待连接的加载动画：三个点轮流跳（reduced-motion 时不跳） */
.dots {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  vertical-align: middle;
}
.dots i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--c-primary);
  animation: dot 1.2s ease-in-out infinite;
}
.dots i:nth-child(2) {
  animation-delay: 0.2s;
}
.dots i:nth-child(3) {
  animation-delay: 0.4s;
}
@keyframes dot {
  0%,
  80%,
  100% {
    transform: translateY(0);
    opacity: 0.35;
  }
  40% {
    transform: translateY(-5px);
    opacity: 1;
  }
}
.sides li:not(.in) {
  border-style: dashed;
}
@media (prefers-reduced-motion: reduce) {
  .dots i {
    animation: none;
    opacity: 0.7;
  }
}
.room-msg {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 48px 16px;
  text-align: center;
}
.room-msg .big {
  font-size: 56px;
  line-height: 1;
}
.room-msg .text {
  font-size: var(--fs-lg);
  font-weight: 700;
}
.room-msg .slow {
  margin: 0;
  color: var(--c-text-light);
}
.netbar {
  position: fixed;
  left: 50%;
  top: 8px;
  z-index: 60;
  transform: translateX(-50%);
  margin: 0;
  padding: 6px 14px;
  border-radius: 999px;
  background: #333;
  color: #fff;
  font-size: var(--fs-sm);
  font-weight: 700;
  white-space: nowrap;
}
.netbar.inline {
  position: static;
  transform: none;
  display: inline-block;
  margin: 0 16px 8px;
}
.toast {
  margin: 0 16px 8px;
  padding: 10px 14px;
  border-radius: var(--radius-md);
  background: #fff3e6;
  color: var(--c-primary-dark);
  font-weight: 700;
}
.kp-icon {
  flex: none;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 0 16px;
  border-radius: 999px;
  background: var(--c-card);
  box-shadow: var(--shadow-card);
  color: var(--c-text);
  font-weight: 700;
  font-size: var(--fs-sm);
  transition: transform 0.08s ease;
}
.chip:active {
  transform: scale(0.94);
}
.chip.done {
  background: #fff3e6;
  color: var(--c-primary-dark);
}
.chips {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}
/* 「以红队 / 蓝队进入」「以观战方进入」（B20）：实心、队色 */
.chip.enter {
  background: var(--c-primary);
  color: #fff;
}
.code-card.red .chip.enter {
  background: var(--c-red);
}
.code-card.blue .chip.enter {
  background: var(--c-blue);
}
.enter-hint {
  margin: 0 0 12px;
  padding: 10px 14px;
  border-radius: var(--radius-md);
  background: #fff3e6;
  font-size: var(--fs-sm);
  font-weight: 700;
  line-height: 1.7;
  text-align: center;
  color: var(--c-primary-dark);
}
/* ── 二维码页（建房的设备） ── */
.codes-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 0 16px 96px;
}
.scan-hint {
  margin: 0 0 12px;
  font-size: var(--fs-lg);
  font-weight: 800;
  text-align: center;
}
.codes {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
@media (max-width: 560px) {
  .codes {
    grid-template-columns: 1fr;
  }
}
.code-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 14px 12px;
  border-radius: var(--radius-lg);
  background: var(--c-card);
  box-shadow: var(--shadow-card);
  border: 3px solid transparent;
}
.code-card.red {
  border-color: rgba(255, 107, 107, 0.6);
  background: #fff5f5;
}
.code-card.blue {
  border-color: rgba(74, 163, 255, 0.6);
  background: #f2f8ff;
}
.code-card.watch {
  margin-top: 12px;
  border-color: var(--c-line);
}
.code-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: var(--fs-lg);
}
.qr-wrap {
  width: 200px;
  height: 200px;
  border-radius: var(--radius-md);
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.code-card.watch .qr-wrap {
  width: 150px;
  height: 150px;
}
.qr-wrap img {
  width: 100%;
  height: 100%;
}
.qr-empty {
  color: var(--c-text-light);
}
.url {
  max-width: 100%;
  font-size: 12px;
  color: var(--c-text-light);
  word-break: break-all;
  text-align: center;
  user-select: all;
  -webkit-user-select: all;
}
.who {
  margin: 0;
  min-height: 24px;
  font-size: var(--fs-sm);
  font-weight: 700;
  color: var(--c-text-light);
}
.who.some {
  color: #1f7a43;
}
.bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 20;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 16px calc(10px + env(safe-area-inset-bottom));
  background: rgba(253, 246, 236, 0.96);
  box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.08);
}
.chip.leave {
  color: var(--c-text-light);
}
/* ── 三方连接状态（扫码进来的人） ── */
.wait {
  max-width: 560px;
  margin: 0 auto;
  padding: 32px 16px 48px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
}
.wait-icon {
  margin: 0;
  font-size: 56px;
  line-height: 1;
}
.wait-title {
  margin: 0;
  font-size: var(--fs-xl);
}
.wait-sub {
  margin: 0 0 8px;
  color: var(--c-text-light);
  font-weight: 700;
}
.sides {
  list-style: none;
  margin: 0;
  padding: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.sides li {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 56px;
  padding: 8px 14px;
  border-radius: var(--radius-lg);
  background: var(--c-card);
  box-shadow: var(--shadow-card);
  border: 3px solid var(--c-line);
  text-align: left;
}
.sides li.red {
  border-color: rgba(255, 107, 107, 0.6);
  background: #fff5f5;
}
.sides li.blue {
  border-color: rgba(74, 163, 255, 0.6);
  background: #f2f8ff;
}
.side-name {
  flex: 0 0 auto;
  font-weight: 800;
}
.side-who {
  flex: 1 1 auto;
  font-weight: 700;
  color: var(--c-text-light);
}
.sides li.in .side-who {
  color: var(--c-text);
}
.side-mark {
  width: 28px;
  text-align: center;
  font-weight: 900;
  color: var(--c-text-light);
}
.sides li.in .side-mark {
  color: #2e9e5b;
}
.wait .chip.leave {
  margin-top: 12px;
}
</style>
