// 五下「1 观察物体（三）」（旧版课本）的词条（五年级数学 A）：问法同五上「观察简单组合体」，照这本旧书说「几何体」。
// 课本用词：几何体、小正方体、摆、从前面看 / 从左面看 / 从上面看、符合要求。图下面的「从前面看」注音、不朗读。
// 拼音：「几何体」jǐ hé tǐ、「哪一个」nǎ yí gè、「这一摞」zhè yí luò、「哪个」「这个」的个读轻声 ge；「要求」yāo qiú；「一共」yí gòng。
import type { Dict } from '@/engine/i18n'

export const ZH: Dict = {
  'm5.view.side.front': '从前面看',
  'm5.view.side.top': '从上面看',
  'm5.view.side.left': '从左面看',
  'm5.view.who': '{side}，哪个几何体看到的是这个图形？',
  'm5.view.howMany': '{side}，看到的图形是这样的有几个？',
  'm5.view.fitN': '用 {n} 个小正方体摆几何体，{side}是这个图形，下面哪种摆法对？',
  'm5.view.least': '{side}是这个图形，摆这样的几何体最少要用几个小正方体？',
  'm5.view.leftFrom': '用 {n} 个小正方体摆几何体，从前面和上面看是这样的。从左面看，是哪个图形？',
  'm5.view.count': '照这三个方向看到的图形摆几何体，要用几个小正方体？',
  'm5.view.build': '照这三个方向看到的图形摆几何体，是下面哪一个？',
  'm5.view.twoViews': '从前面和上面看是这样的，下面哪个几何体符合要求？',
  'm5.view.topPick': '从上面看，格子里的数字是这一摞有几个小正方体。{side}，看到的是哪个图形？',
  'm5.view.topCount': '从上面看，格子里的数字是这一摞有几个小正方体。一共用了几个小正方体？',
}

export const EN: Dict = {
  'm5.view.side.front': 'From the front',
  'm5.view.side.top': 'From the top',
  'm5.view.side.left': 'From the left',
  'm5.view.who': '{side}, which solid looks like this shape?',
  'm5.view.howMany': '{side}, how many solids look like this shape?',
  'm5.view.fitN': 'Build a solid with {n} small cubes. {side} it looks like this shape. Which way of building is right?',
  'm5.view.least': '{side} the solid looks like this shape. At least how many small cubes are needed?',
  'm5.view.leftFrom': 'A solid built with {n} small cubes looks like this from the front and from the top. Which shape do you see from the left?',
  'm5.view.count': 'Build a solid that looks like these shapes from the three directions. How many small cubes do you need?',
  'm5.view.build': 'Build a solid that looks like these shapes from the three directions. Which one below is it?',
  'm5.view.twoViews': 'This is how it looks from the front and from the top. Which solid below fits?',
  'm5.view.topPick': 'Seen from the top, each number tells how many cubes are stacked there. {side}, which shape do you see?',
  'm5.view.topCount': 'Seen from the top, each number tells how many cubes are stacked there. How many small cubes are used in all?',
}

export const PY: Record<string, string> = {
  'm5.view.side.front': 'cóng qián miàn kàn',
  'm5.view.side.top': 'cóng shàng miàn kàn',
  'm5.view.side.left': 'cóng zuǒ miàn kàn',
  'm5.view.who': 'nǎ ge jǐ hé tǐ kàn dào de shì zhè ge tú xíng',
  'm5.view.howMany': 'kàn dào de tú xíng shì zhè yàng de yǒu jǐ gè',
  'm5.view.fitN': 'yòng gè xiǎo zhèng fāng tǐ bǎi jǐ hé tǐ shì zhè ge tú xíng xià miàn nǎ zhǒng bǎi fǎ duì',
  'm5.view.least': 'shì zhè ge tú xíng bǎi zhè yàng de jǐ hé tǐ zuì shǎo yào yòng jǐ gè xiǎo zhèng fāng tǐ',
  'm5.view.leftFrom': 'yòng gè xiǎo zhèng fāng tǐ bǎi jǐ hé tǐ cóng qián miàn hé shàng miàn kàn shì zhè yàng de cóng zuǒ miàn kàn shì nǎ ge tú xíng',
  'm5.view.count': 'zhào zhè sān gè fāng xiàng kàn dào de tú xíng bǎi jǐ hé tǐ yào yòng jǐ gè xiǎo zhèng fāng tǐ',
  'm5.view.build': 'zhào zhè sān gè fāng xiàng kàn dào de tú xíng bǎi jǐ hé tǐ shì xià miàn nǎ yí gè',
  'm5.view.twoViews': 'cóng qián miàn hé shàng miàn kàn shì zhè yàng de xià miàn nǎ ge jǐ hé tǐ fú hé yāo qiú',
  'm5.view.topPick': 'cóng shàng miàn kàn gé zi lǐ de shù zì shì zhè yí luò yǒu jǐ gè xiǎo zhèng fāng tǐ kàn dào de shì nǎ ge tú xíng',
  'm5.view.topCount': 'cóng shàng miàn kàn gé zi lǐ de shù zì shì zhè yí luò yǒu jǐ gè xiǎo zhèng fāng tǐ yí gòng yòng le jǐ gè xiǎo zhèng fāng tǐ',
}
