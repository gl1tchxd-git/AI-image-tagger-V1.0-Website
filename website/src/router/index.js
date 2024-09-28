import { createWebHistory, createRouter } from 'vue-router'

import gallery from '../pages/gallery.vue'
import upload from '../pages/upload.vue'
import about from '../pages/about.vue'

const routes = [
  { path: '/gallery', component: gallery },
  { path: '/upload', component: upload },
  { path: '/about', component: about },
  { path: '/', redirect: '/gallery' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
