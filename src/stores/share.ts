import { ref } from 'vue'
import { defineStore } from 'pinia'
import { REPO_URL, SITE_URL } from '@/engine/sites'
import { copyText, shareMessage, shareWay, siteRoot, type ShareWay } from '@/engine/share'
import { ui } from '@/engine/i18n'

/** 分享面板的内容：微信里教用右上角菜单；没有系统分享面板时给一段话让人复制 */
export interface SharePanel {
  way: Exclude<ShareWay, 'native'>
  message: string
  copied: boolean
}

/**
 * 「分享给朋友」（需求 F1「开源与分享」）：首页页脚、对战结果页都从这里发起；
 * 有系统分享面板就直接弹（用户取消不算错），否则打开 SharePanel（App.vue 里挂一个）。
 */
export const useShareStore = defineStore('share', () => {
  const panel = ref<SharePanel | null>(null)

  function env() {
    return {
      ua: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      canShare: typeof navigator !== 'undefined' && typeof navigator.share === 'function',
    }
  }

  const url = (): string => siteRoot(typeof location !== 'undefined' ? location.href : '', SITE_URL)

  /** text 不传就是站点的一句话介绍（share.text 词条）；传了就是这一刻的内容（比如一局的战绩），后面都跟着站点链接 */
  async function share(text = ui('share.text')): Promise<void> {
    const way = shareWay(env())
    const link = url()
    const message = shareMessage(text, link)
    if (way === 'native') {
      try {
        await navigator.share({ title: ui('brand.title'), text, url: link })
        return
      } catch (e) {
        // 用户取消：什么都不做；分享面板调不起来（部分电脑浏览器）：退到复制
        if (e instanceof Error && e.name === 'AbortError') return
      }
      panel.value = { way: 'copy', message, copied: await copyText(message) }
      return
    }
    panel.value = { way, message, copied: way === 'copy' ? await copyText(message) : false }
  }

  async function copy(): Promise<void> {
    if (!panel.value) return
    panel.value.copied = await copyText(panel.value.message)
  }

  function close(): void {
    panel.value = null
  }

  return { panel, share, copy, close, repoUrl: REPO_URL }
})
