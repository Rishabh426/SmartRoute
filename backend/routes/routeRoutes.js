const express = require('express');
const router = express.Router();
const Route = require('../models/Route');

// Get all routes
router.get('/', async (req, res) => {
  try {
    const routes = await Route.find();
    res.json(routes);
  } catch (error) {
    console.error('Get routes error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get route by ID
router.get('/:id', async (req, res) => {
  try {
    const route = await Route.findById(req.params.id);
    
    if (!route) {
      return res.status(404).json({ message: 'Route not found' });
    }
    
    res.json(route);
  } catch (error) {
    console.error('Get route error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create new route (admin only)
router.post('/', async (req, res) => {
  try {
    const {
      name,
      description,
      startPoint,
      endPoint,
      waypoints,
      distance,
      estimatedTime,
      maxCapacity,
      isTempleRoute,
      restrictions
    } = req.body;
    
    // Check if route already exists
    const existingRoute = await Route.findOne({ name });
    if (existingRoute) {
      return res.status(400).json({ message: 'Route with this name already exists' });
    }
    
    const newRoute = new Route({
      name,
      description,
      startPoint,
      endPoint,
      waypoints: waypoints || [],
      distance,
      estimatedTime,
      maxCapacity: maxCapacity || 500,
      isTempleRoute: isTempleRoute || false,
      restrictions: restrictions || { vehicleTypes: [], timeRestrictions: [] }
    });
    
    await newRoute.save();
    
    res.status(201).json({
      message: 'Route created successfully',
      route: newRoute
    });
  } catch (error) {
    console.error('Create route error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update route traffic level
router.patch('/:id/traffic', async (req, res) => {
  try {
    const { trafficLevel } = req.body;
    
    if (!['low', 'medium', 'high', 'severe'].includes(trafficLevel)) {
      return res.status(400).json({ message: 'Invalid traffic level' });
    }
    
    const route = await Route.findByIdAndUpdate(
      req.params.id,
      { trafficLevel },
      { new: true }
    );
    
    if (!route) {
      return res.status(404).json({ message: 'Route not found' });
    }
    
    // Emit socket event for real-time traffic update
    const io = require('../server').io;
    io.to(route._id.toString()).emit('trafficUpdate', {
      routeId: route._id,
      trafficLevel,
      updatedAt: new Date()
    });
    
    res.json({
      message: 'Route traffic level updated',
      route
    });
  } catch (error) {
    console.error('Update route traffic error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update route status (open, closed, restricted)
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['open', 'closed', 'restricted'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    const route = await Route.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    
    if (!route) {
      return res.status(404).json({ message: 'Route not found' });
    }
    
    // Emit socket event for real-time status update
    const io = require('../server').io;
    io.to(route._id.toString()).emit('routeStatusUpdate', {
      routeId: route._id,
      status,
      updatedAt: new Date()
    });
    
    res.json({
      message: 'Route status updated',
      route
    });
  } catch (error) {
    console.error('Update route status error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
