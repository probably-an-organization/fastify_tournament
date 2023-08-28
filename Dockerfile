FROM node:18

WORKDIR /app

COPY package.json .

RUN npm i

COPY . .

EXPOSE 8080

ENV ADDRESS=0.0.0.0 PORT=8080

CMD ["npm", "start"]