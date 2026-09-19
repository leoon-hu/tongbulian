<script setup lang="ts">
// 多设备房间（需求 B13–B25）：同一视图分阶段——连接中 / 出错 → 大厅 → 竞技场（Arena）→ 结果。
// 大厅主持人和其他人看到的不一样（B21）：主持人第一件事是把二维码给对方扫，底部固定「开始比赛」；
// 其他人先看到自己在哪队、等主持人开始，一个大按钮「我准备好了」（举手 + 解锁声音，不是开始的条件）。
// 房间的一切状态都来自服务器的快照（stores/room），这里只画与发操作；比赛部分由 stores/battle 的线上模式承接。
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { createRng } from '@/engine'
import { unlockAudio } from '@/engine/audio'
import { courseOfKp } from '@/engine/catalog'
import { kpTitleKey, ui } from '@/engine/i18n'
import type { Difficulty } from '@/types/models'
import type { Member, Role, Team } from '@/battle/protocol'
import { enterArenaFullscreen } from '@/battle/fullscreen'
import { RANDOM_SKIN, resolveSkin, ruleKey, skinById } from '@/battle/skins'
import { useBattleStore } from '@/stores/battle'
import { FATAL_ERRORS, useRoomStore } from '@/stores/room'
import Arena from '@/components/battle/Arena.vue'
import NameSheet from '@/components/battle/NameSheet.vue'
import SkinPicker from '@/components/battle/SkinPicker.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import BigButton from '@/components/ui/BigButton.vue'
import RubyText from '@/components/ui/RubyText.vue'

/** 连接超过这么久还没进房：提示检查网络（重连仍在后台继续） */
const SLOW_MS = 8000

const route = useRoute()
const router = useRouter()
const room = useRoomStore()
const battle = useBattleStore()

const code = String(route.params.code)
const ROLES: readonly Role[] = ['red', 'blue', 'watch']
const TEAMS: readonly Team[] = ['red', 'blue']
const DIFFS: readonly Difficulty[] = [1, 2, 3]
/** 链接里的默认身份（B20）：只是进来时的默认，不是密钥；不带就由服务器分到人少的队 */
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

// ── 邀请（B20）：一个链接（不带队伍，进来自动分队）+ 大二维码；指定队伍的链接收在「更多」里 ──
const base = computed(() => (typeof location === 'undefined' ? '' : location.href.split('#')[0]!))
const inviteUrl = computed(() => `${base.value}#/battle/${code}`)
const linkOf = (t: Role): string => `${inviteUrl.value}?t=${t}`
const qrData = ref('')
async function makeQr(): Promise<void> {
  if (qrData.value) return
  try {
    const mod = await import('qrcode')
    qrData.value = await mod.toDataURL(inviteUrl.value, { width: 320, margin: 1 })
  } catch {
    qrData.value = ''
  }
}
// 主持人一进大厅就出码；其他人展开「更多」才生成
watch(
  () => !!snap.value && isHost.value,
  (host) => {
    if (host) void makeQr()
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
const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
function share(url: string): void {
  navigator.share({ title: `${ui('brand.title')} · ${ui('battle.title')}`, text: ui('room.invite.title'), url }).catch(() => {})
}

// ── 更多（让子 / 锁定队伍 / 指定队伍的链接 / 邀请更多人）默认收起 ──
const more = ref(false)
function toggleMore(): void {
  more.value = !more.value
  if (more.value) void makeQr()
}
const skinOpen = ref(false)

// ── 名单与我的操作 ──
const membersOf = (team: Team): Member[] => room.teamMembers(team)
function setDifficulty(m: Member, d: Difficulty): void {
  if (m.difficulty !== d) room.setDifficulty(d, m.clientId === room.you ? undefined : m.clientId)
}
function joinTeam(team: Team): void {
  unlockAudio()
  room.setTeam(team)
}
/** 举手（B21）：告诉主持人我在看；顺手解锁声音、触屏设备试全屏。不是开始的条件 */
function raiseHand(): void {
  unlockAudio()
  const on = !me.value?.ready
  if (on) enterArenaFullscreen()
  room.setReady(on)
}
function start(): void {
  unlockAudio()
  enterArenaFullscreen()
  room.start()
}
function pickSkin(id: string): void {
  room.setSkin(id === RANDOM_SKIN ? resolveSkin(id, createRng()) : id)
  skinOpen.value = false
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
  skinOpen.value = true
}
onBeforeUnmount(() => {
  if (copiedTimer) clearTimeout(copiedTimer)
  if (slowTimer) clearTimeout(slowTimer)
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
    <p v-if="slow" class="slow"><RubyText :text="{ k: 'room.connect.slow' }" /></p>
    <BigButton color="ghost" @click="leave"><RubyText :text="{ k: 'room.back' }" /></BigButton>
  </div>

  <template v-else-if="room.inMatch">
    <Arena :host="isHost" @exit="leave" @change-skin="changeSkin" />
    <p v-if="room.status === 'reconnecting'" class="netbar">📶 <RubyText :text="{ k: 'room.reconnecting' }" /></p>
    <p v-else-if="toast" class="netbar" role="status"><RubyText :text="{ k: `room.error.${toast}` }" /></p>
  </template>

  <div v-else class="lobby" :class="{ host: isHost }">
    <PageHeader :back="mapPath">
      <template #title>
        <span class="kp-icon">⚔️</span>
        <RubyText :text="{ k: 'room.title' }" />
        <span class="code">{{ snap.code }}</span>
      </template>
    </PageHeader>

    <p v-if="room.status === 'reconnecting'" class="netbar inline">📶 <RubyText :text="{ k: 'room.reconnecting' }" /></p>
    <p v-if="toast" class="toast" role="status"><RubyText :text="{ k: `room.error.${toast}` }" /></p>

    <!-- 主持人：先把码给对方扫（B20 / B21） -->
    <section v-if="isHost" class="block invite">
      <div class="qr-wrap">
        <img v-if="qrData" :src="qrData" :alt="ui('room.qr')" />
        <div v-else class="qr-empty">…</div>
      </div>
      <div class="invite-text">
        <p class="invite-title"><RubyText :text="{ k: 'room.invite.title' }" /></p>
        <p class="code-line">
          <span class="code-label"><RubyText :text="{ k: 'room.code' }" /></span>
          <strong class="code-big">{{ snap.code }}</strong>
        </p>
        <p class="hint"><RubyText :text="{ k: 'room.invite.hint' }" /></p>
        <div class="invite-actions">
          <button type="button" class="chip" :class="{ done: copied === inviteUrl }" @click="copy(inviteUrl)">
            <RubyText :text="{ k: copied === inviteUrl ? 'room.copied' : 'room.copyLink' }" />
          </button>
          <button v-if="canShare" type="button" class="chip" @click="share(inviteUrl)"><RubyText :text="{ k: 'room.share' }" /></button>
        </div>
      </div>
    </section>

    <!-- 其他人：我在哪队、等主持人（B21） -->
    <section v-else class="block status" :class="myRole">
      <p class="status-team">
        <span v-if="myRole !== 'watch'" class="status-dot">{{ myRole === 'red' ? '🔴' : '🔵' }}</span>
        <span v-else class="status-dot">👀</span>
        <RubyText :text="{ k: `room.you.${myRole}` }" />
      </p>
      <p class="status-wait">⏳ <RubyText :text="{ k: 'room.waitHost' }" /></p>
      <button v-if="myRole !== 'watch'" type="button" class="raise" :class="{ on: me?.ready }" :aria-pressed="!!me?.ready" @click="raiseHand">
        <span class="raise-icon">{{ me?.ready ? '✓' : '🙋' }}</span>
        <RubyText :text="{ k: me?.ready ? 'room.raised' : 'room.raise' }" />
      </button>
      <p v-if="myRole !== 'watch' && !me?.ready" class="hint"><RubyText :text="{ k: 'room.raise.hint' }" /></p>
    </section>

    <!-- 知识点、游戏、规则句 -->
    <section v-if="info && skin" class="block game">
      <p class="kp">
        <span>{{ info.kp.icon }}</span>
        <RubyText :text="{ k: kpTitleKey(info.kp) }" />
        <span class="course">{{ ui('course.name', { grade: info.grade.title, subject: info.subject.title }) }}</span>
      </p>
      <div class="skin-line">
        <span class="skin-icon">{{ skin.icon }}</span>
        <RubyText :text="{ k: `skin.${skin.id}` }" />
        <button v-if="isHost" type="button" class="chip" :class="{ on: skinOpen }" @click="skinOpen = !skinOpen">
          <RubyText :text="{ k: 'battle.changeSkin' }" />
        </button>
      </div>
      <SkinPicker v-if="isHost && skinOpen" :model-value="snap.skin" @update:model-value="pickSkin" />
      <p class="rule"><RubyText :text="{ k: ruleKey(snap.skin) }" /></p>
    </section>

    <!-- 两队名单（B21）：每队最多 6 人；可以换队 -->
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
            <span v-if="m.difficulty > 1" class="tag diff">{{ ui('battle.diffBadge', { n: m.difficulty }) }}</span>
            <span v-if="m.ready" class="ready-mark" :title="ui('room.raised')">✓</span>
          </li>
        </ul>
        <p v-if="!membersOf(team).length" class="empty"><RubyText :text="{ k: 'room.empty' }" /></p>
        <button v-if="myRole !== team && (!locked || isHost)" type="button" class="switch" @click="joinTeam(team)">
          <RubyText :text="{ k: `room.switch.${team}` }" />
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

    <!-- 更多：让子 / 锁定队伍（主持人）、指定队伍的链接、邀请更多人 -->
    <section class="block">
      <button type="button" class="more-toggle" :aria-expanded="more" @click="toggleMore">
        <span class="more-icon" aria-hidden="true">⚙️</span>
        <RubyText :text="{ k: 'battle.more' }" />
        <span class="more-sep" aria-hidden="true">·</span>
        <RubyText :text="{ k: isHost ? 'room.more.hint' : 'room.invite.more' }" />
        <span class="chev" aria-hidden="true">{{ more ? '▴' : '▾' }}</span>
      </button>
      <div v-if="more" class="more">
        <template v-if="isHost">
          <h3 class="more-title"><RubyText :text="{ k: 'battle.handicap' }" /></h3>
          <p class="hint"><RubyText :text="{ k: 'battle.handicap.hint' }" /></p>
          <div v-for="m in room.participants" :key="m.clientId" class="hrow" :class="m.role">
            <span class="hwho"><span class="who">{{ m.role === 'red' ? '🔴' : '🔵' }}</span>{{ m.name }}</span>
            <div class="hlevels" role="radiogroup">
              <button
                v-for="d in DIFFS"
                :key="d"
                type="button"
                class="hlevel"
                :class="{ on: m.difficulty === d }"
                role="radio"
                :aria-checked="m.difficulty === d"
                @click="setDifficulty(m, d)"
              >
                <RubyText :text="{ k: `battle.diff.${d}` }" />
              </button>
            </div>
          </div>
          <button type="button" class="chip lock" :class="{ on: locked }" @click="room.setLock(!locked)">
            {{ locked ? '🔒' : '🔓' }} <RubyText :text="{ k: locked ? 'room.locked' : 'room.lock' }" />
          </button>
        </template>
        <template v-else>
          <div class="invite small">
            <div class="qr-wrap">
              <img v-if="qrData" :src="qrData" :alt="ui('room.qr')" />
              <div v-else class="qr-empty">…</div>
            </div>
            <div class="invite-text">
              <p class="code-line">
                <span class="code-label"><RubyText :text="{ k: 'room.code' }" /></span>
                <strong class="code-big">{{ snap.code }}</strong>
              </p>
              <div class="invite-actions">
                <button type="button" class="chip" :class="{ done: copied === inviteUrl }" @click="copy(inviteUrl)">
                  <RubyText :text="{ k: copied === inviteUrl ? 'room.copied' : 'room.copyLink' }" />
                </button>
                <button v-if="canShare" type="button" class="chip" @click="share(inviteUrl)"><RubyText :text="{ k: 'room.share' }" /></button>
              </div>
            </div>
          </div>
        </template>
        <h3 class="more-title"><RubyText :text="{ k: 'room.teamLinks' }" /></h3>
        <div v-for="t in ROLES" :key="t" class="link" :class="t">
          <span class="link-name"><RubyText :text="{ k: `room.link.${t}` }" /></span>
          <code class="url">{{ linkOf(t) }}</code>
          <button type="button" class="chip" :class="{ done: copied === linkOf(t) }" @click="copy(linkOf(t))">
            <RubyText :text="{ k: copied === linkOf(t) ? 'room.copied' : 'room.copy' }" />
          </button>
        </div>
      </div>
    </section>

    <!-- 底部固定一条：主持人「开始比赛」，其他人等；都能离开 -->
    <div class="bar">
      <template v-if="isHost">
        <BigButton color="green" class="start-btn" :disabled="!room.canStart" @click="start"><RubyText :text="{ k: 'room.start' }" /></BigButton>
        <span v-if="!room.canStart" class="bar-hint"><RubyText :text="{ k: 'room.start.hint' }" /></span>
      </template>
      <span v-else class="bar-wait">⏳ <RubyText :text="{ k: 'room.waitHost' }" /></span>
      <button type="button" class="chip leave" @click="leave"><RubyText :text="{ k: 'room.leave' }" /></button>
    </div>
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
.lobby {
  max-width: 840px;
  margin: 0 auto;
  /* 底部固定条的高度 */
  padding-bottom: 104px;
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
.hint {
  margin: 0 0 8px;
  color: var(--c-text-light);
  font-size: var(--fs-sm);
}
/* ── 邀请（主持人首屏） ── */
.invite {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 20px;
  margin: 0 16px;
  padding: 14px 16px;
  border-radius: var(--radius-lg);
  background: var(--c-card);
  box-shadow: var(--shadow-card);
}
.invite.small {
  margin: 0;
  padding: 10px 0;
  background: none;
  box-shadow: none;
}
.qr-wrap {
  flex: none;
  width: 200px;
  height: 200px;
  border-radius: var(--radius-md);
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.invite.small .qr-wrap {
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
.invite-text {
  flex: 1 1 220px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.invite-title {
  margin: 0;
  font-size: var(--fs-lg);
  font-weight: 800;
}
.code-line {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin: 0;
}
.code-label {
  color: var(--c-text-light);
  font-size: var(--fs-sm);
  font-weight: 700;
}
.code-big {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 36px;
  letter-spacing: 0.16em;
  line-height: 1.1;
}
.invite-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
/* ── 其他人的状态牌 ── */
.status {
  margin: 0 16px;
  padding: 16px;
  border-radius: var(--radius-lg);
  border: 3px solid var(--c-line);
  background: var(--c-card);
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}
.status.red {
  border-color: rgba(255, 107, 107, 0.7);
  background: #fff5f5;
}
.status.blue {
  border-color: rgba(74, 163, 255, 0.7);
  background: #f2f8ff;
}
.status-team {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: var(--fs-xl);
  font-weight: 900;
}
.status-dot {
  font-size: 28px;
}
.status-wait {
  margin: 0;
  color: var(--c-text-light);
  font-size: var(--fs-md);
  font-weight: 700;
}
.raise {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: var(--tap-min);
  padding: 0 24px;
  border-radius: 999px;
  background: var(--c-primary);
  color: #fff;
  font-size: var(--fs-lg);
  font-weight: 800;
  box-shadow: 0 4px 0 var(--c-primary-dark);
  transition: transform 0.08s ease;
}
.raise:active {
  transform: translateY(3px);
  box-shadow: none;
}
.raise.on {
  background: #2e9e5b;
  box-shadow: 0 4px 0 #1f7a43;
}
.raise-icon {
  font-size: var(--fs-xl);
  line-height: 1;
}
/* ── 知识点 / 游戏 / 规则 ── */
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
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 10px;
  margin: 0 0 8px;
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
/* ── 两队 ── */
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
.ready-mark {
  margin-left: auto;
  width: 28px;
  text-align: center;
  font-weight: 900;
  color: #2e9e5b;
}
.empty {
  margin: 4px 0;
  color: var(--c-text-light);
  font-size: var(--fs-sm);
}
.switch {
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
/* ── 通用小按钮 ── */
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
/* ── 更多 ── */
.more-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 48px;
  padding: 0 16px;
  border-radius: 999px;
  background: var(--c-card);
  box-shadow: var(--shadow-card);
  color: var(--c-text);
  font-weight: 800;
  font-size: var(--fs-md);
}
.more-sep,
.chev {
  color: var(--c-text-light);
}
.more {
  margin-top: 10px;
  padding: 12px 14px;
  border-radius: var(--radius-lg);
  background: var(--c-card);
  box-shadow: var(--shadow-card);
}
.more-title {
  margin: 8px 0 6px;
  font-size: var(--fs-md);
  color: var(--c-primary-dark);
}
.hrow {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 12px;
  padding: 8px 0;
}
.hrow + .hrow {
  border-top: 1px solid var(--c-line);
}
.hwho {
  flex: 1 1 140px;
  font-weight: 800;
}
.hwho .who {
  margin-right: 6px;
}
.hlevels {
  display: flex;
  gap: 8px;
}
.hlevel {
  min-width: 64px;
  min-height: 44px;
  padding: 0 12px;
  border-radius: var(--radius-md);
  background: var(--c-bg);
  border: 2px solid transparent;
  font-weight: 700;
  color: var(--c-text);
}
.hlevel.on {
  border-color: var(--c-primary);
  background: #fff3e6;
  color: var(--c-primary-dark);
}
.chip.lock {
  margin-top: 8px;
}
.link {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 10px;
  padding: 8px 0;
  border-top: 1px solid var(--c-line);
}
.link-name {
  flex: 0 0 auto;
  font-weight: 800;
}
.link.red .link-name {
  color: #e5484d;
}
.link.blue .link-name {
  color: #2f7fe0;
}
.url {
  flex: 1 1 200px;
  font-size: 12px;
  color: var(--c-text-light);
  word-break: break-all;
  user-select: all;
  -webkit-user-select: all;
}
/* ── 底部固定条 ── */
.bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 20;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 14px;
  padding: 10px 16px calc(10px + env(safe-area-inset-bottom));
  background: rgba(253, 246, 236, 0.96);
  box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.08);
}
.start-btn {
  min-width: 200px;
  font-size: var(--fs-xl);
}
.bar-hint {
  flex: 1 1 200px;
  color: var(--c-text-light);
  font-size: var(--fs-sm);
  font-weight: 700;
}
.bar-wait {
  flex: 1 1 200px;
  font-size: var(--fs-md);
  font-weight: 800;
  color: var(--c-text-light);
}
.chip.leave {
  margin-left: auto;
  color: var(--c-text-light);
}
</style>
