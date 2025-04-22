const express = require('express');
const router = express.Router();
const Pass = require('../models/Pass');
const User = require('../models/User');
const Route = require('../models/Route');
const TimeSlot = require('../models/TimeSlot');
const moment = require('moment');

// Generate a new pass
router.post('/generate', async (req, res) => {
  try {
    const { userId, startLocation, destination, visitingTemple, timeSlotId } = req.body;
    
    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Verify time slot exists and has capacity
    const timeSlot = await TimeSlot.findById(timeSlotId);
    if (!timeSlot) {
      return res.status(404).json({ message: 'Time slot not found' });
    }
    
    if (timeSlot.status === 'full') {
      return res.status(400).json({ message: 'Time slot is already full' });
    }
    
    // Find optimal route based on start, destination, and whether visiting temple
    let route;
    if (visitingTemple) {
      route = await Route.findOne({ 
        startPoint: startLocation, 
        endPoint: destination,
        isTempleRoute: true
      });
    } else {
      route = await Route.findOne({ 
        startPoint: startLocation, 
        endPoint: destination,
        isTempleRoute: false
      });
    }
    
    if (!route) {
      return res.status(404).json({ message: 'No suitable route found' });
    }
    
    // Calculate valid until time (end of time slot)
    const validUntil = timeSlot.endTime;
    
    // Create new pass
    const newPass = new Pass({
      user: userId,
      startLocation,
      destination,
      visitingTemple,
      timeSlot: timeSlot.startTime,
      route: route._id,
      vehicleType: user.vehicleType,
      vehicleNumber: user.vehicleNumber,
      validUntil
    });
    
    await newPass.save();
    
    // Update time slot count and add pass reference
    timeSlot.currentCount += 1;
    timeSlot.passes.push(newPass._id);
    await timeSlot.save();
    
    res.status(201).json({
      message: 'Pass generated successfully',
      pass: newPass
    });
  } catch (error) {
    console.error('Pass generation error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get pass by ID
router.get('/:passId', async (req, res) => {
  try {
    const pass = await Pass.findOne({ passId: req.params.passId })
      .populate('user', 'name email phone vehicleType vehicleNumber')
      .populate('route', 'name description startPoint endPoint estimatedTime');
    
    if (!pass) {
      return res.status(404).json({ message: 'Pass not found' });
    }
    
    res.json(pass);
  } catch (error) {
    console.error('Get pass error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all passes for a user
router.get('/user/:userId', async (req, res) => {
  try {
    const passes = await Pass.find({ user: req.params.userId })
      .populate('route', 'name description startPoint endPoint estimatedTime')
      .sort({ timeSlot: -1 });
    
    res.json(passes);
  } catch (error) {
    console.error('Get user passes error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update pass status
router.patch('/:passId/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['active', 'used', 'expired', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    const pass = await Pass.findOneAndUpdate(
      { passId: req.params.passId },
      { status },
      { new: true }
    );
    
    if (!pass) {
      return res.status(404).json({ message: 'Pass not found' });
    }
    
    res.json({
      message: 'Pass status updated',
      pass
    });
  } catch (error) {
    console.error('Update pass status error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
