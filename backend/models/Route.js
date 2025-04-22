const mongoose = require('mongoose');

const RouteSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String
  },
  startPoint: {
    type: String,
    required: true
  },
  endPoint: {
    type: String,
    required: true
  },
  waypoints: [{
    name: String,
    latitude: Number,
    longitude: Number
  }],
  distance: {
    type: Number,  // in kilometers
    required: true
  },
  estimatedTime: {
    type: Number,  // in minutes
    required: true
  },
  maxCapacity: {
    type: Number,
    default: 500  // default max capacity per 30 min window
  },
  isTempleRoute: {
    type: Boolean,
    default: false
  },
  trafficLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'severe'],
    default: 'low'
  },
  status: {
    type: String,
    enum: ['open', 'closed', 'restricted'],
    default: 'open'
  },
  restrictions: {
    vehicleTypes: [{
      type: String,
      enum: ['car', 'bike', 'bus', 'truck', 'other']
    }],
    timeRestrictions: [{
      dayOfWeek: Number,  // 0-6 (Sunday-Saturday)
      startTime: String,  // HH:MM format
      endTime: String     // HH:MM format
    }]
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp before saving
RouteSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Route', RouteSchema);
