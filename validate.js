const _ = require('lodash');
const validator = require('validator');

const { ValidationError } = require('./errors');

const expandKeys = (keys) => {
  return keys.map(key => {
    const optional = key.endsWith('?');

    return {
      key: optional ? key.substr(0, key.length - 1) : key,
      optional,
    };
  });
};

const validators = {
  id: (id) => {
    if (!validator.isMongoId(id)) throw new ValidationError('`id` is invalid');
    return id;
  },
  name: (name) => {
    if (validator.isEmpty(name)) throw new ValidationError('`name` must be not empty');
    return name;
  },
  timeout: (timeout) => {
    if (!validator.isInt(_.toString(timeout), { gt: 0 })) throw new ValidationError('`timeout` must be a positive integer');
    return _.toInteger(timeout);
  },
  notification: (notification) => {
    const scheme = _.get(notification, 'scheme', '');
    if (!validator.isIn(scheme, ['pushover', 'webhook'])) throw new ValidationError('`notification.scheme` is not supported');

    switch (scheme) {
      case 'pushover':
        const user = _.get(notification, 'user', '');
        if (_.isEmpty(user)) throw new ValidationError('`notification.user` is required');

        const token = _.get(notification, 'token', '');
        if (_.isEmpty(token)) throw new ValidationError('`notification.token` is required');

        return { scheme, user, token };
      case 'webhook':
        const url = _.get(notification, 'url', '');
        if (_.isEmpty(url)) throw new ValidationError('`notification.url` is required');
        if (!validator.isURL(url)) throw new ValidationError('`notification.url` must be a URL');

        return { scheme, url };
    }
  },
}

module.exports = (parameters, keys) => {
  return expandKeys(keys).reduce((accumulator, { key, optional }) => {
    if (_.isUndefined(parameters[key])) {
      if (optional) return accumulator;
      else throw new ValidationError(`\`${key}\` is required`);
    }

    accumulator[key] = validators[key](parameters[key]);
    return accumulator;
  }, {});
};