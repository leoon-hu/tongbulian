// 六年级英语课本书后「Words in each unit」（单元词汇表）的黑体词与白体词，照智慧教育平台页图抄（测试用，E1）。
// 六上（新版，页图 086–089）注明「黑体词要求理解、运用，白体词仅要求在语境中理解」：单独考的单词只能用黑体词；
// 动词后面括号里的过去式（go（过去式 went））跟原形一样粗细，原形和过去式分开记。
// 六下（平台上的旧版，页图 059–061）注明「黑体词要求学生能够听、说、读、写；白体词要求听、说、认读」：白体词也能单独考（不考拼写，R4p）。
// PART_B：词表页码落在 Part B（及 Read and write、Reading time / Story time）那几页的词；其余是 Part A 的。
import type { WordList } from '@/content/english/shared/__tests__/suite'

export const BOLD: WordList = {
  1: {
    1: ['was', 'climb', 'go', 'went', 'see', 'saw', 'eat', 'ate', 'take', 'took'],
    2: ['paste', 'dress', 'count down', 'run', 'ran', 'read', 'make', 'made', 'sing', 'sang', 'wear', 'wore'],
    3: ['cold', 'runny nose', 'fever', 'cough', 'diet', 'stay up'],
    4: ['money', 'goods', 'drink', 'service', 'haircut', 'save up', 'sale'],
    5: ['planet', 'earth', 'moon', 'star', 'space', 'space station', 'satellite', 'telescope', 'astronaut', 'spaceship'],
    6: ['power', 'solar', 'light', 'heat', 'cool', 'run', 'reduce', 'reuse'],
  },
  2: {
    1: ['younger', 'older', 'taller', 'shorter', 'longer', 'thinner', 'heavier', 'bigger', 'smaller', 'stronger'],
    2: ['cleaned', 'stayed', 'washed', 'watched', 'had', 'had a cold', 'slept', 'read', 'saw', 'last', 'yesterday', 'before'],
    3: ['went', 'camp', 'went camping', 'fish', 'went fishing', 'rode', 'hurt', 'ate', 'took', 'took pictures', 'bought', 'gift'],
    4: ['dining hall', 'grass', 'gym', 'ago', 'cycling', 'go cycling', 'ice-skate', 'badminton'],
  },
}

export const WHITE: WordList = {
  1: {
    1: ['kilometre', 'gingerbread house', 'send', 'thousand', 'clay', 'village', 'dry', 'view', 'inspiring', 'bamboo', 'pumpkin', 'restaurant', 'airport', 'New Zealand', 'Hong Kong-Zhuhai-Macao Bridge', 'Paris', 'Eiffel Tower', 'Terracotta Warriors', 'Jinggangshan Revolution Museum', 'the Red Army'],
    2: ['gala', 'marathon', 'as', 'race', 'cheer', 'book fair', 'writer', 'yesterday', 'notice', 'wake', 'woke', 'later', 'judge', 'begin', 'began', 'win', 'won', 'winner', 'ever', 'exciting'],
    3: ['ill', 'head', 'soon', 'discuss', 'cry', 'another', 'call', 'email', 'unhappy', 'glass', 'may', 'add', 'video', 'better'],
    4: ['pocket money', 'schoolbag', 'microscope', 'lucky', 'half', 'ticket', 'manage', 'sell', 'jar', 'for example'],
    5: ['sky', 'daytime', 'cloud', 'outer space', 'ocean', 'marble', 'soil', 'alien', 'sunrise', 'rover', 'into', 'month', 'taikonaut', 'cloth', 'toothpaste', 'question', 'sunset', 'time', 'Mars'],
    6: ['electricity', 'type', 'energy', 'resource', 'run out', 'change', 'quick', 'shower', 'unplug', 'difference', 'air conditioner', 'drive', 'own', 'market', 'bottle', 'top', 'useful', 'dirty', 'side'],
  },
  2: {
    1: ['dinosaur', 'hall', 'metre', 'than', 'both', 'kilogram', 'countryside', 'lower', 'shadow', 'smarter', 'become'],
    2: ['drank', 'show', 'magazine', 'better', 'faster', 'hotel', 'fixed', 'broken', 'lamp', 'loud', 'enjoy', 'stay'],
    3: ['fell', 'off', 'mule', 'Turpan', 'could', 'till', 'beach', 'basket', 'part', 'licked', 'laughed'],
    4: ['star', 'easy', 'look up', 'Internet', 'different', 'active', 'race', 'nothing', 'thought', 'felt', 'cheetah', 'trip', 'woke', 'dream'],
  },
}

/** 词表页码落在 Part B 的词（黑体、白体都在内） */
export const PART_B: WordList = {
  1: {
    1: ['go', 'went', 'see', 'saw', 'eat', 'ate', 'take', 'took', 'thousand', 'clay', 'Terracotta Warriors', 'village', 'dry', 'view', 'inspiring', 'bamboo', 'pumpkin', 'restaurant', 'airport', 'Jinggangshan Revolution Museum', 'the Red Army'],
    2: ['run', 'ran', 'read', 'make', 'made', 'sing', 'sang', 'wear', 'wore', 'marathon', 'as', 'race', 'cheer', 'book fair', 'writer', 'yesterday', 'notice', 'wake', 'woke', 'later', 'judge', 'begin', 'began', 'win', 'won', 'winner', 'ever', 'exciting'],
    3: ['diet', 'stay up', 'discuss', 'cry', 'another', 'call', 'email', 'unhappy', 'glass', 'may', 'add', 'video', 'better'],
    4: ['save up', 'sale', 'microscope', 'lucky', 'half', 'ticket', 'manage', 'sell', 'jar', 'for example'],
    5: ['telescope', 'astronaut', 'spaceship', 'soil', 'alien', 'sunrise', 'rover', 'into', 'month', 'taikonaut', 'cloth', 'toothpaste', 'question', 'sunset', 'time', 'Mars'],
    6: ['reduce', 'reuse', 'resource', 'run out', 'change', 'quick', 'shower', 'unplug', 'difference', 'air conditioner', 'drive', 'own', 'market', 'bottle', 'top', 'useful', 'dirty', 'side'],
  },
  2: {
    1: ['thinner', 'heavier', 'bigger', 'smaller', 'stronger', 'kilogram', 'countryside', 'lower', 'shadow', 'smarter', 'become'],
    2: ['had', 'had a cold', 'slept', 'read', 'saw', 'last', 'yesterday', 'before', 'magazine', 'better', 'faster', 'hotel', 'fixed', 'broken', 'lamp', 'loud', 'enjoy', 'stay'],
    3: ['ate', 'took', 'took pictures', 'bought', 'gift', 'beach', 'basket', 'part', 'licked', 'laughed'],
    4: ['cycling', 'go cycling', 'ice-skate', 'badminton', 'different', 'active', 'race', 'nothing', 'thought', 'felt', 'cheetah', 'trip', 'woke', 'dream'],
  },
}
