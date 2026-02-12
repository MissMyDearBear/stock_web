<template>
  <div class="analysis-container">
    <el-card class="search-card">
      <template #header>
        <div class="card-header">
          <span>📈 智能技术推演引擎</span>
          <el-button type="info" size="small" plain @click="openHistory">
            <el-icon style="margin-right: 4px;">
              <Timer />
            </el-icon> 历史记录
          </el-button>
        </div>
      </template>

      <el-form :model="form" class="search-form">
        <el-form-item label="代码">
          <el-input v-model="form.code" placeholder="如: 510300" clearable />
        </el-form-item>
        <el-form-item label="市场">
          <el-select v-model="form.type" style="width: 100px">
            <el-option label="沪市" value="sh" />
            <el-option label="深市" value="sz" />
            <el-option label="ETF" value="etf" />
          </el-select>
        </el-form-item>
        <el-button type="primary" :loading="loading" @click="startAnalysis" class="analyze-btn">
          开始分析
        </el-button>
      </el-form>
    </el-card>

    <div v-if="result" class="result-area">
      <el-card class="decision-card">
        <div class="stock-header">
          <div>
            <div class="stock-name">{{ result.name }}</div>
            <div class="stock-code">{{ result.code }} · {{ result.date }}</div>
          </div>
          <div class="price">¥{{ result.price }}</div>
        </div>

        <div class="decision-box" :class="getDecisionClass(result.decision)">
          <div class="dec-text">{{ result.decision }}</div>
          <div class="prob">买入概率 {{ result.probability?.buy ?? 0 }}%</div>
        </div>
      </el-card>

      <h4 class="section-title">核心技术指标</h4>
      <div class="indicator-grid">
        <el-card v-for="(val, key) in result.indicators" :key="key" class="indicator-card" shadow="never">
          <div class="mini-label">
            {{ key.toUpperCase() }}
            <el-tooltip effect="dark" :content="getIndicatorTip(key)" placement="top">
              <el-icon class="help-icon">
                <QuestionFilled />
              </el-icon>
            </el-tooltip>
          </div>
          <div class="mini-value">{{ val }}</div>
        </el-card>
      </div>

      <h4 class="section-title">高级量化因子</h4>
      <el-card class="advanced-card">
        <el-row :gutter="20">
          <el-col :xs="12" :sm="6" v-for="factor in factorDetails" :key="factor.key">
            <div class="factor-item">
              <div class="f-label">
                {{ factor.label }}
                <el-tooltip :content="factor.tip" placement="top">
                  <el-icon class="help-icon">
                    <InfoFilled />
                  </el-icon>
                </el-tooltip>
              </div>
              <div class="f-value">{{ getFactorValue(factor.key) }}</div>
            </div>
          </el-col>
        </el-row>
      </el-card>

      <div class="footer-info">
        <p>💡 提示：RSI > 70 警惕超买，Beta > 1 波动强于大盘。点击历史记录可查看往期推演。</p>
        <p>⚠️ 本报告由 AI 自动生成，不构成投资建议。</p>
      </div>
    </div>

    <el-empty v-else description="请输入股票代码获取实时分析报告" />

    <el-drawer v-model="historyDrawer" title="历史查询记录" size="90%" direction="rtl">
      <el-table :data="historyList" v-loading="historyLoading" size="small">
        <el-table-column label="名称/代码" min-width="130">
          <template #default="scope">
            <div style="font-weight: bold; font-size: 14px;">{{ scope.row.name }}</div>
            <el-tag :type="getTypeTag(scope.row.type)" size="small" style="margin-top: 4px;">
              {{ scope.row.type }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="决策/日期" width="110">
          <template #default="scope">
            <div :style="{ color: getDecisionColor(scope.row.data?.decision), fontWeight: 'bold' }">
              {{ scope.row.data?.decision || 'N/A' }}
            </div>
            <div style="font-size: 11px; color: #999">{{ scope.row.data?.date || '-' }}</div>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="100" fixed="right">
          <template #default="scope">
            <el-button link type="primary" @click="loadBack(scope.row)">加载</el-button>
            <el-popover placement="left" :width="280" trigger="click">
              <template #reference>
                <el-button link type="info">详情</el-button>
              </template>
              <div class="json-detail">
                <pre>{{ scope.row.data }}</pre>
              </div>
            </el-popover>
          </template>
        </el-table-column>
      </el-table>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { Timer, QuestionFilled, InfoFilled } from '@element-plus/icons-vue'
import { getMarketAnalysis, getSupposeList } from '../api/stock';
import axios from 'axios'

// --- 基础状态 ---
const form = reactive({ code: '', type: 'sh' })
const loading = ref(false)
const result = ref(null)
const HOST = 'http://localhost:3000'

// --- 历史记录状态 ---
const historyDrawer = ref(false)
const historyLoading = ref(false)
const historyList = ref([])

// --- 工具函数：指标释义 ---
const getIndicatorTip = (key) => {
  const tips = {
    rsi: 'RSI: 相对强弱指数。>70超买，<30超卖。',
    atrRatio: 'ATR Ratio: 波动率因子，反映股价震荡剧烈程度。',
    dailyChange: 'Daily Change: 当日涨跌幅。'
  }
  return tips[key] || '技术指标数据'
}

const factorDetails = [
  { key: 'beta', label: 'Beta (β)', tip: '衡量相对于大盘的波动性。' },
  { key: 'sharpe', label: 'Sharpe', tip: '夏普比率。每承担一单位风险获得的超额回报。' },
  { key: 'resonance', label: '共振分', tip: '多周期信号一致性。得分越高信号越明确。' },
  { key: 'riskScore', label: '风险分', tip: '综合风险评估。分数越高潜在波动越大。' }
]

const getFactorValue = (key) => {
  if (key === 'riskScore') return result.value?.riskScore ?? 'N/A'
  return result.value?.advancedFactors?.[key] ?? 'N/A'
}

// --- 核心逻辑：开始分析 ---
const startAnalysis = async () => {
  if (!form.code) return ElMessage.warning('请输入代码')
  loading.value = true
  try {
    const res = await getMarketAnalysis(form.code, form.type)
    result.value = res.data
    ElMessage.success('推演成功')
  } catch (err) {
    ElMessage.error('接口异常')
  } finally {
    loading.value = false
  }
}

// --- 历史记录逻辑 ---
const openHistory = async () => {
  historyDrawer.value = true
  historyLoading.value = true
  try {
    const res = await getSupposeList()
    // 关键修正：后端返回的对象中，list 字段才是真正的数组
    if (res.data && res.data.success) {
      historyList.value = res.data.list;
    } else {
      historyList.value = [];
    }

    console.log("历史记录加载成功，共", res.data.count, "条");
  } catch (err) {
    console.error("加载历史失败:", err);
    ElMessage.error('无法获取历史记录');
    historyList.value = []; // 出错时重置为空数组，防止表格报错
  } finally {
    historyLoading.value = false;
  }
}

// 将历史数据加载回主界面
const loadBack = (row) => {
  result.value = row.data
  form.code = row.symbol
  form.type = row.type
  historyDrawer.value = false
  ElMessage.success('已加载历史推演数据')
}

// 辅助样式函数
const getDecisionClass = (dec) => {
  if (!dec) return 'is-hold'
  if (dec.includes('BUY')) return 'is-buy'
  if (dec.includes('SELL')) return 'is-sell'
  return 'is-hold'
}

const getTypeTag = (type) => {
  const map = { 'sh': 'danger', 'sz': 'success', 'etf': 'warning' }
  return map[type] || 'info'
}

const getDecisionColor = (dec) => {
  if (!dec) return '#999'
  if (dec.includes('BUY')) return '#67c23a'
  if (dec.includes('SELL')) return '#f56c6c'
  return '#909399'
}
</script>

<style scoped>
.analysis-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 15px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: bold;
}

.search-card {
  margin-bottom: 20px;
  border-radius: 12px;
}

.search-form {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.analyze-btn {
  flex: 1;
  min-width: 100px;
}

/* 核心结论 */
.stock-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.stock-name {
  font-size: 22px;
  font-weight: bold;
}

.stock-code {
  color: #909399;
  font-size: 14px;
}

.price {
  font-size: 24px;
  font-weight: 800;
  color: #cf4444;
}

.decision-box {
  padding: 20px;
  border-radius: 12px;
  text-align: center;
}

.dec-text {
  font-size: 28px;
  font-weight: 900;
}

.prob {
  font-size: 14px;
  margin-top: 8px;
  opacity: 0.8;
}

.is-buy {
  background: #f0f9eb;
  color: #67c23a;
  border: 1px solid #c2e7b0;
}

.is-sell {
  background: #fef0f0;
  color: #f56c6c;
  border: 1px solid #fbc4c4;
}

.is-hold {
  background: #f4f4f5;
  color: #909399;
  border: 1px solid #e9e9eb;
}

/* 章节 */
.section-title {
  margin: 25px 0 15px;
  font-size: 16px;
  color: #606266;
  border-left: 4px solid #409eff;
  padding-left: 10px;
}

.indicator-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.mini-label {
  font-size: 12px;
  color: #909399;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.mini-value {
  font-size: 18px;
  font-weight: bold;
  margin-top: 5px;
}

.help-icon {
  color: #c0c4cc;
  cursor: help;
}

/* 历史列表详情 */
.json-detail {
  max-height: 300px;
  overflow-y: auto;
  background: #222;
  color: #4af;
  padding: 12px;
  border-radius: 6px;
  font-family: monospace;
  font-size: 11px;
}

.json-detail pre {
  margin: 0;
  white-space: pre-wrap;
}

.footer-info {
  margin-top: 30px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
  font-size: 12px;
  color: #999;
  line-height: 1.6;
}

@media (max-width: 600px) {
  .indicator-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  :deep(.el-drawer) {
    width: 100% !important;
  }
}
</style>