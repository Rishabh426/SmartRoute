/**
 * Database Seed Script
 * 
 * This script populates the database with initial data for testing
 * including routes, time slots, and admin user
 */

const mongoose = require('mongoose');
const User = require('../models/User');
const Route = require('../models/Route');
const TimeSlot = require('../models/TimeSlot');
const moment = require('moment');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smartroute', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected for seeding'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Sample data
const adminUser = {
  name: 'Admin User',
  email: 'admin@smartroute.com',
  password: 'admin123',
  phone: '9876543210',
  vehicleType: 'car',
  vehicleNumber: 'ADMIN-001',
  role: 'admin'
};

const routes = [
  {
    name: 'Main Temple Route',
    description: 'Primary route to Kachi Dham temple',
    startPoint: 'City Center',
    endPoint: 'Kachi Dham Temple',
    waypoints: [
      { name: 'Market Square', latitude: 30.7333, longitude: 79.0667 },
      { name: 'River Crossing', latitude: 30.7350, longitude: 79.0690 }
    ],
    distance: 5.2,
    estimatedTime: 45,
    maxCapacity: 500,
    isTempleRoute: true,
    trafficLevel: 'low',
    status: 'open'
  },
  {
    name: 'Northern Bypass',
    description: 'Alternative route from north side',
    startPoint: 'Northern Gate',
    endPoint: 'Kachi Dham Temple',
    waypoints: [
      { name: 'Hill View', latitude: 30.7400, longitude: 79.0700 },
      { name: 'Forest Path', latitude: 30.7380, longitude: 79.0720 }
    ],
    distance: 7.8,
    estimatedTime: 60,
    maxCapacity: 400,
    isTempleRoute: true,
    trafficLevel: 'low',
    status: 'open'
  },
  {
    name: 'Southern Route',
    description: 'Route from southern residential area',
    startPoint: 'South Colony',
    endPoint: 'Kachi Dham Temple',
    waypoints: [
      { name: 'Lake View', latitude: 30.7200, longitude: 79.0650 },
      { name: 'Old Bridge', latitude: 30.7250, longitude: 79.0670 }
    ],
    distance: 6.5,
    estimatedTime: 55,
    maxCapacity: 450,
    isTempleRoute: true,
    trafficLevel: 'low',
    status: 'open'
  },
  {
    name: 'City Bypass',
    description: 'Route avoiding temple area',
    startPoint: 'City Center',
    endPoint: 'Industrial Area',
    waypoints: [
      { name: 'West Junction', latitude: 30.7300, longitude: 79.0600 }
    ],
    distance: 4.2,
    estimatedTime: 30,
    maxCapacity: 600,
    isTempleRoute: false,
    trafficLevel: 'low',
    status: 'open'
  }
];

// Function to create time slots for a route
const createTimeSlotsForRoute = async (routeId) => {
  const slots = [];
  // Create slots for today and tomorrow
  for (let day = 0; day < 2; day++) {
    const date = moment().add(day, 'days');
    
    // Create slots from 6 AM to 9 PM with 30-minute intervals
    for (let hour = 6; hour < 21; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const startTime = moment(date).hour(hour).minute(minute).second(0);
        const endTime = moment(startTime).add(30, 'minutes');
        
        const slot = new TimeSlot({
          startTime: startTime.toDate(),
          endTime: endTime.toDate(),
          route: routeId,
          maxCapacity: 500,
          currentCount: Math.floor(Math.random() * 200) // Random initial count
        });
        
        await slot.save();
        slots.push(slot);
      }
    }
  }
  
  return slots;
};

// Seed the database
const seedDatabase = async () => {
  try {
    // Clear existing data
    await User.deleteMany({});
    await Route.deleteMany({});
    await TimeSlot.deleteMany({});
    
    console.log('Existing data cleared');
    
    // Create admin user
    const admin = new User(adminUser);
    await admin.save();
    console.log('Admin user created');
    
    // Create routes
    const createdRoutes = [];
    for (const route of routes) {
      const newRoute = new Route(route);
      await newRoute.save();
      createdRoutes.push(newRoute);
      console.log(`Route created: ${newRoute.name}`);
    }
    
    // Create time slots for each route
    for (const route of createdRoutes) {
      const slots = await createTimeSlotsForRoute(route._id);
      console.log(`Created ${slots.length} time slots for route: ${route.name}`);
    }
    
    console.log('Database seeding completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

// Run the seed function
seedDatabase();
