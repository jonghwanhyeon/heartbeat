const _ = require('lodash');

const { MonitorManagerError } = require('../errors');
const { Monitor, createNotification } = require('./monitor');
const { dateAfter } = require('../utils');

class MonitorManager {
  constructor(onExpired) {
    this._onExpired = onExpired;
    this.timers = {};
  }

  load() {
    return new Promise((resolve, reject) => {
      Monitor.find().where('expiresAt').exists().exec().then(monitors => {
        const now = new Date();

        for (const monitor of monitors) {
          if (monitor.expiresAt <= now) { // expired
            this.onExpired(monitor);
          } else {
            this.add(monitor);
          }
        }

        resolve();
      }).catch(reject);
    });
  }

  create({ name, timeout, notification }) {
    return new Promise((resolve, reject) => {
      Monitor.create({
        name,
        timeout,
        expiresAt: dateAfter(timeout * 1000),
        notification: createNotification(notification),
      }).then(monitor => {
        this.add(monitor);
        resolve(monitor);
      }).catch(reject);
    });
  }

  get(id) {
    return Monitor.findById(id);
  }

  update(id, { name, timeout, notification }) {
    return new Promise((resolve, reject) => {
      this.get(id).then(monitor => {
        if (!monitor) {
          resolve(monitor);
          return;
        }

        if (!_.isUndefined(name)) {
          monitor.name = name;
        }

        if (!_.isUndefined(timeout)) {
          monitor.timeout = timeout;
        }

        if (!_.isUndefined(notification)) {
          monitor.notification = createNotification(notification);
        }

        monitor.save().then(resolve).catch(reject);
      }).catch(reject);
    });
  }

  delete(id) {
    return new Promise((resolve, reject) => {
      Monitor.findByIdAndRemove(id).then(monitor => {
        this.remove(monitor);
        resolve(monitor);
      }).catch(reject);
    });
  }

  tick(monitor) {
    return new Promise((resolve, reject) => {
      this.remove(monitor);

      monitor.expiresAt = dateAfter(monitor.timeout * 1000);
      monitor.save().then(updatedMonitor => {
        this.add(updatedMonitor);
        resolve(updatedMonitor);
      }).catch(reject);
    });
  }

  add(monitor) {
    if (_.has(this.timers, monitor.id)) throw new MonitorManagerError('Monitor has already been added');

    const delay = monitor.expiresAt.getTime() - new Date().getTime();
    this.timers[monitor.id] = setTimeout(() => {
      this.onExpired(monitor);
    }, delay);
  }

  remove(monitor) {
    if (!_.has(this.timers, monitor.id)) return; // nothing to remove

    clearTimeout(this.timers[monitor.id]);
    delete this.timers[monitor.id];
  }

  onExpired(monitor) {
    monitor.expiresAt = undefined;
    monitor.save().then(this._onExpired);
  }
}

module.exports = {
  MonitorManager,
};