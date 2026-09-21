<script setup lang="ts">
// 🎤 开 / 关语音（需求 B57）：只在多设备房间里出现。没开是灰的，开着带绿圈、自己说话时脉动；
// 出错（拒绝权限 / 不支持 / 名额满）在旁边写一句 3 秒消失并朗读，开 / 关也朗读一句（B39a；正在读题就排在后面，B37）。
// round = 竞技场顶栏的圆钮（只有图标，提示挂在按钮下面）；否则是带字的药丸键；hint = 下面写「一个屋子里就不用开」。
import { computed, watch } from 'vue'
import { lang, ui } from '@/engine/i18n'
import { sayKeys } from '@/engine/voice'
import { useVoiceStore } from '@/stores/voice'
import RubyText from '@/components/ui/RubyText.vue'

const props = defineProps<{ round?: boolean; hint?: boolean }>()
/** 🎤 的几句提示排一个队：正在读题就等它读完，几句连着来只留最新的 */
const MIC_SAY = { mode: 'wait', key: 'mic' } as const
const voice = useVoiceStore()
const label = computed(() => ui(voice.enabled ? 'mic.btn.off' : 'mic.btn.on'))
/** 按钮下面那一句：出错 > 连不上 / 人太多 > 麦克风暂时没声音 > 连接中 > 「一个屋子里就不用开」 */
const note = computed<{ key: string; kind: 'error' | 'link' | 'hint' } | null>(() => {
  if (voice.error) return { key: `mic.${voice.error}`, kind: 'error' }
  if (voice.link === 'failed' || voice.link === 'crowded') return { key: `mic.${voice.link}`, kind: 'error' }
  if (voice.muted) return { key: 'mic.muted', kind: 'link' }
  if (voice.link === 'connecting') return { key: 'mic.connecting', kind: 'link' }
  return props.hint ? { key: 'mic.hint', kind: 'hint' } : null
})

async function toggle(): Promise<void> {
  const was = voice.enabled
  await voice.toggle()
  if (voice.enabled !== was) sayKeys([voice.enabled ? 'mic.on' : 'mic.off'], lang.value, 0, MIC_SAY)
}
watch(
  () => voice.error,
  (e) => {
    if (e) sayKeys([`mic.${e}`], lang.value, 0, MIC_SAY)
  },
)
// 连不上 / 人太多：出现时读一遍
watch(
  () => voice.link,
  (l) => {
    if (l === 'failed' || l === 'crowded') sayKeys([`mic.${l}`], lang.value, 0, MIC_SAY)
  },
)
</script>

<template>
  <span class="voice" :class="{ round: props.round }">
    <button
      type="button"
      class="mic-btn"
      :class="{ on: voice.enabled, talking: voice.talking, busy: voice.busy, dim: !voice.enabled && !voice.canEnable }"
      :aria-label="label"
      :aria-pressed="voice.enabled"
      :disabled="voice.busy"
      @click="toggle"
    >
      <span class="mic-icon" aria-hidden="true">🎤</span>
      <RubyText v-if="!props.round" :text="{ k: voice.enabled ? 'mic.btn.off' : 'mic.btn.on' }" />
      <i class="mic-dot" :class="voice.link" aria-hidden="true" />
    </button>
    <span v-if="note" :class="note.kind === 'hint' ? 'voice-hint' : 'voice-msg'" :data-kind="note.kind" role="status"><RubyText :text="{ k: note.key }" /></span>
  </span>
</template>

<style scoped>
.voice {
  position: relative;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.mic-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 44px;
  padding: 0 16px;
  border-radius: 999px;
  background: var(--c-card);
  box-shadow: var(--shadow-card);
  color: var(--c-text);
  font-weight: 700;
  font-size: var(--fs-sm);
  border: 3px solid transparent;
  transition: transform 0.08s ease, border-color 0.2s ease;
}
.mic-btn:active {
  transform: scale(0.94);
}
.mic-btn.dim:not(.on) {
  opacity: 0.55;
}
.mic-btn.busy {
  opacity: 0.7;
}
.mic-btn.on {
  border-color: #2e9e5b;
  background: #eefaf2;
  color: #1f7a43;
}
.mic-btn.talking {
  animation: talk 0.6s ease-in-out infinite alternate;
}
.mic-btn:not(.on) .mic-icon {
  filter: grayscale(1);
  opacity: 0.6;
}
.mic-icon {
  font-size: 20px;
  line-height: 1;
}
/* 连接状态的小点（B57）：连上了绿、连不上 / 人太多红、连接中灰闪；没有连接不画 */
.mic-dot {
  display: none;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.mic-dot.ok {
  display: inline-block;
  background: #2e9e5b;
}
.mic-dot.failed,
.mic-dot.crowded {
  display: inline-block;
  background: #e0443e;
}
.mic-dot.connecting {
  display: inline-block;
  background: #b8b0a6;
  animation: blink 0.8s ease-in-out infinite alternate;
}
.round .mic-dot {
  position: absolute;
  right: 2px;
  bottom: 2px;
}
.round .mic-btn {
  position: relative;
}
.voice-msg[data-kind='link'] {
  background: rgba(61, 44, 30, 0.08);
  color: var(--c-text-light);
}
@keyframes blink {
  from {
    opacity: 0.35;
  }
  to {
    opacity: 1;
  }
}
/* 竞技场顶栏的圆钮：与旁边的 ✕ / 🔊 一样大小 */
.round .mic-btn {
  width: 44px;
  height: 44px;
  min-height: 0;
  padding: 0;
}
.voice-msg,
.voice-hint {
  max-width: 320px;
  text-align: center;
  font-size: var(--fs-sm);
  font-weight: 700;
  line-height: 1.5;
  color: var(--c-text-light);
}
.voice-msg {
  padding: 4px 12px;
  border-radius: var(--radius-md);
  background: #fff3e6;
  color: var(--c-primary-dark);
}
/* 顶栏里提示挂在按钮下面，不撑开顶栏 */
.round .voice-msg {
  position: absolute;
  top: 100%;
  right: 0;
  z-index: 30;
  margin-top: 4px;
  white-space: nowrap;
  box-shadow: var(--shadow-card);
}
@keyframes talk {
  from {
    box-shadow: 0 0 0 0 rgba(46, 158, 91, 0.45);
  }
  to {
    box-shadow: 0 0 0 8px rgba(46, 158, 91, 0);
  }
}
@media (prefers-reduced-motion: reduce) {
  .mic-btn.talking {
    animation: none;
    box-shadow: 0 0 0 4px rgba(46, 158, 91, 0.35);
  }
}
</style>
