# stock_station

this is my first web station

## quick start
1. ```git clone https://github.com/MissMyDearBear/stock_web.git```

2. 修改src/server.js中的ip为你服务器的ipv4 or 公网Ip

```
import axios from 'axios';

const HOST = 'http://192.168.71.4:3000'; //ip修改为你的ip
const API_URL = '${HOST}/api/stocks';

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
```


```cd stock_web```


```sudo docker compose up -d```


