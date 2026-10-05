// 四上「☆ 1亿有多大」的词条：100 张纸厚 1 厘米，推算 1 万张、1 亿张有多高；几个一百是一万、几个一万是一亿。
// 课本写「1 cm」「10000 m」，题目里写「厘米」「米」「千米」（朗读读得准）；1 亿张写「1 亿」（课本「你能算出1亿张纸有多高吗」）。
import type { Dict } from '@/engine/i18n'

/** [键尾, 中文, 拼音, 英文] */
type Row = [string, string, string, string]
const ROWS: Row[] = [
  ['cm', '100 张纸厚 1 厘米，{n} 张纸摞起来高多少厘米？', 'zhāng zhǐ hòu lí mǐ zhāng zhǐ luò qǐ lái gāo duō shao lí mǐ', '100 sheets of paper are 1 cm thick. How many cm tall is a stack of {n} sheets?'],
  ['m', '100 张纸厚 1 厘米，{n} 张纸摞起来高多少米？', 'zhāng zhǐ hòu lí mǐ zhāng zhǐ luò qǐ lái gāo duō shao mǐ', '100 sheets of paper are 1 cm thick. How many m tall is a stack of {n} sheets?'],
  ['yiM', '100 张纸厚 1 厘米，1 亿张纸摞起来高多少米？', 'zhāng zhǐ hòu lí mǐ yì zhāng zhǐ luò qǐ lái gāo duō shao mǐ', '100 sheets of paper are 1 cm thick. How many m tall is a stack of 100 million sheets?'],
  ['yiKm', '100 张纸厚 1 厘米，1 亿张纸摞起来高多少千米？', 'zhāng zhǐ hòu lí mǐ yì zhāng zhǐ luò qǐ lái gāo duō shao qiān mǐ', '100 sheets of paper are 1 cm thick. How many km tall is a stack of 100 million sheets?'],
  ['sheetsCm', '100 张纸厚 1 厘米，多少张纸摞起来高 {h} 厘米？', 'zhāng zhǐ hòu lí mǐ duō shao zhāng zhǐ luò qǐ lái gāo lí mǐ', '100 sheets of paper are 1 cm thick. How many sheets make a stack {h} cm tall?'],
  ['sheetsM', '100 张纸厚 1 厘米，多少张纸摞起来高 {h} 米？', 'zhāng zhǐ hòu lí mǐ duō shao zhāng zhǐ luò qǐ lái gāo mǐ', '100 sheets of paper are 1 cm thick. How many sheets make a stack {h} m tall?'],
  ['sheetsKm', '100 张纸厚 1 厘米，多少张纸摞起来高 {h} 千米？', 'zhāng zhǐ hòu lí mǐ duō shao zhāng zhǐ luò qǐ lái gāo qiān mǐ', '100 sheets of paper are 1 cm thick. How many sheets make a stack {h} km tall?'],
  ['cmToM', '10000 张纸高 100 厘米，也就是多少米？', 'zhāng zhǐ gāo lí mǐ yě jiù shì duō shao mǐ', 'A stack of 10000 sheets is 100 cm tall. How many m is that?'],
  ['hundreds', '多少个一百是一万？', 'duō shao gè yì bǎi shì yí wàn', 'How many hundreds make ten thousand?'],
  ['wans', '多少个一万是一亿？', 'duō shao gè yí wàn shì yí yì', 'How many ten thousands make one hundred million?'],
  ['qianwans', '多少个一千万是一亿？', 'duō shao gè yì qiān wàn shì yí yì', 'How many ten millions make one hundred million?'],
  ['hundredHundreds', '100 个一百是多少？', 'gè yì bǎi shì duō shao', 'What do 100 hundreds make?'],
  ['wanWans', '10000 个一万是多少？', 'gè yí wàn shì duō shao', 'What do 10000 ten thousands make?'],
  ['w.qian', '一千', 'yì qiān', 'one thousand'],
  ['w.wan', '一万', 'yí wàn', 'ten thousand'],
  ['w.shiwan', '十万', 'shí wàn', 'one hundred thousand'],
  ['w.baiwan', '一百万', 'yì bǎi wàn', 'one million'],
  ['w.qianwan', '一千万', 'yì qiān wàn', 'ten million'],
  ['w.yi', '一亿', 'yí yì', 'one hundred million'],
  ['w.shiyi', '十亿', 'shí yì', 'one billion'],
  ['head.sheets', '纸张数', 'zhǐ zhāng shù', 'sheets'],
  ['head.height', '高度', 'gāo dù', 'height'],
  ['cell.cm', '{n} 厘米', 'lí mǐ', '{n} cm'],
  ['cell.m', '{n} 米', 'mǐ', '{n} m'],
  ['tableCm', '100 张纸厚 1 厘米。算一算，表里问号处的高度是多少厘米？', 'zhāng zhǐ hòu lí mǐ suàn yi suàn biǎo lǐ wèn hào chù de gāo dù shì duō shao lí mǐ', '100 sheets of paper are 1 cm thick. Work it out: how many cm tall is the stack where the question mark is?'],
  ['tableM', '100 张纸厚 1 厘米。算一算，表里问号处的高度是多少米？', 'zhāng zhǐ hòu lí mǐ suàn yi suàn biǎo lǐ wèn hào chù de gāo dù shì duō shao mǐ', '100 sheets of paper are 1 cm thick. Work it out: how many m tall is the stack where the question mark is?'],
  [
    'everestHigh',
    '1 亿张纸摞起来大约高 10000 米，珠穆朗玛峰海拔 8800 多米。1 亿张纸摞起来比珠穆朗玛峰高，对吗？',
    'yì zhāng zhǐ luò qǐ lái dà yuē gāo mǐ zhū mù lǎng mǎ fēng hǎi bá duō mǐ yì zhāng zhǐ luò qǐ lái bǐ zhū mù lǎng mǎ fēng gāo duì ma',
    'A stack of 100 million sheets is about 10000 m tall, and Mount Qomolangma is a little over 8800 m high. The stack is taller than Mount Qomolangma. Is that right?',
  ],
  [
    'everestLow',
    '1 亿张纸摞起来大约高 10000 米，珠穆朗玛峰海拔 8800 多米。1 亿张纸摞起来比珠穆朗玛峰矮，对吗？',
    'yì zhāng zhǐ luò qǐ lái dà yuē gāo mǐ zhū mù lǎng mǎ fēng hǎi bá duō mǐ yì zhāng zhǐ luò qǐ lái bǐ zhū mù lǎng mǎ fēng ǎi duì ma',
    'A stack of 100 million sheets is about 10000 m tall, and Mount Qomolangma is a little over 8800 m high. The stack is shorter than Mount Qomolangma. Is that right?',
  ],
  ['yes', '对', 'duì', 'Right'],
  ['no', '不对', 'bú duì', 'Not right'],
]

const col = (i: 1 | 2 | 3): Record<string, string> => Object.fromEntries(ROWS.map((r) => [`m4.yi.${r[0]}`, r[i]]))
export const ZH: Dict = col(1)
export const EN: Dict = col(3)
export const PY: Record<string, string> = col(2)
