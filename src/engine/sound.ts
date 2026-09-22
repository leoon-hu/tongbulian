/**
 * 声音开关的真值（N8）：settings store 与 voice 模块共用这一个 ref——设置只需要改开关，不用为此把整个朗读模块
 * （含音频清单）拉进首页的入口分块；voice 模块加载后自己 watch 它，关掉就闭嘴。
 */
import { ref } from 'vue'

export const soundOn = ref(true)
