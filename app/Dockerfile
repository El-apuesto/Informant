# Build stage
FROM node:18 AS build

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Serve with nginx
FROM nginx:alpine

# Copy built app INTO nginx default directory
COPY --from=build /app/dist /usr/share/nginx/html

# Replace nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf
