const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Stock = require('./models/Stock');
const History = require('./models/History');
const Suppose = require('./models/Suppose')
const axios = require('axios');
const cron = require('node-cron');
const iconv = require('iconv-lite');
const TI = require('technicalindicators');

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
const mongoUrl = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/make_a_million';
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

// =============================
// 工具函数
// =============================
const analyzeEngine = {

    formatFullId: (code, type) => {
        if (type === "sh" || type === "sz") return `${type}${code}`;
        if (type === "etf") return `${code.startsWith("5") ? "sh" : "sz"}${code}`;
        return `sh${code}`;
    },

    // 获取股票名称
    fetchStockName: async (fullId) => {
        try {
            const resp = await axios.get(`https://qt.gtimg.cn/q=${fullId}`, {
                // 必须指定为 arraybuffer，否则 axios 会尝试用 utf8 解释字节流
                responseType: 'arraybuffer'
            });
            const data = iconv.decode(resp.data, 'gbk');
            const parts = data.split("~");
            return parts[1] || fullId;
        } catch {
            return fullId;
        }
    },

    fetchKlines: async (fullId) => {
        const url = `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${fullId},day,,,250,qfq`;
        try {
            const resp = await axios.get(url);
            const data = resp.data.data[fullId];
            const kline = data.day || data.qfqday;
            if (!kline) return null;

            return kline.map(i => ({
                Date: i[0],
                Open: +i[1],
                Close: +i[2],
                High: +i[3],
                Low: +i[4],
                Volume: +i[5]
            }));
        } catch {
            return null;
        }
    },

    fetchIndexKlines: async (indexId = "sh000001") => {
        const url = `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${indexId},day,,,250,qfq`;
        try {
            const resp = await axios.get(url);
            const data = resp.data.data[indexId];
            const kline = data.day || data.qfqday;
            return kline.map(i => +i[2]);
        } catch {
            return null;
        }
    },

    fetchWeekKlines: async (fullId) => {
        const url = `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${fullId},week,,,120,qfq`;
        try {
            const resp = await axios.get(url);
            const data = resp.data.data[fullId];
            const kline = data.week;
            if (!kline) return null;
            return kline.map(i => +i[2]);
        } catch {
            return null;
        }
    }

};

// =============================
// 数学函数
// =============================

function calculateBeta(stockCloses, indexCloses) {
    const rs = [];
    const ri = [];

    for (let i = 1; i < stockCloses.length; i++) {
        rs.push((stockCloses[i] - stockCloses[i - 1]) / stockCloses[i - 1]);
        ri.push((indexCloses[i] - indexCloses[i - 1]) / indexCloses[i - 1]);
    }

    const meanS = rs.reduce((a, b) => a + b) / rs.length;
    const meanI = ri.reduce((a, b) => a + b) / ri.length;

    let cov = 0, varI = 0;

    for (let i = 0; i < rs.length; i++) {
        cov += (rs[i] - meanS) * (ri[i] - meanI);
        varI += Math.pow((ri[i] - meanI), 2);
    }

    return cov / varI;
}

function calculateSharpe(closes) {
    const r = [];
    for (let i = 1; i < closes.length; i++) {
        r.push((closes[i] - closes[i - 1]) / closes[i - 1]);
    }
    const mean = r.reduce((a, b) => a + b) / r.length;
    const variance = r.reduce((s, x) => s + Math.pow(x - mean, 2), 0) / r.length;
    const std = Math.sqrt(variance);
    return std === 0 ? 0 : mean / std;
}

// =============================
// 主接口
// =============================
// =============================
// 主接口 - 专业版
// =============================
app.get("/api/market/analysis/:code", async (req, res) => {
    const { code } = req.params;
    const { type } = req.query;

    if (!type)
        return res.status(400).json({ error: "请提供 type 参数" });

    try {
        const fullId = analyzeEngine.formatFullId(code, type);

        const [kData, indexData, weekClose, name] = await Promise.all([
            analyzeEngine.fetchKlines(fullId),
            analyzeEngine.fetchIndexKlines(),
            analyzeEngine.fetchWeekKlines(fullId),
            analyzeEngine.fetchStockName(fullId)
        ]);

        if (!kData || kData.length < 120)
            return res.status(404).json({ error: "行情数据不足" });

        // =============================
        // 基础数据
        // =============================
        const close = kData.map(d => d.Close);
        const high = kData.map(d => d.High);
        const low = kData.map(d => d.Low);
        const volume = kData.map(d => d.Volume);

        const last = kData.at(-1);
        const prev = kData.at(-2);

        const pct = (last.Close - prev.Close) / prev.Close; // 小数形式
        const price = +last.Close;

        // =============================
        // 技术指标计算
        // =============================
        const sma5 = TI.SMA.calculate({ period: 5, values: close });
        const sma20 = TI.SMA.calculate({ period: 20, values: close });
        const sma60 = TI.SMA.calculate({ period: 60, values: close });
        const rsi = TI.RSI.calculate({ period: 7, values: close });
        const atr = TI.ATR.calculate({ high, low, close, period: 14 });
        const volSMA5 = TI.SMA.calculate({ period: 5, values: volume });

        const macd = TI.MACD.calculate({
            values: close,
            fastPeriod: 12,
            slowPeriod: 26,
            signalPeriod: 9,
            SimpleMAOscillator: false,
            SimpleMASignal: false
        });

        const kdj = TI.Stochastic.calculate({
            high, low, close,
            period: 9,
            signalPeriod: 3
        });

        const lastSMA5 = sma5.at(-1);
        const prevSMA5 = sma5.at(-2);
        const lastSMA20 = sma20.at(-1);
        const lastSMA60 = sma60.at(-1);
        const lastRSI = rsi.at(-1);
        const lastATR = atr.at(-1);
        const lastVol = volume.at(-1);
        const lastVolMA = volSMA5.at(-1);
        const lastMACD = macd.at(-1);
        const prevMACD = macd.at(-2);
        const lastKDJ = kdj.at(-1);

        const atrRatio = lastATR / last.Close;

        // =============================
        // 1️⃣ 趋势因子
        // =============================
        let trendScore = 0;
        if (last.Close > lastSMA5) trendScore++;
        if (lastSMA5 > lastSMA20) trendScore++;
        if (lastSMA20 > lastSMA60) trendScore++;
        if (prevSMA5 && lastSMA5 > prevSMA5) trendScore++;

        // =============================
        // 2️⃣ 动量因子
        // =============================
        let momentumScore = 0;

        if (prevMACD && lastMACD) {
            if (prevMACD.MACD < prevMACD.signal &&
                lastMACD.MACD > lastMACD.signal) {
                momentumScore += 2;
            }
        }

        if (lastKDJ && lastKDJ.k > lastKDJ.d) momentumScore++;
        if (lastRSI > 50 && lastRSI < 70) momentumScore++;

        // =============================
        // 3️⃣ 量能因子
        // =============================
        let volumeScore = 0;

        if (lastVolMA) {
            if (lastVol > lastVolMA * 1.3 && pct > 0) volumeScore += 2;
            if (lastVol > lastVolMA * 1.3 && pct < 0) volumeScore -= 2;
        }

        // =============================
        // 4️⃣ 吸筹识别
        // =============================
        let accumulationScore = 0;

        const recentCloses = close.slice(-15);
        const maxClose = Math.max(...recentCloses);
        const minClose = Math.min(...recentCloses);
        const rangeRatio = (maxClose - minClose) / minClose;

        const recentVol = volume.slice(-10);
        const prevVol = volume.slice(-20, -10);

        const avgRecentVol =
            recentVol.reduce((a, b) => a + b, 0) / recentVol.length;

        const avgPrevVol =
            prevVol.reduce((a, b) => a + b, 0) / prevVol.length;

        const prevATR = atr.at(-5);

        if (
            rangeRatio < 0.08 &&
            avgRecentVol < avgPrevVol * 0.8 &&
            prevATR &&
            lastATR < prevATR
        ) {
            accumulationScore += 3;
        }

        // =============================
        // 5️⃣ 多周期共振
        // =============================
        let multiTimeframeScore = 0;

        if (weekClose && weekClose.length > 20) {
            const weekSMA5 = TI.SMA.calculate({ period: 5, values: weekClose });
            const weekSMA20 = TI.SMA.calculate({ period: 20, values: weekClose });

            if (weekSMA5.at(-1) > weekSMA20.at(-1)) {
                multiTimeframeScore += 2;
            }
        }

        // =============================
        // 6️⃣ 相对强度
        // =============================
        let relativeScore = 0;
        let beta = 0;

        if (indexData && indexData.length >= 120) {
            beta = calculateBeta(
                close.slice(-120),
                indexData.slice(-120)
            );
        }

        const sharpe = calculateSharpe(close.slice(-120));

        if (beta < 0.8) relativeScore++;
        if (sharpe > 0.8) relativeScore += 2;
        if (sharpe < 0.2) relativeScore -= 2;

        // =============================
        // 7️⃣ 风险控制
        // =============================
        let riskPenalty = 0;

        if (last.Close < lastSMA60) riskPenalty += 2;
        if (pct < -0.05) riskPenalty += 1;
        if (atrRatio > 0.06) riskPenalty += 2;

        // =============================
        // 总评分
        // =============================
        const totalScore =
            trendScore * 0.25 +
            momentumScore * 0.2 +
            volumeScore * 0.15 +
            accumulationScore * 0.15 +
            multiTimeframeScore * 0.15 +
            relativeScore * 0.1 -
            riskPenalty;

        // 稍微平滑 sigmoid
        const prob = 1 / (1 + Math.exp(-totalScore * 0.8));

        const buyProb = prob;
        const sellProb = 1 - prob;

        let decision = "HOLD";

        if (totalScore >= 3) decision = "STRONG BUY";
        else if (totalScore >= 1.5) decision = "BUY";
        else if (totalScore <= -3) decision = "STRONG SELL";
        else if (totalScore <= -1.5) decision = "SELL";

        // =============================
        // 返回结构（纯数值版）
        // =============================
        const result = {
            code,
            name,
            fullId,
            date: last.Date,
            price,

            decision,

            probability: {
                buy: +buyProb.toFixed(4),
                sell: +sellProb.toFixed(4)
            },

            score: {
                total: +totalScore.toFixed(2),
                factors: {
                    trend: trendScore,
                    momentum: momentumScore,
                    volume: volumeScore,
                    accumulation: accumulationScore,
                    multiTimeframe: multiTimeframeScore,
                    relative: relativeScore,
                    riskPenalty
                }
            },

            advancedFactors: {
                beta: +beta.toFixed(4),
                sharpe: +sharpe.toFixed(4)
            },

            indicators: {
                rsi: +lastRSI.toFixed(2),
                atrRatio: +atrRatio.toFixed(4),
                dailyChange: +pct.toFixed(4)
            }
        };

        console.log(JSON.stringify(result));

        try {
            await Suppose.findOneAndUpdate(
                { symbol: code }, // 以代码作为唯一标识
                {
                    symbol: code,
                    name: name,
                    type: type, // 来自 req.query 的 'sh'/'sz'/'etf'
                    suppose: JSON.stringify(result), // 将完整的 result 对象转为字符串存储
                    updatedAt: new Date() // 更新时间
                },
                {
                    upsert: true, // 如果不存在则创建
                    new: true,    // 返回更新后的文档
                    setDefaultsOnInsert: true // 如果是新增，应用 Schema 的默认值
                }
            );
        } catch (dbErr) {
            console.error("Database Save Error:", dbErr);
        }
        res.json(result);

    } catch (err) {
        console.error(err);
        res.status(500).json({
            error: "分析失败",
            message: err.message
        });
    }
});

// ==========================================
// 获取所有已保存的推演记录
// ==========================================
app.get('/api/market/suppose/list', async (req, res) => {
    try {
        // 按更新时间倒序排列（最近更新的排在前面）
        const records = await Suppose.find().sort({ updatedAt: -1 });

        // 处理数据：将字符串形式的 suppose 字段还原为 JSON 对象
        const formattedRecords = records.map(item => {
            let detail = {};
            try {
                detail = JSON.parse(item.suppose);
            } catch (e) {
                detail = { error: "解析明细失败" };
            }

            return {
                _id: item._id,
                symbol: item.symbol,
                name: item.name,
                type: item.type,
                updatedAt: item.updatedAt,
                // 将还原后的对象直接放在这里
                data: detail
            };
        });

        res.json({
            success: true,
            count: formattedRecords.length,
            list: formattedRecords
        });
    } catch (err) {
        console.error("获取列表失败:", err);
        res.status(500).json({ error: "服务器内部错误", message: err.message });
    }
});
// --- 3. 启动服务 ---
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 后端服务已启动: http://localhost:${PORT}`);
});