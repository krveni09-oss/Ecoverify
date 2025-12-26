# Step 1: Build the React app
FROM node:20-alpine AS build
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Receive the API Key as a Build Argument
ARG GEMINI_API_KEY
# Write it to .env.local so Vite can see it
# Note: In Vite, variables must start with VITE_ to be public
RUN echo "VITE_GEMINI_API_KEY=$GEMINI_API_KEY" > .env.local

# Copy the rest of the code and build
COPY . .
RUN npm run build

# Step 2: Serve the app using Nginx
FROM nginx:alpine
# Copy the custom nginx config from our project
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Copy the build files from the first step
COPY --from=build /app/dist /usr/share/nginx/html

# Cloud Run requires port 8080
EXPOSE 8080

# Start Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]
