// 五年级英语两册书后「Words in each unit」（Appendix 2 单元词汇表）：按册、课本的单元号分黑体词与白体词（2026-10-25 照平台页图逐行核对）。
// 五上是新版：黑体词要求理解、运用，白体词仅要求在语境中理解——只有黑体词单独考（E1）。
// 五下是平台上还没换的旧版（三年级起点）：注「黑体词要求学生能够听、说、读、写；白体词只作听、说、认读要求」——白体词也要求听、说、认读，
// 所以五下的白体词也可以单独考听音、看图、选意思，只是不考拼写（补全字母）。「have ... class」「having ... class」这种带省略号的词组只在句子里出现。
export const BOLD: Readonly<Record<1 | 2, Readonly<Record<number, readonly string[]>>>> = {
  1: {
    1: ['lovely', 'clever', 'young', 'hard-working', 'robot', 'jump', 'rope', 'piano', 'chess'],
    2: ['sad', 'worried', 'excited', 'angry', 'parent', 'ask'],
    3: ['Wednesday', 'Tuesday', 'Friday', 'Monday', 'Thursday', 'Saturday', 'Sunday', 'lesson'],
    4: ['exercise', 'phone', 'rest', 'check', 'less', 'brush', 'tooth'],
    5: ['beef', 'ice cream', 'dumpling', 'tea', 'hamburger', 'seed', 'stem', 'root'],
    6: ['river', 'waterfall', 'forest', 'mountain', 'fog', 'flood', 'fire'],
  },
  2: {
    1: ['eat breakfast', 'have ... class', 'play sports', 'exercise', 'do morning exercises', 'eat dinner', 'clean my room', 'go for a walk', 'go shopping', 'take', 'dancing', 'take a dancing class'],
    2: ['spring', 'summer', 'autumn', 'winter', 'season', 'picnic', 'go on a picnic', 'pick', 'pick apples', 'snowman', 'make a snowman', 'go swimming'],
    3: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    4: ['first', 'second', 'third', 'fourth', 'fifth', 'twelfth', 'twentieth', 'twenty-first', 'twenty-third', 'thirtieth'],
    5: ['mine', 'yours', 'his', 'hers', 'theirs', 'ours', 'climbing', 'eating', 'playing', 'jumping', 'drinking', 'sleeping'],
    6: ['doing morning exercises', 'having ... class', 'eating lunch', 'reading a book', 'listening to music', 'keep', 'keep to the right', 'keep your desk clean', 'talk quietly', 'turn', 'take turns'],
  },
}

export const WHITE: Readonly<Record<1 | 2, Readonly<Record<number, readonly string[]>>>> = {
  1: {
    1: ['team', 'player', 'him', 'science', 'front', 'easy', 'star', 'wonderful', 'Australia'],
    2: ['matter', 'project', 'centre', 'agree', 'finish', 'both', 'wrong', 'afraid', 'laugh', 'move', 'yours'],
    3: ['subject', 'because', 'start', 'usually', 'weekend', 'sometimes', 'evening', 'answer', 'ping-pong', 'night', 'visit', 'grandparent'],
    4: ['stay', 'should', 'flu', 'else', 'enough', 'if', 'habit', 'house', 'show', 'then', 'take care of', 'twice', 'hour', 'free'],
    5: ['hungry', 'little', 'Mrs', 'coconut', 'interesting', 'pull', 'lotus', 'lake', 'world', 'round', 'different', 'way'],
    6: ['nature', 'famous', 'wind', 'trip', 'dangerous', 'heavy', 'hotel', 'close', 'umbrella', 'raincoat', 'worry', 'fine', 'know', 'before', 'go hiking', 'bring'],
  },
  2: {
    1: ['when', 'after', 'start', 'usually', 'Spain', 'late', 'a.m.', 'p.m.', 'why', 'shop', 'work', 'last', 'sound', 'also', 'busy', 'need', 'play', 'letter', 'live', 'island', 'always', 'cave', 'go swimming', 'win'],
    2: ['which', 'best', 'snow', 'good job', 'because', 'vacation', 'all', 'pink', 'lovely', 'leaf', 'fall', 'paint'],
    3: ['few', 'a few', 'thing', 'meet', 'sports meet', 'trip', 'year', 'plant', 'contest', 'labour', 'Labour Day', 'the Great Wall', 'national', 'National Day', 'American', 'Thanksgiving', 'Christmas', 'game', 'riddle', 'act', 'act out', 'RSVP', 'by'],
    4: ['other', 'special', 'show', 'festival', 'kitten', 'diary', 'still', 'noise', 'fur', 'open', 'walk'],
    5: ['each', 'each other', 'excited', 'like'],
    6: ['bamboo', 'its', 'show', 'anything', 'else', 'exhibition', 'say', 'have a look', 'sushi', 'teach', 'sure', 'Canadian', 'Spanish'],
  },
}

/**
 * 单元里 Part B 页码上的词（按词表页码分：五上每个单元第 3–6 页是 Part A、第 7–9 页是 Part B；五下旧版每个单元第 2–5 页是 Part A、
 * 第 6–8 页是 Part B）。五上只列黑体词；五下的白体词也能单独考，白体词也列上
 */
export const PART_B: Readonly<Record<1 | 2, Readonly<Record<number, readonly string[]>>>> = {
  1: {
    1: ['robot', 'jump', 'rope', 'piano', 'chess'],
    2: ['parent', 'ask'],
    3: ['Saturday', 'Sunday', 'lesson'],
    4: ['phone', 'rest', 'check', 'less', 'brush', 'tooth'],
    5: ['seed', 'stem', 'root'],
    6: ['fog', 'flood', 'fire'],
  },
  2: {
    1: ['clean my room', 'go for a walk', 'go shopping', 'take', 'dancing', 'take a dancing class', 'why', 'shop', 'work', 'last', 'sound', 'also', 'busy', 'need', 'play', 'letter', 'live', 'island', 'always', 'cave', 'go swimming', 'win'],
    2: ['picnic', 'go on a picnic', 'pick', 'pick apples', 'snowman', 'make a snowman', 'go swimming', 'good job', 'because', 'vacation', 'all', 'pink', 'lovely', 'leaf', 'fall', 'paint'],
    3: ['July', 'August', 'September', 'October', 'November', 'December', 'the Great Wall', 'national', 'National Day', 'American', 'Thanksgiving', 'Christmas', 'game', 'riddle', 'act', 'act out', 'RSVP', 'by'],
    4: ['twelfth', 'twentieth', 'twenty-first', 'twenty-third', 'thirtieth', 'kitten', 'diary', 'still', 'noise', 'fur', 'open', 'walk'],
    5: ['climbing', 'eating', 'playing', 'jumping', 'drinking', 'sleeping', 'each', 'each other', 'excited', 'like'],
    6: ['keep', 'keep to the right', 'keep your desk clean', 'talk quietly', 'turn', 'take turns', 'show', 'anything', 'else', 'exhibition', 'say', 'have a look', 'sushi', 'teach', 'sure', 'Canadian', 'Spanish'],
  },
}
