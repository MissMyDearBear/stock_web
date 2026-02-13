import axios from 'axios';

const HOST = 'http://101.35.132.84:3000';
const API_URL = `${HOST}/api/stocks`;

export const getStocks = () => axios.get(API_URL);
export const addStock = (data) => axios.post(API_URL, data);
export const updateStock = (id, data) => axios.put(`${API_URL}/${id}`, data);
export const deleteStock = (id) => axios.delete(`${API_URL}/${id}`);


// --- 新增：历史记录相关接口 ---
const HISTORY_URL = `${HOST}/api/history`;
export const getHistory = () => axios.get(HISTORY_URL);
export const saveRecord = (profit) => axios.post(`${HISTORY_URL}/record`, { profit });

// --- 新增：行情获取接口 ---
export const getMarketPrices = () => axios.get(`${HOST}/api/market/prices`);
// 2. 执行技术推演分析 (接收 code 和 type)
// 调用示例: getMarketAnalysis('600519', 'sh')
export const getMarketAnalysis = (code, type) =>
    axios.get(`${HOST}/api/market/analysis/${code}`, { params: { type } });

// 3. 获取已保存的推演列表
// 调用示例: getSupposeList()
export const getSupposeList = () => axios.get(`${HOST}/api/market/suppose/list`);
