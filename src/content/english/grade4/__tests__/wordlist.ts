// 四年级英语两册书后「Words in each unit」（Appendix 2 单元词汇表）：按册、单元分黑体词与白体词（2026-10-25 照平台页图逐行核对）。
// 课本的注：黑体词要求理解、运用，白体词仅要求在语境中理解——所以只有黑体词单独考（听音选词、看图、选意思……），
// 白体词只在句子里出现（E1）。sock、shoe、chopstick 词表写单数（chopstick 注「常用复数」），Let's learn 写复数，这里照 Let's learn。
// 四上的 cook 出现两次：Unit 1 是「烹饪；煮」（做饭，家务），Unit 4 是「厨师」。四下书后另有一张数词表（one 到 hundred，都是白体），不算单元词。
export const BOLD: Readonly<Record<1 | 2, Readonly<Record<number, readonly string[]>>>> = {
  1: {
    1: ['doctor', 'farmer', 'nurse', 'office worker', 'factory worker', 'cook', 'look after', 'sweep', 'floor'],
    2: ['strong', 'hair', 'kind', 'quiet', 'read', 'Chinese', 'play', 'game', 'football'],
    3: ['playground', 'park', 'hospital', 'shop', 'toilet', 'bus stop', 'sport', 'walk'],
    4: ['driver', 'cleaner', 'cook', 'delivery worker', 'police officer', 'old', 'tell'],
    5: ['sunny', 'hot', 'cold', 'windy', 'cloudy', 'rainy', 'snowy', 'cool', 'warm', 'film', 'fly', 'kite', 'snowman'],
    6: ['sweater', 'socks', 'shirt', 'coat', 'dress', 'winter', 'spring', 'summer', 'autumn'],
  },
  2: {
    1: ['late', 'classroom', 'turn off', 'light', 'desk', 'chair', 'door', 'window', 'fan'],
    2: ['homework', 'living room', 'word', 'wash', 'bedroom', 'kitchen', 'study', 'bathroom'],
    3: ['dinner', 'art', 'lunch', 'maths', 'get up', 'go to school', 'go home', 'go to bed'],
    4: ['trousers', 'shorts', 'jacket', 'skirt', 'expensive', 'cheap', 'shoes', 'beautiful', 'hat', 'sunglasses'],
    5: ['cow', 'horse', 'sheep', 'pig', 'chicken', 'tomato', 'carrot', 'potato'],
    6: ['feed', 'pick', 'milk', 'knife', 'fork', 'chopsticks', 'bowl', 'spoon'],
  },
}

/** 黑体词在单元里哪一部分（按词表的页码：每个单元第 3–6 页是 Part A，第 7–9 页是 Part B） */
export const PART_B: Readonly<Record<1 | 2, Readonly<Record<number, readonly string[]>>>> = {
  1: {
    1: ['cook', 'look after', 'sweep', 'floor'],
    2: ['read', 'Chinese', 'play', 'game', 'football'],
    3: ['sport', 'walk'],
    4: ['old', 'tell'],
    5: ['film', 'fly', 'kite', 'snowman'],
    6: ['winter', 'spring', 'summer', 'autumn'],
  },
  2: {
    1: ['desk', 'chair', 'door', 'window', 'fan'],
    2: ['bedroom', 'kitchen', 'study', 'bathroom'],
    3: ['get up', 'go to school', 'go home', 'go to bed'],
    4: ['expensive', 'cheap', 'shoes', 'beautiful', 'hat', 'sunglasses'],
    5: ['tomato', 'carrot', 'potato'],
    6: ['knife', 'fork', 'chopsticks', 'bowl', 'spoon'],
  },
}

export const WHITE: Readonly<Record<1 | 2, Readonly<Record<number, readonly string[]>>>> = {
  1: {
    1: ['PE', 'job', 'busy', 'tired', 'chore', 'clean', 'room', 'together', 'people', 'child'],
    2: ['his', 'best', 'basketball', 'always'],
    3: ['afternoon', 'there', 'over', 'library', 'community', 'favourite', 'place', 'photo', 'story', 'buy'],
    4: ['firefighter', 'why', 'important', 'a lot of', 'now', 'make the bed', 'everyone', 'Ms'],
    5: ['speak', 'weather', 'bad', 'tomorrow', 'rain', 'closed', 'idea', 'fun', 'their', 'swim', 'Sydney'],
    6: ['whose', 'mine', 'wear', 'which', 'season', 'snow', 'get together', 'T-shirt', 'fall', 'leaf', 'glove', 'then'],
  },
  2: {
    1: ['sorry', 'hurry up', 'class', 'ready', 'rule', 'blackboard', 'tidy', 'music', 'when', 'understand', 'wall', 'newspaper', 'hand out', 'workbook'],
    2: ['watch', 'TV', 'first', 'wet', 'run', 'safe', 'helpful', 'loud', 'sleep', 'think', 'work', 'hard', 'follow', 'feel'],
    3: ['over', 'kid', 'want', 'clock', 'just', 'minute'],
    4: ['pair', 'clothes', 'those', 'dear', 'take', 'free', 'large', 'size', 'list', 'try on', 'any'],
    5: ['bee', 'mouse', 'green bean', 'can', 'a box of'],
    6: ['pass', 'waste', 'food', 'delicious', 'clear the table', 'set the table', 'supermarket', 'herself', 'week', 'salad'],
  },
}
