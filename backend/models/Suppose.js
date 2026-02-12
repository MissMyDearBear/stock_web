const mongoose = require('mongoose');

const SupposeSchema = new mongoose.Schema({
    symbol: { type: String, required: true }, // 股票代码
    name: { type: String, required: true }, // 股票名称
    type: { type: String, enum: ['sh', 'sz', 'etf'], default: 'sh' }, // 新增字段
    suppose: { type: String, required: true },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Suppose', SupposeSchema);