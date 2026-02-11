const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Stock = require('./models/Stock');
const History = require('./models/History');
const axios = require('axios');
const cron = require('node-cron');

const app = express();

// --- 中间件配置 ---
// 更加显式的 CORS 配置
app.use(cors({
    origin: '*', // 允许所有来源
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    optionsSuccessStatus: 200 // 针对旧版浏览器的兼容
}));
// 额外保险：手动添加一个处理所有请求的 Header
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    // 如果是预检请求 (OPTIONS)，直接返回 200
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});
app.use(express.json());

// --- 1. 数据库连接 ---
// 使用你本机的硬件环境，建议保持 127.0.0.1 提高稳定性
const mongoUrl = process.env.MONGO_URL || 'mongodb://db:27017/make_a_million';
mongoose.connect(mongoUrl)
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

// 腾讯行情接口解析工具
app.get('/api/market/prices', async (req, res) => {
    try {
        const stocks = await Stock.find();
        if (stocks.length === 0) return res.json({});

        // 1. 构造腾讯要求的代码格式，例如 sz000001,sh600000
        const queryIds = stocks.map(s => {
            const prefix = s.type === 'etf' ? (s.symbol.startsWith('5') ? 'sh' : 'sz') : s.type;
            return `${prefix}${s.symbol}`;
        }).join(',');

        // 2. 请求腾讯 API
        const response = await axios.get(`https://qt.gtimg.cn/q=${queryIds}`, {
            responseType: 'arraybuffer' // 腾讯返回的是 gbk 编码，需要处理
        });

        // 简易解析逻辑：将返回的字符串拆解
        const rawData = response.data.toString();
        const priceMap = {};

        rawData.split(';').forEach(line => {
            const parts = line.split('~');
            if (parts.length > 3) {
                const symbol = parts[2]; // 股票代码
                const currentPrice = parseFloat(parts[3]); // 当前价格
                priceMap[symbol] = currentPrice;
            }
        });

        res.json(priceMap);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/history/record', async (req, res) => {
    const { profit } = req.body;
    const today = new Date().toISOString().split('T')[0];
    try {
        // upsert: 如果今天已有记录则更新，没有则创建
        await History.findOneAndUpdate(
            { date: today },
            { profit: profit },
            { upsert: true, new: true }
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. 获取历史记录接口 (获取最近15天)
app.get('/api/history', async (req, res) => {
    const data = await History.find().sort({ date: 1 }).limit(15);
    res.json(data);
});

const recordDailyProfit = async () => {
    try {
        const stocks = await Stock.find();
        if (stocks.length === 0) return;

        // 获取当前实时价格
        const queryIds = stocks.map(s => {
            const prefix = s.type === 'etf' ? (s.symbol.startsWith('5') ? 'sh' : 'sz') : s.type;
            return `${prefix}${s.symbol}`;
        }).join(',');

        const response = await axios.get(`https://qt.gtimg.cn/q=${queryIds}`);
        const rawData = response.data.toString();
        const priceMap = {};
        rawData.split(';').forEach(line => {
            const parts = line.split('~');
            if (parts.length > 3) priceMap[parts[2]] = parseFloat(parts[3]);
        });

        // 计算总盈亏
        let totalProfit = 0;
        stocks.forEach(s => {
            const currentPrice = priceMap[s.symbol] || s.costPrice;
            totalProfit += (currentPrice - s.costPrice) * s.quantity;
        });

        const today = new Date().toISOString().split('T')[0];

        // 存入数据库
        await History.findOneAndUpdate(
            { date: today },
            { profit: totalProfit },
            { upsert: true }
        );
        console.log(`[Cron] ${today} 收益记录成功: ${totalProfit}`);
    } catch (err) {
        console.error('[Cron] 自动记录失败:', err.message);
    }
};

// 2. 设置定时任务：周一至周五，每天 15:05 执行 (收盘后5分钟)
// 分 时 日 月 周
cron.schedule('5 15 * * 1-5', () => {
    console.log('正在执行收盘收益自动记录...');
    recordDailyProfit();
}, {
    timezone: "Asia/Shanghai" // 确保使用北京时间
});

// --- 3. 启动服务 ---
const PORT = 3500;
app.listen(PORT, () => {
    console.log(`🚀 后端服务已启动: http://localhost:${PORT}`);
});