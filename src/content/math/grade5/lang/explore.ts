// 五下「☆ 探索图形」的词条（五年级数学 G）。
// 课本用词：三面、两面、一面涂色，没有涂色；顶点、棱、面。「涂色」的「色」读 sè（要听一下）；不写「数一数」（数 shǔ）。
import type { Dict } from '@/engine/i18n'

export const ZH: Dict = {
  'm5.explore.q': '把这个大正方体的表面涂上颜色，{kind}的小正方体有几个？',
  'm5.explore.qText': '一个大正方体由棱长 1 厘米的小正方体拼成，每条棱上有 {n} 个小正方体。把它的表面涂上颜色，{kind}的小正方体有几个？',
  'm5.explore.total': '这个大正方体是用几个小正方体拼成的？',
  'm5.explore.where': '把大正方体的表面涂上颜色，{kind}的小正方体在大正方体的什么位置？',
  'm5.explore.k3': '三面涂色',
  'm5.explore.k2': '两面涂色',
  'm5.explore.k1': '一面涂色',
  'm5.explore.k0': '没有涂色',
  'm5.explore.at.vertex': '顶点上',
  'm5.explore.at.edge': '棱上，顶点除外',
  'm5.explore.at.face': '每个面的中间',
  'm5.explore.at.inside': '大正方体的里面',
}

export const EN: Dict = {
  'm5.explore.q': 'The surface of this big cube is painted. How many small cubes have {kind}?',
  'm5.explore.qText': 'A big cube is built from small cubes with 1 cm edges, {n} small cubes along each edge. Its surface is painted. How many small cubes have {kind}?',
  'm5.explore.total': 'How many small cubes make up this big cube?',
  'm5.explore.where': 'The surface of the big cube is painted. Where are the small cubes with {kind}?',
  'm5.explore.k3': 'three faces painted',
  'm5.explore.k2': 'two faces painted',
  'm5.explore.k1': 'one face painted',
  'm5.explore.k0': 'no face painted',
  'm5.explore.at.vertex': 'At the vertices',
  'm5.explore.at.edge': 'On the edges, not at the vertices',
  'm5.explore.at.face': 'In the middle of each face',
  'm5.explore.at.inside': 'Inside the big cube',
}

export const PY: Record<string, string> = {
  'm5.explore.q': 'bǎ zhè ge dà zhèng fāng tǐ de biǎo miàn tú shàng yán sè de xiǎo zhèng fāng tǐ yǒu jǐ gè',
  'm5.explore.qText': 'yí gè dà zhèng fāng tǐ yóu léng cháng lí mǐ de xiǎo zhèng fāng tǐ pīn chéng měi tiáo léng shàng yǒu gè xiǎo zhèng fāng tǐ bǎ tā de biǎo miàn tú shàng yán sè de xiǎo zhèng fāng tǐ yǒu jǐ gè',
  'm5.explore.total': 'zhè ge dà zhèng fāng tǐ shì yòng jǐ gè xiǎo zhèng fāng tǐ pīn chéng de',
  'm5.explore.where': 'bǎ dà zhèng fāng tǐ de biǎo miàn tú shàng yán sè de xiǎo zhèng fāng tǐ zài dà zhèng fāng tǐ de shén me wèi zhì',
  'm5.explore.k3': 'sān miàn tú sè',
  'm5.explore.k2': 'liǎng miàn tú sè',
  'm5.explore.k1': 'yí miàn tú sè',
  'm5.explore.k0': 'méi yǒu tú sè',
  'm5.explore.at.vertex': 'dǐng diǎn shàng',
  'm5.explore.at.edge': 'léng shàng dǐng diǎn chú wài',
  'm5.explore.at.face': 'měi gè miàn de zhōng jiān',
  'm5.explore.at.inside': 'dà zhèng fāng tǐ de lǐ miàn',
}
