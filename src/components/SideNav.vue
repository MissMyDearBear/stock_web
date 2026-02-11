<template>
  <div class="sidenav">
    <div class="logo">Make a million</div>
    <nav class="menu">
      <router-link to="/" class="menu-item">Dashboard</router-link>
      <router-link to="/alerts" class="menu-item">Stock</router-link>
      <router-link to="/news" class="menu-item">News</router-link>
      <router-link to="/about" class="menu-item">About</router-link>
    </nav>
  </div>
</template>

<style scoped>
.logo {
  padding: 2rem;
  font-size: 1.5rem;
  font-weight: bold;
  text-align: center;
  border-bottom: 1px solid #334155;
}

.menu {
  display: flex;
  flex-direction: column;
  padding-top: 1rem;
}

.menu-item {
  padding: 1rem 2rem;
  color: #94a3b8;
  text-decoration: none;
  transition: all 0.3s;
}

.menu-item:hover {
  background-color: #334155;
  color: white;
}

/* 路由激活时的样式 */
/* 只有路径完全一致时才高亮 */
.router-link-exact-active {
  background-color: #2563eb;
  color: white;
  border-right: 4px solid #60a5fa;
}
</style>