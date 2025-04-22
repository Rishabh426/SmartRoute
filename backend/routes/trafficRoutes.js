const express = require('express');
const router = express.Router();
const { 
  getRouteTraffic, 
  getOptimalTimeSlot, 
  balanceLoad, 
  getTrafficOverview, 
  simulateTraffic 
} = require('../controllers/trafficController');
const { auth, admin } = require('../middleware/auth');

// Get traffic status for a specific route
router.get('/route/:routeId', getRouteTraffic);

// Get optimal time slot for a journey
router.post('/optimal-slot', getOptimalTimeSlot);

// Balance load across time slots for a route (admin only)
router.get('/balance/:routeId', auth, admin, balanceLoad);

// Get real-time traffic overview for all routes
router.get('/overview', getTrafficOverview);

// Simulate traffic for a specific time period (admin only)
router.post('/simulate', auth, admin, simulateTraffic);

module.exports = router;
