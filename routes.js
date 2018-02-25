const _ = require('lodash');

const { HeartbeatError, ValidationError } = require('./errors');
const { Monitor, createNotification } = require('./models/monitor');
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

};


// const loadMonitors = (onExpired) => {
//   return new Promise((resolve, reject) => {
//     Monitor.find().where('expires').exists().exec().then(monitors => {
//       const now = new Date();

//       const activeMonitors = {}
//       monitors.forEach(monitor => {
//         if (now >= monitor.expires) {
//           monitor.expires = undefined;
//           monitor.save();

//           onExpired(monitor);
//         } else {
//           // set timeout

//           activeMonitors[monitor.id] = monitor;
//         }
//       });

//       resolve(activeMonitors);
//     }).catch(error => reject(error));
//   });
// };

module.exports = (server) => {
  // onExpired should be async
  // const onExpired = (monitor) => {
  //   console.log('[Expired]');
  //   console.log(monitor);
  // };

  // loadMonitors(onExpired).then(monitors => {
  //   console.log('monitors');
  //   console.log(monitors);
  // }).catch(error => {

  // });


  server.post('/monitors', (request, response, next) => {
    const parameters = validate(request.body, ['name', 'timeout?', 'notification']);
    parameters.timeout = parameters.timeout || 3600;

    Monitor.create({
      name: parameters.name,
      timeout: parameters.timeout,
      expiresAt: dateAfter(parameters.timeout * 1000),
      notification: createNotification(parameters.notification),
    }).then(monitor => {
      response.json({
        id: monitor.id,
        timeout: monitor.timeout,
        expiresAt: monitor.expiresAt,
      });
    }).catch(error => {
      console.error(error);
      return next(new HeartbeatError(500, 'A database error occurred'));
    })
  });

  server.get('/monitors/:id', (request, response, next) => {
    const { id } = validate(request.params, ['id']);

    Monitor.findById(id).then(monitor => {
      if (!monitor) {
        return next(new HeartbeatError(404, 'Monitor not found'));
      }

      monitor.expiresAt = dateAfter(monitor.timeout * 1000);
      monitor.save().then(updatedMonitor => {
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

    Monitor.findById(id).then(monitor => {
      if (!monitor) {
        return next(new HeartbeatError(404, 'Monitor not found'));
      }

      for (const [key, value] of Object.entries(parameters)) {
        switch (key) {
          case 'name':
            monitor.name = value;
            break;
          case 'timeout':
            monitor.timeout = value;
            monitor.expiresAt = dateAfter(value * 1000);
            break;
          case 'notification':
            monitor.notification = createNotification(value);
            break;
        }
      }

      monitor.save().then(updatedMonitor => {
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

    Monitor.findByIdAndRemove(id).then(monitor => {
      if (!monitor) {
        return next(new HeartbeatError(404, 'Monitor not found'));
      }

      response.json({
        status: 'done',
      });
    }).catch(error => {
      console.error(error);
      return next(new HeartbeatError(500, 'A database error occurred'));
    });
  });
};