import type { Question } from '@/types/models'
import type { Player } from '@/battle/protocol'
import type { Feedback } from '@/stores/battle'
import type { VoiceMark } from '@/stores/voice'

/** 队区里一行的数据：人 + 他正在答的题（倒数阶段为 null）+ 答完后的反馈窗口 + 名字旁的 🎤（多设备开了语音才有，B57） */
export interface RowData {
  player: Player
  question: Question | null
  feedback: Feedback | null
  voice?: VoiceMark
}
