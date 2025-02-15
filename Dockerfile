FROM node:22-alpine
WORKDIR /app
COPY package*.json /app/
RUN npm ci  --production
COPY . .
EXPOSE 4485
CMD ["node", "index.js"]
