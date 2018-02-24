const _ = require('lodash');
const { body, param, validationResult } = require('express-validator/check');
const { matchedData } = require('express-validator/filter');

const HeartbeatError = require('./error');
const { Monitor, createNotification } = require('./models/monitor');

const { conditionalExists, dateAfter } = require('./utils');

const validate = (request) => {
  const result = validationResult(request).formatWith(error => `\`${error.param}\` ${error.msg}`);
  if (!result.isEmpty()) {
    throw new HeartbeatError(400, _.head(result.array()));
  }

  return matchedData(request);
};

const onExpired = (monitor) => {

};
/*
  write my own validate function using validate.js

  validate(request, parameters): Object
    parameters: {
      name: 'something',
      optional: true, false
    }

*/


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


  server.post('/monitors', [
    body('name')
      .exists().withMessage('is required')
      .not().isEmpty().withMessage('must be not empty')
      .trim(),
    body('timeout')
      .optional()
      .isInt({ gt: 0 }).withMessage('must be a positive integer')
      .toInt(),
    body('notification')
      .exists().withMessage('is required'),
    body('notification.scheme')
      .exists().withMessage('is required')
      .isIn(['pushover', 'webhook']).withMessage('is not supported'),
    body('notification.user')
      .custom(conditionalExists(body => _.get(body, 'notification.scheme') === 'pushover'))
        .withMessage('is required'),
    body('notification.token')
      .custom(conditionalExists(body => _.get(body, 'notification.scheme') === 'pushover'))
        .withMessage('is required'),
    body('notification.url')
      .custom(conditionalExists(body => _.get(body, 'notification.scheme') === 'webhook'))
        .withMessage('is required'),
  ], (request, response, next) => {
    const parameters = validate(request);
    console.log(parameters);
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

  server.get('/monitors/:id', [
    param('id').isMongoId().withMessage('is not valid'),
  ], (request, response, next) => {
    const { id } = validate(request);

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

  server.put('/monitors/:id', [
    param('id').isMongoId().withMessage('is not valid'),
    body('name')
      .optional()
      .not().isEmpty().withMessage('must be not empty')
      .trim(),
    body('timeout')
      .optional()
      .isInt({ gt: 0 }).withMessage('must be a positive integer')
      .toInt(),
    body('notification')
      .optional(),
    body('notification.scheme')
      .optional()
      .isIn(['pushover', 'webhook']).withMessage('is not supported'),
    body('notification.user')
      .custom(conditionalExists(body => _.get(body, 'notification.scheme') === 'pushover'))
        .withMessage('is required'),
    body('notification.token')
      .custom(conditionalExists(body => _.get(body, 'notification.scheme') === 'pushover'))
        .withMessage('is required'),
    body('notification.url')
      .custom(conditionalExists(body => _.get(body, 'notification.scheme') === 'webhook'))
        .withMessage('is required')

  ], (request, response, next) => {
    const { id, ...parameters } = validate(request);

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
            if (_.isUndefined(value.scheme)) continue;
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

  server.delete('/monitors/:id', [
    param('id').isMongoId().withMessage('is not valid'),
  ], (request, response, next) => {
    const { id } = validate(request);

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