// 视口尺寸（CSS 像素）的响应式值：resize / orientationchange 时更新，组件卸载时摘掉监听。竞技场按它算布局（battle/layout.ts）
import { onBeforeUnmount, ref, type Ref } from 'vue'
import type { Viewport } from '@/battle/layout'

function read(): Viewport {
  if (typeof window === 'undefined') return { width: 1024, height: 768 }
  return { width: window.innerWidth, height: window.innerHeight }
}

export function useViewport(): Readonly<Ref<Viewport>> {
  const vp = ref<Viewport>(read())
  const update = (): void => {
    const v = read()
    if (v.width !== vp.value.width || v.height !== vp.value.height) vp.value = v
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    onBeforeUnmount(() => {
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
    })
  }
  return vp
}
