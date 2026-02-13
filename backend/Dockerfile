FROM node:22-alpine

WORKDIR /app

# 1. 安装 Alpine 编译 tfjs-node 所需的底层依赖
RUN apk add --no-cache python3 make g++ libc6-compat

# 2. 设置环境变量和镜像源（一次性完成）
ENV TFJS_NODE_BINARY_RES_URL=https://cdn.npmmirror.com/binaries/tfjs-node/
RUN npm config set registry https://registry.npmmirror.com

# 3. 【关键】先拷贝依赖定义文件
COPY package*.json ./

# 4. 【关键】执行安装。只要 package.json 没改，下次构建会瞬间跳过这一步
RUN npm install --verbose --ignore-scripts

# 5. 最后拷贝源码（因为源码改动最频繁）
COPY . .

EXPOSE 3500

CMD ["node", "server.js"]