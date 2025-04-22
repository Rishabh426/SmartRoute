require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const routes = require('./routes');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smartroute', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api', routes);

// Socket.io connection
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  // Join a specific route or area channel
  socket.on('joinRoute', (routeId) => {
    socket.join(routeId);
    console.log(`Client ${socket.id} joined route: ${routeId}`);
  });
  
  // Leave a specific route or area channel
  socket.on('leaveRoute', (routeId) => {
    socket.leave(routeId);
    console.log(`Client ${socket.id} left route: ${routeId}`);
  });
  
  // Handle traffic updates
  socket.on('trafficUpdate', (data) => {
    // Broadcast to all clients in the specific route
    io.to(data.routeId).emit('trafficUpdate', data);
    console.log(`Traffic update for route ${data.routeId}:`, data);
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Export socket.io instance for use in other files
module.exports.io = io;

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
