const mongoose = require('mongoose');
const timestamps = require('mongoose-timestamp');

// Schema
const notificationSchema = new mongoose.Schema({}, {
  _id: false,
  discriminatorKey: 'scheme',
});

const monitorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  timeout: {
    type: Number,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: false,
  },
  notification: notificationSchema,
});
monitorSchema.plugin(timestamps);

const pushoverNotificationSchema = new mongoose.Schema({
  user: {
    type: String,
    required: true,
    trim: true,
  },
  token: {
    type: String,
    required: true,
    trim: true,
  },
}, {
  _id: false,
});

const webhookNotificationSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
    trim: true,
  },
}, {
  _id: false,
});

// Models
const PushoverNotification = monitorSchema.path('notification').discriminator(
  'Pushover',
  pushoverNotificationSchema
);
const WebhookNotification = monitorSchema.path('notification').discriminator(
  'Webhook',
  webhookNotificationSchema
);

const Monitor = mongoose.model('Monitor', monitorSchema);

// Helper functions
const createNotification = (notification) => {
  switch (notification.scheme.toLowerCase()) {
    case 'pushover':
      return new PushoverNotification({
        user: notification.user,
        token: notification.token,
      });
    case 'webhook':
      return new WebhookNotification({
        url: notification.url,
      });
  }
}

module.exports = {
  Monitor,
  PushoverNotification,
  WebhookNotification,
  createNotification,
}