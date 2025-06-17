# Dockerfile
FROM node:18

# Install Python
RUN apt update && apt install -y python3 python3-pip
RUN pip install lxml openpyxl

WORKDIR /app

COPY server/ ./server
COPY engine/ ./engine

WORKDIR /app/server
RUN npm install

EXPOSE 5000
CMD ["node", "index.js"]
