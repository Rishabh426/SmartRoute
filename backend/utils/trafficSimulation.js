/**
 * Traffic Simulation Utility
 * 
 * This module provides algorithms for simulating traffic flow,
 * calculating optimal routes, and distributing vehicle load across time slots.
 */

const Route = require('../models/Route');
const TimeSlot = require('../models/TimeSlot');
const Pass = require('../models/Pass');
const moment = require('moment');

/**
 * Calculate traffic density for a route at a specific time
 * @param {String} routeId - ID of the route
 * @param {Date} time - Time to check traffic density
 * @returns {Object} Traffic density information
 */
const calculateTrafficDensity = async (routeId, time) => {
  try {
    // Get the route
    const route = await Route.findById(routeId);
    if (!route) {
      throw new Error('Route not found');
    }
    
    // Find time slots around the specified time
    const startTime = moment(time).subtract(1, 'hour').toDate();
    const endTime = moment(time).add(1, 'hour').toDate();
    
    const timeSlots = await TimeSlot.find({
      route: routeId,
      startTime: { $gte: startTime, $lte: endTime }
    }).populate('passes');
    
    // Calculate total vehicles in the time range
    let totalVehicles = 0;
    timeSlots.forEach(slot => {
      totalVehicles += slot.currentCount;
    });
    
    // Calculate density as vehicles per km
    const density = totalVehicles / route.distance;
    
    // Determine traffic level based on density
    let trafficLevel = 'low';
    if (density > 100) {
      trafficLevel = 'severe';
    } else if (density > 50) {
      trafficLevel = 'high';
    } else if (density > 20) {
      trafficLevel = 'medium';
    }
    
    return {
      routeId,
      density,
      trafficLevel,
      totalVehicles,
      timeSlots: timeSlots.length
    };
  } catch (error) {
    console.error('Traffic density calculation error:', error);
    throw error;
  }
};

/**
 * Find optimal time slot for a journey
 * @param {String} startLocation - Starting location
 * @param {String} destination - Destination
 * @param {Boolean} visitingTemple - Whether the user is visiting the temple
 * @param {Date} preferredDate - User's preferred date
 * @returns {Object} Optimal time slot and route information
 */
const findOptimalTimeSlot = async (startLocation, destination, visitingTemple, preferredDate) => {
  try {
    // Find suitable routes
    const routeQuery = {
      startPoint: startLocation,
      endPoint: destination
    };
    
    if (visitingTemple !== undefined) {
      routeQuery.isTempleRoute = visitingTemple;
    }
    
    const routes = await Route.find(routeQuery);
    
    if (routes.length === 0) {
      throw new Error('No suitable routes found');
    }
    
    // Get start and end of preferred date
    const startOfDay = moment(preferredDate).startOf('day').toDate();
    const endOfDay = moment(preferredDate).endOf('day').toDate();
    
    // Find all available time slots for these routes on the preferred date
    const availableSlots = [];
    
    for (const route of routes) {
      const slots = await TimeSlot.find({
        route: route._id,
        startTime: { $gte: startOfDay, $lte: endOfDay },
        status: { $ne: 'full' }
      }).sort({ currentCount: 1 }); // Sort by least crowded first
      
      slots.forEach(slot => {
        availableSlots.push({
          timeSlot: slot,
          route: route,
          loadFactor: slot.currentCount / slot.maxCapacity
        });
      });
    }
    
    if (availableSlots.length === 0) {
      throw new Error('No available time slots found for the preferred date');
    }
    
    // Sort by load factor (least crowded first)
    availableSlots.sort((a, b) => a.loadFactor - b.loadFactor);
    
    // Return the optimal slot
    return {
      timeSlot: availableSlots[0].timeSlot,
      route: availableSlots[0].route,
      loadFactor: availableSlots[0].loadFactor,
      alternativeSlots: availableSlots.slice(1, 4) // Return a few alternatives
    };
  } catch (error) {
    console.error('Optimal time slot finding error:', error);
    throw error;
  }
};

/**
 * Distribute vehicles across time slots to balance load
 * @param {String} routeId - ID of the route
 * @param {Date} date - Date to balance
 * @returns {Object} Load balancing results
 */
const balanceRouteLoad = async (routeId, date) => {
  try {
    // Get the route
    const route = await Route.findById(routeId);
    if (!route) {
      throw new Error('Route not found');
    }
    
    // Get start and end of date
    const startOfDay = moment(date).startOf('day').toDate();
    const endOfDay = moment(date).endOf('day').toDate();
    
    // Find all time slots for this route on the given date
    const timeSlots = await TimeSlot.find({
      route: routeId,
      startTime: { $gte: startOfDay, $lte: endOfDay }
    }).sort({ startTime: 1 });
    
    if (timeSlots.length === 0) {
      throw new Error('No time slots found for the given date');
    }
    
    // Calculate average load
    const totalCapacity = timeSlots.reduce((sum, slot) => sum + slot.maxCapacity, 0);
    const totalCurrent = timeSlots.reduce((sum, slot) => sum + slot.currentCount, 0);
    const averageLoad = totalCurrent / timeSlots.length;
    
    // Find overloaded and underloaded slots
    const overloadedSlots = timeSlots.filter(slot => slot.currentCount > averageLoad * 1.2);
    const underloadedSlots = timeSlots.filter(slot => slot.currentCount < averageLoad * 0.8);
    
    return {
      routeId,
      date: date,
      totalSlots: timeSlots.length,
      totalVehicles: totalCurrent,
      averageLoad,
      overloadedSlots: overloadedSlots.length,
      underloadedSlots: underloadedSlots.length,
      loadDistribution: timeSlots.map(slot => ({
        timeSlotId: slot._id,
        startTime: slot.startTime,
        endTime: slot.endTime,
        currentCount: slot.currentCount,
        maxCapacity: slot.maxCapacity,
        loadPercentage: (slot.currentCount / slot.maxCapacity) * 100
      }))
    };
  } catch (error) {
    console.error('Route load balancing error:', error);
    throw error;
  }
};

module.exports = {
  calculateTrafficDensity,
  findOptimalTimeSlot,
  balanceRouteLoad
};
