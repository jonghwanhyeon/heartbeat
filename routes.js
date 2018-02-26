const _ = require('lodash');

const { HeartbeatError, ValidationError } = require('./errors');
const { MonitorManager } = require('./models/monitor-manager');
const { PushoverNotification, WebhookNotification } = require('./models/monitor');
const { Pushover, Webhook } = require('./notification');
const { dateAfter } = require('./utils');

const validate = (() => {
  const doValidate = require('./validate');

  return (parameters, keys) => {
    try {
      return doValidate(parameters, keys);
    } catch (error) {
      if (error instanceof ValidationError) throw new HeartbeatError(400, error.message);
      else throw error;
    }
  };
})();

const onExpired = (monitor) => {
  console.log(`Expired: ${monitor.id} (${monitor.name})`);
  let notification = monitor.notification;

  let promise;
  if (notification instanceof PushoverNotification) {
    promise = new Pushover(notification.user, notification.token).notify(`${monitor.name} is not responding`);
  } else if (notification instanceof WebhookNotification) {
    promise = new Webhook(notification.url).notify({
      id: monitor.id,
      name: monitor.name,
    });
  }

  promise.then(() => {
    console.log(`Notification sent: ${monitor.id} (${monitor.name})`);
  }).catch(error => {
    console.error(error);
  });
};

module.exports = (server) => {
  const manager = new MonitorManager(onExpired);
  manager.load();

  server.post('/monitors', (request, response, next) => {
    const parameters = validate(request.body, ['name', 'timeout?', 'notification']);
    parameters.timeout = parameters.timeout || 3600;

    manager.create(parameters).then(monitor => {
      console.log(`Created: ${monitor.id} (${monitor.name})`);
      response.json({
        id: monitor.id,
        timeout: monitor.timeout,
        expiresAt: monitor.expiresAt,
      });
    }).catch(error => {
      console.error(error);
      return next(new HeartbeatError(500, 'A database error occurred'));
    });
  });

  server.get('/monitors/:id', (request, response, next) => {
    const { id } = validate(request.params, ['id']);

    manager.get(id).then(monitor => {
      if (!monitor) {
        return next(new HeartbeatError(404, 'Monitor not found'));
      }

      manager.tick(monitor).then(updatedMonitor => {
        console.log(`Tick: ${updatedMonitor.id} (${updatedMonitor.name})`);

        response.json({
          id: updatedMonitor.id,
          timeout: updatedMonitor.timeout,
          expiresAt: updatedMonitor.expiresAt,
        });
      }).catch(error => {
        console.error(error);
        return next(new HeartbeatError(500, 'A database error occurred'));
      });
    }).catch(error => {
      console.error(error);
      return next(new HeartbeatError(500, 'A database error occurred'));
    });
  });

  server.put('/monitors/:id', (request, response, next) => {
    const { id, ...parameters } = validate({
      ...request.params,
      ...request.body,
    }, ['id', 'name?', 'timeout?', 'notification?']);

    manager.update(id, parameters).then(monitor => {
      if (!monitor) {
        return next(new HeartbeatError(404, 'Monitor not found'));
      }

      console.log(`Updated: ${monitor.id} (${monitor.name})`);
      manager.tick(monitor).then(updatedMonitor => {
        console.log(`Tick: ${updatedMonitor.id} (${updatedMonitor.name})`);

        response.json({
          id: updatedMonitor.id,
          timeout: updatedMonitor.timeout,
          expiresAt: updatedMonitor.expiresAt,
        });
      }).catch(error => {
        console.error(error);
        return next(new HeartbeatError(500, 'A database error occurred'));
      });
    }).catch(error => {
      console.error(error);
      return next(new HeartbeatError(500, 'A database error occurred'));
    });
  });

  server.delete('/monitors/:id', (request, response, next) => {
    const { id } = validate(request.params, ['id']);

    manager.delete(id).then(monitor => {
      if (!monitor) {
        return next(new HeartbeatError(404, 'Monitor not found'));
      }

      console.log(`Deleted: ${monitor.id} (${monitor.name})`);
      response.json({
        status: 'done',
      });
    }).catch(error => {
      console.error(error);
      return next(new HeartbeatError(500, 'A database error occurred'));
    });
  });
};