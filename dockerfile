FROM node:18.20
WORKDIR /app
COPY . /app
RUN npm install -force
EXPOSE 8000
CMD npm run start


# docker build -t krishdesai044506/youtube-api-node:0.0.1.RELEASE .
# docker run -p 8000:8000 -d krishdesai044506/youtube-api-node:0.0.1.RELEASE