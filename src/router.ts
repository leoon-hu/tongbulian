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
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

export default router
