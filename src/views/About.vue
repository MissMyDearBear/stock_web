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


        <div v-for="stock in stocks" :key="stock._id" class="mobile-card">
            <div class="card-main">
                <div class="left">
                    <div class="symbol">
                        {{ stock.symbol }}
                        <span :class="['type-badge', (stock.type || 'sh').toLowerCase()]">
                            {{ (stock.type || 'sh').toUpperCase() }}
                        </span>
                    </div>

                    <div class="name">{{ stock.name }}</div>

                    <div class="meta">
                        <span>Cost ￥{{ stock.costPrice.toFixed(4) }}</span>
                        <span>Qty {{ stock.quantity }}</span>
                    </div>
                </div>

                <div class="right">
                    <div class="total">
                        ￥{{ (stock.costPrice * stock.quantity).toLocaleString() }}
                    </div>
                    <div class="sub">Total Value</div>
                </div>
            </div>

            <div class="card-actions">
                <button @click="openModal(stock)" class="action edit">Edit</button>
                <button @click="handleDelete(stock._id)" class="action delete">Delete</button>
            </div>
        </div>


        <!-- Bottom Sheet -->
        <transition name="fade">
            <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
                <transition name="slide">
                    <div class="modal-content">
                        <div class="sheet-handle"></div>

                        <h3>{{ isEditing ? 'Edit Asset' : 'Add New Asset' }}</h3>

                        <div class="form-group">
                            <div class="input-item">
                                <label>Stock Symbol</label>
                                <input v-model="currentForm.symbol" type="text" />
                            </div>

                            <div class="input-item">
                                <label>Stock Name</label>
                                <input v-model="currentForm.name" type="text" />
                            </div>

                            <div class="input-item">
                                <label>Asset Type</label>
                                <select v-model="currentForm.type">
                                    <option value="sh">SH</option>
                                    <option value="sz">SZ</option>
                                    <option value="etf">ETF</option>
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
                </transition>
            </div>
        </transition>
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
.portfolio-container {
    max-width: 1100px;
    margin: 0 auto;
    padding: 24px 16px 100px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto;
}

/* ================= Header ================= */
.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
}

.title-group h1 {
    font-size: 24px;
    margin: 0;
}

.title-group p {
    font-size: 14px;
    color: #64748b;
    margin: 4px 0 0;
}

.btn-add {
    background: linear-gradient(135deg, #2563eb, #1d4ed8);
    color: white;
    border: none;
    padding: 10px 18px;
    border-radius: 12px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 14px rgba(37, 99, 235, 0.3);
    transition: 0.2s;
}

.btn-add:active {
    transform: scale(0.97);
}

/* 手机端浮动按钮 */
@media (max-width: 768px) {
    .btn-add {
        position: fixed;
        bottom: 24px;
        right: 20px;
        padding: 16px;
        border-radius: 50%;
        font-size: 20px;
        width: 56px;
        height: 56px;
    }

    .btn-add span {
        display: none;
    }
}

/* ================= Summary ================= */
.summary-card {
    background: linear-gradient(135deg, #1e293b, #334155);
    padding: 20px;
    border-radius: 18px;
    margin-bottom: 20px;
    color: white;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
}

.summary-value {
    font-size: 30px;
    font-weight: 800;
}

/* ================= Mobile Cards ================= */
.mobile-card {
    background: linear-gradient(145deg, #ffffff, #f8fafc);
    border-radius: 20px;
    padding: 18px;
    margin-bottom: 16px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
    transition: 0.2s ease;
}

.mobile-card:active {
    transform: scale(0.98);
}

.card-main {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
}

.left {
    flex: 1;
}

.symbol {
    font-size: 18px;
    font-weight: 700;
    color: #0f172a;
    display: flex;
    align-items: center;
    gap: 6px;
}

.name {
    font-size: 14px;
    color: #64748b;
    margin-top: 4px;
}

.meta {
    font-size: 12px;
    color: #94a3b8;
    margin-top: 8px;
    display: flex;
    gap: 12px;
}

.right {
    text-align: right;
}

.total {
    font-size: 20px;
    font-weight: 800;
    color: #2563eb;
}

.sub {
    font-size: 11px;
    color: #94a3b8;
    margin-top: 4px;
}

.card-actions {
    display: flex;
    justify-content: flex-end;
    gap: 16px;
    margin-top: 14px;
    padding-top: 12px;
    border-top: 1px solid #f1f5f9;
}

.action {
    background: none;
    border: none;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    padding: 4px 0;
}

.action.edit {
    color: #2563eb;
}

.action.delete {
    color: #ef4444;
}

/* ================= Bottom Sheet ================= */
.modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.55);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: flex-end;
    justify-content: center;
    z-index: 1000;
}

.modal-content {
    width: 100%;
    max-width: 520px;
    background: white;
    border-radius: 22px 22px 0 0;
    padding: 24px 20px 30px;
    box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.15);
    max-height: 90vh;
    overflow-y: auto;
}

.sheet-handle {
    width: 40px;
    height: 4px;
    background: #cbd5e1;
    border-radius: 10px;
    margin: 0 auto 16px;
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.input-item input,
select {
    width: 100%;
    padding: 12px 14px;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    transition: 0.2s;
}

.input-item input:focus,
select:focus {
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
    outline: none;
}

.modal-actions {
    display: flex;
    gap: 12px;
    margin-top: 24px;
}

.btn-cancel {
    flex: 1;
    padding: 14px;
    background: #f1f5f9;
    border: none;
    border-radius: 12px;
}

.btn-save {
    flex: 1;
    padding: 14px;
    background: linear-gradient(135deg, #2563eb, #1d4ed8);
    color: white;
    border: none;
    border-radius: 12px;
    font-weight: 600;
}

/* ================= Transitions ================= */
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

.slide-enter-active {
    transition: transform 0.3s cubic-bezier(.25, .8, .25, 1);
}

.slide-enter-from {
    transform: translateY(100%);
}

/* iPhone 安全区 */
@supports (padding: max(0px)) {
    .modal-content {
        padding-bottom: max(30px, env(safe-area-inset-bottom));
    }
}
</style>