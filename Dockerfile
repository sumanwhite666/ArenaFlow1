FROM node:20-alpine

WORKDIR /app

# 1. Install dependencies (include devDependencies for the build)
COPY package.json package-lock.json* ./
RUN npm install

# 2. Copy source code
COPY . .

# 3. Build the application
# We set a dummy DATABASE_URL because the build process checks for it, 
# even though it doesn't actually connect to the DB during build.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
RUN npm run build

# 4. Set environment to production only after build (optional, but good practice)
ENV NODE_ENV=production

EXPOSE 3000

# 5. Start the production server
CMD ["npm", "start"]
