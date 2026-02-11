const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Stock = require('./models/Stock');
const axios = require('axios');

const app = express();

// --- 中间件配置 ---
app.use(cors());
app.use(express.json());

// --- 1. 数据库连接 ---
// 使用你本机的硬件环境，建议保持 127.0.0.1 提高稳定性
mongoose.connect('mongodb://127.0.0.1:27017/make_a_million')
  .then(() => console.log('✅ MongoDB 已连接: 硬件 E5-2696V3 运行正常'))
  .catch(err => console.error('❌ MongoDB 连接失败:', err));

// --- 2. 路由接口 ---

/**
 * @GET 获取股票列表
 */
app.get('/api/stocks', async (req, res) => {
  try {
    // 按照创建时间倒序排列，新添加的在最前面
    const stocks = await Stock.find().sort({ createdAt: -1 });
    res.json(stocks);
  } catch (err) {
    res.status(500).json({ error: '获取数据失败', message: err.message });
  }
});

/**
 * @POST 添加新股票
 */
app.post('/api/stocks', async (req, res) => {
  try {
    const newStock = new Stock(req.body);
    const savedStock = await newStock.save();
    res.status(201).json(savedStock);
  } catch (err) {
    res.status(400).json({ error: '添加失败', message: err.message });
  }
});

/**
 * @PUT 更新股票信息 (编辑功能)
 * :id 是路径参数，对应 MongoDB 的 _id
 */
app.put('/api/stocks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updatedStock = await Stock.findByIdAndUpdate(
      id, 
      req.body, 
      { new: true, runValidators: true } // 返回更新后的对象并执行校验
    );
    
    if (!updatedStock) {
      return res.status(404).json({ error: '未找到该股票记录' });
    }
    
    res.json({ message: '更新成功', data: updatedStock });
  } catch (err) {
    res.status(400).json({ error: '更新失败', message: err.message });
  }
});

/**
 * @DELETE 删除股票 (删除功能)
 */
app.delete('/api/stocks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedStock = await Stock.findByIdAndDelete(id);
    
    if (!deletedStock) {
      return res.status(404).json({ error: '未找到该股票记录' });
    }
    
    res.json({ message: '删除成功' });
  } catch (err) {
    res.status(500).json({ error: '删除失败', message: err.message });
  }
});

// 获取 A 股实时行情 (腾讯接口示例)
app.get('/api/market/prices', async (req, res) => {
  try {
    const [stocks] = await db.query('SELECT symbol FROM user_stocks'); // 如果是 MongoDB 用 Stock.find()
    const symbols = stocks.map(s => {
      // A股代码转换：000300 -> sh000300
      return s.symbol.startsWith('6') ? `sh${s.symbol}` : `sz${s.symbol}`;
    }).join(',');

    const response = await axios.get(`https://qt.gtimg.cn/q=${symbols}`);
    // 腾讯接口返回的是字符串，需要解析（这里仅做示意，实际需根据返回值切割）
    res.json({ raw: response.data }); 
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// --- 3. 启动服务 ---
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 后端服务已启动: http://localhost:${PORT}`);
});