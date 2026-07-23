FROM node:18-alpine
WORKDIR /app
COPY kingshot-clone/package*.json ./kingshot-clone/
RUN cd kingshot-clone && npm install
COPY . .

# Preserve original public files for volume initialization
RUN mkdir -p /public-orig && cp -r /app/kingshot-clone/public/* /public-orig/

# Init script: copy built files to volume on first run
RUN printf '#!/bin/sh\nif [ -z "$(ls -A /app/kingshot-clone/public 2>/dev/null)" ]; then\n  cp -r /public-orig/* /app/kingshot-clone/public/\nfi\n' > /init-volume.sh && chmod +x /init-volume.sh

EXPOSE 3000
CMD sh -c "/init-volume.sh && node kingshot-clone/server.js"
