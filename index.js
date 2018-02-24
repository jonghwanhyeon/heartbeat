const express = require('express');
const mongoose = require('mongoose');

const HeartbeatError = require('./error');

const config = require('./config.json');

const server = express();
server.use(express.json());

mongoose.connect(config.mongo.uri).then(() => {
  require('./routes')(server);

  // global error handlers, should be last middleware
  server.use((error, request, response, next) => {
    let statusCode = 500;
    let message = 'An error occurred';

    if (error instanceof HeartbeatError) {
      statusCode = error.statusCode;
      message = error.message;
    } else {
      console.error(error);
    }

    response.status(statusCode).json({
      error: message,
    });
  });

  server.listen(config.http.port, () => {
    console.log(`Server is listening on port ${config.http.port}`);
  });
}).catch(error => {
  console.error('An error occurred while connecting to MongoDB');
  console.error(error);
  process.exit(1);
});