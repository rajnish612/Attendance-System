FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install
RUN npm build
EXPOSE 5173
CMD ["npm", "run", "start"]