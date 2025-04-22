const express = require('express');
const router = express.Router();
const Route = require('../models/Route');
const TimeSlot = require('../models/TimeSlot');
const Pass = require('../models/Pass');
const { 
  calculateTrafficDensity, 
  findOptimalTimeSlot, 
  balanceRouteLoad 
} = require('../utils/trafficSimulation');

/**
 * Get traffic status for a specific route
 */
const getRouteTraffic = async (req, res) => {
  try {
    const { routeId } = req.params;
    const time = req.query.time ? new Date(req.query.time) : new Date();
    
    const trafficData = await calculateTrafficDensity(routeId, time);
    
    res.json(trafficData);
  } catch (error) {
    console.error('Get route traffic error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Get optimal time slot for a journey
 */
const getOptimalTimeSlot = async (req, res) => {
  try {
    const { startLocation, destination, visitingTemple, preferredDate } = req.body;
    
    if (!startLocation || !destination || !preferredDate) {
      return res.status(400).json({ message: 'Start location, destination, and preferred date are required' });
    }
    
    const optimalSlot = await findOptimalTimeSlot(
      startLocation,
      destination,
      visitingTemple,
      new Date(preferredDate)
    );
    
    res.json(optimalSlot);
  } catch (error) {
    console.error('Get optimal time slot error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Balance load across time slots for a route
 */
const balanceLoad = async (req, res) => {
  try {
    const { routeId } = req.params;
    const date = req.query.date ? new Date(req.query.date) : new Date();
    
    const balancingResults = await balanceRouteLoad(routeId, date);
    
    res.json(balancingResults);
  } catch (error) {
    console.error('Balance load error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Get real-time traffic overview for all routes
 */
const getTrafficOverview = async (req, res) => {
  try {
    // Get all active routes
    const routes = await Route.find({ status: { $ne: 'closed' } });
    
    // Get current traffic for each route
    const trafficData = [];
    for (const route of routes) {
      const traffic = await calculateTrafficDensity(route._id, new Date());
      trafficData.push({
        routeId: route._id,
        routeName: route.name,
        startPoint: route.startPoint,
        endPoint: route.endPoint,
        isTempleRoute: route.isTempleRoute,
        trafficLevel: traffic.trafficLevel,
        density: traffic.density,
        status: route.status
      });
    }
    
    res.json({
      timestamp: new Date(),
      routes: trafficData
    });
  } catch (error) {
    console.error('Traffic overview error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Simulate traffic for a specific time period
 */
const simulateTraffic = async (req, res) => {
  try {
    const { routeId, startTime, endTime, vehicleCount } = req.body;
    
    if (!routeId || !startTime || !endTime || !vehicleCount) {
      return res.status(400).json({ 
        message: 'Route ID, start time, end time, and vehicle count are required' 
      });
    }
    
    // Get the route
    const route = await Route.findById(routeId);
    if (!route) {
      return res.status(404).json({ message: 'Route not found' });
    }
    
    // Get time slots in the specified period
    const timeSlots = await TimeSlot.find({
      route: routeId,
      startTime: { $gte: new Date(startTime), $lte: new Date(endTime) }
    }).sort({ startTime: 1 });
    
    if (timeSlots.length === 0) {
      return res.status(404).json({ message: 'No time slots found in the specified period' });
    }
    
    // Distribute vehicles across time slots
    const vehiclesPerSlot = Math.floor(vehicleCount / timeSlots.length);
    const remainder = vehicleCount % timeSlots.length;
    
    const updatedSlots = [];
    
    for (let i = 0; i < timeSlots.length; i++) {
      const slot = timeSlots[i];
      let addedVehicles = vehiclesPerSlot;
      
      // Add remainder to first slots
      if (i < remainder) {
        addedVehicles += 1;
      }
      
      // Update slot count
      slot.currentCount += addedVehicles;
      if (slot.currentCount > slot.maxCapacity) {
        slot.status = 'full';
      } else if (slot.currentCount > slot.maxCapacity * 0.8) {
        slot.status = 'filling';
      }
      
      await slot.save();
      updatedSlots.push({
        timeSlotId: slot._id,
        startTime: slot.startTime,
        endTime: slot.endTime,
        previousCount: slot.currentCount - addedVehicles,
        addedVehicles,
        newCount: slot.currentCount,
        status: slot.status
      });
    }
    
    // Update route traffic level based on new load
    const averageLoad = updatedSlots.reduce((sum, slot) => sum + slot.newCount, 0) / updatedSlots.length;
    let trafficLevel = 'low';
    
    if (averageLoad > route.maxCapacity * 0.8) {
      trafficLevel = 'severe';
    } else if (averageLoad > route.maxCapacity * 0.6) {
      trafficLevel = 'high';
    } else if (averageLoad > route.maxCapacity * 0.4) {
      trafficLevel = 'medium';
    }
    
    route.trafficLevel = trafficLevel;
    await route.save();
    
    // Emit socket event for real-time traffic update
    const io = require('../server').io;
    io.to(routeId).emit('trafficSimulation', {
      routeId,
      trafficLevel,
      simulatedVehicles: vehicleCount,
      timeSlots: updatedSlots
    });
    
    res.json({
      message: 'Traffic simulation completed',
      routeId,
      simulatedVehicles: vehicleCount,
      trafficLevel,
      timeSlots: updatedSlots
    });
  } catch (error) {
    console.error('Traffic simulation error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getRouteTraffic,
  getOptimalTimeSlot,
  balanceLoad,
  getTrafficOverview,
  simulateTraffic
};
