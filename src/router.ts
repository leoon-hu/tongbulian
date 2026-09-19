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
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

export default router
