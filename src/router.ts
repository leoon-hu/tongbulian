import { createRouter, createWebHashHistory } from 'vue-router'
import SubjectPickerView from '@/views/SubjectPickerView.vue'

// hash 路由：本地静态部署（vite preview / 直接开 dist）也能正常刷新
const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'subjects', component: SubjectPickerView },
    {
      path: '/s/:subjectId',
      name: 'grades',
      component: () => import('@/views/GradePickerView.vue'),
    },
    {
      path: '/s/:subjectId/g/:gradeId',
      name: 'topics',
      component: () => import('@/views/TopicMapView.vue'),
    },
    {
      path: '/s/:subjectId/g/:gradeId/practice/:kpId',
      name: 'practice',
      component: () => import('@/views/PracticeView.vue'),
    },
    // 对战（需求 §8）：设置页与单设备竞技场只带 kpId（学科 / 年级由目录反查）
    {
      path: '/battle/new/:kpId',
      name: 'battle-setup',
      component: () => import('@/views/battle/BattleSetupView.vue'),
    },
    {
      path: '/battle/local/:kpId',
      name: 'battle-local',
      component: () => import('@/views/battle/BattleArenaView.vue'),
    },
    // 输房间号加入（B20）：给没法扫码的设备
    { path: '/battle/join', name: 'battle-join', component: () => import('@/views/battle/BattleJoinView.vue') },
    // 多设备房间（B19–B21）：大厅 → 竞技场 → 结果，同一视图分阶段；房间号 6 位，去掉 0 O 1 I L
    {
      path: '/battle/:code([A-HJ-NP-Z2-9]{6})',
      name: 'battle-room',
      component: () => import('@/views/battle/BattleRoomView.vue'),
    },
    // 帮助页（需求 F17）：学习内容 / 题目、对战玩法、规则、技巧、常见问题
    { path: '/help', name: 'help', component: () => import('@/views/HelpView.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

export default router
