const express = require('express');
const router = express.Router();
const userRoutes = require('./userRoutes');
const passRoutes = require('./passRoutes');
const routeRoutes = require('./routeRoutes');
const timeSlotRoutes = require('./timeSlotRoutes');
const trafficRoutes = require('./trafficRoutes');

// Mount routes
router.use('/users', userRoutes);
//  user route just login , create account  , register 
router.use('/passes', passRoutes);
router.use('/routes', routeRoutes);
router.use('/timeslots', timeSlotRoutes);
router.use('/traffic', trafficRoutes);

// Health check route
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

module.exports = router;
