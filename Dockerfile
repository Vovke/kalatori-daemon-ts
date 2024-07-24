# Stage 1: Build
FROM node:18 AS build

# Set working directory
WORKDIR /app

# Install dependencies
COPY package.json yarn.lock ./
RUN yarn install

# Copy the rest of the application
COPY . .

# Stage 2: Run
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy built application from the build stage
COPY --from=build /app /app

# Install only production dependencies
RUN yarn install --production

# Expose the port the app runs on
EXPOSE 3000

# Set environment variable to production
ENV NODE_ENV=production

# Start the application
CMD ["node", "dist/server.js"]