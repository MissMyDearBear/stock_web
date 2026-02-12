<template>
  <div class="dashboard-wrapper">
    <div class="dashboard-header">
      <div class="header-main">
        <h1>Portfolio Insights</h1>
        <button @click="manualRefresh" :disabled="isRefreshing || cooldown > 0" class="btn-refresh">
          <span v-if="cooldown > 0">{{ cooldown }}s</span>
          <span v-else-if="isRefreshing" class="spinner"></span>
          <span v-else>🔄 Refresh Prices</span>
        </button>
      </div>
      <p>Visual analysis of your current holdings</p>
    </div>

    <div class="dashboard-content">
      <div class="stats-column">
        <div class="info-card">
          <span class="label">Total Investment</span>
          <div class="value">￥{{ totalAmount.toLocaleString() }}</div>
        </div>

        <div class="info-card market-value-card" :class="profitStatus">
          <span class="label">Current Market Value</span>
          <div class="value">￥{{ currentMarketValue.toLocaleString(undefined, { minimumFractionDigits: 2 }) }}</div>
          <div class="sub-value">
            {{ totalProfit >= 0 ? 'Surplus' : 'Deficit' }}: ￥{{ Math.abs(totalProfit).toLocaleString() }}
          </div>
        </div>

        <div class="info-card highlight">
          <span class="label">Largest Position</span>
          <div class="value">{{ largestPosition.name || 'N/A' }}</div>
          <div class="sub-value">{{ largestPosition.percent }}% of total portfolio</div>
        </div>

        <div class="info-card profit-card" :class="totalProfit >= 0 ? 'up' : 'down'">
          <span class="label">Total Profit/Loss</span>
          <div class="value">
            {{ totalProfit >= 0 ? '+' : '' }}￥{{ totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2 }) }}
          </div>
          <div class="sub-value">收益率: {{ profitRate }}%</div>
        </div>
      </div>

      <div class="chart-card">
        <h3>Asset Allocation</h3>
        <div ref="chartRef" class="echarts-box"></div>
      </div>
      <div class="history-section">
        <div class="history-header">
          <h3>Profit History (Last 15 Days)</h3>
          <button @click="saveTodayRecord" class="btn-save-record">Record</button>
        </div>
        <div ref="lineChartRef" class="line-chart-box"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue';
import * as echarts from 'echarts';
import axios from 'axios';
import { getStocks, getMarketPrices, getHistory, saveRecord } from '../api/stock';


// --- 状态定义 ---
const stocks = ref([]);
const marketPrices = ref({});
const chartRef = ref(null);
const isRefreshing = ref(false);
const cooldown = ref(0);
let myChart = null;
let cooldownTimer = null;
const lineChartRef = ref(null);
let myLineChart = null;

// --- 计算逻辑 ---

// 1. 总投入成本
const totalAmount = computed(() => {
  return stocks.value.reduce((sum, s) => sum + (s.costPrice * s.quantity), 0);
});

// 2. 当前总市值 (现价 * 数量)
const currentMarketValue = computed(() => {
  return stocks.value.reduce((sum, s) => {
    const price = marketPrices.value[s.symbol] || s.costPrice;
    return sum + (price * s.quantity);
  }, 0);
});

// 3. 总盈亏额
const totalProfit = computed(() => currentMarketValue.value - totalAmount.value);

// 4. 总收益率
const profitRate = computed(() => {
  return totalAmount.value === 0 ? "0.00" : ((totalProfit.value / totalAmount.value) * 100).toFixed(2);
});

// 5. 市值文字颜色状态
const profitStatus = computed(() => {
  if (totalProfit.value > 0) return 'text-up';
  if (totalProfit.value < 0) return 'text-down';
  return 'text-flat';
});

// 6. 最大持仓计算
const largestPosition = computed(() => {
  if (stocks.value.length === 0) return { name: '', percent: 0 };
  const sorted = [...stocks.value].sort((a, b) => (b.costPrice * b.quantity) - (a.costPrice * a.quantity));
  const top = sorted[0];
  const percent = totalAmount.value === 0 ? 0 : ((top.costPrice * top.quantity) / totalAmount.value * 100).toFixed(1);
  return { name: top.name || top.symbol, percent };
});

// --- 方法定义 ---

const renderChart = () => {
  if (!chartRef.value) return;
  if (myChart) myChart.dispose();
  myChart = echarts.init(chartRef.value);

  const chartData = stocks.value.map(s => ({
    name: s.name || s.symbol,
    value: ((marketPrices.value[s.symbol] || s.costPrice) * s.quantity).toFixed(2)
  }));

  myChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: ￥{c} ({d}%)' },
    legend: { bottom: '5%', textStyle: { color: '#64748b' } },
    series: [{
      type: 'pie',
      radius: ['50%', '80%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
      label: { show: false, position: 'center' },
      emphasis: { label: { show: true, fontSize: 20, fontWeight: 'bold', formatter: '{d}%' } },
      data: chartData,
      color: ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe']
    }]
  });
};

const fetchPrices = async () => {
  try {
    const res = await getMarketPrices();
    marketPrices.value = res.data;
    renderChart();
  } catch (err) {
    console.error("行情获取失败:", err);
  }
};

const loadData = async () => {
  try {
    const res = await getStocks();
    stocks.value = res.data;
    renderChart();
  } catch (err) {
    console.error("数据加载失败:", err);
  }
};

const manualRefresh = async () => {
  isRefreshing.value = true;
  await fetchPrices();
  isRefreshing.value = false;
  cooldown.value = 15;
  cooldownTimer = setInterval(() => {
    if (--cooldown.value <= 0) clearInterval(cooldownTimer);
  }, 1000);
};

const handleResize = () => myChart && myChart.resize();

// 渲染历史折线图
const renderLineChart = (historyData) => {
  if (!lineChartRef.value) return;
  if (myLineChart) myLineChart.dispose();
  myLineChart = echarts.init(lineChartRef.value);

  const option = {
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: historyData.map(d => d.date.slice(5)), // 只显示 月-日
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: { color: '#64748b' }
    },
    yAxis: {
      type: 'value',
      axisLabel: { formatter: '￥{value}' },
      splitLine: { lineStyle: { type: 'dashed', color: '#f1f5f9' } }
    },
    tooltip: { trigger: 'axis' },
    series: [{
      data: historyData.map(d => d.profit),
      type: 'line',
      smooth: true,
      symbolSize: 8,
      lineStyle: { width: 4, color: '#2563eb' },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(37, 99, 235, 0.2)' },
          { offset: 1, color: 'rgba(37, 99, 235, 0)' }
        ])
      },
      itemStyle: { color: '#2563eb', borderSize: 2 }
    }]
  };
  myLineChart.setOption(option);
};

// 获取历史数据
const loadHistory = async () => {
  try {
    const res = await getHistory();
    renderLineChart(res.data);
  } catch (err) {
    console.error("历史数据加载失败", err);
  }
};

// 保存今日数据快照
const saveTodayRecord = async () => {
  try {
    await saveRecord(totalProfit.value);
    alert("Record saved!");
    loadHistory(); // 刷新折线图
  } catch (err) {
    alert("Save failed");
  }
};

// --- 生命周期 ---
onMounted(async () => {
  await loadData();
  await fetchPrices();
  await loadHistory();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  if (cooldownTimer) clearInterval(cooldownTimer);
  window.removeEventListener('resize', handleResize);
});
</script>

<style scoped>
.dashboard-wrapper {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 16px;
  font-family: system-ui, sans-serif;
}

/* ======================
   Header
====================== */
.dashboard-header {
  margin-bottom: 24px;
}

.header-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.dashboard-header h1 {
  font-size: 28px;
  color: #1e293b;
  margin: 0;
}

.dashboard-header p {
  color: #64748b;
  margin-top: 6px;
  font-size: 14px;
}

/* ======================
   主体布局
====================== */
.dashboard-content {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 24px;
}

/* 小屏直接单列 */
@media (max-width: 1024px) {
  .dashboard-content {
    grid-template-columns: 1fr;
  }
}

/* ======================
   统计卡片区域
====================== */
.stats-column {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

/* 手机改成 2 列卡片 */
@media (max-width: 640px) {
  .stats-column {
    grid-template-columns: 1fr 1fr;
  }

  .stats-column .info-card {
    padding: 16px;
  }
}

/* ======================
   卡片样式
====================== */
.info-card {
  background: white;
  padding: 20px;
  border-radius: 18px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.04);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.info-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.06);
}

.label {
  display: block;
  font-size: 12px;
  color: #64748b;
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.6px;
}

.value {
  font-size: 22px;
  font-weight: 700;
  color: #1e293b;
}

.sub-value {
  font-size: 12px;
  margin-top: 4px;
  opacity: 0.85;
}

/* ======================
   高亮卡
====================== */
.info-card.highlight {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  color: white;
  border: none;
}

.highlight .label,
.highlight .value {
  color: white;
}

/* ======================
   盈亏卡（修正颜色语义）
====================== */
.info-card.profit-card.down {
  background: linear-gradient(135deg, #22c55e 0%, #166534 100%);
  color: white;
  border: none;
}

.info-card.profit-card.up {
  background: linear-gradient(135deg, #ef4444 0%, #991b1b 100%);
  color: white;
  border: none;
}

.profit-card .label,
.profit-card .value {
  color: white;
}

/* ======================
   市值动态颜色
====================== */
.market-value-card.text-up .value {
  color: #ef4444;
}

.market-value-card.text-down .value {
  color: #ef4444;
}

/* ======================
   图表卡
====================== */
.chart-card {
  background: white;
  padding: 20px;
  border-radius: 20px;
  border: 1px solid #e2e8f0;
}

.echarts-box {
  width: 100%;
  height: 380px;
}

/* 手机图表高度降低 */
@media (max-width: 640px) {
  .echarts-box {
    height: 280px;
  }
}

/* ======================
   按钮
====================== */
.btn-refresh {
  background: white;
  border: 1px solid #e2e8f0;
  padding: 8px 14px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  transition: all 0.2s ease;
}

.btn-refresh:hover {
  background: #f1f5f9;
}

.btn-refresh:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

/* ======================
   历史区域
====================== */
.history-section {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid #f1f5f9;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 10px;
}

.line-chart-box {
  width: 100%;
  height: 240px;
}

@media (max-width: 640px) {
  .line-chart-box {
    height: 200px;
  }
}

/* ======================
   Spinner
====================== */
.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid #94a3b8;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>