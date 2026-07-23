FROM node:18-alpine
WORKDIR /app
COPY kingshot-clone/package*.json ./kingshot-clone/
RUN cd kingshot-clone && npm install
COPY . .
# Rename index.html to template so static middleware doesn't serve it
RUN mv /app/kingshot-clone/public/index.html /app/kingshot-clone/public/_index_template.html
EXPOSE 3000
CMD ["node", "kingshot-clone/server.js"]
