import { createRouter, createWebHistory } from 'vue-router'
import Reader from '../views/Reader.vue'

const routes = [
  {
    path: '/',
    name: 'Reader',
    component: Reader
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router