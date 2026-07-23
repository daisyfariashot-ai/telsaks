FROM node:18-alpine
WORKDIR /app
COPY kingshot-clone/package*.json ./kingshot-clone/
RUN cd kingshot-clone && npm install
COPY . .
EXPOSE 3000
CMD ["node", "kingshot-clone/server.js"]
