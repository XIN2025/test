FROM node:18-alpine

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache git

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Set environment variables
ENV NODE_ENV=production
ENV EXPO_PUBLIC_API_URL=http://api:8000
ENV PORT=3000

# Expose port
EXPOSE 3000

# Use serve to serve the built app (alternative approach)
RUN npm install -g serve

# Build the app first, then serve it
CMD ["sh", "-c", "npx expo export --platform web --output-dir ./dist && serve -s ./dist -l 3000"] 