// 五下「☆ 怎样通知最快」的词条（五年级数学 F）。
// 课本是「队长」通知「15 名队员」、「每分钟通知 1 人」、「第几分钟」「新接到通知的队员数」「接到通知的队员总数」。
// 朗读避坑：「队长」「组长」「多长时间」的「长」不出——换成「老师」通知「同学」、「几分钟」；不写「应急」（应 yìng）、「一个一个地」（地）；
// 序数不用阿拉伯数字（「第 4 分钟」读不好）——问表里的问号、「几分钟后」「最后这 1 分钟里」。表里的字不朗读。
import type { Dict } from '@/engine/i18n'

export const ZH: Dict = {
  'm5.notify.yes': '对',
  'm5.notify.no': '不对',
  'm5.notify.one.q': '老师要通知 {n} 名同学，每分钟只能通知 1 人。如果只有老师一个人通知，要几分钟？',
  'm5.notify.group.q': '{n} 名同学分成 {k} 组，每组 {s} 人，每分钟只能通知 1 人。老师先通知每组的 1 名同学，他们再同时通知本组的其他人。一共要几分钟？',
  'm5.notify.more.j': '{n} 名同学分组通知：分成 {a} 组要 {x} 分钟，分成 {b} 组要 {y} 分钟。分的组越多，用的时间就越少，对吗？',
  'm5.notify.fast.q': '老师要通知 {n} 名同学，每分钟只能通知 1 人。下面哪种方法最快？',
  'm5.notify.way.one': '老师一个人通知所有同学',
  'm5.notify.way.group': '分成 {k} 组通知',
  'm5.notify.way.all': '接到通知的同学都去通知别人',
  'm5.notify.rule': '老师和接到通知的同学都一直去通知别人，每人每分钟通知 1 人。',
  'm5.notify.table.q': '表里的问号处应该填几？',
  'm5.notify.th.minute': '第几分钟',
  'm5.notify.th.new': '新接到通知的人数',
  'm5.notify.th.total': '接到通知的总人数',
  'm5.notify.tree.total': '圈里的数是第几分钟接到通知的。{t} 分钟后，一共有几名同学接到了通知？',
  'm5.notify.tree.new': '圈里的数是第几分钟接到通知的。最后这 1 分钟里，新接到通知的有几名同学？',
  'm5.notify.full.q': '照这样通知 {n} 名同学，最少要几分钟？',
  'm5.notify.most.q': '照这样通知，{t} 分钟最多可以通知多少名同学？',
}

export const EN: Dict = {
  'm5.notify.yes': 'Right',
  'm5.notify.no': 'Not right',
  'm5.notify.one.q': 'The teacher must tell {n} pupils a message, one person per minute. If only the teacher passes it on, how many minutes does it take?',
  'm5.notify.group.q': '{n} pupils are split into {k} groups of {s}, and only one person can be told per minute. The teacher first tells 1 pupil in each group, then they tell the others in their groups at the same time. How many minutes does it take in all?',
  'm5.notify.more.j': '{n} pupils are told in groups: {a} groups take {x} minutes and {b} groups take {y} minutes. The more groups, the less time it takes. Is that right?',
  'm5.notify.fast.q': 'The teacher must tell {n} pupils a message, one person per minute. Which way is the fastest?',
  'm5.notify.way.one': 'The teacher tells everyone alone',
  'm5.notify.way.group': 'Tell them in {k} groups',
  'm5.notify.way.all': 'Everyone who hears it tells others',
  'm5.notify.rule': 'The teacher and every pupil who has heard the message keep telling others, one person per minute each.',
  'm5.notify.table.q': 'What goes where the question mark is in the table?',
  'm5.notify.th.minute': 'minute',
  'm5.notify.th.new': 'newly told',
  'm5.notify.th.total': 'told in all',
  'm5.notify.tree.total': 'The number in each circle is the minute that pupil was told. After {t} minutes, how many pupils have been told?',
  'm5.notify.tree.new': 'The number in each circle is the minute that pupil was told. How many pupils were newly told in the last minute?',
  'm5.notify.full.q': 'Passing the message this way, at least how many minutes does it take to tell {n} pupils?',
  'm5.notify.most.q': 'Passing the message this way, at most how many pupils can be told in {t} minutes?',
}

export const PY: Record<string, string> = {
  'm5.notify.yes': 'duì',
  'm5.notify.no': 'bú duì',
  'm5.notify.one.q': 'lǎo shī yào tōng zhī míng tóng xué měi fēn zhōng zhǐ néng tōng zhī rén rú guǒ zhǐ yǒu lǎo shī yí gè rén tōng zhī yào jǐ fēn zhōng',
  'm5.notify.group.q':
    'míng tóng xué fēn chéng zǔ měi zǔ rén měi fēn zhōng zhǐ néng tōng zhī rén lǎo shī xiān tōng zhī měi zǔ de míng tóng xué tā men zài tóng shí tōng zhī běn zǔ de qí tā rén yí gòng yào jǐ fēn zhōng',
  'm5.notify.more.j': 'míng tóng xué fēn zǔ tōng zhī fēn chéng zǔ yào fēn zhōng fēn chéng zǔ yào fēn zhōng fēn de zǔ yuè duō yòng de shí jiān jiù yuè shǎo duì ma',
  'm5.notify.fast.q': 'lǎo shī yào tōng zhī míng tóng xué měi fēn zhōng zhǐ néng tōng zhī rén xià miàn nǎ zhǒng fāng fǎ zuì kuài',
  'm5.notify.way.one': 'lǎo shī yí gè rén tōng zhī suǒ yǒu tóng xué',
  'm5.notify.way.group': 'fēn chéng zǔ tōng zhī',
  'm5.notify.way.all': 'jiē dào tōng zhī de tóng xué dōu qù tōng zhī bié rén',
  'm5.notify.rule': 'lǎo shī hé jiē dào tōng zhī de tóng xué dōu yì zhí qù tōng zhī bié rén měi rén měi fēn zhōng tōng zhī rén',
  'm5.notify.table.q': 'biǎo lǐ de wèn hào chù yīng gāi tián jǐ',
  'm5.notify.th.minute': 'dì jǐ fēn zhōng',
  'm5.notify.th.new': 'xīn jiē dào tōng zhī de rén shù',
  'm5.notify.th.total': 'jiē dào tōng zhī de zǒng rén shù',
  'm5.notify.tree.total': 'quān lǐ de shù shì dì jǐ fēn zhōng jiē dào tōng zhī de fēn zhōng hòu yí gòng yǒu jǐ míng tóng xué jiē dào le tōng zhī',
  'm5.notify.tree.new': 'quān lǐ de shù shì dì jǐ fēn zhōng jiē dào tōng zhī de zuì hòu zhè fēn zhōng lǐ xīn jiē dào tōng zhī de yǒu jǐ míng tóng xué',
  'm5.notify.full.q': 'zhào zhè yàng tōng zhī míng tóng xué zuì shǎo yào jǐ fēn zhōng',
  'm5.notify.most.q': 'zhào zhè yàng tōng zhī fēn zhōng zuì duō kě yǐ tōng zhī duō shao míng tóng xué',
}
