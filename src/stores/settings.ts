import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { loadState, saveState } from '@/engine/storage'
import { lang as i18nLang, setLang } from '@/engine/i18n'
import { soundOn } from '@/engine/sound'

export const useSettingsStore = defineStore('settings', () => {
  const persisted = loadState()
  const soundEnabled = ref(persisted.settings.soundEnabled)

  // 语言的运行时真值就是 i18n 模块里的 lang ref（叶子组件无需 pinia 即可读到）；
  // 这里只负责用持久化值初始化它，并在变化时写回本地存储。声音开关同理接到 voice 模块。
  setLang(persisted.settings.lang)
  soundOn.value = soundEnabled.value

  watch([soundEnabled, i18nLang], () => {
    soundOn.value = soundEnabled.value
    saveState({ settings: { soundEnabled: soundEnabled.value, lang: i18nLang.value } })
  })

  function toggleLanguage(): void {
    setLang(i18nLang.value === 'zh' ? 'en' : 'zh')
  }

  function toggleSound(): void {
    soundEnabled.value = !soundEnabled.value
  }

  return { soundEnabled, lang: i18nLang, toggleLanguage, toggleSound }
})
