# Use an official Node.js runtime as a parent image
FROM node:18-alpine

# Set the working directory
WORKDIR /app

# Install curl
RUN apk --no-cache add curl

# Install Chopsticks package
RUN npm install -g @acala-network/chopsticks@latest

# Copy the configuration file
COPY chopsticks.yml /app/config/chopsticks.yml

# Run Chopsticks when the container launches
CMD ["chopsticks", "-c", "/app/config/chopsticks.yml"]
