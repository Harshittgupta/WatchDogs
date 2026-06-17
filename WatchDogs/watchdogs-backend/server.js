const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const http = require('http');
const socketIO = require('socket.io');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files (for driver documents)
app.use('/uploads', express.static('uploads'));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/watchdogs', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB Connected'))
.catch(err => console.error('❌ MongoDB Connection Error:', err));

// Socket.io for real-time features
io.on('connection', (socket) => {
  console.log('👤 User connected:', socket.id);

  // Existing socket events
  socket.on('location:update', (data) => {
    socket.broadcast.emit('location:new', data);
  });

  socket.on('report:new', (data) => {
    socket.broadcast.emit('report:added', data);
  });

  socket.on('checkin:new', (data) => {
    socket.broadcast.emit('checkin:added', data);
  });

  socket.on('emergency:trigger', (data) => {
    io.emit('emergency:alert', data);
  });

  // Driver joins their room
  socket.on('driver:join', (driverId) => {
    socket.join(`driver:${driverId}`);
    console.log(`🚗 Driver ${driverId} joined their room`);
  });
  
  // User joins ride room
  socket.on('ride:join', (rideId) => {
    socket.join(`ride:${rideId}`);
    console.log(`👤 User joined ride room: ${rideId}`);
  });
  
  // Driver location update (real-time tracking)
  socket.on('driver:location', async (data) => {
    const { driverId, latitude, longitude, rideId, speed, heading } = data;
    
    console.log(`📍 Driver ${driverId} location update:`, { latitude, longitude });
    
    // Broadcast to ride room (user sees driver moving)
    io.to(`ride:${rideId}`).emit('driver:location:update', {
      latitude,
      longitude,
      speed,
      heading,
      timestamp: new Date()
    });
    
    // Update location in database
    try {
      const Ride = require('./models/Ride');
      const ride = await Ride.findById(rideId);
      if (ride) {
        ride.updateDriverLocation(longitude, latitude);
        ride.addTrackingPoint([longitude, latitude], speed, heading);
        await ride.save();
      }
    } catch (error) {
      console.error('❌ Error updating driver location:', error);
    }
  });
  
  // Notify driver of new ride request
  socket.on('ride:request', (data) => {
    const { driverId, rideDetails } = data;
    io.to(`driver:${driverId}`).emit('new-ride-request', rideDetails);
    console.log(`🔔 Sent ride request to driver ${driverId}`);
  });
  
  // Driver accepts ride
  socket.on('ride:accept', (data) => {
    const { rideId, driverDetails } = data;
    io.to(`ride:${rideId}`).emit('driver-accepted', driverDetails);
    console.log(`✅ Driver accepted ride ${rideId}`);
  });
  
  // Driver arrived at pickup
  socket.on('ride:arrived', (data) => {
    const { rideId } = data;
    io.to(`ride:${rideId}`).emit('driver-arrived', data);
    console.log(`📍 Driver arrived at pickup for ride ${rideId}`);
  });
  
  // Ride started
  socket.on('ride:started', (data) => {
    const { rideId } = data;
    io.to(`ride:${rideId}`).emit('ride-started', data);
    console.log(`🚗 Ride ${rideId} started`);
  });
  
  // Ride completed
  socket.on('ride:completed', (data) => {
    const { rideId, fare } = data;
    io.to(`ride:${rideId}`).emit('ride-completed', { fare });
    console.log(`✅ Ride ${rideId} completed`);
  });
  
  // Ride cancelled
  socket.on('ride:cancelled', (data) => {
    const { rideId, cancelledBy, reason } = data;
    io.to(`ride:${rideId}`).emit('ride-cancelled', { cancelledBy, reason });
    if (data.driverId) {
      io.to(`driver:${data.driverId}`).emit('ride-cancelled', { rideId, reason });
    }
    console.log(`❌ Ride ${rideId} cancelled by ${cancelledBy}`);
  });
  
  // No driver found
  socket.on('ride:no-driver', (data) => {
    const { rideId } = data;
    io.to(`ride:${rideId}`).emit('no-driver-found');
    console.log(`⚠️ No driver found for ride ${rideId}`);
  });

  socket.on('disconnect', () => {
    console.log('👤 User disconnected:', socket.id);
  });
});

// Make io accessible to routes
app.set('io', io);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/location', require('./routes/location'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/emergency', require('./routes/emergency'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/digital-id', require('./routes/digitalId'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/admin', require('./routes/admin'));

// CAB BOOKING ROUTES
app.use('/api/rides', require('./routes/rides'));
app.use('/api/driver/auth', require('./routes/driver/auth'));

// DRIVER LOCATION ROUTES (NEW!) - Add this line
app.use('/api/driver/location', require('./routes/driver/location'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'WatchDogs API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🚕 Cab booking enabled with real-time tracking`);
  console.log(`📍 Driver location tracking enabled`);
});