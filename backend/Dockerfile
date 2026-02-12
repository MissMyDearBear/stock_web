FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# 暴露后端端口
EXPOSE 3500
CMD ["node", "server.js"]