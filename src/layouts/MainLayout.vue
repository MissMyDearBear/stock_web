<template>
  <div class="main-layout">
    <!-- 移动端顶部栏 -->
    <header class="mobile-header">
      <button class="menu-btn" @click="toggleSidebar">☰</button>
      <div class="title">My App</div>
    </header>

    <!-- 遮罩层（移动端） -->
    <div v-if="isMobile && sidebarOpen" class="overlay" @click="sidebarOpen = false" />

    <!-- 侧边栏 -->
    <aside class="sidebar" :class="{ open: sidebarOpen || !isMobile }">
      <SideNav />
    </aside>

    <!-- 内容区域 -->
    <main class="content">
      <router-view v-slot="{ Component, route }">
        <transition name="fade" mode="out-in">
          <component :is="Component" :key="route.fullPath" />
        </transition>
      </router-view>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import SideNav from '../components/SideNav.vue'
import { provide } from 'vue'

const sidebarOpen = ref(false)
const isMobile = ref(false)

const checkScreen = () => {
  isMobile.value = window.innerWidth <= 768
  if (!isMobile.value) {
    sidebarOpen.value = false
  }
}

provide('closeSidebar', () => {
  sidebarOpen.value = false
})

const toggleSidebar = () => {
  sidebarOpen.value = !sidebarOpen.value
}

onMounted(() => {
  checkScreen()
  window.addEventListener('resize', checkScreen)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkScreen)
})
</script>

<style scoped>
/* 整体布局 */
.main-layout {
  display: flex;
  height: 100dvh;
  /* 移动端更安全 */
  width: 100%;
  overflow: hidden;
  position: relative;
}

/* ======================
   移动端顶部栏
====================== */
.mobile-header {
  display: none;
  height: 56px;
  background: #1e293b;
  color: white;
  align-items: center;
  padding: 0 1rem;
  flex-shrink: 0;
}

.menu-btn {
  font-size: 20px;
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  margin-right: 1rem;
}

.title {
  font-weight: 600;
}

/* ======================
   侧边栏
====================== */
.sidebar {
  width: 240px;
  background-color: #1e293b;
  color: white;
  flex-shrink: 0;
  transition: transform 0.3s ease;
}

/* 移动端默认隐藏 */
@media (max-width: 768px) {
  .mobile-header {
    display: flex;
  }

  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    height: 100%;
    transform: translateX(-100%);
    z-index: 1000;
  }

  .sidebar.open {
    transform: translateX(0);
  }
}

/* ======================
   遮罩层
====================== */
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 999;
}

/* ======================
   内容区域
====================== */
.content {
  flex: 1;
  background-color: #f8fafc;
  overflow-y: auto;
  padding: 2rem;
  min-width: 0;
}

/* 移动端内容区顶部留出 header */
@media (max-width: 768px) {
  .content {
    padding: 1rem;
    margin-top: 56px;
  }
}

/* ======================
   页面切换动画
====================== */
.fade-enter-active,
.fade-leave-active {
  transition: all 0.25s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
