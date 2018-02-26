const axios = require('axios');

class Notifier {
  notify() {
    throw new Error('Not implemented');
  }
}

class Pushover extends Notifier {
  constructor(user, token) {
    super();

    this.user = user;
    this.token = token;
  }

  notify(message) {
    return axios.post('https://api.pushover.net/1/messages.json', {
      user: this.user,
      token: this.token,
      message
    });
  }
}

class Webhook extends Notifier {
  constructor(url) {
    super();

    this.url = url;
  }

  notify(parameters = {}) {
    return axios.get(this.url, {
      params: parameters
    });
  }
}

module.exports = {
  Notifier,
  Pushover,
  Webhook,
}