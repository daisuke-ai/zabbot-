# Stage 1: Build the React frontend
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package.json and package-lock.json from the root
COPY package.json package-lock.json ./

# Install dependencies for the frontend
RUN npm install

# Copy the entire frontend source code from src
COPY src ./src

# Build the React application
# This will create a 'dist' directory inside /app
RUN npm run build

# Stage 2: Serve the frontend using Nginx
FROM nginx:stable-alpine

# Copy the default Nginx configuration
COPY --from=builder /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf

# Remove the existing Nginx default configuration file if it's there
# RUN rm /etc/nginx/conf.d/default.conf

# Copy the custom Nginx configuration to correctly serve React app
# Create a simple Nginx config that serves index.html for all requests
RUN echo 'server {
    listen 80;
    location / {
        root   /usr/share/nginx/html;
        index  index.html index.htm;
        try_files $uri $uri/ /index.html;
    }
    error_page   500 502 503 504  /50x.html;
    location = /50x.html {
        root   /usr/share/nginx/html;
    }
}
' > /etc/nginx/conf.d/default.conf

# Copy the built React app from the builder stage to Nginx's serve directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80 for the frontend
EXPOSE 80

# Command to run Nginx
CMD ["nginx", "-g", "daemon off;"]
