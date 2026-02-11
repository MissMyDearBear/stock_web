import { createRouter, createWebHistory } from 'vue-router';
import MainLayout from '../layouts/MainLayout.vue';

const routes = [
  {
    path: '/',
    component: MainLayout, // 只要匹配到以下路径，都会先加载 MainLayout
    children: [
      {
        path: '', // 默认首页
        name: 'Dashboard',
        component: () => import('../views/Dashboard.vue')
      },
      {
        path: 'alerts',
        name: 'Alerts',
        component: () => import('../views/StockAlert.vue')
      },
      {
        path: 'news',
        name: 'News',
        component: () => import('../views/News.vue')
      },
      {
        path: 'about',
        name: 'About',
        component: () => import('../views/About.vue')
      }
    ]
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;