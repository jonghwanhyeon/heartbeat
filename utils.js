const _ = require('lodash');

module.exports = {
  dateAfter(milliseconds) {
    return new Date(Date.now() + milliseconds);
  }
};