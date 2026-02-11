const mongoose = require('mongoose');

const StockSchema = new mongoose.Schema({
  symbol: { type: String, required: true }, // 股票代码
  name: { type: String, required: true }, // 股票名称
  type: { type: String, enum: ['sh', 'sz', 'etf'], default: 'sh' }, // 新增字段
  costPrice: { type: Number, default: 0 },  // 成本价
  quantity: { type: Number, default: 0 },   // 持仓数量
  note: String,                             // 备注
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Stock', StockSchema);