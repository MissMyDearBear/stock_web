const mongoose = require('mongoose');
// 1. 定义历史收益模型
const HistorySchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true }, // 格式: "2026-02-10"
  profit: { type: Number, required: true }
});
const History = mongoose.model('History', HistorySchema);
module.exports = History;