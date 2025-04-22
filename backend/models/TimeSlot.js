const mongoose = require('mongoose');

const TimeSlotSchema = new mongoose.Schema({
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  route: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Route',
    required: true
  },
  maxCapacity: {
    type: Number,
    default: 500
  },
  currentCount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['available', 'filling', 'full', 'closed'],
    default: 'available'
  },
  // Track passes issued for this time slot
  passes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pass'
  }],
  // Special event flag (festivals, holidays, etc.)
  isSpecialEvent: {
    type: Boolean,
    default: false
  },
  specialEventName: {
    type: String
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

// Update status based on current count
TimeSlotSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  if (this.currentCount >= this.maxCapacity) {
    this.status = 'full';
  } else if (this.currentCount >= this.maxCapacity * 0.8) {
    this.status = 'filling';
  } else {
    this.status = 'available';
  }
  
  next();
});

module.exports = mongoose.model('TimeSlot', TimeSlotSchema);
