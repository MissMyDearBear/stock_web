import axios from 'axios';

const API_URL = 'http://localhost:3000/api/stocks';

export const getStocks = () => axios.get(API_URL);
export const addStock = (data) => axios.post(API_URL, data);
export const updateStock = (id, data) => axios.put(`${API_URL}/${id}`, data);
export const deleteStock = (id) => axios.delete(`${API_URL}/${id}`);