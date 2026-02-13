<template>
  <div class="sidenav">
    <div class="logo">
      <span class="logo-text">Make a million</span>
    </div>

    <nav class="menu">
      <router-link v-for="item in menuList" :key="item.path" :to="item.path" class="menu-item" active-class="is-active"
        exact-active-class="is-active" @click="handleClick">
        <span class="label">{{ item.label }}</span>
      </router-link>
    </nav>
  </div>
</template>

<script setup>
import { inject } from 'vue'

const emitClose = inject('closeSidebar', null)

const menuList = [
  { path: '/', label: 'Dashboard' },
  { path: '/alerts', label: 'Stock' },
  { path: '/news', label: 'News' },
  { path: '/about', label: 'About' }
]

const handleClick = () => {
  // 如果是移动端，点击菜单自动关闭
  if (emitClose) {
    emitClose()
  }
}
</script>

<style scoped>
.sidenav {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* ======================
   Logo 区域
====================== */
.logo {
  padding: 1.5rem 1rem;
  text-align: center;
  border-bottom: 1px solid #334155;
}

.logo-text {
  font-size: 1.3rem;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: white;
}

/* ======================
   菜单区域
====================== */
.menu {
  display: flex;
  flex-direction: column;
  padding-top: 0.5rem;
}

.menu-item {
  padding: 0.9rem 1.5rem;
  color: #94a3b8;
  text-decoration: none;
  display: flex;
  align-items: center;
  position: relative;
  transition: background 0.25s ease, color 0.25s ease;
}

/* hover */
.menu-item:hover {
  background-color: #334155;
  color: white;
}

/* 激活状态 */
.menu-item.is-active {
  background-color: #1e40af;
  color: white;
}

/* 左侧高亮条（更现代） */
.menu-item.is-active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 20%;
  height: 60%;
  width: 4px;
  background: #60a5fa;
  border-radius: 0 4px 4px 0;
}

/* 文本 */
.label {
  font-size: 0.95rem;
  font-weight: 500;
}

/* ======================
   移动端优化
====================== */
@media (max-width: 768px) {
  .logo {
    padding: 1rem;
  }

  .menu-item {
    padding: 1rem 1.2rem;
  }
}
</style>
