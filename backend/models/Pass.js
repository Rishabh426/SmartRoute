const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const PassSchema = new mongoose.Schema({
  passId: {
    type: String,
    default: () => uuidv4(),
    unique: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  startLocation: {
    type: String,
    required: true
  },
  destination: {
    type: String,
    required: true
  },
  visitingTemple: {
    type: Boolean,
    default: false
  },
  timeSlot: {
    type: Date,
    required: true
  },
  route: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Route',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'used', 'expired', 'cancelled'],
    default: 'active'
  },
  vehicleType: {
    type: String,
    required: true
  },
  vehicleNumber: {
    type: String,
    required: true
  },
  passGeneratedAt: {
    type: Date,
    default: Date.now
  },
  validUntil: {
    type: Date,
    required: true
  }
});

module.exports = mongoose.model('Pass', PassSchema);
