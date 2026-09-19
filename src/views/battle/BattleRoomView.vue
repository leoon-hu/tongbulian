<script setup lang="ts">
// 多设备房间（需求 B13–B25）：同一视图分阶段——连接中 / 出错 → 大厅（链接、两队名单、准备、主持人开始）→ 竞技场（Arena）→ 结果。
// 房间的一切状态都来自服务器的快照（stores/room），这里只画与发操作；比赛部分由 stores/battle 的线上模式承接。
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { createRng } from '@/engine'
import { courseOfKp } from '@/engine/catalog'
import { kpTitleKey, ui } from '@/engine/i18n'
import type { Difficulty } from '@/types/models'
import type { Member, Role, Team } from '@/battle/protocol'
import { RANDOM_SKIN, resolveSkin, ruleKey, skinById } from '@/battle/skins'
import { useBattleStore } from '@/stores/battle'
import { FATAL_ERRORS, useRoomStore } from '@/stores/room'
import Arena from '@/components/battle/Arena.vue'
import NameSheet from '@/components/battle/NameSheet.vue'
import SkinPicker from '@/components/battle/SkinPicker.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import BigButton from '@/components/ui/BigButton.vue'
import RubyText from '@/components/ui/RubyText.vue'

const route = useRoute()
const router = useRouter()
const room = useRoomStore()
const battle = useBattleStore()

const code = String(route.params.code)
const ROLES: readonly Role[] = ['red', 'blue', 'watch']
const TEAMS: readonly Team[] = ['red', 'blue']
/** 链接里的默认身份（B20）：只是进来时的默认，不是密钥 */
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
const info = computed(() => (snap.value ? courseOfKp(snap.value.kpId) : undefined))
const mapPath = computed(() => (info.value ? `/s/${info.value.subject.id}/g/${info.value.grade.id}` : '/'))
const skin = computed(() => (snap.value ? skinById(snap.value.skin) : undefined))
const me = computed(() => room.me)
const myRole = computed<Role>(() => me.value?.role ?? 'watch')
const locked = computed(() => !!snap.value?.locked)
const isHost = computed(() => room.isHost)

// ── 三个链接（B20）：复制 / 系统分享 / 二维码（本机生成，按需加载库） ──
const base = computed(() => (typeof location === 'undefined' ? '' : location.href.split('#')[0]!))
const linkOf = (t: Role): string => `${base.value}#/battle/${code}?t=${t}`
const copied = ref<Role | null>(null)
let copiedTimer: ReturnType<typeof setTimeout> | null = null
async function copy(t: Role): Promise<void> {
  try {
    await navigator.clipboard.writeText(linkOf(t))
    copied.value = t
    if (copiedTimer) clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => (copied.value = null), 2000)
  } catch {
    /* 没有剪贴板权限：让用户长按地址 */
  }
}
const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
function share(t: Role): void {
  navigator.share({ title: `${ui('brand.title')} · ${ui('battle.title')}`, text: ui(`room.link.${t}`), url: linkOf(t) }).catch(() => {})
}
const qr = ref<Role | null>(null)
const qrData = ref('')
async function toggleQr(t: Role): Promise<void> {
  if (qr.value === t) {
    qr.value = null
    return
  }
  qr.value = t
  qrData.value = ''
  try {
    const mod = await import('qrcode')
    const url = await mod.toDataURL(linkOf(t), { width: 256, margin: 1 })
    if (qr.value === t) qrData.value = url
  } catch {
    qrData.value = ''
  }
}

// ── 名单与我的操作 ──
const membersOf = (team: Team): Member[] => room.teamMembers(team)
/** 自己的难度自己改；主持人可以改任何人的（B22） */
const canSetDiff = (m: Member): boolean => !room.inMatch && (m.clientId === room.you || isHost.value)
function cycleDiff(m: Member): void {
  const next = ((m.difficulty % 3) + 1) as Difficulty
  room.setDifficulty(next, m.clientId === room.you ? undefined : m.clientId)
}
function joinTeam(team: Team): void {
  room.setTeam(team)
}
function toggleReady(): void {
  const on = !me.value?.ready
  room.setReady(on)
  if (on) goFullscreen()
}
function start(): void {
  goFullscreen()
  room.start()
}
function pickSkin(id: string): void {
  room.setSkin(id === RANDOM_SKIN ? resolveSkin(id, createRng()) : id)
}
/** 在这个手势里试着全屏 + 横屏锁（B30）；不支持就算了 */
function goFullscreen(): void {
  try {
    document.documentElement
      .requestFullscreen?.()
      ?.then(() => (screen.orientation as { lock?: (o: string) => Promise<void> }).lock?.('landscape')?.catch(() => {}))
      .catch(() => {})
  } catch {
    /* 不支持 */
  }
}

function leave(): void {
  // 先记下地图地址：离开房间后快照没了，就不知道是哪个学科 / 年级了
  const to = mapPath.value
  room.leave()
  router.push(to)
}
/** 结果页「换个游戏」（主持人）：结束这局回大厅换 */
function changeSkin(): void {
  room.end()
}
onBeforeUnmount(() => {
  if (copiedTimer) clearTimeout(copiedTimer)
  // 离开这个页面（返回键 / 换地址）= 离开房间，释放座位（B25）；刷新页面走的是重连
  room.leave()
})
</script>

<template>
  <NameSheet v-if="asking" @save="saveName" @close="leave" />

  <div v-else-if="fatal" class="room-msg">
    <p class="big">😶</p>
    <p class="text"><RubyText :text="{ k: `room.error.${fatal}` }" /></p>
    <BigButton color="primary" @click="leave"><RubyText :text="{ k: 'room.back' }" /></BigButton>
  </div>

  <div v-else-if="!snap" class="room-msg">
    <p class="big">📶</p>
    <p class="text"><RubyText :text="{ k: room.status === 'reconnecting' ? 'room.reconnecting' : 'room.connecting' }" /></p>
    <BigButton color="ghost" @click="leave"><RubyText :text="{ k: 'room.back' }" /></BigButton>
  </div>

  <template v-else-if="room.inMatch">
    <Arena :host="isHost" @exit="leave" @change-skin="changeSkin" />
    <p v-if="room.status === 'reconnecting'" class="netbar">📶 <RubyText :text="{ k: 'room.reconnecting' }" /></p>
    <p v-else-if="toast" class="netbar" role="status"><RubyText :text="{ k: `room.error.${toast}` }" /></p>
  </template>

  <div v-else class="lobby">
    <PageHeader :back="mapPath">
      <template #title>
        <span class="kp-icon">⚔️</span>
        <RubyText :text="{ k: 'room.title' }" />
        <span class="code">{{ snap.code }}</span>
      </template>
    </PageHeader>

    <p v-if="room.status === 'reconnecting'" class="netbar inline">📶 <RubyText :text="{ k: 'room.reconnecting' }" /></p>
    <p v-if="toast" class="toast" role="status"><RubyText :text="{ k: `room.error.${toast}` }" /></p>

    <section class="block links">
      <p class="hint"><RubyText :text="{ k: 'room.links' }" /></p>
      <div v-for="t in ROLES" :key="t" class="link" :class="t">
        <span class="link-name"><RubyText :text="{ k: `room.link.${t}` }" /></span>
        <button type="button" class="chip" :class="{ done: copied === t }" @click="copy(t)">
          <RubyText :text="{ k: copied === t ? 'room.copied' : 'room.copy' }" />
        </button>
        <button v-if="canShare" type="button" class="chip" @click="share(t)"><RubyText :text="{ k: 'room.share' }" /></button>
        <button type="button" class="chip" :class="{ on: qr === t }" @click="toggleQr(t)"><RubyText :text="{ k: 'room.qr' }" /></button>
        <div v-if="qr === t" class="qr">
          <img v-if="qrData" :src="qrData" :alt="ui(`room.link.${t}`)" />
          <code class="url">{{ linkOf(t) }}</code>
        </div>
      </div>
    </section>

    <section v-if="info" class="block">
      <p class="kp">
        <span>{{ info.kp.icon }}</span>
        <RubyText :text="{ k: kpTitleKey(info.kp) }" />
        <span class="course">{{ ui('course.name', { grade: info.grade.title, subject: info.subject.title }) }}</span>
      </p>
      <template v-if="isHost">
        <h2 class="label"><RubyText :text="{ k: 'battle.pickSkin' }" /></h2>
        <SkinPicker :model-value="snap.skin" @update:model-value="pickSkin" />
      </template>
      <p v-else-if="skin" class="skin-line">
        <span class="skin-icon">{{ skin.icon }}</span>
        <RubyText :text="{ k: `skin.${skin.id}` }" />
      </p>
      <p class="rule"><RubyText :text="{ k: ruleKey(snap.skin) }" /></p>
    </section>

    <section class="block teams">
      <div v-for="team in TEAMS" :key="team" class="col" :class="team">
        <h2 class="col-head">
          <span>{{ team === 'red' ? '🔴' : '🔵' }}</span>
          <RubyText :text="{ k: `battle.team.${team}` }" />
          <small>{{ membersOf(team).length }}/6</small>
        </h2>
        <ul class="members">
          <li v-for="m in membersOf(team)" :key="m.clientId" class="member" :class="{ me: m.clientId === room.you, offline: !m.online }">
            <span class="nm">{{ m.name }}</span>
            <span v-if="m.clientId === room.you" class="tag me"><RubyText :text="{ k: 'room.me' }" /></span>
            <span v-if="m.clientId === snap.hostId" class="tag host"><RubyText :text="{ k: 'room.host' }" /></span>
            <span v-if="!m.online" class="tag off">📶 <RubyText :text="{ k: 'room.offline' }" /></span>
            <button v-if="canSetDiff(m)" type="button" class="diff" @click="cycleDiff(m)">{{ ui('battle.diffBadge', { n: m.difficulty }) }}</button>
            <span v-else class="diff static">{{ ui('battle.diffBadge', { n: m.difficulty }) }}</span>
            <span class="ready-mark" :class="{ on: m.ready }">{{ m.ready ? '✓' : '…' }}</span>
          </li>
        </ul>
        <p v-if="!membersOf(team).length" class="empty"><RubyText :text="{ k: 'room.empty' }" /></p>
        <button v-if="myRole !== team && (!locked || isHost)" type="button" class="join-team" @click="joinTeam(team)">
          <RubyText :text="{ k: `room.role.${team}` }" />
        </button>
      </div>
    </section>

    <section class="block watchers">
      <p>
        👀 {{ ui('room.watchers', { n: room.watchers.length }) }}
        <span v-if="room.watchers.length" class="names">{{ room.watchers.map((m) => m.name).join('、') }}</span>
      </p>
      <button v-if="myRole !== 'watch'" type="button" class="chip" @click="room.setTeam('watch')">
        <RubyText :text="{ k: isHost ? 'room.role.host' : 'room.role.watch' }" />
      </button>
    </section>

    <section class="block mine">
      <button v-if="myRole !== 'watch'" type="button" class="ready-btn" :class="{ on: me?.ready }" :aria-pressed="!!me?.ready" @click="toggleReady">
        <span class="mark">{{ me?.ready ? '✓' : '○' }}</span>
        <RubyText :text="{ k: 'room.ready' }" />
      </button>
      <template v-if="isHost">
        <BigButton color="green" class="start-btn" :disabled="!room.canStart" @click="start"><RubyText :text="{ k: 'room.start' }" /></BigButton>
        <p v-if="!room.canStart" class="hint"><RubyText :text="{ k: 'room.start.hint' }" /></p>
        <button type="button" class="chip lock" :class="{ on: locked }" @click="room.setLock(!locked)">
          {{ locked ? '🔒' : '🔓' }} <RubyText :text="{ k: locked ? 'room.locked' : 'room.lock' }" />
        </button>
      </template>
      <p v-else-if="me?.ready" class="hint"><RubyText :text="{ k: 'room.waiting' }" /></p>
      <button type="button" class="chip leave" @click="leave"><RubyText :text="{ k: 'room.leave' }" /></button>
    </section>
  </div>
</template>

<style scoped>
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
.lobby {
  max-width: 840px;
  margin: 0 auto;
  padding-bottom: 32px;
}
.kp-icon {
  flex: none;
}
.code {
  margin-left: 8px;
  padding: 2px 10px;
  border-radius: var(--radius-md);
  background: var(--c-card);
  box-shadow: var(--shadow-card);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  letter-spacing: 0.12em;
  font-size: var(--fs-lg);
}
.block {
  padding: 8px 16px;
}
.label {
  font-size: var(--fs-md);
  color: var(--c-primary-dark);
  margin: 10px 0;
}
.hint {
  margin: 0 0 8px;
  color: var(--c-text-light);
  font-size: var(--fs-sm);
}
.link {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  border-top: 1px solid var(--c-line);
}
.link-name {
  flex: 1 1 120px;
  font-weight: 800;
}
.link.red .link-name {
  color: var(--c-team-red, #e5484d);
}
.link.blue .link-name {
  color: var(--c-team-blue, #2f7fe0);
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 0 14px;
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
.chip.on,
.chip.done {
  background: #fff3e6;
  color: var(--c-primary-dark);
}
.qr {
  flex-basis: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 8px 0;
}
.qr img {
  width: 200px;
  height: 200px;
  border-radius: var(--radius-md);
  background: #fff;
}
.url {
  font-size: 12px;
  color: var(--c-text-light);
  word-break: break-all;
  user-select: all;
  -webkit-user-select: all;
}
.kp {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin: 0 0 6px;
  font-size: var(--fs-lg);
  font-weight: 800;
}
.course {
  font-size: var(--fs-sm);
  font-weight: 700;
  color: var(--c-text-light);
}
.skin-line {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: var(--fs-md);
  font-weight: 800;
}
.skin-icon {
  font-size: 28px;
}
.rule {
  margin: 8px 0 0;
  padding: 10px 14px;
  border-radius: var(--radius-md);
  background: var(--c-card);
  box-shadow: var(--shadow-card);
  font-size: var(--fs-md);
}
.teams {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
@media (max-width: 480px) {
  .teams {
    grid-template-columns: 1fr;
  }
}
.col {
  padding: 10px 12px;
  border-radius: var(--radius-lg);
  background: var(--c-card);
  box-shadow: var(--shadow-card);
  border: 3px solid transparent;
}
.col.red {
  border-color: rgba(255, 107, 107, 0.55);
  background: #fff5f5;
}
.col.blue {
  border-color: rgba(74, 163, 255, 0.55);
  background: #f2f8ff;
}
.col-head {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 6px;
  font-size: var(--fs-md);
}
.col-head small {
  margin-left: auto;
  color: var(--c-text-light);
  font-weight: 400;
}
.members {
  list-style: none;
  margin: 0;
  padding: 0;
}
.member {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 4px 0;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}
.member .nm {
  font-weight: 800;
  font-size: var(--fs-md);
}
.member.me .nm {
  text-decoration: underline;
  text-decoration-thickness: 3px;
  text-decoration-color: var(--c-primary);
  text-underline-offset: 4px;
}
.member.offline .nm {
  opacity: 0.5;
}
.tag {
  padding: 1px 8px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.06);
  font-size: 12px;
  font-weight: 700;
  color: var(--c-text-light);
}
.tag.host {
  background: #fff3e6;
  color: var(--c-primary-dark);
}
.diff {
  margin-left: auto;
  min-height: 36px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.8);
  border: 2px solid var(--c-line);
  font-size: var(--fs-sm);
  font-weight: 700;
  color: var(--c-text);
}
.diff.static {
  display: inline-flex;
  align-items: center;
  border-color: transparent;
}
.ready-mark {
  width: 28px;
  text-align: center;
  font-weight: 900;
  color: var(--c-text-light);
}
.ready-mark.on {
  color: #2e9e5b;
}
.empty {
  margin: 4px 0;
  color: var(--c-text-light);
  font-size: var(--fs-sm);
}
.join-team {
  margin-top: 8px;
  min-height: 44px;
  width: 100%;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.9);
  border: 2px dashed var(--c-line);
  font-weight: 800;
  color: var(--c-text);
}
.watchers {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  color: var(--c-text-light);
  font-size: var(--fs-sm);
}
.watchers p {
  margin: 0;
}
.watchers .names {
  margin-left: 6px;
  color: var(--c-text);
}
.mine {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding-top: 16px;
}
.ready-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: var(--tap-min);
  padding: 0 22px;
  border-radius: 999px;
  background: var(--c-card);
  box-shadow: var(--shadow-card);
  border: 3px solid transparent;
  font-size: var(--fs-lg);
  font-weight: 800;
  color: var(--c-text);
  transition: transform 0.08s ease;
}
.ready-btn:active {
  transform: scale(0.96);
}
.ready-btn.on {
  border-color: #2e9e5b;
  background: #eaf8ef;
  color: #1f7a43;
}
.ready-btn .mark {
  font-size: var(--fs-xl);
  line-height: 1;
}
.start-btn {
  min-width: 200px;
  font-size: var(--fs-xl);
}
.mine .hint {
  flex-basis: 100%;
  margin: 0;
}
.chip.leave {
  margin-left: auto;
  color: var(--c-text-light);
}
</style>
