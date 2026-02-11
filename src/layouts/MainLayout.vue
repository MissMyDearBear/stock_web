<template>
  <div class="main-layout">
    <aside class="sidebar">
      <SideNav />
    </aside>

    <main class="content">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
  </div>
</template>

<script setup>
import SideNav from '../components/SideNav.vue';
</script>

<style scoped>
.main-layout {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.sidebar {
  width: 240px;
  background-color: #1e293b; /* 深色背景 */
  color: white;
  flex-shrink: 0;
}

.content {
  flex: 1;
  background-color: #f8fafc;
  overflow-y: auto;
  padding: 2rem;
}

/* 简单的切换动画 */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>