<script setup lang="ts">
// 知识点的设置页（B26 / B27）：地图上点知识点直接到这里。怎么练（自己练 / 打机器人 / 两人一台 / 各用各的）→ 开始，自己练就进练习页；
// 默认选着上次开始时选的那张卡（偏好 mode）。机器人快慢、选游戏、名字与小动物都在页头「⚙️ 配置」的面板里，页面默认不展示；
// 点「开始」直接开始、不问名字（B17：没自定义的用随机点选的，两边不一样）。「各用各的」（B19 / B20）：建房间 → 二维码页，别人扫码进来（输口令进房的「🔑 加入对战」在全局顶栏，不在这里）。
// 选中哪张「怎么练」的卡，卡下面出一行对应的说明（B27）；页面打开读「怎么练？」+ 当前那张卡的说明，换卡读那张的说明，建房出错读错误提示（B39a）
// 页面顶上两个玩法页签（M5）：⚔️ 对战（上面这四张卡）/ 🥊 打怪兽（一个人打 / 和机器人 / 两人一台 / 各用各的 + 「一起打 / 各打各的」开关）；
// 页签、卡、开关都记进偏好，下次进来默认选着；打怪兽点「开始」进 /boss/local/<kpId>（一个人打不锁横屏）
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { createRng, hasGenerator } from '@/engine'
import { courseOfKp, mapPathOf, practicePathOf } from '@/engine/catalog'
import { kpTitleKey, lang, ui } from '@/engine/i18n'
import { hush, sayKeys } from '@/engine/voice'
import { enterArenaFullscreen } from '@/battle/fullscreen'
import { AUTOCREATE_KEY, remember, takeIntent } from '@/engine/update'
import { chapterSkin, resolveSkin } from '@/battle/skins'
import { SETUP_MODES, useBattleStore, type LocalMode, type PlayFormat, type SetupMode } from '@/stores/battle'
import { useBossStore } from '@/stores/boss'
import { BOSS_MODES, bestKey, resolveBoss, type BossMode, type LocalBossMode } from '@/battle/boss'
import type { TimedVariant } from '@/battle/timed'
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
const bossStore = useBossStore()

const kpId = String(route.params.kpId)
const info = courseOfKp(kpId)
const ready = info !== undefined && hasGenerator(kpId)
if (!ready) router.replace('/')
const mapPath = mapPathOf(kpId)

/** 多设备（B46）：这个地址有没有对战服务（file:// 打开就没有） */
const online = computed(() => room.available)
/** 选着哪张卡：上次开始时选的，从来没开始过是自己练（B27）；上次是各用各的而这里没有对战服务也回到自己练 */
const mode = ref<SetupMode>(store.prefs.mode === 'online' && !online.value ? 'practice' : store.prefs.mode)
/** 玩法页签（M5）：上次开始时选的，从来没开始过是对战 */
const FORMATS: readonly PlayFormat[] = ['battle', 'boss']
const format = ref<PlayFormat>(store.prefs.format)
/** 打怪兽选着哪张卡：上次开始时选的；上次是各用各的而这里没有对战服务就回到一个人打 */
const bossMode = ref<BossMode>(store.prefs.boss.mode === 'online' && !online.value ? 'solo' : store.prefs.boss.mode)
const variant = ref<TimedVariant>(store.prefs.boss.variant)
/** 「一个人打」卡上写本机这个知识点、现在选的时长的最好得分（M5 / M7）；没打过不写 */
const soloBest = computed<number | null>(() => store.prefs.bossBest[bestKey(kpId, store.prefs.boss.durationS)] ?? null)
const VARIANTS: readonly TimedVariant[] = ['coop', 'versus']
/** 打怪兽的卡上写什么：和机器人 / 一个人打是这个玩法自己的说法，两人一台 / 各用各的同对战 */
function bossLabel(m: BossMode): string {
  return m === 'solo' || m === 'ai' ? `boss.mode.${m}` : `battle.mode.${m}`
}
/** 卡片下面那行说明（B27 / M5）：对战按卡；打怪兽的和机器人 / 两人一台 / 各用各的还分一起打、各打各的 */
const descKey = computed(() => {
  if (format.value === 'battle') return `battle.mode.${mode.value}.desc`
  const m = bossMode.value
  return m === 'solo' ? 'boss.mode.solo.desc' : `boss.mode.${m}.${variant.value}.desc`
})
/** 开始键要建房间（多设备）：对战的「各用各的」或打怪兽的「各用各的」 */
const makingRoom = computed(() => (format.value === 'battle' ? mode.value : bossMode.value) === 'online')
/** 正在改谁的名字（「⚙️ 配置」里点了名字，NameSheet 打开时） */
const asking = ref<'me' | 'right' | null>(null)
const names = computed(() => store.prefs.names)
/** 现在用的名字（没自定义的是随机点选的）：改名字面板里「🎲 随机」时当提示、现成名字避开对方的 */
const ids = computed(() => store.identities())
/** 「⚙️ 配置」面板 */
const config = ref(false)
/** 这一次用的游戏：默认按章节排到的那个（B36），配置里换了只影响这一次 */
const skin = ref(chapterSkin(kpId))

function saveName(name: string): void {
  const which = asking.value
  if (!which) return
  store.setName(which, name)
  asking.value = null
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
    // 建的是哪种房间：开始前已经记进了偏好（玩法页签、打怪兽的卡）
    if (format.value === 'boss' && bossMode.value === 'online') createRoom(true)
    else {
      mode.value = 'online'
      createRoom()
    }
    return
  }
  // 切页动画后再开口（与练习页读题一样）
  sayKeys(['battle.how', descKey.value], lang.value, 350)
})
// 换页签 / 换卡 / 换一起打还是各打各的：读新的那行说明
watch(descKey, (k) => {
  if (!creating.value) sayKeys([k], lang.value)
})
watch(roomError, (e) => {
  if (e) sayKeys([e === 'connect' ? 'room.connect.slow' : `room.error.${e}`], lang.value)
})
/** 建房间；boss：建打怪兽的房间（M5 / M13），带上一起打还是各打各的、时长 */
function createRoom(boss = false): void {
  if (creating.value) return
  roomError.value = null
  creating.value = true
  const bossOpts = boss ? { variant: variant.value, durationS: store.prefs.boss.durationS, boss: resolveBoss(undefined) } : undefined
  room.create(kpId, resolveSkin(skin.value, createRng()), bossOpts)
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
  store.prefs.format = format.value
  if (format.value === 'boss') {
    startBoss()
    return
  }
  store.prefs.mode = mode.value
  // 自己练（B26）：进这个知识点的练习页，不试全屏
  if (mode.value === 'practice') {
    router.push(practicePathOf(kpId))
    return
  }
  if (mode.value === 'online') {
    createRoom()
    return
  }
  store.startLocal({ kpId, mode: mode.value as LocalMode, skin: skin.value })
  // 在这个手势里试着全屏 + 横屏锁（B30）：只有触屏设备，电脑不自动全屏
  enterArenaFullscreen()
  router.push({ path: `/battle/local/${kpId}`, query: { mode: mode.value } })
}

/** 打怪兽（M5 / M6）：记住卡与开关，开一局，进竞技场；一个人打不锁横屏（手机竖着也能玩） */
function startBoss(): void {
  store.prefs.boss = { ...store.prefs.boss, mode: bossMode.value, variant: variant.value }
  if (bossMode.value === 'online') {
    createRoom(true)
    return
  }
  const m = bossMode.value as LocalBossMode
  const v: TimedVariant = m === 'solo' ? 'coop' : variant.value
  const t = store.prefs.boss.durationS
  bossStore.startLocal({ kpId, mode: m, variant: v, durationS: t })
  enterArenaFullscreen({ landscape: m !== 'solo' })
  router.push({ path: `/boss/local/${kpId}`, query: { mode: m, v, t: String(t) } })
}
</script>

<template>
  <div v-if="info" class="setup">
    <PageHeader :back="mapPath">
      <template #title>
        <span class="kp-icon">⚔️</span>
        <RubyText class="title-word" :text="{ k: 'battle.setupTitle' }" />
        <span class="kp-name">{{ info.kp.icon }} <RubyText :text="{ k: kpTitleKey(info.kp) }" /></span>
      </template>
      <template #actions>
        <button type="button" class="config-btn" @click="config = true">{{ ui('battle.config') }}</button>
        <RouterLink class="howto" to="/help#rules">{{ ui('help.howto') }}</RouterLink>
      </template>
    </PageHeader>

    <section class="block">
      <div class="formats" role="tablist">
        <button
          v-for="f in FORMATS"
          :key="f"
          type="button"
          role="tab"
          class="format"
          :class="{ on: format === f }"
          :data-format="f"
          :aria-selected="format === f"
          @click="format = f"
        >
          <span class="format-icon" aria-hidden="true">{{ f === 'battle' ? '⚔️' : '🥊' }}</span>
          <RubyText :text="{ k: `boss.tab.${f}` }" />
        </button>
      </div>
      <h2 class="label"><RubyText :text="{ k: 'battle.how' }" /></h2>
      <div v-if="format === 'battle'" class="modes">
        <button
          v-for="m in SETUP_MODES"
          :key="m"
          type="button"
          class="mode"
          :class="{ on: mode === m, soon: m === 'online' && !online }"
          :data-mode="m"
          :disabled="m === 'online' && !online"
          @click="mode = m"
        >
          <ModeIcon :mode="m" />
          <RubyText :text="{ k: `battle.mode.${m}` }" />
          <small v-if="m === 'online' && !online">{{ ui('room.unavailable') }}</small>
        </button>
      </div>
      <div v-else class="modes boss-modes">
        <button
          v-for="m in BOSS_MODES"
          :key="m"
          type="button"
          class="mode"
          :class="{ on: bossMode === m, soon: m === 'online' && !online }"
          :data-boss-mode="m"
          :disabled="m === 'online' && !online"
          @click="bossMode = m"
        >
          <ModeIcon :mode="m" boss />
          <RubyText :text="{ k: bossLabel(m) }" />
          <small v-if="m === 'online' && !online">{{ ui('room.unavailable') }}</small>
          <small v-else-if="m === 'solo' && soloBest !== null" class="best">🏅 {{ ui('boss.best', { n: soloBest }) }}</small>
        </button>
      </div>
      <div v-if="format === 'boss' && bossMode !== 'solo'" class="variants" role="radiogroup">
        <button
          v-for="v in VARIANTS"
          :key="v"
          type="button"
          role="radio"
          class="variant"
          :class="{ on: variant === v }"
          :data-variant="v"
          :aria-checked="variant === v"
          @click="variant = v"
        >
          <span aria-hidden="true">{{ v === 'coop' ? '🤝' : '🥊' }}</span> <RubyText :text="{ k: `boss.variant.${v}` }" />
        </button>
      </div>
      <p class="mode-desc" :key="descKey"><RubyText :text="{ k: descKey }" /></p>
    </section>

    <div class="start">
      <BigButton color="green" class="start-btn" :disabled="creating" @click="start">
        <RubyText :text="{ k: makingRoom ? (creating ? (room.updating ? 'room.updating' : 'room.connecting') : 'room.create') : 'battle.start' }" />
      </BigButton>
      <p v-if="roomError" class="room-error" role="alert">
        <RubyText :text="{ k: roomError === 'connect' ? 'room.connect.slow' : `room.error.${roomError}` }" />
      </p>
    </div>


    <ConfigSheet v-if="config" v-model:skin="skin" :format="format" @close="config = false" @rename="(w) => (asking = w)" />
    <NameSheet
      v-if="asking"
      :initial="asking === 'right' ? names.right : names.me"
      :current="asking === 'right' ? ids.right.name : ids.me.name"
      :taken="asking === 'right' ? [ids.me.name] : [ids.right.name]"
      @save="saveName"
      @close="asking = null"
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
/* 玩法页签（M5）：两个大药丸，选中的橙底 */
.formats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 14px;
}
.format {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: var(--tap-min);
  padding: 8px 12px;
  border-radius: 999px;
  background: var(--c-card);
  box-shadow: var(--shadow-card);
  border: 3px solid transparent;
  font-size: var(--fs-md);
  font-weight: 900;
  color: var(--c-text);
}
.format.on {
  border-color: var(--c-primary);
  background: #fff3e6;
}
.format-icon {
  font-size: 1.3em;
}
/* 打怪兽的「一起打 / 各打各的」开关（M4 / M5） */
.variants {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 12px;
}
.variant {
  min-height: 48px;
  padding: 6px 18px;
  border-radius: 999px;
  background: var(--c-card);
  box-shadow: var(--shadow-card);
  border: 3px solid transparent;
  font-weight: 800;
  color: var(--c-text);
}
.variant.on {
  border-color: var(--c-primary);
  background: #fff3e6;
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
/* 标题「练习」两个字不许被挤成竖排（手机上知识点名长时，flex 按最小内容宽度把它压成一字一行） */
.title-word {
  flex: none;
  white-space: nowrap;
}
.kp-name {
  min-width: 0;
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
  grid-template-columns: repeat(4, 1fr);
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
/* 一个人打的最好成绩（M5） */
.mode small.best {
  font-size: var(--fs-sm);
  font-weight: 800;
  color: #9a6400;
}
/* 四张卡的示意图（ModeIcon）：一台 / 两台手机，卡越宽图越大，最大 132px */
.mode :deep(.mode-pic) {
  margin-bottom: 2px;
}
/* 手机竖屏：四张卡两排各两张（一排四张每张不到 90px，示意图和注音都挤）；卡片收矮一点，「开始」留在第一屏。
   要写在 .mode 的规则后面，同样的选择器后写的才盖得住 */
@media (max-width: 640px) {
  .modes {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
  .mode {
    gap: 2px;
    padding: 10px 8px;
  }
  .mode :deep(.mode-pic) {
    max-width: 96px;
  }
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
