# 阶段 1: 编译打包
FROM node:22-alpine AS build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# 阶段 2: 使用 Nginx 部署
FROM nginx:stable-alpine
# 将打包后的静态文件拷贝到 Nginx 目录
COPY --from=build-stage /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]