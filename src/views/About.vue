<template>
    <div class="portfolio-container">
        <div class="header">
            <div class="title-group">
                <h1>Portfolio Manager</h1>
                <p>Manage your stock and ETF holdings</p>
            </div>
            <button @click="openModal()" class="btn-add">
                <span class="plus-icon">+</span> Add Asset
            </button>
        </div>
        <div class="summary-card">
            <div class="summary-item">
                <span class="summary-label">Total assets</span>
                <div class="summary-value">
                    <span class="currency">￥</span>{{ totalInvestment.toLocaleString(undefined, {
                        minimumFractionDigits:
                            2, maximumFractionDigits: 2
                    }) }}
                </div>
            </div>
        </div>

        <div class="table-card">
            <table class="stock-table">
                <thead>
                    <tr>
                        <th>Symbol</th>
                        <th class="text-right">Name</th>
                        <th class="text-right">Cost Price</th>
                        <th class="text-right">Quantity</th>
                        <th class="text-right">Total</th>
                        <th class="text-center">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="stock in stocks" :key="stock._id">
                        <td class="symbol-cell">
                            {{ stock.symbol }}
                            <span :class="['type-badge', (stock.type || 'sh').toLowerCase()]">
                                {{ (stock.type || 'sh').toUpperCase() }}
                            </span>
                        </td>
                        <td class="text-right">{{ stock.name }}</td>
                        <td class="text-right font-mono">￥{{ stock.costPrice.toFixed(4) }}</td>
                        <td class="text-right">{{ stock.quantity }}</td>
                        <td class="text-right total-cell font-mono">
                            ￥{{ (stock.costPrice * stock.quantity).toLocaleString() }}
                        </td>
                        <td class="text-center">
                            <button @click="openModal(stock)" class="btn-edit">Edit</button>
                            <button @click="handleDelete(stock._id)" class="btn-delete">Delete</button>
                        </td>
                    </tr>
                    <tr v-if="stocks.length === 0">
                        <td colspan="5" class="empty-state">No assets found. Start by adding one!</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div v-if="showModal" class="modal-overlay">
            <div class="modal-content">
                <h3>{{ isEditing ? 'Edit Asset' : 'Add New Asset' }}</h3>

                <div class="form-group">
                    <div class="input-item">
                        <label>Stock Symbol</label>
                        <input v-model="currentForm.symbol" type="text" placeholder="000300" />
                    </div>
                    <div class="input-item">
                        <label>Stock Name</label>
                        <input v-model="currentForm.name" type="text" placeholder="沪深300" />
                    </div>
                    <div class="input-item">
                        <label>Asset Type</label>
                        <select v-model="currentForm.type" class="type-select">
                            <option value="sh">SH (沪市)</option>
                            <option value="sz">SZ (深市)</option>
                            <option value="etf">ETF (基金)</option>
                        </select>
                    </div>
                    <div class="input-item">
                        <label>Cost Price</label>
                        <input v-model.number="currentForm.costPrice" type="number" step="0.0001" />
                    </div>
                    <div class="input-item">
                        <label>Quantity</label>
                        <input v-model.number="currentForm.quantity" type="number" />
                    </div>
                </div>

                <div class="modal-actions">
                    <button @click="showModal = false" class="btn-cancel">Cancel</button>
                    <button @click="handleSubmit" class="btn-save">Save</button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { getStocks, addStock, updateStock, deleteStock } from '../api/stock';

const stocks = ref([]);
const showModal = ref(false);
const isEditing = ref(false);
const currentForm = ref({ symbol: '', name: "", type: "sh", costPrice: 0, quantity: 0 });

const loadData = async () => {
    try {
        const res = await getStocks();
        stocks.value = res.data;
    } catch (err) {
        console.error('Fetch error:', err);
    }
};

const openModal = (stock = null) => {
    if (stock) {
        isEditing.value = true;
        currentForm.value = { ...stock };
    } else {
        isEditing.value = false;
        currentForm.value = { symbol: '', name: "", type: "sh", costPrice: 0, quantity: 0 };
    }
    showModal.value = true;
};

const handleSubmit = async () => {
    try {
        if (isEditing.value) {
            await updateStock(currentForm.value._id, currentForm.value);
        } else {
            await addStock(currentForm.value);
        }
        showModal.value = false;
        await loadData();
    } catch (err) {
        alert('Operation failed. Please check backend.');
    }
};

const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this asset?')) {
        await deleteStock(id);
        await loadData();
    }
};

const totalInvestment = computed(() => {
    return stocks.value.reduce((sum, stock) => {
        return sum + (stock.costPrice * stock.quantity);
    }, 0);
});

onMounted(loadData);
</script>

<style scoped>
/* 容器与布局 */
.portfolio-container {
    max-width: 1100px;
    margin: 0 auto;
    padding: 40px 20px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

/* 头部样式 */
.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30px;
}

.title-group h1 {
    font-size: 28px;
    color: #1e293b;
    margin: 0 0 8px 0;
}

.title-group p {
    color: #64748b;
    margin: 0;
}

/* 按钮基础样式 */
.btn-add {
    background-color: #2563eb;
    color: white;
    border: none;
    padding: 10px 24px;
    border-radius: 8px;
    font-weight: bold;
    cursor: pointer;
    transition: background 0.3s;
    display: flex;
    align-items: center;
    gap: 8px;
}

.btn-add:hover {
    background-color: #1d4ed8;
}

/* 表格卡片样式 */
.table-card {
    background: white;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    overflow: hidden;
}

.stock-table {
    width: 100%;
    border-collapse: collapse;
    text-align: left;
}

.stock-table th {
    background-color: #f8fafc;
    padding: 16px;
    font-size: 13px;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    border-bottom: 1px solid #e2e8f0;
}

.stock-table td {
    padding: 16px;
    border-bottom: 1px solid #f1f5f9;
    color: #334155;
}

.stock-table tr:hover {
    background-color: #f8fafc;
}

.symbol-cell {
    font-weight: 700;
    color: #1e293b;
}

.total-cell {
    font-weight: 700;
    color: #2563eb;
}

.text-right {
    text-align: right;
}

.text-center {
    text-align: center;
}

.font-mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.btn-edit {
    color: #2563eb;
    background: none;
    border: none;
    cursor: pointer;
    margin-right: 15px;
    font-weight: 500;
}

.btn-delete {
    color: #ef4444;
    background: none;
    border: none;
    cursor: pointer;
    font-weight: 500;
}

.empty-state {
    padding: 60px;
    text-align: center;
    color: #94a3b8;
}

/* 模态框样式 */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(15, 23, 42, 0.5);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.modal-content {
    background: white;
    padding: 32px;
    border-radius: 16px;
    width: 100%;
    max-width: 400px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.input-item label {
    display: block;
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 6px;
    color: #475569;
}

.input-item input {
    width: 100%;
    padding: 12px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    outline: none;
    box-sizing: border-box;
    /* 确保padding不撑开宽度 */
}

.input-item input:focus {
    border-color: #2563eb;
    ring: 2px #bfdbfe;
}

.modal-actions {
    display: flex;
    gap: 12px;
    margin-top: 24px;
}

.btn-cancel {
    flex: 1;
    padding: 12px;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    cursor: pointer;
    color: #64748b;
}

.btn-save {
    flex: 1;
    padding: 12px;
    background: #2563eb;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
}

/* 总览统计卡片 */
.summary-card {
    background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
    padding: 24px;
    border-radius: 16px;
    margin-bottom: 24px;
    color: white;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

.summary-label {
    display: block;
    font-size: 14px;
    color: #94a3b8;
    margin-bottom: 8px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.summary-value {
    font-size: 32px;
    font-weight: 800;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.summary-value .currency {
    font-size: 20px;
    margin-right: 4px;
    color: #60a5fa;
    /* 亮蓝色货币符号 */
}

/* 类型标签样式 */
.type-badge {
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 4px;
    margin-left: 8px;
    vertical-align: middle;
    font-weight: 800;
}

.type-badge.sh {
    background-color: #fee2e2;
    color: #ef4444;
}

/* 红色系 */
.type-badge.sz {
    background-color: #dcfce7;
    color: #22c55e;
}

/* 绿色系 */
.type-badge.etf {
    background-color: #fef9c3;
    color: #ca8a04;
}

/* 黄色系 */

/* 下拉框样式 */
.type-select {
    width: 100%;
    padding: 12px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background-color: white;
    outline: none;
    cursor: pointer;
}

.type-select:focus {
    border-color: #2563eb;
}
</style>