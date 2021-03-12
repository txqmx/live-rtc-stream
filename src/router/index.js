import Vue from 'vue'
import VueRouter from 'vue-router'

Vue.use(VueRouter)

const routes = [
  // {
  //   path: '/',
  //   name: 'login',
  //   component: () => import('../views/login.vue'),
  // },
  {
    path: '/',
    name: 'mediaSoup',
    component: () => import('../views/mediaSoup.vue'),
  },
  {
    path: '/liveRoom',
    name: 'liveRoom',
    component: () => import('../views/liveRoom.vue'),
  }
]
const router = new VueRouter({
  mode: 'hash',
  routes
})

export default router
