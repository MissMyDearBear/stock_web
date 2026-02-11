<template>
  <div class="page-container">
    <div class="header">
      <h2>股票预警设置</h2>
      <button @click="addStock" class="btn-add">+ 添加预警</button>
    </div>

    <div class="stock-list">
      <div v-for="item in stocks" :key="item.id" class="stock-card">
        <span class="symbol">{{ item.symbol }}</span>
        <span class="price">当前: ${{ item.price }}</span>
        <span class="alert">阈值: > {{ item.threshold }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const stocks = ref([
  { id: 1, symbol: 'AAPL', price: 185.2, threshold: 190 },
  { id: 2, symbol: 'TSLA', price: 240.5, threshold: 250 },
]);

const addStock = () => {
  // 这里后续写逻辑
  console.log('添加新股票');
};
</script>

<style scoped>
.header { display: flex; justify-content: space-between; margin-bottom: 20px; }
.btn-add { background: #2563eb; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; }
.stock-card { background: white; padding: 15px; border-radius: 8px; margin-bottom: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); display: flex; gap: 20px; }
.symbol { font-weight: bold; width: 80px; }
</style>