import { createRouter, createWebHashHistory } from 'vue-router'
import SubjectPickerView from '@/views/SubjectPickerView.vue'
import { courseLoaded, courseOfKp, getCourse, loadCourse } from '@/engine/catalog'

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
    // 多设备房间（B19–B21）：二维码页 / 连接状态 → 竞技场 → 结果，同一视图分阶段；房间号 6 位，去掉 0 O 1 I L
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

/** 地址里的这门课：地图 / 练习按学科、年级找，对战按知识点反查 */
function courseOf(params: Record<string, unknown>): string | undefined {
  const one = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined)
  const kpId = one(params.kpId)
  if (kpId) return courseOfKp(kpId)?.course.id
  const subjectId = one(params.subjectId)
  const gradeId = one(params.gradeId)
  return subjectId && gradeId ? getCourse(subjectId, gradeId)?.id : undefined
}

// 内容包按需加载（N8）：进地图 / 练习 / 对战之前把这门课的生成器与题目词条加载好，视图里照旧同步出题；
// 加载失败（断网又没缓存）照样放行，视图按「没有这个知识点」处理（地图显示敬请期待、练习页回地图）
router.beforeEach(async (to) => {
  const id = courseOf(to.params)
  if (id && !courseLoaded(id)) await loadCourse(id).catch(() => undefined)
})

export default router
