FROM node:20-alpine

WORKDIR /app

# 1. Install dependencies (include devDependencies for the build)
COPY package.json package-lock.json* ./
RUN npm install

# 2. Copy source code
COPY . .

# 3. Build the application
RUN npm run build

# 4. Set environment to production only after build (optional, but good practice)
ENV NODE_ENV=production

EXPOSE 3000

# 5. Start the production server
CMD ["npm", "start"]
