const _ = require('lodash');

module.exports = {
  conditionalExists(predicate) {
    return (value, { req: { body: body } }) => {
      if (!predicate(body)) {
        return true;
      }

      return !_.isUndefined(value);
    };
  },

  dateAfter(milliseconds) {
    return new Date(Date.now() + milliseconds);
  }
};