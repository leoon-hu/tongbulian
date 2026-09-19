<script setup lang="ts">
// 对战设置页（B27）：跟谁打（打机器人 / 两人一台 / 各用各的）、机器人快慢、选游戏、名字 → 开始
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { hasGenerator } from '@/engine'
import { courseOfKp } from '@/engine/catalog'
import { kpTitleKey, ui } from '@/engine/i18n'
import { AI_LEVELS, type AiLevel } from '@/battle/ai'
import { useBattleStore, type LocalMode } from '@/stores/battle'
import PageHeader from '@/components/ui/PageHeader.vue'
import RubyText from '@/components/ui/RubyText.vue'
import BigButton from '@/components/ui/BigButton.vue'
import SkinPicker from '@/components/battle/SkinPicker.vue'
import NameSheet from '@/components/battle/NameSheet.vue'

const route = useRoute()
const router = useRouter()
const store = useBattleStore()

const kpId = String(route.params.kpId)
const info = courseOfKp(kpId)
const ready = info !== undefined && hasGenerator(kpId)
if (!ready) router.replace('/')
const mapPath = info ? `/s/${info.subject.id}/g/${info.grade.id}` : '/'

const mode = ref<LocalMode>('ai')
const AI_ICONS: Record<AiLevel, string> = { slow: '🐢', mid: '🐰', fast: '🚀' }
/** 正在改谁的名字（NameSheet 打开时） */
const asking = ref<'me' | 'left' | 'right' | null>(null)
const names = computed(() => store.prefs.names)
const leftName = computed(() => names.value.left || names.value.me)

// 第一次进对战先问名字（B17）
onMounted(() => {
  if (!names.value.me) asking.value = 'me'
})

function saveName(name: string): void {
  const which = asking.value
  if (!which) return
  store.setName(which, name)
  if (which === 'left' && !names.value.me) store.setName('me', name)
  asking.value = null
}

function start(): void {
  if (!names.value.me) {
    asking.value = 'me'
    return
  }
  if (mode.value === 'duo' && !names.value.right) {
    asking.value = 'right'
    return
  }
  store.startLocal({ kpId, mode: mode.value })
  // 在这个手势里试着全屏（iPad / Android / 电脑；iPhone 不支持就算了）
  try {
    document.documentElement.requestFullscreen?.()?.catch(() => {})
  } catch {
    /* 不支持 */
  }
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
    </PageHeader>

    <section class="block">
      <h2 class="label"><RubyText :text="{ k: 'battle.who' }" /></h2>
      <div class="modes">
        <button type="button" class="mode" :class="{ on: mode === 'ai' }" @click="mode = 'ai'">
          <span class="mode-icon">🤖</span>
          <RubyText :text="{ k: 'battle.mode.ai' }" />
        </button>
        <button type="button" class="mode" :class="{ on: mode === 'duo' }" @click="mode = 'duo'">
          <span class="mode-icon">👫</span>
          <RubyText :text="{ k: 'battle.mode.duo' }" />
        </button>
        <button type="button" class="mode soon" disabled>
          <span class="mode-icon">📱</span>
          <RubyText :text="{ k: 'battle.mode.online' }" />
          <small>{{ ui('chooser.soon') }}</small>
        </button>
      </div>
    </section>

    <section v-if="mode === 'ai'" class="block">
      <h2 class="label"><RubyText :text="{ k: 'battle.ai.speed' }" /></h2>
      <div class="levels" role="radiogroup">
        <button
          v-for="lv in AI_LEVELS"
          :key="lv"
          type="button"
          class="level"
          :class="{ on: store.prefs.aiLevel === lv }"
          role="radio"
          :aria-checked="store.prefs.aiLevel === lv"
          @click="store.prefs.aiLevel = lv"
        >
          <span class="level-icon">{{ AI_ICONS[lv] }}</span>
          <RubyText :text="{ k: `battle.ai.${lv}` }" />
        </button>
      </div>
    </section>

    <section class="block">
      <h2 class="label"><RubyText :text="{ k: 'battle.pickSkin' }" /></h2>
      <SkinPicker v-model="store.prefs.skin" />
    </section>

    <section class="block">
      <h2 class="label"><RubyText :text="{ k: 'battle.names' }" /></h2>
      <div class="names">
        <button v-if="mode === 'ai'" type="button" class="name-chip red" @click="asking = 'me'">
          <span class="who">🔴</span>
          <span class="nm">{{ names.me || '…' }}</span>
          <span class="edit" :aria-label="ui('battle.name.edit')">✏️</span>
        </button>
        <template v-else>
          <button type="button" class="name-chip red" @click="asking = 'left'">
            <span class="who"><RubyText :text="{ k: 'battle.name.left' }" /></span>
            <span class="nm">{{ leftName || '…' }}</span>
            <span class="edit" :aria-label="ui('battle.name.edit')">✏️</span>
          </button>
          <button type="button" class="name-chip blue" @click="asking = 'right'">
            <span class="who"><RubyText :text="{ k: 'battle.name.right' }" /></span>
            <span class="nm">{{ names.right || '…' }}</span>
            <span class="edit" :aria-label="ui('battle.name.edit')">✏️</span>
          </button>
        </template>
        <span v-if="mode === 'ai'" class="name-chip blue static">
          <span class="who">🔵</span>
          <span class="nm">🤖 <RubyText :text="{ k: 'battle.robot' }" /></span>
        </span>
      </div>
    </section>

    <div class="start">
      <BigButton color="green" class="start-btn" @click="start"><RubyText :text="{ k: 'battle.start' }" /></BigButton>
    </div>

    <NameSheet
      v-if="asking"
      :initial="asking === 'right' ? names.right : asking === 'left' ? leftName : names.me"
      :taken="asking === 'right' ? [leftName] : [names.right]"
      @save="saveName"
      @close="asking = null"
    />
  </div>
</template>

<style scoped>
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
.modes,
.levels {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.mode,
.level {
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
.level {
  padding: 10px 8px;
}
.mode:not(:disabled):active,
.level:active {
  transform: scale(0.96);
}
.mode.on,
.level.on {
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
.mode-icon {
  font-size: 40px;
  line-height: 1;
}
.level-icon {
  font-size: 30px;
  line-height: 1;
}
.names {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.name-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: var(--tap-min);
  padding: 8px 16px;
  border-radius: 999px;
  background: var(--c-card);
  box-shadow: var(--shadow-card);
  font-size: var(--fs-md);
  font-weight: 700;
  color: var(--c-text);
  border: 3px solid transparent;
}
.name-chip.red {
  border-color: rgba(255, 107, 107, 0.45);
}
.name-chip.blue {
  border-color: rgba(74, 163, 255, 0.45);
}
.name-chip.static {
  box-shadow: none;
  background: var(--c-bg);
}
.who {
  color: var(--c-text-light);
  font-size: var(--fs-sm);
}
.nm {
  font-size: var(--fs-lg);
}
.edit {
  font-size: var(--fs-sm);
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
