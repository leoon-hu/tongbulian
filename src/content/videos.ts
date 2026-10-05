// 知识点 → 国家中小学智慧教育平台上的课程视频（地图上「▶ 视频」链接，需求 F2）。scripts/videos.mjs 生成的，别手改。
// 两张表里都没有的知识点（平台上新旧教材都没有这一节的视频）地图上不显示链接。

/** 新教材这一节的同步课：知识点 → 课时 id（注释是平台上的章节名） */
export const VIDEO_LESSONS: Readonly<Record<string, string>> = {
  's1-00-count': 'a817b06d-5d49-e59f-1bff-354e28f85d6e', // 在校园里找一找
  's1-00-compare': 'f4ef48f1-2f0b-60e2-f3f8-fca9877dca02', // 在操场上玩一玩
  's1-00-position': 'ac17e8bb-f3f7-7889-4aca-e61e3981131e', // 在教室里玩一玩
  's1-01-num-5': 'fa3a9a7c-9085-519a-e9cb-4c8c1f3761dc', // 1～5的认识
  's1-01-ordinal': 'd2745ed6-8864-3057-730f-a6eba6c195ce', // 第几
  's1-01-compose-5': '67c1abcf-6491-9cc7-f60c-5d59b15d5584', // 分与合
  's1-01-addsub-5': 'b6453fac-23c2-234a-a5a2-9331715f1d62', // 1～5的加、减法（加法）
  's1-02-num-10': '179006a9-05e3-4549-31ff-15b176050f6d', // 6～9的认识
  's1-02-compose-10': 'f72b75e0-613b-fb2b-3742-42dc27855511', // 6、7的组成
  's1-02-addsub-10': 'c7ae2fa4-bf3c-37e5-d361-56797379f516', // 6和7的加、减法
  's1-02-mixed': 'c947da10-5804-f38f-48f6-601310ed421d', // 连加、连减 加、减混合
  's1-03-solid-shapes': '4a0b4e6f-48d6-6653-351a-e295bb64b8fe', // 三 认识立体图形
  's1-04-num-20': '359c7317-335c-2f30-a5bc-6f6b71e3a172', // 11～20 的认识
  's1-04-simple-addsub': 'f79b6ffa-a492-c96a-5cfa-e75d5021989e', // 简单加、减法
  's1-05-carry-add': '5eb2ceed-819e-0017-0e1c-bbb060b74c4b', // 9加几
  's1-05-add-876': 'dce4f148-d4da-cc78-ce7c-10a841a3ac80', // 8、7、6 加几
  's1-05-add-5432': '397ffa22-57f5-5c9e-f75a-69e95c2c73ce', // 5、4、3、2 加几
  's2-01-flat-shapes': '86bdd6c7-ad71-d131-1019-173a9ac88e76', // 一、认识平面图形
  's2-02-borrow-sub': '4a3fa8a5-dfa4-ead7-6f2e-a65ca29840c5', // 十几减9
  's2-02-sub-876': 'fcaa4a75-5a56-9dea-6db9-6c173b3ad168', // 十几减8、7、6
  's2-02-sub-5432': '3bdb2177-6515-2e62-a6b8-b15b8a9c6ac9', // 十几减5、4、3、2
  's2-03-num-100': '5800cc87-943f-9517-e536-ea375588fa4f', // 数数、数的组成-不超过100的数数、数的组成
  's2-03-compare-100': '2dcdc27a-6ac2-09b7-fea8-218dab100586', // 数的顺序
  's2-03-tens-addsub': 'e6f26aa6-80a3-ded7-bd04-e61a5282e916', // 100以内简单的加、减法（整十数加减整十数、整十数加一位数和相应的减法）
  's2-04-oral-add': '2c31deaf-01fd-3df9-2d3b-258a91ab629a', // 口算加法-两位数加一位数和整十数（不进位）
  's2-04-oral-sub': '76f1acd4-1865-08ef-90a2-8c3561d32249', // 口算减法-两位数减一位数和整十数（不退位）
  's2-05-written-add': '766388da-630c-44bc-dbc4-c644f6eef097', // 笔算加法
  's2-05-written-sub': '7a1e2578-2993-8f1a-53fe-b6ccf1d90ebe', // 笔算减法
  's2-06-diff': '78c27027-4dd1-8795-27ab-0aa24483193f', // 解决求两数相差几的实际问题
  's2-06-more-less': 'fc8b94a3-5a69-c42b-ea8e-ff4274f77f41', // 求比一个数多（或少）几的数是多少
  's2-07-money': 'fae1e2f3-6061-06f9-4984-269d404d79fb', // 认识人民币-认一认、换一换
  'm2s1-01-sorting': '87a8b820-1919-ddb5-0251-a7a4dd8fcba9', // 按给定标准分类
  'm2s1-02-mult-intro': 'd02f9081-9bbc-91cb-7efb-45eefc6c6fd0', // 乘法的初步认识 例1
  'm2s1-02-table-6': 'dbe19f32-6ae6-1b9f-1789-fa8f66c84243', // 5的乘法口诀
  'm2s1-02-mult-addsub': 'b222f4eb-6636-01d1-4d15-10c8e4846af1', // 乘加、乘减
  'm2s1-02-mult-solve': 'a5d6c729-067d-c407-d60d-1f8e4c385279', // 选择一种运算解决问题
  'm2s1-03-share': '5a4687a9-f182-67e7-57b4-95a07db99273', // 平均分——包含
  'm2s1-03-div-parts': '41bf667e-60ac-7ada-dd9e-d4365a34c744', // 除法（包含）及算式读法
  'm2s1-03-div-6': 'd4b23915-ae86-f075-1151-46e8a1793f41', // 用2～6的乘法口诀求商（1）
  'm2s1-03-div-solve': '0df21b1d-76aa-35f7-3abd-36b518b49ab1', // 除法的基本应用
  'm2s1-04-directions': '6171356e-060c-a1f4-9596-cbe2d26867a8', // 认识东、南、西、北
  'm2s1-04-tour': 'bae319ef-8c2c-6c1b-e2fe-af3de2b4d3a1', // 设计导游路线
  'm2s1-05-cm-m': '8ac2c9a6-3007-76ee-0100-92de018ead73', // 认识米及用米量
  'm2s1-05-measure': 'ccd74ba3-0825-f7b8-d764-e29428eb72dc', // 认识厘米及用厘米量
  'm2s1-05-segment': 'e2d61fde-d303-e19f-30a0-46ce56f36da8', // 认识线段
  'm2s1-06-table-9': 'dbe19f32-6ae6-1b9f-1789-fa8f66c84243', // 5的乘法口诀
  'm2s1-06-div-9': '01d57eb9-5dd2-b893-9b9c-33e45020f7d8', // 用7、8的乘法口诀求商
  'm2s1-06-two-questions': '41a29b88-204f-0f7d-2a36-a986c8f4bfa1', // 解决连续两问的问题
  'm2s2-01-clock-hour': '41385d29-0e12-d366-f86d-9eabd3ccb64c', // 认识时间
  'm2s2-01-time-read': '41385d29-0e12-d366-f86d-9eabd3ccb64c', // 认识时间
  'm2s2-01-time-calc': '41385d29-0e12-d366-f86d-9eabd3ccb64c', // 认识时间
  'm2s2-01-time-story': 'c0f99fb1-59bd-0905-1f33-65158f8ad07e', // 我与时间的故事
  'm2s2-02-remainder': 'a0a102b1-863f-8f80-bb86-35f8a8363cd5', // 有余数的除法及余数的含义
  'm2s2-02-rem-calc': '9782a933-6a60-8dee-5c85-b88be5d9c2c6', // 除法竖式及各部分名称
  'm2s2-02-rem-solve': '54438a6e-c4cd-26d5-b27b-7f2c2110fd6c', // 用“进一法”或“去尾法”解决问题
  'm2s2-03-times': '65567664-b4c9-7a4b-2767-77ae191c7147', // 数量间的乘除关系、倍的认识
  'm2s2-03-mul-div-solve': '9c5cf18d-65be-897f-6bc5-e8bd0f2c60fb', // 连续两问的实际问题
  'm2s2-04-num-1000': '06172958-3ae5-1217-85fb-c21835a24820', // 认识几百几十几的数
  'm2s2-04-num-10000': 'c73bf568-6616-ea1d-d6cf-7e712eb9f833', // 认识几千几百几十几的数
  'm2s2-04-compare': '82ea1a57-8fea-114d-84d5-b6f65303fb0a', // 万以内数的大小比较
  'm2s2-04-round-addsub': '8f0e5cfb-1cc1-f58a-f56d-4d217d4bd31e', // 万以内的简单加、减法
  'm2s2-05-add': '4df37155-46c1-537e-5c8e-31b91e3962e0', // 万以内的加法（一次进位）
  'm2s2-05-sub': '9549f62b-7568-4b0b-fc04-ee18366c19f4', // 万以内的减法（一次退位、连续退位）
  'm2s2-05-relations': 'a40add63-9986-3d45-e531-10a13d57a900', // 加、减法的意义及加法各部分间的关系
  'm3s1-01-views': '3a71b671-2ab3-920e-1ea7-ceb797aa32a3', // 观察简单的立体积木
  'm3s1-01-guess': 'caa07407-7aa0-a808-5782-ebda16345229', // 根据直观图猜测积木形状
  'm3s1-01-unfold': '0d849f56-b6d8-c5f6-5dc9-1385c8ad2ed7', // 长方体纸盒的展开
  'm3s1-02-in-order': 'beeb5a1c-c268-7aee-8964-e6ad52d52fd5', // 同级运算
  'm3s1-02-mul-first': '795d62e7-74cd-4318-d49e-dea20216636d', // 两级运算
  'm3s1-02-parens': '76314b78-41b1-04c9-2e4f-5def04e5bf56', // 含有小括号的两级运算
  'm3s1-02-steps': 'b7c07872-80fd-3193-5e54-7de226c0d280', // 解决问题(两级计算)
  'm3s1-03-mm-dm': '00b449df-086e-2d5d-49f8-564be6196f15', // 毫米的认识
  'm3s1-03-km': '22702544-f090-86ce-dbd5-fc2241f3041b', // 干米的认识及单位换算
  'm3s1-03-choose-unit': '1581a706-63ac-322a-d7bf-079275e45a23', // 问题解决（估测距离）
  'm3s1-03-convert': '72e98438-ec47-e585-d7af-8c6a6595a38d', // 分米的认识及单位换算
  'm3s1-04-mass-units': 'f9bd2529-b44e-0406-df57-53e858a510a7', // 认识质量单位
  'm3s1-04-weighing': '0a465815-7203-0c7c-fd90-59e7ee01c5a5', // 称重我很行
  'm3s1-05-oral-mul': '7d54be2f-2ddf-2422-42bf-a4fece6902ce', // 口算乘法
  'm3s1-05-written-mul': '1946cec5-ab9f-502a-b9a6-629dd3c43e34', // 笔算乘法(不进位)
  'm3s1-05-zero-mul': 'c3804eae-3108-a371-9174-38dcd495bc98', // 笔算乘法(0的乘法)
  'm3s1-05-estimate': '2ede56f5-0412-6616-3e89-eef393a13d4e', // 乘法估算
  'm3s1-06-digit-code': '475e83c2-a2b0-910d-40b5-454933729fb7', // 认识数字编码
  'm3s1-07-lines': 'd2141786-bdc9-0eab-0abd-c9cd7d199e4d', // 线段、射线、直线的概念
  'm3s1-07-angles': '3a2e2aa6-8b39-12c7-10f4-9693903b063c', // 角的认识
  'm3s1-07-angle-kinds': 'cebf4b75-f5f4-3fe8-6ae6-4ecfbe82a37c', // 直角、锐角、钝角
  'm3s1-08-unit-frac': '8c84a565-624e-1d17-a7c5-94bfdfacaf3d', // 认识几分之一
  'm3s1-08-frac': 'faaae238-46dc-ae5b-fd00-eb7d87d0f729', // 认识几分之几
  'm3s1-08-frac-calc': '4a99d765-ad89-fde5-2d1e-8bf0f519e07d', // 同分母分数的加减法
  'm3s1-08-frac-of-set': '16e046a5-6d9b-faa4-c47e-b4c1bf31f2d3', // 进一步认识分数
  'm3s2-01-symmetry': '0d08182c-2621-fffe-0e75-10c2c37b7308', // 对称
  'm3s2-01-translate': 'a2889266-d9ab-f013-093f-9d5266539266', // 平移
  'm3s2-01-rotate': '33c73a8e-771c-b337-5991-a64819ef2756', // 旋转
  'm3s2-02-oral': '26662dec-139c-6420-5a03-4a86b78129fd', // 口算除法
  'm3s2-02-written': '71cc59b7-8f79-2c2e-544c-e09f9f5039ee', // 一位数除两位数
  'm3s2-02-zeros': '1fd907e1-ad2a-d121-cdbb-eb8274dd153d', // 商中间有0的除法
  'm3s2-02-solve': '29a8f6c0-3ef2-b371-926f-30763aaa85e6', // 解决问题（连乘）
  'm3s2-03-polygons': 'd9f62162-baa2-f889-e581-7b1fb1e7bc80', // 多边形的认识
  'm3s2-03-perimeter': '12fadb80-b9a2-eb5e-eca7-802bb60010f9', // 认识周长
  'm3s2-03-puzzle': '1e558419-73dc-32a2-26a6-ef920ed899b4', // 拼图游戏
  'm3s2-04-area-units': '79c0917c-42d4-7b90-81f4-dcf110f974e2', // 面积的概念
  'm3s2-04-rect-area': '51a6d7d7-4161-b577-434b-b38fadfe8b29', // 长方形和正方形的面积计算
  'm3s2-04-area-convert': '701a8905-0591-9b63-7ffa-a1995515c1ed', // 面积单位间的进率
  'm3s2-05-record': '1f75655f-6802-f826-ba84-c0f2dd2a16d2', // 收集并记录数据
  'm3s2-05-table': '1fd3f1b9-c3e5-2809-d4d8-a9142ce255ac', // 复式统计表
  'm3s2-05-segments': 'f4696011-84b4-3709-ab85-5f7c6e787364', // 分段整理数据
  'm3s2-06-calendar': '8782e290-23b3-6f4d-bf25-20fffa86e866', // 年历中的秘密
  'm3s2-06-24h': 'ecb09ca9-0a9d-a7e5-5d6d-b475ee120fe7', // 作息时间表中的秘密
  'm3s2-07-know': 'eb322005-a619-2aba-6805-155ae2bcb28b', // 认识小数
  'm3s2-07-compare': 'cef1ea10-9479-65d0-8532-6b89e57d2bf6', // 小数的大小比较
  'm3s2-07-addsub': '27ee170e-8a71-6180-76dd-f9127c31b9c8', // 简单的小数加、减法
  'c1s1-01-tiandiren': '8b8984a0-3ad9-3183-8250-9dd550069836', // 1 天地人
  'c1s1-01-jinmu': 'f7ba363a-5941-06f0-3300-7972d3fee8d1', // 2 金木水火土
  'c1s1-01-kouer': '8ecbb01e-3df7-91b1-dcaf-5755dd305690', // 3 口耳目手足
  'c1s1-01-riyue': '80ea7a2e-8039-0aaa-8261-1c447db22a2f', // 4 日月山川
  'c1s1-01-garden': 'c798d23f-3927-56a5-30fd-61f148ba57ad', // 语文园地一
  'c1s1-02-aoe': 'f9d66476-070d-3a58-bdc1-438dae46c1ad', // 1 ɑ o e
  'c1s1-02-iuv': '808ccc6b-8ff6-947d-6620-8537c6af1ea2', // 2 i u ü
  'c1s1-02-bpmf': '03c7dc58-eb31-591e-6e2f-099dc79ea29c', // 3 b p m f
  'c1s1-02-dtnl': '87a75b00-0350-fd8b-44b8-53d7b2b7ca24', // 4 d t n l
  'c1s1-02-garden': 'ebda167b-34fa-6d9b-79aa-03972a06be00', // 语文园地二
  'c1s1-03-gkh': 'bb6d987d-15f1-d39d-804b-945f07946b27', // 5 g k h
  'c1s1-03-jqx': 'a356ebce-2c4b-0749-e19f-725e879ed031', // 6 j q x
  'c1s1-03-zcs': 'fe656e73-5d11-127c-549d-5984394dc39f', // 7 z c s
  'c1s1-03-zhchshr': '56081abd-f089-55e5-011a-e642071d3c24', // 8 zh ch sh r
  'c1s1-03-yw': 'b9847c90-ab5e-aab0-b2d6-1bd0447b3856', // 9 y w
  'c1s1-03-garden': '9fc7a46d-b75d-09af-ae73-bf88bccef30a', // 语文园地三
  'c1s1-04-aieiui': '0238806a-8a99-95c1-9daa-f672ca6eec5f', // 10 ɑi ei ui
  'c1s1-04-aoouiu': 'b168fb4e-9d7e-0342-4054-b385e066f93b', // 11 ɑo ou iu
  'c1s1-04-ieveer': '52cde12c-efe2-64c6-30c5-c01f21588d81', // 12 ie üe er
  'c1s1-04-anen': '7061ece5-720e-58ee-6db9-40bdd39bff1d', // 13 ɑn en in un ün
  'c1s1-04-angeng': '387b9b69-1c01-efe7-1fe1-5aa3a62ec941', // 14 ɑng eng ing ong
  'c1s1-04-garden': '7ea1267d-438d-45e0-da43-983133551455', // 语文园地四
  'c1s1-05-qiutian': '17aa0fa6-34bf-96f6-30c9-f2b5cdf36268', // 1 秋天
  'c1s1-05-jiangnan': '6bf70b14-f2b8-9f84-f9e5-25ae0fd75e0f', // 2 江南
  'c1s1-05-huajia': '5ef14afa-61cd-4d4f-ebb7-03b539e58111', // 3 雪地里的小画家
  'c1s1-05-siji': '22cf63b4-baa8-311b-e89b-c506041d1d90', // 4 四季
  'c1s1-05-garden': 'a8c4f5e3-2a95-cda5-17db-7f4d85aed907', // 语文园地五
  'c1s1-06-duiyun': '6266927c-0db1-4ac6-92aa-d48b54cfea79', // 5 对韵歌
  'c1s1-06-riyueming': '99a4fc10-bef9-bccb-879c-5a0141583ba2', // 6 日月明
  'c1s1-06-shubao': '24e5dc7d-18e4-c467-0fbd-08834987e3e9', // 7 小书包
  'c1s1-06-guoqi': 'f19cbcda-daab-5feb-4bae-637190a61613', // 8 升国旗
  'c1s1-06-garden': '6de12852-0db7-7930-4068-f24663515212', // 语文园地六
  'c1s1-07-chuan': '8be2c20f-a4f7-fb74-2f9b-75ed0a1e41eb', // 5 小小的船
  'c1s1-07-yingzi': '35a76a02-928d-03cf-5a05-d82aa3b052e6', // 6 影子
  'c1s1-07-liangjianbao': 'db931197-5b6c-2341-aaaa-5b4b5e40cd10', // 7 两件宝
  'c1s1-07-garden': 'ab5a74a6-665c-71d1-93b1-a2998269ddf6', // 语文园地七
  'c1s1-08-weiba': '95a8d20c-c13a-2634-6b85-f19d0712b0cb', // 8 比尾巴
  'c1s1-08-wuya': '9323ce42-0b86-5891-da1e-592a298dc972', // 9 乌鸦喝水
  'c1s1-08-yudian': '678d6b36-2fbf-613c-3f2b-c261efd98000', // 10 雨点儿
  'c1s1-08-garden': 'cabf5b7b-37a3-f6ca-2b11-4b8c398f9fdb', // 语文园地八
  'c1s2-01-chunxia': '548354cb-8258-f7c1-c60d-3859ba27823c', // 1 春夏秋冬
  'c1s2-01-xingshi': 'f6e729e7-7e2f-94ac-40cf-1fdbc763ce5f', // 2 姓氏歌
  'c1s2-01-qingwa': 'b59d84fa-5be1-cb0a-b312-8c60e37305e9', // 3 小青蛙
  'c1s2-01-caizimi': '41fdef50-5b81-6403-1749-2f2969a119d4', // 4 猜字谜
  'c1s2-01-garden': '5e8ed182-6f02-9fe1-5366-30d8de6160d9', // 语文园地一
  'c1s2-02-dang': '1a74fd8c-40c0-c0fd-87ca-5b458e4ea30f', // 1 热爱中国共产党
  'c1s2-02-wajing': 'c1a85b7f-0f1c-7f2f-9fca-2e349c4051d7', // 2 吃水不忘挖井人
  'c1s2-02-kankan': 'cb8f590c-7cb4-3367-e22c-a6e7c57ac0ab', // 3 我多想去看看
  'c1s2-02-garden': '89d7abd2-4127-08dc-95d3-e1b81d190175', // 语文园地二
  'c1s2-03-gongji': '957c4b0e-9764-4da2-726f-334250385ce6', // 4 小公鸡和小鸭子
  'c1s2-03-xique': '4c7b856e-89b3-fa70-3591-d68b3c1988ff', // 5 树和喜鹊
  'c1s2-03-kuaile': 'e1eb694a-5bd4-a197-ba4e-6c7e9db12590', // 6 怎么都快乐
  'c1s2-03-garden': 'a0e46919-3db3-5886-019f-28a7e151ad1a', // 语文园地三
  'c1s2-04-jingyesi': '9cb86eca-7b94-0314-03c2-2011b26f7aea', // 7 静夜思
  'c1s2-04-yese': 'd3badd36-cc32-ccf2-4513-f1a68fc81d89', // 8 夜色
  'c1s2-04-zongzi': 'f4520fe2-0b79-ecd4-acbd-f093cc5fe6af', // 9 端午粽
  'c1s2-04-garden': 'd17c5a2c-5653-9263-ac3d-fb64f9120ee6', // 语文园地四
  'c1s2-05-dongwu': '32fdb62d-81b4-b885-0c36-74a1a1669d03', // 5 动物儿歌
  'c1s2-05-guduijin': '8611f0db-7ff0-c98b-4031-2cc0ded0f712', // 6 古对今
  'c1s2-05-caochang': '314c137c-65a4-77c5-6b46-0ce0a3f4c15f', // 7 操场上
  'c1s2-05-renzhichu': 'e857d969-73de-70ec-7a68-15192bf9561d', // 8 人之初
  'c1s2-05-garden': '3558dddc-1894-a00d-66d8-d2c9d808705c', // 语文园地五
  'c1s2-06-gushi': 'cf199129-93a8-8fe2-006c-d697783b1605', // 10 古诗二首
  'c1s2-06-langhua': 'cb67b0c5-547f-92a8-0f7f-8138fcc5d102', // 11 浪花
  'c1s2-06-heye': '686bf53d-5c50-ccff-409b-165422a791ff', // 12 荷叶圆圆
  'c1s2-06-xiayu': '1b267355-19ec-71c7-22d9-8295a502d36d', // 13 要下雨了
  'c1s2-06-garden': '608ceb02-c51a-5c98-3dcb-74039cd2d110', // 语文园地六
  'c1s2-07-wenju': '27357d21-7191-e952-7b90-5723f16f7311', // 14 文具的家
  'c1s2-07-yifenzhong': '288ece00-8504-5372-cee8-8fe52bf117d7', // 15 一分钟
  'c1s2-07-dahui': 'c407dc97-664e-ce5d-5bd3-42fc5284d42f', // 16 动物王国开大会
  'c1s2-07-xiaohouzi': '8c2ab205-365e-a27c-8daa-68dbdc15e7fa', // 17 小猴子下山
  'c1s2-07-garden': 'c99e5e56-04d2-2a43-5072-1728c9ac909a', // 语文园地七
  'c1s2-08-mianhua': '7176c83f-11b1-a628-ab58-4f6d14d23fd2', // 18 棉花姑娘
  'c1s2-08-gudong': '335e4e77-987d-1797-25bb-c25e46f221e3', // 19 咕咚
  'c1s2-08-bihu': 'be7bd7fa-41d6-1966-b346-0445329de4af', // 20 小壁虎借尾巴
  'c1s2-08-garden': '7f42b55d-85a2-faa6-3eda-2e675f17776f', // 语文园地八
  'c2s1-01-kedou': 'dbe76153-fcd0-a19b-f0a6-6c97818f4d66', // 1 小蝌蚪找妈妈
  'c2s1-01-woshi': '92e99e4d-4a30-0d9f-b869-3538b301f1d4', // 2 我是什么
  'c2s1-01-zhiwu': '1a2017e5-d513-2ab0-5ce5-0498d8104468', // 3 植物妈妈有办法
  'c2s1-01-garden': '0a89aebe-5f3d-5db6-0efc-2e7ef9eec92d', // 语文园地一
  'c2s1-02-changjing': '0f505369-b470-91e0-6501-2846bfecdf79', // 1 场景歌
  'c2s1-02-shuzhi': '74589b7c-ad49-fa85-965a-7d2db7753445', // 2 树之歌
  'c2s1-02-paishou': 'ba233874-910c-b224-48ff-5c618714285e', // 3 拍手歌
  'c2s1-02-tianjia': 'aa88439d-4f27-e3d2-fd60-0f67b1029e8d', // 4 田家四季歌
  'c2s1-02-garden': 'bb69c166-bfa8-b608-712d-9d4d47ab6e3c', // 语文园地二
  'c2s1-03-caihong': 'd953c5d5-958b-fbcb-f966-9200f2a9d78b', // 4 彩虹
  'c2s1-03-waipo': '7b8e29b9-b464-14fe-5a2f-cef60f7abd9a', // 5 去外婆家
  'c2s1-03-shuxing': 'a65b48a3-ff48-bfbd-306f-a29c0014212b', // 6 数星星的孩子
  'c2s1-03-garden': '268227a8-dd4d-1740-a3ac-15c87ece5c70', // 语文园地三
  'c2s1-04-gushi': 'a06bdf41-1b8c-397b-5a20-f5f00d2950c3', // 7 古诗二首
  'c2s1-04-huangshan': 'd84a200e-e365-5c60-a942-7178610712c3', // 8 黄山奇石
  'c2s1-04-riyuetan': '35bdc985-64b1-feb0-d6ae-f104ce43e650', // 9 日月潭
  'c2s1-04-putaogou': '40cfa619-afa6-462e-1dd2-6062f236fc81', // 10 葡萄沟
  'c2s1-04-garden': '6c0fc5c3-2a73-bc12-372b-565f7250be25', // 语文园地四
  'c2s1-05-zuojing': 'f676ca97-e41a-be13-8f96-6763ec8d4fa8', // 11 坐井观天
  'c2s1-05-hanhao': 'fd810f83-c252-c472-223f-9422091304e1', // 12 寒号鸟
  'c2s1-05-hulu': '7941404e-9731-2402-de1f-41f4c4f916da', // 13 我要的是葫芦
  'c2s1-05-garden': 'cf4600e0-7820-6017-723d-07b9abe4800f', // 语文园地五
  'c2s1-06-bajiaolou': '9eec8954-0b33-abed-44b7-e6daf9a17d34', // 14 八角楼上
  'c2s1-06-biandan': 'adaab60c-5681-f909-f6a3-7b4ca9438156', // 15 朱德的扁担
  'c2s1-06-poshui': '9e7d5bd1-1a06-75e0-2841-1f4d1fb6f2e3', // 16 难忘的泼水节
  'c2s1-06-liuhulan': '3b7d167e-765d-a704-4412-2bbe7ecd77cd', // 17 刘胡兰
  'c2s1-06-garden': 'd2b1d4ec-2382-9e5a-2434-8b057a934fa1', // 语文园地六
  'c2s1-07-gushi': 'd86bf7ac-fdcb-0484-8976-3ab563585d1a', // 18 古诗二首
  'c2s1-07-wu': '12c08b34-3305-bb25-6057-625b8f591d24', // 19 雾在哪里
  'c2s1-07-xuehaizi': '6f4c2c16-adae-18d8-16b9-67982b4ac2b2', // 20 雪孩子
  'c2s1-07-garden': 'a42c6e7d-1e08-34dd-ceb7-f885770d6aad', // 语文园地七
  'c2s1-08-chengzan': 'c14733c8-37c7-e92c-2847-3136ca227439', // 21 称赞
  'c2s1-08-zhichuan': 'a918f32c-ee36-690c-365b-519e1ca9ad2a', // 22 纸船和风筝
  'c2s1-08-xiaohe': '080688fc-d84e-7086-99fe-f422e103b049', // 23 快乐的小河
  'c2s1-08-garden': '2c6e7301-6148-23a0-7361-7c9ebb00fc83', // 语文园地八
  'c2s2-01-gushi': '072e5e98-27db-04a9-0f10-34e52ac40de8', // 1 古诗二首
  'c2s2-01-chuntian': '3123ab77-05a3-cb8b-cecd-1eafd29bfe24', // 2 找春天
  'c2s2-01-xiaolu': 'b305f9be-e0a5-b2fe-07ee-2345f074d9eb', // 3 开满鲜花的小路
  'c2s2-01-zhishu': '518048f0-c1f4-e79e-67e0-65d99365be54', // 4 邓小平爷爷植树
  'c2s2-02-leifeng': 'e110dbfc-3abd-6dbe-f84f-7664cc4a2f71', // 5 雷锋叔叔，你在哪里
  'c2s2-02-qianrengao': 'f32a82be-547d-8fb6-5568-b94b8552bb16', // 6 千人糕
  'c2s2-02-ruoxiao': 'fb80174d-4f37-7579-0b52-5f788fa3e9d7', // 7 我不是最弱小的
  'c2s2-03-shenzhou': '9938d8a1-3819-95bb-462b-d75ba3a2d03d', // 1 神州谣
  'c2s2-03-jieri': '21efec50-1fb7-824a-87e1-bebb38ad225d', // 2 传统节日
  'c2s2-03-bei': 'de17f654-9e6b-8d1a-78c8-e2dd1d30cf34', // 3 “贝”的故事
  'c2s2-03-meishi': '974fb1a2-8b45-169e-0024-ed67e4a8e32d', // 4 中国美食
  'c2s2-03-garden': '3e04fab9-0cab-10df-7a1b-86082ece4362', // 语文园地三
  'c2s2-04-caisemeng': '6ac05fcb-666e-966b-980d-4e559e63787b', // 8 彩色的梦
  'c2s2-04-yipima': '8feed116-2635-183d-85dd-fb24e846376e', // 9 一匹出色的马
  'c2s2-04-xique': '30767020-4534-e15c-8a6d-d2fa7a823665', // 10 枫树上的喜鹊
  'c2s2-04-garden': 'b66874c7-50e9-de18-fe4d-7f4b159547f9', // 语文园地四
  'c2s2-05-yuyan': 'e22d31e8-9a0b-b1b8-57e5-cb2fd213d7b3', // 11 寓言二则
  'c2s2-05-yangtao': '1a476567-5f6b-3f61-5fae-68e66ce28fcf', // 12 画杨桃
  'c2s2-05-xiaoma': '719867b0-3a54-4e97-c644-00898ba98fc7', // 13 小马过河
  'c2s2-05-garden': '7dc2e463-0924-9914-233c-dabb8b2f5d44', // 语文园地五
  'c2s2-06-gushi': 'a5c9382f-370a-400b-c970-50633bbff175', // 14 古诗二首
  'c2s2-06-leiyu': '87eb17ad-bc34-37f6-7567-f7530e3ef7bc', // 15 雷雨
  'c2s2-06-milu': '39db4550-817b-b133-5cab-b5a5bd3dab09', // 16 要是你在野外迷了路
  'c2s2-06-taikong': 'fce8438e-d08b-13a8-336c-ee819aada56f', // 17 太空生活趣事多
  'c2s2-06-garden': '6f85b1bb-5626-6428-1221-5076dcdf5720', // 语文园地六
  'c2s2-07-erduo': '9d8a5460-c50e-8ec9-9da7-151a03ce2c20', // 18 大象的耳朵
  'c2s2-07-zhizhu': '7ac3abf2-b4ad-7694-82a9-8a0341f39760', // 19 蜘蛛开店
  'c2s2-07-nitang': 'da0ca883-54e7-3d08-9a0a-fc910a00bc94', // 20 青蛙卖泥塘
  'c2s2-07-maochong': '401009ad-4ca7-d22b-a92b-0853038a3190', // 21 小毛虫
  'c2s2-07-garden': '5b5342e9-770d-75c4-c6ba-4e737d5af567', // 语文园地七
  'c2s2-08-yishe': '4e09b09b-2abc-c9e9-068c-6109d101a9da', // 22 羿射九日
  'c2s2-08-huangdi': '0c0b4114-70a5-9a4d-f120-1098085ac671', // 23 黄帝的传说
  'c2s2-08-dayu': '34415469-dcb7-3fb5-f32f-617e038474a4', // 24 大禹治水
  'c2s2-08-garden': '8172801d-cb56-78b0-7a77-bd6d371a93a7', // 语文园地八
  'c3s1-01-dashu': '95b463d2-2a14-e987-6437-394e53b15197', // 1 大青树下的小学
  'c3s1-01-huaxuexiao': '41352dca-0e4f-0b06-7132-d98f33e7b913', // 2 花的学校
  'c3s1-01-budong': 'daf6550f-a3e6-5be1-a21e-55e66e24a968', // 3* 不懂就要问
  'c3s1-01-garden': '678fd3ee-44d4-ab3a-e43a-64b34e9258f4', // 语文园地
  'c3s1-02-gushi': 'd2456be1-b25b-b957-97d5-54af93639ff0', // 4 古诗三首
  'c3s1-02-shuinidao': '8ed0fe62-4b24-6103-8736-f845a9eeda5f', // 5 铺满金色巴掌的水泥道
  'c3s1-02-qiuyu': '6f689a89-0bf9-72db-8c1c-4b33f82cbfd7', // 6 秋天的雨
  'c3s1-02-qiusheng': '544fbe5d-8f73-79cc-3c86-fc9b6ff14870', // 7* 听听，秋的声音
  'c3s1-03-laowu': '60cd35e7-8f48-0085-a887-caf94556c291', // 8 总也倒不了的老屋
  'c3s1-03-jianggui': '9ac1e93e-29ff-6adc-6566-7da9eb44f72e', // 9* 犟龟
  'c3s1-03-xiaogou': 'a3b6abd4-6483-6132-7e38-78e5954f53a9', // 10* 小狗学叫
  'c3s1-03-garden': '5e90f262-9d63-e287-5f3c-2c3a6dd97d17', // 语文园地
  'c3s1-04-baohulu': 'b6768b18-fc41-f753-95ca-a76c73f1810d', // 11 宝葫芦的秘密（节选）
  'c3s1-04-niudu': 'e0b908c6-fa9e-8e1a-2eb0-6e646212b870', // 12 在牛肚子里旅行
  'c3s1-04-nailao': '1b1a1b06-3699-7ae8-9605-5902824813ec', // 13* 一块奶酪
  'c3s1-04-garden': '74349a26-791c-a26e-fd9f-b9e488c783b8', // 语文园地
  'c3s1-05-dachuan': '834e6106-6bab-95bb-8884-eea65da82485', // 14 搭船的鸟
  'c3s1-05-caodi': '5fb656f5-9a27-411c-140b-e503c0cdb7d3', // 15 金色的草地
  'c3s1-06-xisha': 'df62121b-03bf-d934-ce54-4f5e14f8bd37', // 16 富饶的西沙群岛
  'c3s1-06-haibin': 'dbd88f17-b432-4033-749e-492b0b377f36', // 17 海滨小城
  'c3s1-06-xinganling': '2b260ac0-2f7e-f3a2-d7d6-a80d3acdb1c6', // 18 美丽的小兴安岭
  'c3s1-06-xianggang': '307d9215-fd24-ee56-d767-d91d990fbca3', // 19* 香港，璀璨的明珠
  'c3s1-07-gushi': '3caaf076-ef9b-836b-ae3d-90d43f53cb4f', // 20 古诗三首
  'c3s1-07-shengyin': '678aa9f1-f890-d19d-7be8-0a87ac85aa6a', // 21 大自然的声音
  'c3s1-07-dashu': '184dc912-fb49-3a22-f92d-289afb834029', // 22 读不完的大书
  'c3s1-08-simaguang': '634be751-3fa8-8700-e179-c94734477c3f', // 23 司马光
  'c3s1-08-zhengqi': 'e04d37e3-1680-4b15-5012-1313ea56678a', // 24 一定要争气
  'c3s1-08-shoushutai': 'aa94b3a1-a787-e651-b20e-e80a8e9eca94', // 25 手术台就是阵地
  'c3s1-08-ciwan': '33b7b256-446c-1f2e-3775-6de71bcb3d0a', // 26* 一个粗瓷大碗
  'c3s2-01-gushi': 'b1200339-b030-8f7d-0ae6-8d2c327ac9be', // 1 古诗三首
  'c3s2-01-yanzi': 'b27fb3a9-3980-ddda-69a4-81360d1b3168', // 2 燕子
  'c3s2-01-hehua': 'c1d3d8c0-493c-e505-08f1-78fa6452a9ab', // 3 荷花
  'c3s2-01-kunchong': '69bbad08-8cff-266a-7a94-1fb9fb93e951', // 4* 昆虫备忘录
  'c3s2-02-shouzhu': '5dd0e819-45e4-a326-7b11-6734fe1bc8e4', // 5 守株待兔
  'c3s2-02-lang': '6ca0046b-b28c-4740-8981-b57e00fda5d2', // 6 会摇尾巴的狼
  'c3s2-02-lujiao': '608d6ee0-e62a-7333-b11b-629792693fec', // 7 鹿角和鹿腿
  'c3s2-02-chizi': 'ed7f6544-9f09-604c-b22a-ecb3e53e9549', // 8* 池子与河流
  'c3s2-02-garden': 'e5636f8d-bbd8-3456-c5b3-67bb2b91fb10', // 语文园地
  'c3s2-03-haidi': '570694d5-441b-7449-81cd-3f15e4fb3d6c', // 9 海底世界
  'c3s2-03-shifeng': 'fddcebd8-87fa-be7c-bcd9-aec2b8da9211', // 10 石蜂
  'c3s2-03-xiaoxia': '270095f6-e9a8-e8a7-37f8-0e6de01c3482', // 11* 小虾
  'c3s2-04-gushi': 'ad9a7e4e-49b9-9058-8113-24811d4d9e92', // 12 古诗三首
  'c3s2-04-zhi': '8b4e0ae8-0eb4-0768-b75f-31469ab86baa', // 13 纸的发明
  'c3s2-04-zhaozhou': 'a68af8a4-2923-4ac2-7201-45abfdb5b824', // 14 赵州桥
  'c3s2-04-minghua': 'b893434f-e341-a7e1-2a60-26804584a6e9', // 15* 一幅名扬中外的画
  'c3s2-05-huluobo': 'af153faf-901f-de63-8f91-39ad95d33e21', // 16 胡萝卜先生的长胡子
  'c3s2-05-yikeshu': '6d1fa478-9fbe-97df-4729-a5ef35243f6e', // 17 我变成了一棵树
  'c3s2-07-huoshaoyun': 'b253ad1f-7cfb-9c96-a9a6-0409634fdb68', // 22 火烧云
  'c3s2-07-baofengyu': 'f8206335-b8bd-dab0-0c1d-9d5516db6c0d', // 23 暴风雨来临之前
  'c3s2-07-shijie': 'ca324adf-9bb8-e01e-a953-99a176923d3c', // 24 我们奇妙的世界
  'c3s2-07-garden': '07d0a7e8-09cf-03d8-0232-56155cecfdcc', // 语文园地
  'c3s2-08-caifeng': 'b25161f4-3ccb-90b4-0ce1-7ece6d279920', // 25 慢性子裁缝和急性子顾客
  'c3s2-08-lou': '34562a60-3e6e-1b09-d5b5-a7c7309d0954', // 26 漏
  'c3s2-08-zaohe': 'f5fda836-2a01-04b1-f498-50f52dc2da91', // 27* 枣核
}

/** 替代视频从哪来：elite 新教材这一节的精品课，old 旧教材对应那一课的同步课，old-elite 旧教材的精品课 */
export type VideoFallbackFrom = 'elite' | 'old' | 'old-elite'

/**
 * 替代视频（标记）：新教材这一节平台上还没有同步课，先用这些（地图上画虚线框，旧教材的写「旧版」）。平台补上新教材的
 * 同步课后重跑 npm run videos 自动换回同步课；要统一撤掉就清空这张表。注释是视频在平台上的位置，语文园地带上判断依据
 * （旧教材那个单元里和新教材相同的课题）
 */
export const VIDEO_FALLBACKS: Readonly<Record<string, { id: string; from: VideoFallbackFrom }>> = {
  'c2s2-01-garden': { id: 'b612ee0d-a464-438c-9466-bf7ca110e59e', from: 'old' }, // 旧教材二年级下册 · 课文 · 语文园地一（单元里相同的：咏柳、村居、找春天、开满鲜花的小路、邓小平爷爷植树）
  'c2s2-02-garden': { id: 'e538e7b0-f64c-4b9f-a13a-69dea22463ec', from: 'old' }, // 旧教材二年级下册 · 课文 · 语文园地二（单元里相同的：雷锋叔叔，你在哪里、千人糕、读读儿童故事）
  'c3s1-02-garden': { id: 'f7fdf3e0-44e2-1369-c058-2db1440308ef', from: 'elite' }, // 新教材三年级上册 · 第二单元 · 语文园地（精品课）
  'c3s1-06-garden': { id: '83334999-c74b-4985-862b-105edcabe8d1', from: 'old' }, // 旧教材三年级上册 · 第六单元 · 语文园地（单元里相同的：富饶的西沙群岛、海滨小城、美丽的小兴安岭、这儿真美）
  'c3s1-07-garden': { id: '8e0fedac-a433-2cf3-89ee-2a2514095cd3', from: 'elite' }, // 新教材三年级上册 · 第七单元 · 语文园地（精品课）
  'c3s2-01-garden': { id: '116c1353-da0a-40a9-b7cd-3ae5d5b8a606', from: 'old' }, // 旧教材三年级下册 · 第一单元 · 语文园地（单元里相同的：绝句、惠崇春江晚景、三衢道中、燕子、荷花、昆虫备忘录、我的植物朋友）
  'c3s2-03-garden': { id: '8df28e2e-2d24-444f-b482-92498b1b8b90', from: 'old' }, // 旧教材三年级下册 · 第四单元 · 语文园地（单元里相同的：小虾、我做了一项小实验）
  'c3s2-04-garden': { id: 'cc6f0c71-ac0a-44b3-bb99-a0beb3783fb4', from: 'old' }, // 旧教材三年级下册 · 第三单元 · 语文园地（单元里相同的：元日、清明、九月九日忆山东兄弟、纸的发明、赵州桥、一幅名扬中外的画、中华传统节日）
  'c3s2-06-shuimo': { id: '0e72470a-a3e6-42f9-8fc0-dc15e9b6adec', from: 'old' }, // 旧教材三年级下册 · 第六单元 · 18 童年的水墨画
  'c3s2-06-feizao': { id: '3a48fe12-f9d4-4c00-8db9-35f6edb0249a', from: 'old' }, // 旧教材三年级下册 · 第六单元 · 20 肥皂泡
  'c3s2-06-huique': { id: '692515b8-2f5b-424e-8e40-7455ce03c6e8', from: 'old' }, // 旧教材三年级上册 · 第八单元 · 25 灰雀
  'c3s2-06-shixin': { id: 'cacefaa5-a63a-4190-a353-ee2d128709fd', from: 'old' }, // 旧教材三年级下册 · 第六单元 · 21* 我不能失信
  'c3s2-06-garden': { id: '47b49160-2bb8-40cf-bfbd-cad364429f5f', from: 'old' }, // 旧教材三年级下册 · 第六单元 · 语文园地（单元里相同的：童年的水墨画、肥皂泡、我不能失信、身边那些有特点的人）
  'c3s2-08-garden': { id: '103330d5-ec9a-41ea-a4c7-3917848b5ead', from: 'old' }, // 旧教材三年级下册 · 第八单元 · 语文园地（单元里相同的：慢性子裁缝和急性子顾客、漏、枣核、趣味故事会、这样想象真有趣）
}

const SYNC_URL = 'https://basic.smartedu.cn/syncClassroom/classActivity?activityId='
const ELITE_URL = 'https://basic.smartedu.cn/qualityCourse?courseId='

/** 这个知识点的视频：地址 + 来源（sync 是新教材的同步课，其余是替代视频）；没有就是 undefined */
export function videoOf(kpId: string): { url: string; from: 'sync' | VideoFallbackFrom } | undefined {
  const lesson = VIDEO_LESSONS[kpId]
  if (lesson) return { url: SYNC_URL + lesson, from: 'sync' }
  const alt = VIDEO_FALLBACKS[kpId]
  if (!alt) return undefined
  return { url: (alt.from === 'old' ? SYNC_URL : ELITE_URL) + alt.id, from: alt.from }
}
