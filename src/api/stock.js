import axios from 'axios';

const API_URL = 'http://192.168.71.4:3000/api/stocks';

export const getStocks = () => axios.get(API_URL);
export const addStock = (data) => axios.post(API_URL, data);
export const updateStock = (id, data) => axios.put(`${API_URL}/${id}`, data);
export const deleteStock = (id) => axios.delete(`${API_URL}/${id}`);


// --- 新增：历史记录相关接口 ---
const HISTORY_URL = `${Base_URL}/api/history`;
export const getHistory = () => axios.get(HISTORY_URL);
export const saveRecord = (profit) => axios.post(`${HISTORY_URL}/record`, { profit });

// --- 新增：行情获取接口 ---
export const getMarketPrices = () => axios.get(`${Base_URL}/api/market/prices`);

