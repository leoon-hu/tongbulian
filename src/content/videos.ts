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
  's1-03-solid-shapes': '4a0b4e6f-48d6-6653-351a-e295bb64b8fe', // 认识立体图形
  's1-04-num-20': '359c7317-335c-2f30-a5bc-6f6b71e3a172', // 11～20 的认识
  's1-04-simple-addsub': 'f79b6ffa-a492-c96a-5cfa-e75d5021989e', // 简单加、减法
  's1-05-carry-add': '5eb2ceed-819e-0017-0e1c-bbb060b74c4b', // 9加几
  's1-05-add-876': 'dce4f148-d4da-cc78-ce7c-10a841a3ac80', // 8、7、6 加几
  's1-05-add-5432': '397ffa22-57f5-5c9e-f75a-69e95c2c73ce', // 5、4、3、2 加几
  's2-01-flat-shapes': '86bdd6c7-ad71-d131-1019-173a9ac88e76', // 认识平面图形
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
  'm4s1-01-within-yi': 'f51f1082-f9fc-e266-ddc0-a0209d3faf69', // 亿以内数的认识-读数
  'm4s1-01-above-yi': 'a219ed82-a73e-e76b-edde-2040d3fa1cfc', // 十进制计数法
  'm4s1-01-compare': '1484f6a2-b2d5-a314-beb9-47667f7710e4', // 数的大小比较
  'm4s1-01-round': 'ab55074c-4ee7-55ab-d556-8baa1b26d52f', // 数的改写和求近似数
  'm4s1-02-yi': 'ca6722c4-3b99-7908-ecf6-cb65e6d36837', // 1亿张纸有多高
  'm4s1-03-angles': 'dc0ecb4c-3f6c-9510-2c45-346a12fe5204', // 角的再认识
  'm4s1-03-measure': 'e7f8fa86-fc85-37fc-c81b-817fff4d1aaa', // 角的度量
  'm4s1-03-draw': '5ced60c0-f618-945c-8a42-15a8d5a27851', // 画角
  'm4s2-01-addsub': '716cc82c-b238-468a-869f-5998ba9c1030', // 加、减法的意义和各部分间的关系
  'm4s2-01-muldiv': '41622daa-0154-4ea9-ab5d-59b1d4178a7a', // 乘、除法的意义和各部分间的关系
  'm4s2-01-brackets': 'd3e82597-e2a1-4c1f-96e1-507594a17ccd', // 括号
  'm4s2-01-solve': '2fa15574-bae4-4e18-a2ff-c752ddb94d83', // 解决问题
  'm4s2-02-positions': 'fd85a03a-8e5b-4383-90c8-0484bc8a65d9', // 2 观察物体（二）
  'm4s2-02-objects': 'fd85a03a-8e5b-4383-90c8-0484bc8a65d9', // 2 观察物体（二）
  'm4s2-03-add-laws': '156bf091-609f-4f06-9831-1f8b90bdd0ca', // 加法运算律
  'm4s2-03-mul-laws': '95c3ccf4-2a27-4892-996a-390f69058843', // 乘法运算律
  'm4s2-03-distrib': '95c3ccf4-2a27-4892-996a-390f69058843', // 乘法运算律
  'm4s2-03-mul-apply': '6e29d87d-b45e-4fdd-8d5b-a160c7e69deb', // 乘法运算律的应用
  'm4s2-04-meaning': 'b8032fec-f4a6-480f-b3a0-c07c0c5a9867', // 小数的意义
  'm4s2-04-property': 'f6edf193-fc4b-46c9-9b37-dca85c4e4ea2', // 小数的性质
  'm4s2-04-shift': '45f91496-f7d5-4d2f-9035-568db6fc13de', // 小数点移动引起小数大小的变化
  'm4s2-04-units': '51c28082-dbf4-4188-a9c6-d8eaaf48a958', // 小数与单位换算
  'm4s2-04-round': '28244acb-d4fb-4aad-bcdb-295604a5d71a', // 小数的近似数
  'm4s2-05-traits': '8ede089c-82bb-fc42-ccab-e7dd3999e361', // 三角形的特性
  'm4s2-05-kinds': '37b746c7-10d1-c82f-6ef1-bee45a13e963', // 三角形的分类
  'm4s2-05-angle-sum': '209012c4-6307-ffa7-2f8f-1f1edbd6fa0c', // 三角形的内角和
  'm4s2-05-polygon': 'e5449118-be6c-7cc7-28ab-9b993eb576cb', // 解决问题
  'm4s2-06-addsub': '55aefab3-c803-c7c7-cabe-aabd5d8f54e2', // 小数加减法
  'm4s2-06-mixed': 'd68e3ba7-6326-74d9-9423-45c3d4c17350', // 小数加减混合运算
  'm4s2-06-laws': '188584ae-acc8-85ca-91d7-2e535e585e56', // 整数加法运算律推广到小数
  'm4s2-07-symmetry': '982fe55c-b608-6847-68e4-4f8da249fbd4', // 轴对称
  'm4s2-07-translate': '2429fbae-9ada-65c0-a5e1-9c9473067b56', // 平移
  'm4s2-08-average': '10a9f19e-c356-d712-70d7-2b0914119bc2', // 平均数
  'm4s2-08-double': '4a18a6a6-fd79-cc49-6237-19169d4d379c', // 复式条形统计图
  'm4s2-09-lunch': '35888d07-6d05-04d5-5a50-4b9722a71fca', // ★ 营养午餐
  'm4s2-10-chicken': '09b4bb1d-1f33-e677-dbd2-701fc9cc7ec5', // 9 数学广角——鸡兔同笼
  'm5s1-01-observe': 'dad5f7ac-a512-94ff-e2cd-ec130833827f', // 观察简单组合体
  'm5s1-01-restore': '3bf899e6-3ba1-f9b2-be2e-bb09651bd965', // 还原简单组合体
  'm5s2-01-arrange': '3e7ca3cb-0411-4dfe-aeb8-200ac1fedb84', // 1 观察物体（三）
  'm5s2-01-restore': '3e7ca3cb-0411-4dfe-aeb8-200ac1fedb84', // 1 观察物体（三）
  'm5s2-02-meaning': '7800fe71-aad8-48df-9899-1f74cf0945ef', // 因数和倍数的认识
  'm5s2-02-find': '7800fe71-aad8-48df-9899-1f74cf0945ef', // 因数和倍数的认识
  'm5s2-02-two-five': 'fe029057-f1a9-4e7f-a94d-1c54ff797111', // 2、5的倍数的特征
  'm5s2-02-prime': '8be922ec-2a4e-46a5-ac6d-3ce44a7cf697', // 质数和合数
  'm5s2-02-parity': '197940b8-b5f2-477f-a387-94bf063c0808', // 解决问题（探索和的奇偶性）
  'm5s2-03-know': '086d9874-a2b0-476a-b718-31ce9818f4e6', // 长方体和正方体的认识
  'm5s2-03-net': 'ec390e40-1445-4024-be13-dc0522c2d838', // 长方体和正方体的表面积
  'm5s2-03-surface': 'ec390e40-1445-4024-be13-dc0522c2d838', // 长方体和正方体的表面积
  'm5s2-03-volume-unit': '883acb72-9faa-437a-8c9d-5128a85d98aa', // 体积和体积单位
  'm5s2-03-volume': 'bc764338-7db4-be08-f075-98dd3298e905', // 长方体和正方体的体积
  'm5s2-03-rate': '6fcd374a-4147-4873-83af-9c571dd51dec', // 体积单位间的进率
  'm5s2-03-capacity': '13b76c31-8885-4e3e-9842-727ae51cb6d6', // 容积和容积单位
  'm5s2-03-irregular': '6430a195-6310-1300-0a95-b48a4d2d29b6', // 解决问题（不规则物体的体积）
  'm5s2-04-explore': '9d03adb0-e927-43bc-b993-e188bd062f3c', // ★ 探索图形
  'm5s2-05-meaning': '332f7681-4f98-4ea9-ac3c-2f2849df2cdc', // 分数的产生、意义
  'm5s2-05-division': 'fc44df16-651a-405f-806c-76d8f2716e77', // 分数与除法
  'm5s2-05-proper': '66221857-3606-424e-aaef-b6910e89b9cf', // 真分数和假分数
  'm5s2-05-mixed': '66221857-3606-424e-aaef-b6910e89b9cf', // 真分数和假分数
  'm5s2-05-property': '9158d483-13f0-49b7-89ea-1aeddfb25f65', // 分数的基本性质
  'm5s2-05-gcf': '942424a3-d6b5-4669-8b47-1f6ba62f6b8e', // 最大公因数
  'm5s2-05-reduce': '5ab3c75b-dc15-d3b4-b141-978b821bf9a8', // 约分
  'm5s2-05-lcm': '3ab99bd2-2060-4e86-88a4-04f8e5cd0557', // 最小公倍数
  'm5s2-05-common': '52bd3752-5604-4ee8-9105-6250c023d28d', // 通分
  'm5s2-05-decimal': '935998d3-1dab-d8c9-2538-6be1973d8ccd', // 分数和小数互化
  'm5s2-06-rotate': '9c30f720-eb79-ae6d-c354-682c294634f6', // 旋转
  'm5s2-07-same': '054c7c3f-afbf-7d5b-de91-f990d2787d4f', // 同分母分数加、减法
  'm5s2-08-notify': 'c14bec7b-0cf6-05aa-1c6a-2b274727d879', // ★ 怎样通知最快
  'm5s2-09-double': '1eb0f934-7016-d6ca-68de-1db853e7af31', // 复式折线统计图
  'm5s2-10-defective': 'f609d22e-6036-46b0-8f20-3d87cd27da72', // 8 数学广角——找次品
  'm6s1-01-pairs': 'e3a6c804-0c65-d437-2296-ace406c02e93', // 用有序数对确定位置
  'm6s1-01-bearing': '3ec5ccc9-876f-0b9e-5af6-a186fc822b6b', // 用方向和距离确定位置
  'm6s2-01-meaning': '763b7eb0-1e06-4a0b-a9d4-2f5bceea0d94', // 认识负数
  'm6s2-01-line': '95ca359e-28f2-407b-8d0b-6ff5a22f1875', // 解决问题
  'm6s2-02-discount': 'e2816d0d-5a30-4128-b0e2-ddb9899cbd58', // 折扣
  'm6s2-02-chengshu': 'cc531998-23b6-496e-8b7b-c756f5bb1422', // 成数
  'm6s2-02-tax': 'a6d0f87c-4c77-4b72-a248-c1dcf7a51cf8', // 税率
  'm6s2-02-interest': '97eb2263-4d09-4c2d-8397-f35888e8a7be', // 利率
  'm6s2-02-sale': '85babd3e-d41d-484e-85ac-339640ea0191', // 解决问题
  'm6s2-04-cyl-know': '0b1e591e-695d-4a19-85eb-4939fc324e68', // 圆柱的认识
  'm6s2-04-cyl-net': '0b1e591e-695d-4a19-85eb-4939fc324e68', // 圆柱的认识
  'm6s2-04-cyl-side': 'faf3946f-b203-461c-9fc5-8d50ba8095f8', // 圆柱的表面积
  'm6s2-04-cyl-surface': 'faf3946f-b203-461c-9fc5-8d50ba8095f8', // 圆柱的表面积
  'm6s2-04-cyl-volume': '7b7ef7f1-95ed-4396-978a-ffcb74df1af6', // 圆柱的体积
  'm6s2-04-cyl-capacity': '7b7ef7f1-95ed-4396-978a-ffcb74df1af6', // 圆柱的体积
  'm6s2-04-cone-know': '5a4462ab-93d7-4cae-aa0a-4a46db0d46c2', // 圆锥的认识
  'm6s2-04-cone-volume': '0eb95f26-0165-491a-980c-cddd6f2eb99d', // 圆锥的体积
  'm6s2-05-meaning': '2d554d37-7d22-4d5a-9f0e-4daf60b68161', // 比例的意义
  'm6s2-05-property': '0e1f4c97-7933-4c47-92b3-e685eb817202', // 比例的基本性质
  'm6s2-05-solve': '01d317a8-8c8a-4968-a2e5-c47c401a260d', // 解比例
  'm6s2-05-direct': 'ed45ec41-db88-4242-8eb8-1cf91f45ecdb', // 正比例和反比例
  'm6s2-05-inverse': 'ed45ec41-db88-4242-8eb8-1cf91f45ecdb', // 正比例和反比例
  'm6s2-05-scale': '76e89496-dbdb-415c-89da-2fdad901dcaa', // 比例尺
  'm6s2-05-scale-use': '76e89496-dbdb-415c-89da-2fdad901dcaa', // 比例尺
  'm6s2-05-zoom': 'b15be436-3855-4404-be27-f5c66df25585', // 图形的放大与缩小
  'm6s2-05-apply': '8bfb7118-3ce6-4637-a5c3-ccb25152be4d', // 用比例解决问题
  'm6s2-06-bike': '78a85b92-2834-4547-921d-ed53ec7207de', // ★ 自行车里的数学
  'm6s2-07-pigeonhole': '87add3eb-0410-4019-a808-56d6a2813488', // 5 数学广角——鸽巢问题
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
  'c3s2-06-shuimo': '6a988bf8-e08a-d785-bca1-7ebd166a285f', // 18 童年的水墨画
  'c3s2-06-feizao': 'd0ee5110-bdd7-2949-299a-99883addd70d', // 19 肥皂泡
  'c3s2-06-huique': '21ec8fc7-ee05-9cb9-9c26-eaed58c8614d', // 20 灰雀
  'c3s2-06-shixin': 'b86f6059-8b56-d0ed-903e-2008a15b156c', // 21* 我不能失信
  'c3s2-07-huoshaoyun': 'b253ad1f-7cfb-9c96-a9a6-0409634fdb68', // 22 火烧云
  'c3s2-07-baofengyu': 'f8206335-b8bd-dab0-0c1d-9d5516db6c0d', // 23 暴风雨来临之前
  'c3s2-07-shijie': 'ca324adf-9bb8-e01e-a953-99a176923d3c', // 24 我们奇妙的世界
  'c3s2-07-garden': '07d0a7e8-09cf-03d8-0232-56155cecfdcc', // 语文园地
  'c3s2-08-caifeng': 'b25161f4-3ccb-90b4-0ce1-7ece6d279920', // 25 慢性子裁缝和急性子顾客
  'c3s2-08-lou': '34562a60-3e6e-1b09-d5b5-a7c7309d0954', // 26 漏
  'c3s2-08-zaohe': 'f5fda836-2a01-04b1-f498-50f52dc2da91', // 27* 枣核
  'c4s1-01-guanchao': '06197810-967b-fa4f-1983-a1fe003449b0', // 1 观潮
  'c4s1-01-fanxing': 'd80c864f-b758-c862-32ea-d6fe0a655a60', // 2 繁星
  'c4s1-01-xiandaishi': 'e4b10e36-f09e-60d6-b5b6-c2dc0f32e62f', // 3* 现代诗二首
  'c4s2-01-gushici': 'f4bac759-da1c-4ff4-8bc4-e7d128719e66', // 1 古诗词三首
  'c4s2-01-xiangxia': 'd76cb763-97c2-4a96-bf10-75b52e34987b', // 2 乡下人家
  'c4s2-01-tianchuang': '545b0a0f-7ac3-43cd-8ac6-0d92e51396ee', // 3 天窗
  'c4s2-01-taohuashui': '9036566b-b34b-47f5-92d2-3e8997429ba5', // 4* 三月桃花水
  'c4s2-01-garden': '8033a85c-52c5-4066-a695-c8ea350c72eb', // 语文园地
  'c4s2-02-hupo': 'e25d35e0-5cc2-4202-b402-469dce3e2c99', // 5 琥珀
  'c4s2-02-konglong': '2367d36b-8c93-44c1-a983-a678bc5f4790', // 6 飞向蓝天的恐龙
  'c4s2-02-nami': 'ce7e698c-d7e8-45db-aa8d-b34ef9d4527f', // 7 纳米技术就在我们身边
  'c4s2-02-mengyuan': '5ad190eb-56a0-4bf4-a418-912cc942b3f4', // 8*千年梦圆在今朝
  'c4s2-02-garden': 'a4785df4-eb86-4487-9665-d7f0aab1d662', // 语文园地
  'c4s2-03-duanshi': '27c180d3-41a8-43e4-ad14-da19758c9f2b', // 9 短诗三首
  'c4s2-03-lv': 'e199f54b-50ba-41f2-bfa3-4b7b5cc78808', // 10 绿
  'c4s2-03-baihua': 'f28e9c51-ab2e-4c5e-9920-bd157fcc0291', // 11 白桦
  'c4s2-03-tianqing': '55afd451-90f3-4456-86d5-698f141b1b06', // 12*在天晴了的时候
  'c4s2-03-garden': '5cf509b4-2b60-49d6-9797-043e036e5ca1', // 语文园地
  'c4s2-04-mao': '947c4d9c-7635-47f4-9db6-a1948906d76d', // 13 猫
  'c4s2-04-muji': '06ddfa86-3701-4a75-b84d-abfae6f87731', // 14 母鸡
  'c4s2-04-baie': '6ae86b4e-659b-43ac-977b-5a9b41c40852', // 15 白鹅
  'c4s2-04-garden': 'db139bc4-8a5e-42ec-8743-3c8fb714a6ac', // 语文园地
  'c4s2-05-richu': '05af45a9-a042-4d17-9b88-71d5347d046e', // 16 海上日出
  'c4s2-05-shuanglong': 'b0e29389-9572-4a80-a761-9ee075b9252c', // 17 记金华的双龙洞
  'c4s2-06-wenyan': '476cb2a1-30a2-4880-ab8f-abd95bebdfa2', // 18 文言文二则
  'c4s2-06-yulai': '8ac85081-a8c3-4fab-9881-fe5d0cea9071', // 19 小英雄雨来（节选）
  'c4s2-06-nanzihan': 'f271ed38-a547-49ae-9aa9-e32d8f488e43', // 20*我们家的男子汉
  'c4s2-06-luhuaxie': 'f8dcf59c-5c82-467f-ac0a-f4de23829bb3', // 21*芦花鞋
  'c4s2-06-garden': 'a939c0a4-4df3-4fae-975c-ab21e877d93a', // 语文园地
  'c4s2-07-gushi': '114fd2ce-4ad5-47fb-adb1-45ab656bd91f', // 22 古诗三首
  'c4s2-07-huangjiguang': 'c6326a87-4314-4ba0-8431-7a659170e356', // 23 黄继光
  'c4s2-07-nuomandi': '4bcd3cd7-fc27-4acb-b858-473b228660f0', // 24 “诺曼底号”遇难记
  'c4s2-07-tiaoshangong': '66ce4871-9777-11ec-92ef-246e9675e50c', // 25* 挑山工
  'c4s2-07-garden': '78f0dfee-7737-4aed-ae69-bc987216755e', // 语文园地
  'c4s2-08-baohulu': '021aa8d0-e544-40ba-a6bf-5a9e99126f46', // 26 宝葫芦的秘密（节选）
  'c4s2-08-juren': 'cb78e443-d546-40d5-a0a8-3150976bb73c', // 27 巨人的花园
  'c4s2-08-nver': '35bcd698-5fe9-4653-a71e-9c074e3d302a', // 28* 海的女儿
  'c4s2-08-garden': '23189250-a778-4aab-9e01-523d0d82b5f6', // 语文园地
  'c5s1-01-guihuayu': 'b23ab933-5113-1af8-0c82-71692956fce0', // 1 桂花雨
  'c5s1-01-luohuasheng': 'fd8aee4e-cb2d-598a-2605-b4a60b285d79', // 2 落花生
  'c5s1-01-zhenzhuniao': '38892478-a913-6af7-eb22-de4583910632', // 3* 珍珠鸟
  'c5s2-01-gushi': 'e4e41e34-77b8-4bcf-978c-e3db9cceacc2', // 1 古诗三首
  'c5s2-01-zufu': '5eabbbc0-a3f4-49e4-a1cb-0c2cbb666145', // 2 祖父的园子
  'c5s2-01-yueshi': 'ea16e8e7-21ec-4c5e-a73e-f67ec1bce895', // 3*月是故乡明
  'c5s2-01-meihuahun': '1a29d7a8-83fd-4bed-8930-2ead62fec0e5', // 4*梅花魂
  'c5s2-01-garden': '8438b3a7-b8c7-4a30-a2c4-623ac64131e7', // 语文园地
  'c5s2-02-caochuan': 'acd9ffd1-36ed-4a5c-9003-02d271bf3f27', // 5 草船借箭
  'c5s2-02-jingyanggang': '002feaa6-fe6e-428d-b1f3-098555ab013f', // 6 景阳冈
  'c5s2-02-houwang': 'b657adb9-467d-4163-9f6f-0cc60da09494', // 7*猴王出世
  'c5s2-02-honglou': '701c7f29-03c4-4c73-b38c-6307dfc50964', // 8*红楼春趣
  'c5s2-02-garden': 'd70c5795-fa2e-4f9c-b968-02548589c6b1', // 语文园地
  'c5s2-04-gushi': '1aa5ffc5-2a1a-4e53-84cf-573c4ed8f36b', // 9 古诗三首
  'c5s2-04-qingshan': 'bdc20091-b968-4da4-a63e-4006371e3d75', // 10 青山处处埋忠骨
  'c5s2-04-junshen': 'c463dcf8-138d-4471-a6e5-0159f48f92f7', // 11 军神
  'c5s2-04-qingpin': 'e991e012-2d52-440a-8f0e-c01c9f46c7c0', // 12*清贫
  'c5s2-04-garden': '63de1064-a698-4322-82d4-e0dfcb3eab76', // 语文园地
  'c5s2-05-renwu': '6243f322-f2eb-4876-87f5-25a50e12f09b', // 13 人物描写一组
  'c5s2-05-shuazili': '917d95c2-8de9-4279-8b40-5d5a2a829f6e', // 14 刷子李
  'c5s2-06-maodun': '75abf198-bf9a-4073-bbab-c26d60cf45bb', // 15 自相矛盾
  'c5s2-06-saima': 'a50e39f6-c720-4f34-b616-834835ca42c4', // 16 田忌赛马
  'c5s2-06-tiaoshui': 'eb22d259-cd0c-4ce3-bf01-bea3bc41a240', // 17 跳水
  'c5s2-06-garden': 'f9621e6a-41aa-4ba7-ae6f-29548a8bb4c4', // 语文园地
  'c5s2-07-xiaoting': '5e938888-1c8a-4b9e-91ac-682d97555735', // 18 威尼斯的小艇
  'c5s2-07-muchang': '24742c5a-48d6-4b64-8c42-c2074a0e8069', // 19 牧场之国
  'c5s2-07-jinzita': '23740ddb-e9e7-4b4c-9207-ad01733e2657', // 20*金字塔
  'c5s2-07-garden': 'b6287813-b119-4bc6-9324-31aff7d82c0f', // 语文园地
  'c5s2-08-yangshi': 'ff7ff8a1-5ee3-4e70-a014-2ae2c94796c7', // 21 杨氏之子
  'c5s2-08-shouzhi': 'e6424192-c40c-45f7-b11f-173177bc332f', // 22 手指
  'c5s2-08-tongnian': 'd0ceed64-57d6-47d9-8363-95f13f24a5f6', // 23*童年的发现
  'c5s2-08-garden': 'd592f3c4-8f7d-47c3-91a6-a9676e6eeec2', // 语文园地
  'c6s1-01-caoyuan': 'afa295a3-a5f6-b6e4-bdcb-18cefb4541a3', // 1 草原
  'c6s1-01-dingxiangjie': 'f2c180e2-c5b9-6a6a-d8ff-be833ce939bd', // 2 丁香结
  'c6s1-01-gushici': '00414fea-ff36-ad91-09a6-686b1eae10d4', // 3 古诗词三首
  'c6s2-01-chunjie': '356e43aa-9714-4078-a15e-1ecb656ca39e', // 1 北京的春节
  'c6s2-01-labazhou': '4f2da214-b9e1-4a96-831c-6a51cdc04cc5', // 2 腊八粥
  'c6s2-01-gushi': 'ead93583-f4ed-43c6-8035-07f86a02c578', // 3 古诗三首
  'c6s2-01-zangxi': '58eba64f-e6d8-46aa-a4ae-2116068e739e', // 4*藏戏
  'c6s2-01-garden': '7ec60b3b-18db-4325-9c94-59d8bac6934d', // 语文园地
  'c6s2-02-lubinxun': '4196a51b-bb08-4a0e-bfe7-75b82da90991', // 5 鲁滨逊漂流记（节选）
  'c6s2-02-qie': '460056c2-707c-46f2-85ba-3869717d235a', // 6*骑鹅旅行记（节选）
  'c6s2-02-tangmu': '50f12751-6e5a-4508-b3eb-1f9c3df0ee25', // 7*汤姆·索亚历险记（节选）
  'c6s2-02-garden': '5132c27b-c0bc-49ee-be61-f08f74de0304', // 语文园地
  'c6s2-03-congcong': '7eea20a5-332f-4574-a6ee-d4f6841154be', // 8 匆匆
  'c6s2-03-xingqitian': '4bb8a0f9-2951-4fb1-b22f-66db0ab490d3', // 9 那个星期天
  'c6s2-04-gushi': 'e8ff9337-875b-4b9d-a222-95c678c3b774', // 10 古诗三首
  'c6s2-04-huiyi': '6492e8df-469c-48b6-9e04-a10710e9e479', // 11 十六年前的回忆
  'c6s2-04-weirenmin': '25f681a1-1516-4afd-86b5-002188b08503', // 12 为人民服务
  'c6s2-04-dongcunrui': 'f298831e-a3fb-a7f1-eba9-cbd5f6c9fd5e', // 13*董存瑞舍身炸暗堡
  'c6s2-04-garden': 'b8092c2f-56ab-45db-8a24-be72362e1d8c', // 语文园地
  'c6s2-05-wenyan': '792b1e38-1968-4c7b-bf23-80386a4e75cb', // 14 文言文二则
  'c6s2-05-zhenli': '1262a1bc-33a1-4510-8401-21530db53065', // 15 真理诞生于一百个问号之后
  'c6s2-05-biaoli': '25c296d4-547b-40e3-8cc0-f03043040b12', // 16 表里的生物
  'c6s2-05-youqu': '51e4f640-ad63-418d-972d-2c3f09030a63', // 17*他们那时候多有趣啊
  'c6s2-05-garden': 'a487b6b3-71ca-4289-bd64-c6d60973a4c8', // 语文园地
  'e3s1-01-a': '5e7b70d5-8b90-b4e2-3de4-ef4dce5b755d', // part A How do we greet friends?
  'e3s1-01-letters': '5e7b70d5-8b90-b4e2-3de4-ef4dce5b755d', // part A How do we greet friends?
  'e3s1-01-b': '29b581af-0f4d-845a-93ce-446cb62f6eb5', // part B How can we be a good friend?
  'e3s1-02-a': '3cfb6334-8e84-4b74-f1e6-c6a84c9705eb', // part A Who lives with you?
  'e3s1-02-letters': '3cfb6334-8e84-4b74-f1e6-c6a84c9705eb', // part A Who lives with you?
  'e3s1-02-b': '48af6647-ada6-bc3f-4209-a09f1e8ad681', // part B How are families different?
  'e3s1-03-a': '789b326e-f5c7-f687-0f51-534a50a7f3db', // part A What pets do you know?
  'e3s1-03-letters': '789b326e-f5c7-f687-0f51-534a50a7f3db', // part A What pets do you know?
  'e3s1-03-b': 'd18794b7-d57c-6316-c24d-5be733ebeef9', // part B What wild animals do you know?
  'e3s1-04-a': 'c93b83e7-7e7b-5d88-1828-01501d0e5173', // part A What do we get from plants?
  'e3s1-04-letters': 'c93b83e7-7e7b-5d88-1828-01501d0e5173', // part A What do we get from plants?
  'e3s1-04-b': '0a89aaa0-446a-35d3-7841-940f673a64fb', // part B How can we help plants?
  'e3s1-05-a': '94e86bb7-6d0a-85bd-ff07-ad453f7cacbc', // part A What colours do you see?
  'e3s1-05-letters': '94e86bb7-6d0a-85bd-ff07-ad453f7cacbc', // part A What colours do you see?
  'e3s1-05-b': '86e6b30b-d8cd-9ff2-c70f-781e0caef8cc', // part B How do colours help us?
  'e3s1-06-a': '32f02caf-3089-5588-b718-cf30de5f199b', // part A When do we use numbers?
  'e3s1-06-letters': '32f02caf-3089-5588-b718-cf30de5f199b', // part A When do we use numbers?
  'e3s1-06-b': '0f35a00d-6b47-81d0-8109-e972f0324b99', // part B How useful are numbers?
  'e3s2-01-a': '116814bf-e8bb-3a2a-7faa-e6c29e4db407', // Part A How do we greet new people?
  'e3s2-01-spell': '116814bf-e8bb-3a2a-7faa-e6c29e4db407', // Part A How do we greet new people?
  'e3s2-01-b': 'b96b1baf-3b1b-3763-d31e-239cf58ec028', // Part B How can we be polite?
  'e3s2-02-a': '2ecace19-b31b-e543-7aee-5bc2f97d3d95', // Part A How do we describe things?
  'e3s2-02-spell': '2ecace19-b31b-e543-7aee-5bc2f97d3d95', // Part A How do we describe things?
  'e3s2-02-b': 'fa742dbe-59e7-c987-2493-0721f287c023', // Part B How do we express our feelings?
  'e3s2-03-a': 'ed9b9a55-1282-8861-c4f7-03b345e96688', // Part A What tools help us learn?
  'e3s2-03-spell': 'ed9b9a55-1282-8861-c4f7-03b345e96688', // Part A What tools help us learn?
  'e3s2-03-b': '285f2713-948f-5c38-c285-405d8629769a', // Part B How do our senses help us learn?
  'e3s2-04-a': '9dce7c03-533b-c075-f1af-a5314e5c0a61', // Part A What do we eat?
  'e3s2-04-spell': '9dce7c03-533b-c075-f1af-a5314e5c0a61', // Part A What do we eat?
  'e3s2-04-b': 'f1560e5f-cd48-09b7-c9ab-dc0e7707f0e3', // Part B What shall we eat?
  'e3s2-05-a': '6e60cd05-c002-055e-76eb-8ad3a76389ea', // Part A What kinds of old things do you have?
  'e3s2-05-spell': '6e60cd05-c002-055e-76eb-8ad3a76389ea', // Part A What kinds of old things do you have?
  'e3s2-05-b': 'fb0eee49-43be-f428-f0ff-b93b9d6c9c8f', // Part B How can old things be reused?
  'e3s2-06-a': '62e1eaf2-dd22-3cab-4f65-24efba0b9c89', // Part A How do numbers help us count and sort?
  'e3s2-06-spell': '62e1eaf2-dd22-3cab-4f65-24efba0b9c89', // Part A How do numbers help us count and sort?
  'e3s2-06-b': '22795ff0-761e-1282-6217-08f24da3cb07', // Part B How do numbers help us make decisions?
}

/** 替代视频从哪来：elite 新教材这一节的精品课，old 旧教材对应那一课的同步课，old-elite 旧教材的精品课 */
export type VideoFallbackFrom = 'elite' | 'old' | 'old-elite'

/**
 * 替代视频（标记）：新教材这一节平台上还没有同步课，先用这些（地图上画虚线框，旧教材的写「旧版」）。平台补上新教材的
 * 同步课后重跑 npm run videos 自动换回同步课；要统一撤掉就清空这张表。注释是视频在平台上的位置，语文园地带上判断依据
 * （旧教材那个单元里和新教材相同的课题）
 */
export const VIDEO_FALLBACKS: Readonly<Record<string, { id: string; from: VideoFallbackFrom }>> = {
  'm4s1-04-oral': { id: 'c707d102-59fe-4d14-9298-42ff2d8082b4', from: 'old' }, // 旧教材 · 第四单元 两位数乘两位数 · 口算乘法
  'm4s1-04-written': { id: 'ef6c2ce6-8a0d-4ad0-adaa-f5335fd63691', from: 'old' }, // 旧教材 · 4 三位数乘两位数 · 三位数乘两位数笔算
  'm4s1-04-pattern': { id: '3562cd5d-3e98-4d41-b069-4a7c85fc1220', from: 'old' }, // 旧教材 · 4 三位数乘两位数 · 积的变化规律
  'm4s1-05-total-part': { id: '716cc82c-b238-468a-869f-5998ba9c1030', from: 'old' }, // 旧教材 · 1 四则运算 · 加、减法的意义和各部分间的关系
  'm4s1-05-price': { id: '6387f5b9-9b04-4f06-b522-4f883160d5f6', from: 'old' }, // 旧教材 · 4 三位数乘两位数 · 单价、数量和总价
  'm4s1-05-speed': { id: '4d71f545-707f-4d2d-99b8-ca62f6684d53', from: 'old' }, // 旧教材 · 4 三位数乘两位数 · 速度、时间和路程
  'm4s1-06-parallel': { id: 'f70ab85e-83bd-4cb4-b8c5-1a8023279438', from: 'old' }, // 旧教材 · 5 平行四边形和梯形 · 平行与垂直
  'm4s1-06-distance': { id: '8ae7e49e-8388-6a24-0183-bb238d7b06a8', from: 'old-elite' }, // 旧教材 · 5 平行四边形和梯形 · 画垂线和点到直线的距离（精品课）
  'm4s1-06-parallelogram': { id: '68da66f0-4665-42c7-92ec-cc44f42919dd', from: 'old' }, // 旧教材 · 5 平行四边形和梯形 · 平行四边形的认识
  'm4s1-06-trapezoid': { id: '8825f82a-caf3-45ce-a957-9601ae3832e5', from: 'old' }, // 旧教材 · 5 平行四边形和梯形 · 梯形的认识
  'm4s1-07-single': { id: 'c840264f-08aa-4b6d-8f36-ac8344781cad', from: 'old' }, // 旧教材 · 7 条形统计图
  'm4s1-07-double': { id: '4a18a6a6-fd79-cc49-6237-19169d4d379c', from: 'old' }, // 旧教材 · 8 平均数与条形统计图 · 复式条形统计图
  'm4s1-08-treasure': { id: '18d0da2f-f884-4e16-b107-20161b8b4104', from: 'old' }, // 旧教材 · 第一单元 位置与方向（一） · 知道东北、东南、西北、西南四个方向
  'm4s2-03-add-apply': { id: '8ae7e4b0-83f9-d18c-0183-fa95ccec0142', from: 'elite' }, // 四年级下册 · 3 运算律 · 加法运算律的应用（精品课）
  'm4s2-04-read-write': { id: '50d53460-8170-02af-a0e1-e1020a793609', from: 'elite' }, // 四年级下册 · 4 小数的意义和性质 · 小数的读法和写法（精品课）
  'm4s2-04-compare': { id: '5b1b6852-a56b-70df-92b1-51f09f64ff78', from: 'elite' }, // 四年级下册 · 4 小数的意义和性质 · 小数的大小比较（精品课）
  'm4s2-05-sides': { id: '678965f4-cf19-1977-4dd9-5d0c731e8a77', from: 'elite' }, // 四年级下册 · 5 三角形 · 三角形的三边关系（精品课）
  'm5s1-02-dec-int': { id: '12b3206d-c2a5-42ab-b572-3b763886b477', from: 'old' }, // 旧教材 · 1 小数乘法 · 小数乘整数
  'm5s1-02-dec-dec': { id: '6bdcfbb5-1e77-4e05-83e5-955ba7d47e6f', from: 'old' }, // 旧教材 · 1 小数乘法 · 小数乘小数
  'm5s1-02-approx': { id: '4b1c2cdf-3312-44aa-9698-a6df671d64cb', from: 'old' }, // 旧教材 · 1 小数乘法 · 积的近似数
  'm5s1-02-times': { id: '6bdcfbb5-1e77-4e05-83e5-955ba7d47e6f', from: 'old' }, // 旧教材 · 1 小数乘法 · 小数乘小数
  'm5s1-02-laws': { id: '8814c7dc-3b5f-44c4-9db0-52a6903dbb1c', from: 'old' }, // 旧教材 · 1 小数乘法 · 整数乘法运算定律推广到小数
  'm5s1-02-estimate': { id: '2ccc01d3-ed81-47f6-b9e6-d20be4f0f793', from: 'old' }, // 旧教材 · 1 小数乘法 · 解决问题 · 解决问题（估算）
  'm5s1-02-tiered': { id: 'af3c5bb1-2b80-6f76-4828-bef4484adf1e', from: 'old-elite' }, // 旧教材 · 1 小数乘法 · 解决问题 · 解决问题（分段计费）（精品课）
  'm5s1-03-int-divisor': { id: '9a77ffb0-9b1a-451e-b1b8-01cf8e5f0ac6', from: 'old' }, // 旧教材 · 3 小数除法 · 除数是整数的小数除法
  'm5s1-03-repeating': { id: 'b5085877-b9e9-426a-adab-f89e3434daeb', from: 'old' }, // 旧教材 · 3 小数除法 · 循环小数
  'm5s1-03-dec-divisor': { id: '3a30b504-9a79-4ae7-824d-6e307f573983', from: 'old' }, // 旧教材 · 3 小数除法 · 一个数除以小数
  'm5s1-03-approx': { id: '85961024-0398-4289-b946-128cb006ad71', from: 'old' }, // 旧教材 · 3 小数除法 · 商的近似数
  'm5s1-04-symmetry': { id: '982fe55c-b608-6847-68e4-4f8da249fbd4', from: 'old' }, // 旧教材 · 7 图形的运动（二） · 轴对称
  'm5s1-04-translate': { id: '2429fbae-9ada-65c0-a5e1-9c9473067b56', from: 'old' }, // 旧教材 · 7 图形的运动（二） · 平移
  'm5s1-04-rotate': { id: '9c30f720-eb79-ae6d-c354-682c294634f6', from: 'old' }, // 旧教材 · 5 图形的运动（三） · 旋转
  'm5s1-05-addsub': { id: '7dc26415-5563-40a8-b749-f0f1e20710ee', from: 'old' }, // 旧教材 · 5 简易方程 · 用字母表示数
  'm5s1-05-muldiv': { id: '7dc26415-5563-40a8-b749-f0f1e20710ee', from: 'old' }, // 旧教材 · 5 简易方程 · 用字母表示数
  'm5s1-05-laws': { id: '7dc26415-5563-40a8-b749-f0f1e20710ee', from: 'old' }, // 旧教材 · 5 简易方程 · 用字母表示数
  'm5s1-05-equality': { id: '4b4574af-3bff-466f-b8a1-113691217a50', from: 'old' }, // 旧教材 · 5 简易方程 · 等式的性质
  'm5s1-05-axb': { id: '7dc26415-5563-40a8-b749-f0f1e20710ee', from: 'old' }, // 旧教材 · 5 简易方程 · 用字母表示数
  'm5s1-05-axbx': { id: '7dc26415-5563-40a8-b749-f0f1e20710ee', from: 'old' }, // 旧教材 · 5 简易方程 · 用字母表示数
  'm5s1-06-parallelogram': { id: '7c46fa69-80ef-4aee-a43d-efe01366a73b', from: 'old' }, // 旧教材 · 6 多边形的面积 · 平行四边形的面积
  'm5s1-06-hectare': { id: '7a58ed90-9fc0-48ce-bc6f-0f3817c24037', from: 'old' }, // 旧教材 · 2 公顷和平方千米
  'm5s1-06-triangle': { id: '11262e08-b436-42ad-8c94-fd983c847cf0', from: 'old' }, // 旧教材 · 6 多边形的面积 · 三角形的面积
  'm5s1-06-trapezoid': { id: 'f5615639-226d-42f7-b1ca-a16cce9fcfcb', from: 'old' }, // 旧教材 · 6 多边形的面积 · 梯形的面积
  'm5s1-06-composite': { id: 'ec242cde-e975-4b7d-85ab-3f926ca5c4bf', from: 'old' }, // 旧教材 · 6 多边形的面积 · 组合图形的面积
  'm5s1-06-irregular': { id: '8ab21204-a58f-44b1-862f-c62b5011cefa', from: 'old' }, // 旧教材 · 6 多边形的面积 · 解决问题（不规则图形的面积）
  'm5s1-08-certain': { id: 'c6d03265-9867-4040-a190-4cb66892bdde', from: 'old' }, // 旧教材 · 4 可能性
  'm5s1-08-likely': { id: 'c6d03265-9867-4040-a190-4cb66892bdde', from: 'old' }, // 旧教材 · 4 可能性
  'm5s1-08-infer': { id: 'c6d03265-9867-4040-a190-4cb66892bdde', from: 'old' }, // 旧教材 · 4 可能性
  'm5s2-02-three': { id: '573330a5-68ee-9672-bff2-fd2858dc1099', from: 'elite' }, // 五年级下册 · 2 因数与倍数 · 2、5、3的倍数的特征 · 3的倍数的特征（精品课）
  'm5s2-07-diff': { id: '9c576712-4d29-460e-85ad-617d55b71266', from: 'elite' }, // 五年级下册 · 6 分数的加法和减法 · 异分母分数加、减法（精品课）
  'm5s2-07-mixed': { id: '56cadff1-3ee9-e487-b8e1-ecc1da0acb3a', from: 'elite' }, // 五年级下册 · 6 分数的加法和减法 · 分数加减混合运算（精品课）
  'm5s2-07-laws': { id: '56cadff1-3ee9-e487-b8e1-ecc1da0acb3a', from: 'elite' }, // 五年级下册 · 6 分数的加法和减法 · 分数加减混合运算（精品课）
  'm5s2-09-single': { id: '763181ee-9db3-ea6d-c080-e8934f402abd', from: 'elite' }, // 五年级下册 · 7 折线统计图 · 单式折线统计图（精品课）
  'm6s1-01-route': { id: '713d4809-e590-4f80-bc11-270dc87d01f5', from: 'old' }, // 旧教材 · 2 位置与方向（二） · 描述简单的路线图（例3）
  'm6s1-02-frac-int': { id: '077ef535-771d-4e9b-ad65-dd764da6d69d', from: 'old' }, // 旧教材 · 1 分数乘法 · 分数乘整数
  'm6s1-02-num-frac': { id: 'f11b3df3-4757-4140-8e11-d70d5d3af087', from: 'old' }, // 旧教材 · 1 分数乘法 · 分数乘分数
  'm6s1-02-frac-frac': { id: 'f11b3df3-4757-4140-8e11-d70d5d3af087', from: 'old' }, // 旧教材 · 1 分数乘法 · 分数乘分数
  'm6s1-02-dec-frac': { id: '3419d22c-deef-41e1-b730-5653939dfa1b', from: 'old' }, // 旧教材 · 1 分数乘法 · 分数乘小数
  'm6s1-02-laws': { id: '77704779-84a0-4001-b59a-27a24ffdc137', from: 'old' }, // 旧教材 · 1 分数乘法 · 分数四则混合运算
  'm6s1-02-chain': { id: 'c18d09fd-5851-469c-8cfb-8bf4e8477023', from: 'old' }, // 旧教材 · 1 分数乘法 · 解决问题
  'm6s1-02-more-less': { id: 'c18d09fd-5851-469c-8cfb-8bf4e8477023', from: 'old' }, // 旧教材 · 1 分数乘法 · 解决问题
  'm6s1-03-reciprocal': { id: 'b5b8290d-0678-4408-ae98-1154b1b8425b', from: 'old' }, // 旧教材 · 3 分数除法 · 倒数的认识
  'm6s1-03-frac-int': { id: 'a3ea124d-81e2-4ad5-a4f8-ecfd18b7e138', from: 'old' }, // 旧教材 · 3 分数除法 · 分数除法
  'm6s1-03-div-frac': { id: 'a3ea124d-81e2-4ad5-a4f8-ecfd18b7e138', from: 'old' }, // 旧教材 · 3 分数除法 · 分数除法
  'm6s1-03-find-whole': { id: '8ae7e495-84a2-1319-0184-b894f57802a5', from: 'old-elite' }, // 旧教材 · 3 分数除法 · 解决问题 · 已知一个数的几分之几是多少，求这个数（例4）（精品课）
  'm6s1-03-as-one': { id: '54c52508-bf4d-e839-eef2-028ab21ef289', from: 'old-elite' }, // 旧教材 · 3 分数除法 · 解决问题（利用抽象的“1”解决实际问题）（精品课）
  'm6s1-04-negative': { id: '763b7eb0-1e06-4a0b-a9d4-2f5bceea0d94', from: 'old' }, // 旧教材 · 1 负数 · 认识负数
  'm6s1-05-circle': { id: '4685370f-5a90-4b18-a46e-617ac5013819', from: 'old' }, // 旧教材 · 5 圆 · 圆的认识
  'm6s1-05-sector': { id: '71848eab-baaa-4212-9957-755e356d3a07', from: 'old' }, // 旧教材 · 5 圆 · 扇形
  'm6s1-05-circumference': { id: 'e9f30f49-1094-43be-a4f8-dd474aaf4248', from: 'old' }, // 旧教材 · 5 圆 · 圆的周长
  'm6s1-05-area': { id: 'b6fc3464-80dd-4c6c-80d9-56e5be60d73a', from: 'old' }, // 旧教材 · 5 圆 · 圆的面积
  'm6s1-05-ring': { id: 'b6fc3464-80dd-4c6c-80d9-56e5be60d73a', from: 'old' }, // 旧教材 · 5 圆 · 圆的面积
  'm6s1-05-composite': { id: '0860683c-e824-646b-68bf-1d6052c6f496', from: 'old-elite' }, // 旧教材 · 5 圆 · 解决问题（精品课）
  'm6s1-05-square-circle': { id: '0860683c-e824-646b-68bf-1d6052c6f496', from: 'old-elite' }, // 旧教材 · 5 圆 · 解决问题（精品课）
  'm6s1-06-sports': { id: '958dc1be-a04e-4107-a409-8a56701a9533', from: 'old' }, // 旧教材 · ★确定起跑线
  'm6s1-07-meaning': { id: '4329574c-b6f8-4342-aef2-fef47fff5a6a', from: 'old' }, // 旧教材 · 6 百分数（一） · 百分数的意义
  'm6s1-07-rate': { id: '8ae7e4b5-83d5-d03a-0183-de945f7d15c1', from: 'old-elite' }, // 旧教材 · 6 百分数（一） · 百分数和分数、小数的互化（精品课）
  'm6s1-07-part': { id: '8ae7e4b5-83d5-d03a-0183-de945f7d15c1', from: 'old-elite' }, // 旧教材 · 6 百分数（一） · 百分数和分数、小数的互化（精品课）
  'm6s1-07-discount': { id: 'e2816d0d-5a30-4128-b0e2-ddb9899cbd58', from: 'old' }, // 旧教材 · 2 百分数（二） · 折扣
  'm6s1-07-interest': { id: '97eb2263-4d09-4c2d-8397-f35888e8a7be', from: 'old' }, // 旧教材 · 2 百分数（二） · 利率
  'm6s1-07-growth': { id: '2abd40b7-caab-b1e1-7fb5-7b694cb4df4e', from: 'old-elite' }, // 旧教材 · 6 百分数（一） · 用百分数解决问题 · 求一个数比另一个数多（少）百分之几（例3）（精品课）
  'm6s1-07-base': { id: '63861c1c-0d8a-28ec-0ef6-aa3c1b5ad8f7', from: 'old-elite' }, // 旧教材 · 6 百分数（一） · 用百分数解决问题 · 求比一个数多百分之几的数是多少（例4）（精品课）
  'm6s1-07-chain': { id: '08bc98d3-3510-4bf9-9bf9-f898883cf6d8', from: 'old' }, // 旧教材 · 6 百分数（一） · 用百分数解决问题 · 求比一个数连续多（或）少百分之几的数是多少（例5）
  'm6s1-08-water': { id: '8b7961ba-362b-42be-938f-b40e203f9c33', from: 'old' }, // 旧教材 · ★节约用水
  'c2s2-01-garden': { id: 'b612ee0d-a464-438c-9466-bf7ca110e59e', from: 'old' }, // 旧教材二年级下册 · 课文 · 语文园地一（单元里相同的：咏柳、村居、找春天、开满鲜花的小路、邓小平爷爷植树）
  'c2s2-02-garden': { id: 'e538e7b0-f64c-4b9f-a13a-69dea22463ec', from: 'old' }, // 旧教材二年级下册 · 课文 · 语文园地二（单元里相同的：雷锋叔叔，你在哪里、千人糕、读读儿童故事）
  'c3s1-02-garden': { id: 'f7fdf3e0-44e2-1369-c058-2db1440308ef', from: 'elite' }, // 新教材三年级上册 · 第二单元 · 语文园地（精品课）
  'c3s1-06-garden': { id: '83334999-c74b-4985-862b-105edcabe8d1', from: 'old' }, // 旧教材三年级上册 · 第六单元 · 语文园地（单元里相同的：富饶的西沙群岛、海滨小城、美丽的小兴安岭、这儿真美）
  'c3s1-07-garden': { id: '8e0fedac-a433-2cf3-89ee-2a2514095cd3', from: 'elite' }, // 新教材三年级上册 · 第七单元 · 语文园地（精品课）
  'c3s2-01-garden': { id: '116c1353-da0a-40a9-b7cd-3ae5d5b8a606', from: 'old' }, // 旧教材三年级下册 · 第一单元 · 语文园地（单元里相同的：绝句、惠崇春江晚景、三衢道中、燕子、荷花、昆虫备忘录、我的植物朋友）
  'c3s2-03-garden': { id: '8df28e2e-2d24-444f-b482-92498b1b8b90', from: 'old' }, // 旧教材三年级下册 · 第四单元 · 语文园地（单元里相同的：小虾、我做了一项小实验）
  'c3s2-04-garden': { id: 'cc6f0c71-ac0a-44b3-bb99-a0beb3783fb4', from: 'old' }, // 旧教材三年级下册 · 第三单元 · 语文园地（单元里相同的：元日、清明、九月九日忆山东兄弟、纸的发明、赵州桥、一幅名扬中外的画、中华传统节日）
  'c3s2-06-garden': { id: '47b49160-2bb8-40cf-bfbd-cad364429f5f', from: 'old' }, // 旧教材三年级下册 · 第六单元 · 语文园地（单元里相同的：童年的水墨画、肥皂泡、我不能失信、身边那些有特点的人）
  'c3s2-08-garden': { id: '103330d5-ec9a-41ea-a4c7-3917848b5ead', from: 'old' }, // 旧教材三年级下册 · 第八单元 · 语文园地（单元里相同的：慢性子裁缝和急性子顾客、漏、枣核、趣味故事会、这样想象真有趣）
  'c4s1-01-garden': { id: 'f05f88e9-761f-4546-974c-3c9b480f4cac', from: 'old' }, // 旧教材四年级上册 · 第一单元 · 语文园地（单元里相同的：观潮、繁星、现代诗二首、我们与环境、推荐一个好地方）
  'c4s1-02-doujia': { id: 'ab3a465b-0513-4153-bb97-0fbb63d97368', from: 'old' }, // 旧教材四年级上册 · 第二单元 · 5 一个豆荚里的五粒豆
  'c4s1-02-yejian': { id: 'd979ec6b-0440-4f26-8bd4-e6a150bfff72', from: 'old' }, // 旧教材四年级上册 · 第二单元 · 6 夜间飞行的秘密
  'c4s1-02-maozi': { id: 'e6ec32bf-3b2a-4d4e-aad9-766886217540', from: 'old' }, // 旧教材三年级下册 · 第八单元 · 26 *方帽子店
  'c4s1-02-saima': { id: 'a50e39f6-c720-4f34-b616-834835ca42c4', from: 'old' }, // 旧教材五年级下册 · 第六单元 · 16 田忌赛马
  'c4s1-02-garden': { id: 'fddb4787-c818-44f0-bb26-b42e11492148', from: 'old' }, // 旧教材四年级上册 · 第二单元 · 语文园地（单元里相同的：一个豆荚里的五粒豆、夜间飞行的秘密、我的家人）
  'c4s1-03-gushi': { id: 'a0110265-4955-4d80-aca2-a5d1272d444d', from: 'old' }, // 旧教材四年级上册 · 第三单元 · 9 古诗三首
  'c4s1-03-pashanhu': { id: '62ae9eba-c8b5-42d7-8197-2ed39dfdef2b', from: 'old' }, // 旧教材四年级上册 · 第三单元 · 10 爬山虎的脚
  'c4s1-03-xishuai': { id: '0e1dfe4e-7803-4777-9c0d-bb78488772c1', from: 'old' }, // 旧教材四年级上册 · 第三单元 · 11 蟋蟀的住宅
  'c4s1-03-garden': { id: '179bd995-9c9f-4da8-99d3-f98005a93c97', from: 'old' }, // 旧教材四年级上册 · 第三单元 · 语文园地（单元里相同的：爬山虎的脚、蟋蟀的住宅、爱护眼睛，保护视力、写观察日记）
  'c4s1-04-pangu': { id: '8b79827f-e5c5-4cfb-beee-43903170646f', from: 'old' }, // 旧教材四年级上册 · 第四单元 · 12 盘古开天地
  'c4s1-04-jingwei': { id: 'f4622eca-8b8f-4caa-b0c4-166abdf356f6', from: 'old' }, // 旧教材四年级上册 · 第四单元 · 13 精卫填海
  'c4s1-04-puluomi': { id: '184368fb-c940-4905-97f3-b4a16c18b557', from: 'old' }, // 旧教材四年级上册 · 第四单元 · 14 普罗米修斯
  'c4s1-04-nvwa': { id: '100dbbc3-5c15-4e81-9db8-70195d98988e', from: 'old' }, // 旧教材四年级上册 · 第四单元 · 15*女娲补天
  'c4s1-04-garden': { id: '52154b25-eccf-4aab-9286-2d92cac7fb79', from: 'old' }, // 旧教材四年级上册 · 第四单元 · 语文园地（单元里相同的：盘古开天地、精卫填海、普罗米修斯、女娲补天、我和____过一天、很久很久以前）
  'c4s1-05-maque': { id: '8528061d-2af0-4b2d-8212-19f9b9638863', from: 'old' }, // 旧教材四年级上册 · 第五单元 · 16 麻雀
  'c4s1-05-tiandu': { id: 'fe05b15b-f9f1-4c7d-ba14-d916706895db', from: 'old' }, // 旧教材四年级上册 · 第五单元 · 17 爬天都峰
  'c4s1-06-yiheyuan': { id: '24223de1-889c-fedb-476d-589152fcd4b5', from: 'old-elite' }, // 旧教材四年级下册 · 第五单元 · 习作例文： · 颐和园（精品课）
  'c4s1-07-niue': { id: 'f5ddb757-8ab9-4308-852e-8641eafa3a9a', from: 'old' }, // 旧教材四年级上册 · 第六单元 · 18 牛和鹅
  'c4s1-07-laohu': { id: '3b5e9201-1b05-419c-ae3e-e436c33d1bc5', from: 'old' }, // 旧教材四年级上册 · 第六单元 · 19 一只窝囊的大老虎
  'c4s1-07-tuoluo': { id: 'f7a293db-4e9f-4bd8-8ecd-ea1450370487', from: 'old' }, // 旧教材四年级上册 · 第六单元 · 20 陀螺
  'c4s1-07-wangrong': { id: 'd1e5af47-2d64-49b8-8603-85765b7ac2d8', from: 'old' }, // 旧教材四年级上册 · 第八单元 · 25 王戎不取道旁李
  'c4s1-07-garden': { id: '936e06c7-b031-4bca-889c-f99e0871caa2', from: 'old' }, // 旧教材四年级上册 · 第六单元 · 语文园地（单元里相同的：牛和鹅、一只窝囊的大老虎、陀螺、安慰）
  'c4s1-08-jueqi': { id: '2e19902c-8a4c-4393-a521-eb23767322a5', from: 'old' }, // 旧教材四年级上册 · 第七单元 · 22 为中华之崛起而读书
  'c4s1-08-yanan': { id: '04809709-8587-474a-931c-a7c0fa2916b8', from: 'old' }, // 旧教材四年级上册 · 第七单元 · 24* 延安，我把你追寻
  'c4s1-08-gushi': { id: '278aaa3d-bc23-4305-a88b-ea8ac9abf4f6', from: 'old' }, // 旧教材四年级上册 · 第七单元 · 21 古诗三首
  'c4s1-08-garden': { id: 'b96cb450-7a4e-4564-b132-59222b576c1e', from: 'old' }, // 旧教材四年级上册 · 第七单元 · 语文园地（单元里相同的：为中华之崛起而读书、延安，我把你追寻、写信）
  'c5s1-02-didaozhan': { id: '0a58f2e7-b8c6-4b8d-897e-1e17755eb9d8', from: 'old' }, // 旧教材五年级上册 · 第二单元 · 8 冀中的地道战
  'c5s1-02-jiangxianghe': { id: '847fe96f-38e4-47a7-a52d-463c21a3f2cb', from: 'old' }, // 旧教材五年级上册 · 第二单元 · 6 将相和
  'c5s1-02-liebao': { id: '3d88679c-33d8-4ada-a9b3-c5ee63f3c1ea', from: 'old' }, // 旧教材五年级上册 · 第二单元 · 7 什么比猎豹的速度更快
  'c5s1-02-nuomandi': { id: '4bcd3cd7-fc27-4acb-b858-473b228660f0', from: 'old' }, // 旧教材四年级下册 · 第七单元 · 24 “诺曼底号”遇难记
  'c5s1-02-garden': { id: '09ffea2f-1d63-4956-961d-b15022ab9e7b', from: 'old' }, // 旧教材五年级上册 · 第二单元 · 语文园地（单元里相同的：冀中的地道战、将相和、什么比猎豹的速度更快、“漫画”老师）
  'c5s1-03-hailibu': { id: '6e53a491-dacf-4926-9596-f92f41fa21a6', from: 'old' }, // 旧教材五年级上册 · 第三单元 · 9 猎人海力布
  'c5s1-03-niulang1': { id: '8ae7e4ab-7c85-a84a-017c-884bc5c2031d', from: 'old-elite' }, // 旧教材五年级上册 · 第三单元 · 10 牛郎织女（一）（精品课）
  'c5s1-03-niulang2': { id: '63ccd227-6a2e-4699-99cc-b97391077158', from: 'old' }, // 旧教材五年级上册 · 第三单元 · 11* 牛郎织女（二）
  'c5s1-03-garden': { id: '8ae7e4b3-83f9-d174-0184-0525c2ce1428', from: 'old-elite' }, // 旧教材五年级上册 · 第三单元 · 语文园地（精品课）（单元里相同的：猎人海力布、牛郎织女（一）、牛郎织女（二）、讲民间故事、从前有座山）
  'c5s1-04-gushi': { id: '5194e3c1-36ba-4a06-96cf-4a39a98e43bf', from: 'old' }, // 旧教材五年级上册 · 第四单元 · 12 古诗三首
  'c5s1-04-shaonian': { id: 'fad266fc-94f2-4ce4-af15-6541fe6f7ace', from: 'old' }, // 旧教材五年级上册 · 第四单元 · 13 少年中国说（节选）
  'c5s1-04-yuanmingyuan': { id: '83b16c61-e252-4abd-9c9b-464ef6f237df', from: 'old' }, // 旧教材五年级上册 · 第四单元 · 14 圆明园的毁灭
  'c5s1-04-meilanfang': { id: '7bd966b0-757d-470a-84cb-fe78446e5ec4', from: 'old' }, // 旧教材四年级上册 · 第七单元 · 23* 梅兰芳蓄须
  'c5s1-04-garden': { id: 'c0a712b6-2e58-4d72-a1e2-85033c497876', from: 'old' }, // 旧教材五年级上册 · 第四单元 · 语文园地（单元里相同的：少年中国说（节选）、圆明园的毁灭）
  'c5s1-05-taiyang': { id: '57eb9b76-b619-45fa-8cb3-77dfbab2b74b', from: 'old' }, // 旧教材五年级上册 · 第五单元 · 16 太阳
  'c5s1-05-jinzita': { id: '23740ddb-e9e7-4b4c-9207-ad01733e2657', from: 'old' }, // 旧教材五年级下册 · 第七单元 · 20*金字塔
  'c5s1-06-cimu': { id: '60fb2e7d-85f9-4d9a-863e-a72ac7e81882', from: 'old' }, // 旧教材五年级上册 · 第六单元 · 18 慈母情深
  'c5s1-06-fuai': { id: 'f6ecb9a9-1203-4550-af48-f51581cef4f0', from: 'old' }, // 旧教材五年级上册 · 第六单元 · 19 父爱之舟
  'c5s1-06-garden': { id: '608bc456-6ee5-4f26-ae07-4f29a9915a58', from: 'old' }, // 旧教材五年级上册 · 第六单元 · 语文园地（单元里相同的：慈母情深、父爱之舟、父母之爱、我想对您说）
  'c5s1-07-gushi': { id: '840ac221-cda9-4c8d-817b-c41923c3fad3', from: 'old' }, // 旧教材五年级上册 · 第七单元 · 21 古诗词三首
  'c5s1-07-bailu': { id: 'b1a405c2-b607-44eb-9b71-7ba9952344b0', from: 'old' }, // 旧教材五年级上册 · 第一单元 · 1 白鹭
  'c5s1-08-guren': { id: '430ec659-6529-4e50-99b5-9a3b5726bcb1', from: 'old' }, // 旧教材五年级上册 · 第八单元 · 25 古人谈读书
  'c5s1-08-yidushu': { id: 'b2ffdd44-c01d-44a0-b420-03c5340d600e', from: 'old' }, // 旧教材五年级上册 · 第八单元 · 26 忆读书
  'c5s1-08-garden': { id: 'bd1c84d3-4d85-451f-b343-e08a935f1173', from: 'old' }, // 旧教材五年级上册 · 第八单元 · 语文园地（单元里相同的：古人谈读书、忆读书、推荐一本书）
  'c6s1-01-garden': { id: '321c72e0-3443-4b46-a6a8-5bc4a75dd63f', from: 'old' }, // 旧教材六年级上册 · 第一单元 · 语文园地（单元里相同的：草原、丁香结、古诗词三首、变形记）
  'c6s1-02-changzheng': { id: 'f4b56808-e412-4742-863a-c204326b8230', from: 'old' }, // 旧教材六年级上册 · 第二单元 · 5 七律•长征
  'c6s1-02-langyashan': { id: '0d7f05e4-c33f-41a7-bca2-331586e00bf7', from: 'old' }, // 旧教材六年级上册 · 第二单元 · 6 狼牙山五壮士
  'c6s1-02-kaiguo': { id: 'f899eded-4611-492e-8124-b9b62253f9d1', from: 'old' }, // 旧教材六年级上册 · 第二单元 · 7 开国大典
  'c6s1-02-qiushaoyun': { id: '66ce497d-9777-11ec-92ef-246e9675e50c', from: 'old' }, // 旧教材六年级上册 · 第二单元 · 9*我的战友邱少云
  'c6s1-02-garden': { id: '672e09f0-fd90-4a88-8c6d-50c2fa955f53', from: 'old' }, // 旧教材六年级上册 · 第二单元 · 语文园地（单元里相同的：七律·长征、狼牙山五壮士、开国大典、我的战友邱少云、演讲、多彩的活动）
  'c6s1-03-zhujieren': { id: '72eedf25-0135-4d33-8a5d-8f465db47526', from: 'old' }, // 旧教材六年级上册 · 第三单元 · 10 竹节人
  'c6s1-03-yuzhou': { id: '50f25f55-830a-41c6-a9fe-ff6660e76fdb', from: 'old' }, // 旧教材六年级上册 · 第三单元 · 11 宇宙生命之谜
  'c6s1-03-gugong': { id: 'cefbdbe8-0458-4fd7-ac3d-15a6d516fd90', from: 'old' }, // 旧教材六年级上册 · 第三单元 · 12*故宫博物院
  'c6s1-03-garden': { id: 'b4b76d1f-977c-48d2-9507-d20a146f9282', from: 'old' }, // 旧教材六年级上册 · 第三单元 · 语文园地（单元里相同的：竹节人、宇宙生命之谜、故宫博物院）
  'c6s1-04-qiao': { id: 'd249d901-33a9-472f-bec1-b44d0d983f2a', from: 'old' }, // 旧教材六年级上册 · 第四单元 · 13 桥
  'c6s1-04-qiongren': { id: '051a400c-cdd8-4600-8bd7-ba22a63d9293', from: 'old' }, // 旧教材六年级上册 · 第四单元 · 14 穷人
  'c6s1-04-yugou': { id: '66ce4a81-9777-11ec-92ef-246e9675e50c', from: 'old' }, // 旧教材六年级上册 · 第四单元 · 15*金色的鱼钩
  'c6s1-04-garden': { id: '70b447dd-8c46-42cb-bdf6-a2229747f0e5', from: 'old' }, // 旧教材六年级上册 · 第四单元 · 语文园地（单元里相同的：桥、穷人、请你支持我、笔尖流出的故事、笑与泪，经历与成长）
  'c6s1-05-dengguang': { id: '0939c22c-8240-49f0-a8c2-47bdda25528c', from: 'old' }, // 旧教材六年级上册 · 第二单元 · 8* 灯光
  'c6s1-05-pan': { id: 'b3b5ba2e-4dab-4497-90b6-5ffdaad39f84', from: 'old' }, // 旧教材六年级上册 · 第五单元 · 17 盼
  'c6s1-06-diqiu': { id: 'bcbe17d4-5fdd-4c54-a70f-bddaf4a29947', from: 'old' }, // 旧教材六年级上册 · 第六单元 · 19 只有一个地球
  'c6s1-06-qingshan': { id: '8e485e76-3d2a-4ce5-85d4-47dbd14e9bce', from: 'old' }, // 旧教材六年级上册 · 第六单元 · 20*青山不老
  'c6s1-06-sanhei': { id: '630b7260-b32b-4283-a64a-e0f6386d40d5', from: 'old' }, // 旧教材六年级上册 · 第六单元 · 21*三黑和土地
  'c6s1-06-gushi': { id: '527f4ffb-0f95-46b6-8234-fe115fbfa977', from: 'old' }, // 旧教材六年级上册 · 第六单元 · 18 古诗三首
  'c6s1-06-garden': { id: '47072d86-1c12-407c-9d39-68798eea515c', from: 'old' }, // 旧教材六年级上册 · 第六单元 · 语文园地（单元里相同的：只有一个地球、青山不老、三黑和土地、意见不同怎么办、学写倡议书）
  'c6s1-07-wenyan': { id: '792b1e38-1968-4c7b-bf23-80386a4e75cb', from: 'old' }, // 旧教材六年级下册 · 第五单元 · 14 文言文二则 · 两小儿辩日
  'c6s1-07-biaoli': { id: '25c296d4-547b-40e3-8cc0-f03043040b12', from: 'old' }, // 旧教材六年级下册 · 第五单元 · 16 表里的生物
  'c6s1-07-youqu': { id: '51e4f640-ad63-418d-972d-2c3f09030a63', from: 'old' }, // 旧教材六年级下册 · 第五单元 · 17*他们那时候多有趣啊
  'c6s1-07-garden': { id: 'a487b6b3-71ca-4289-bd64-c6d60973a4c8', from: 'old' }, // 旧教材六年级下册 · 第五单元 · 语文园地
  'c6s1-08-runtu': { id: 'b2f06335-d5eb-4f84-bd95-3b36b1f03696', from: 'old' }, // 旧教材六年级上册 · 第八单元 · 25 少年闰土
  'c6s1-08-haogushi': { id: '405d5dad-7c64-4a48-9f17-167c1930e221', from: 'old' }, // 旧教材六年级上册 · 第八单元 · 26 好的故事
  'c6s1-08-bofu': { id: 'fb2997bd-74c6-4c96-aa5e-5c2d19545275', from: 'old' }, // 旧教材六年级上册 · 第八单元 · 27*我的伯父鲁迅先生
  'c6s1-08-youderen': { id: '1319d968-6157-4d0e-908d-0ba879016d21', from: 'old' }, // 旧教材六年级上册 · 第八单元 · 28*有的人——纪念鲁迅有感
  'c6s1-08-garden': { id: '8d1a01b7-a562-431c-8a40-519e684ec0e8', from: 'old' }, // 旧教材六年级上册 · 第八单元 · 语文园地（单元里相同的：少年闰土、好的故事、我的伯父鲁迅先生）
  'c6s2-07-caiwei': { id: '84c223bc-1a62-e755-a1ad-035edf5021f3', from: 'elite' }, // 六年级下册 · 古诗词诵读 · 1 采薇（节选）（精品课）
  'c6s2-07-songyuaner': { id: 'fb15c193-6341-c8c6-ea4e-fb26f94f35b3', from: 'elite' }, // 六年级下册 · 古诗词诵读 · 2 送元二使安西（精品课）
  'c6s2-07-chunye': { id: 'e3895562-cdfa-9a77-56c8-9e27c6e84477', from: 'elite' }, // 六年级下册 · 古诗词诵读 · 3 春夜喜雨（精品课）
  'c6s2-07-zaochun': { id: 'fbd33638-fdda-5e3c-a4fd-60634e922bfa', from: 'elite' }, // 六年级下册 · 古诗词诵读 · 4 早春呈水部张十八员外（精品课）
  'c6s2-07-yuzhe': { id: 'd6cdc311-f5f9-0230-2b61-f21edaabc4a4', from: 'elite' }, // 六年级下册 · 古诗词诵读 · 5 江上渔者（精品课）
  'c6s2-07-guazhou': { id: 'e0bdcb3b-5ee4-bca3-9eeb-00ada120e332', from: 'elite' }, // 六年级下册 · 古诗词诵读 · 6 泊船瓜洲（精品课）
  'c6s2-07-youyuan': { id: 'ae955655-64d0-c770-2f61-5c0280381b68', from: 'elite' }, // 六年级下册 · 古诗词诵读 · 7 游园不值（精品课）
  'c6s2-07-busuanzi': { id: '496cce7f-fce6-55a3-9655-53944f56b296', from: 'elite' }, // 六年级下册 · 古诗词诵读 · 8 卜算子·送鲍浩然之浙东（精品课）
  'c6s2-07-huanxisha': { id: 'bae07e9d-3b01-f055-50a0-df08b8a81f90', from: 'elite' }, // 六年级下册 · 古诗词诵读 · 9 浣溪沙（精品课）
  'c6s2-07-qingpingle': { id: 'bb08f5f5-497d-c1bb-7b1a-364fb61b3921', from: 'elite' }, // 六年级下册 · 古诗词诵读 · 10 清平乐（精品课）
  'e3s1-07-revision': { id: 'ec818ee0-d48d-f17c-ffba-24202236ef20', from: 'elite' }, // 新教材三年级上册 · Revision Being a good guest（精品课）
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
