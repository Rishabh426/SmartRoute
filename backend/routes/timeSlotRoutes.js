const express = require('express');
const router = express.Router();
const TimeSlot = require('../models/TimeSlot');
const Route = require('../models/Route');
const moment = require('moment');

// Get all available time slots
router.get('/', async (req, res) => {
  try {
    const { routeId, date, status } = req.query;
    
    const query = {};
    
    // Filter by route if provided
    if (routeId) {
      query.route = routeId;
    }
    
    // Filter by date if provided
    if (date) {
      const startOfDay = moment(date).startOf('day').toDate();
      const endOfDay = moment(date).endOf('day').toDate();
      query.startTime = { $gte: startOfDay, $lte: endOfDay };
    }
    
    // Filter by status if provided
    if (status && ['available', 'filling', 'full', 'closed'].includes(status)) {
      query.status = status;
    }
    
    const timeSlots = await TimeSlot.find(query)
      .populate('route', 'name startPoint endPoint isTempleRoute')
      .sort({ startTime: 1 });
    
    res.json(timeSlots);
  } catch (error) {
    console.error('Get time slots error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get time slot by ID
router.get('/:id', async (req, res) => {
  try {
    const timeSlot = await TimeSlot.findById(req.params.id)
      .populate('route', 'name startPoint endPoint isTempleRoute')
      .populate('passes', 'passId user vehicleType vehicleNumber status');
    
    if (!timeSlot) {
      return res.status(404).json({ message: 'Time slot not found' });
    }
    
    res.json(timeSlot);
  } catch (error) {
    console.error('Get time slot error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Generate time slots for a route (admin only)
router.post('/generate', async (req, res) => {
  try {
    const { routeId, startDate, endDate, intervalMinutes, maxCapacity, isSpecialEvent, specialEventName } = req.body;
    
    // Validate route exists
    const route = await Route.findById(routeId);
    if (!route) {
      return res.status(404).json({ message: 'Route not found' });
    }
    
    // Validate dates
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start and end dates are required' });
    }
    
    // Default to 30-minute intervals if not specified
    const interval = intervalMinutes || 30;
    
    // Generate time slots
    const slots = [];
    let currentTime = moment(startDate);
    const end = moment(endDate);
    
    while (currentTime.isBefore(end)) {
      const slotStartTime = currentTime.toDate();
      const slotEndTime = moment(currentTime).add(interval, 'minutes').toDate();
      
      // Create new time slot
      const newSlot = new TimeSlot({
        startTime: slotStartTime,
        endTime: slotEndTime,
        route: routeId,
        maxCapacity: maxCapacity || 500,
        isSpecialEvent: isSpecialEvent || false,
        specialEventName: specialEventName || ''
      });
      
      await newSlot.save();
      slots.push(newSlot);
      
      // Move to next interval
      currentTime.add(interval, 'minutes');
    }
    
    res.status(201).json({
      message: `${slots.length} time slots generated successfully`,
      slots
    });
  } catch (error) {
    console.error('Generate time slots error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update time slot status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['available', 'filling', 'full', 'closed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    const timeSlot = await TimeSlot.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    
    if (!timeSlot) {
      return res.status(404).json({ message: 'Time slot not found' });
    }
    
    // Emit socket event for real-time status update
    const io = require('../server').io;
    io.emit('timeSlotUpdate', {
      timeSlotId: timeSlot._id,
      status,
      updatedAt: new Date()
    });
    
    res.json({
      message: 'Time slot status updated',
      timeSlot
    });
  } catch (error) {
    console.error('Update time slot status error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
