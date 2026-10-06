// 四下「观察物体（二）」的词条（四年级数学下册 E）。
// 课本用词：从前面看、从上面看、从左面看（没有右面、后面），图形相同 / 不相同，从哪面看到的图形相同、不同，
// 小正方体、正方体、长方体、物体、摆、搭；「这 3 个物体」照课本写阿拉伯数字。图下面的「从前面看」注音、不朗读。
// 拼音：「一个」yí gè、「哪一个」nǎ yí gè、「几个」「两个」「这 3 个」的个读 gè，「哪个」「这个」的个读轻声 ge；「搭」dā。
import type { Dict } from '@/engine/i18n'

export const ZH: Dict = {
  // ── 三个位置（选项、句子开头、图下面的字）──
  'm4.obs.side.front': '从前面看',
  'm4.obs.side.top': '从上面看',
  'm4.obs.side.left': '从左面看',
  // ── 选项 ──
  'm4.obs.same': '相同',
  'm4.obs.diff': '不相同',
  'm4.obs.pair': '{a} 和 {b}',
  // ── 读屏（不显示、不朗读）──
  'm4.obs.ariaSolid': '小正方体搭的物体',
  'm4.obs.ariaBar': '正方体和长方体',
  'm4.obs.ariaView': '看到的图形',
  // ── 从不同位置观察物体 ──
  'm4.obs.pick': '{side}，看到的是哪个图形？',
  'm4.obs.which': '下面的图形是从什么位置看到的？',
  'm4.obs.count': '照下面的图形摆出物体，要用几个小正方体？',
  'm4.obs.pile': '这个物体是由几个小正方体搭成的？',
  // ── 观察不同的物体 ──
  'm4.obs.sameSide': '这 {n} 个物体，从哪面看到的图形都相同？',
  'm4.obs.diffSide': '这 {n} 个物体，从哪面看到的图形不同？',
  'm4.obs.allDiff': '这 {n} 个物体，从哪面看到的图形都不相同？',
  'm4.obs.isSame': '{side}，这 {n} 个物体看到的图形相同吗？',
  'm4.obs.allSee': '{side}，这 {n} 个物体看到的图形相同，是下面哪一个？',
  'm4.obs.who': '{side}，哪个物体看到的是这个图形？',
  'm4.obs.pairSame': '{side}，哪两个物体看到的图形相同？',
  'm4.obs.howMany': '{side}，看到的图形是这样的有几个？',
  'm4.obs.maybe': '从同一个位置观察不同的物体，看到的图形可能一样，对吗？',
  'm4.obs.must': '从同一个位置看到的图形相同，物体就一定相同，对吗？',
}

export const EN: Dict = {
  'm4.obs.side.front': 'From the front',
  'm4.obs.side.top': 'From the top',
  'm4.obs.side.left': 'From the left',
  'm4.obs.same': 'Same',
  'm4.obs.diff': 'Different',
  'm4.obs.pair': '{a} and {b}',
  'm4.obs.ariaSolid': 'object made of small cubes',
  'm4.obs.ariaBar': 'a cube and a cuboid',
  'm4.obs.ariaView': 'shape seen',
  'm4.obs.pick': '{side}, which shape do you see?',
  'm4.obs.which': 'From which position do you see the shape below?',
  'm4.obs.count': 'Build the object from the shapes below. How many small cubes do you need?',
  'm4.obs.pile': 'How many small cubes make up this object?',
  'm4.obs.sameSide': 'From which side do these {n} objects all look the same?',
  'm4.obs.diffSide': 'From which side do these {n} objects look different?',
  'm4.obs.allDiff': 'From which side do these {n} objects all look different?',
  'm4.obs.isSame': '{side}, do these {n} objects look the same?',
  'm4.obs.allSee': '{side}, these {n} objects look the same. Which shape below is it?',
  'm4.obs.who': '{side}, which object looks like this shape?',
  'm4.obs.pairSame': '{side}, which two objects look the same?',
  'm4.obs.howMany': '{side}, how many objects look like this shape?',
  'm4.obs.maybe': 'Seen from the same position, different objects may look the same. Right?',
  'm4.obs.must': 'If two objects look the same from one position, they must be the same object. Right?',
}

export const PY: Record<string, string> = {
  'm4.obs.side.front': 'cóng qián miàn kàn',
  'm4.obs.side.top': 'cóng shàng miàn kàn',
  'm4.obs.side.left': 'cóng zuǒ miàn kàn',
  'm4.obs.same': 'xiāng tóng',
  'm4.obs.diff': 'bù xiāng tóng',
  'm4.obs.pair': 'hé',
  'm4.obs.ariaSolid': 'xiǎo zhèng fāng tǐ dā de wù tǐ',
  'm4.obs.ariaBar': 'zhèng fāng tǐ hé cháng fāng tǐ',
  'm4.obs.ariaView': 'kàn dào de tú xíng',
  'm4.obs.pick': 'kàn dào de shì nǎ ge tú xíng',
  'm4.obs.which': 'xià miàn de tú xíng shì cóng shén me wèi zhì kàn dào de',
  'm4.obs.count': 'zhào xià miàn de tú xíng bǎi chū wù tǐ yào yòng jǐ gè xiǎo zhèng fāng tǐ',
  'm4.obs.pile': 'zhè ge wù tǐ shì yóu jǐ gè xiǎo zhèng fāng tǐ dā chéng de',
  'm4.obs.sameSide': 'zhè gè wù tǐ cóng nǎ miàn kàn dào de tú xíng dōu xiāng tóng',
  'm4.obs.diffSide': 'zhè gè wù tǐ cóng nǎ miàn kàn dào de tú xíng bù tóng',
  'm4.obs.allDiff': 'zhè gè wù tǐ cóng nǎ miàn kàn dào de tú xíng dōu bù xiāng tóng',
  'm4.obs.isSame': 'zhè gè wù tǐ kàn dào de tú xíng xiāng tóng ma',
  'm4.obs.allSee': 'zhè gè wù tǐ kàn dào de tú xíng xiāng tóng shì xià miàn nǎ yí gè',
  'm4.obs.who': 'nǎ ge wù tǐ kàn dào de shì zhè ge tú xíng',
  'm4.obs.pairSame': 'nǎ liǎng gè wù tǐ kàn dào de tú xíng xiāng tóng',
  'm4.obs.howMany': 'kàn dào de tú xíng shì zhè yàng de yǒu jǐ gè',
  'm4.obs.maybe': 'cóng tóng yí gè wèi zhì guān chá bù tóng de wù tǐ kàn dào de tú xíng kě néng yí yàng duì ma',
  'm4.obs.must': 'cóng tóng yí gè wèi zhì kàn dào de tú xíng xiāng tóng wù tǐ jiù yí dìng xiāng tóng duì ma',
}
