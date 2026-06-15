# 🛡️ WatchDogs Backend API

Complete MERN backend for the WatchDogs Tourist Safety Platform.

## 🚀 Features Implemented

✅ **Authentication & User Management**
- JWT-based authentication
- User registration & login
- Password hashing with bcrypt
- Protected routes

✅ **Real-Time Location Tracking**
- GPS coordinate storage with geospatial indexing
- Location history
- Safety check-ins
- Nearby user detection

✅ **Community Safety Network**
- Safety report submission (safe, caution, danger, info)
- Upvote/downvote system
- Report filtering and nearby reports
- Real-time feed via Socket.io

✅ **Document Management**
- Secure file upload (passports, visas, insurance)
- Expiry tracking & alerts
- Document download
- Status monitoring

✅ **Emergency Response System**
- Multi-level emergency alerts (1-3)
- Auto-notification to emergency contacts
- Location broadcasting
- Emergency history

✅ **AI Features**
- Safety predictions based on time & location
- Smart recommendations
- Cultural etiquette tips
- Emergency phrase translation
- Local alerts

## 📁 Project Structure

```
watchdogs-backend/
├── models/
│   ├── User.js              # User schema with auth
│   ├── Location.js          # Location tracking
│   ├── SafetyReport.js      # Community reports
│   ├── Document.js          # Travel documents
│   └── Emergency.js         # Emergency alerts
├── routes/
│   ├── auth.js              # Authentication endpoints
│   ├── users.js             # User management
│   ├── location.js          # Location tracking
│   ├── reports.js           # Safety reports
│   ├── documents.js         # Document management
│   ├── emergency.js         # Emergency system
│   └── ai.js                # AI features
├── middleware/
│   └── auth.js              # JWT middleware
├── uploads/                 # File storage
├── server.js                # Main server file
├── .env                     # Environment variables
└── package.json             # Dependencies
```

## 🛠️ Installation

### Prerequisites
- Node.js (v14+)
- MongoDB (v4.4+)
- npm or yarn

### Setup Steps

1. **Install dependencies:**
```bash
cd watchdogs-backend
npm install
```

2. **Configure environment variables:**
```bash
# .env file is already created, update these values:
MONGODB_URI=mongodb://localhost:27017/watchdogs
JWT_SECRET=<generated-automatically>
PORT=5000
CLIENT_URL=http://localhost:5173
```

3. **Start MongoDB:**
```bash
# Make sure MongoDB is running
mongod
```

4. **Run the server:**
```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

Server will start on: `http://localhost:5000`

## 📡 API Endpoints

### Authentication
```
POST   /api/auth/register          Register new user
POST   /api/auth/login             Login user
GET    /api/auth/me                Get current user
PUT    /api/auth/update-password   Update password
```

### User Management
```
GET    /api/users/profile                     Get profile
PUT    /api/users/profile                     Update profile
POST   /api/users/emergency-contacts          Add emergency contact
PUT    /api/users/emergency-contacts/:id      Update contact
DELETE /api/users/emergency-contacts/:id      Delete contact
PUT    /api/users/medical-info                Update medical info
DELETE /api/users/account                     Delete account
```

### Location Tracking
```
POST   /api/location/update           Update location
GET    /api/location/current          Get current location
GET    /api/location/history          Get location history
POST   /api/location/check-in         Public safety check-in
GET    /api/location/nearby-checkins  Get nearby check-ins
```

### Safety Reports
```
POST   /api/reports/create        Create safety report
GET    /api/reports/feed          Get community feed
GET    /api/reports/nearby        Get nearby reports
POST   /api/reports/:id/upvote    Upvote report
POST   /api/reports/:id/downvote  Downvote report
DELETE /api/reports/:id           Delete own report
GET    /api/reports/stats         Get community stats
```

### Documents
```
POST   /api/documents/upload          Upload document
GET    /api/documents/list            Get all documents
GET    /api/documents/:id             Get document details
GET    /api/documents/:id/download    Download document
PUT    /api/documents/:id             Update document
DELETE /api/documents/:id             Delete document
GET    /api/documents/expiring/soon   Get expiring documents
```

### Emergency
```
POST   /api/emergency/trigger         Trigger emergency alert
PUT    /api/emergency/:id/resolve     Resolve emergency
PUT    /api/emergency/:id/cancel      Cancel emergency
GET    /api/emergency/status          Get active emergency
GET    /api/emergency/history         Get emergency history
POST   /api/emergency/:id/response    Add response
```

### AI Features
```
POST   /api/ai/safety-prediction   Get safety prediction
POST   /api/ai/recommendations     Get recommendations
GET    /api/ai/cultural-tips       Get cultural tips
POST   /api/ai/translate           Translate phrase
GET    /api/ai/local-alerts        Get local alerts
```

## 🔐 Authentication

All protected routes require JWT token in header:
```javascript
headers: {
  'Authorization': 'Bearer <your-jwt-token>'
}
```

## 📊 Database Schemas

### User Schema
```javascript
{
  email: String (unique),
  password: String (hashed),
  firstName: String,
  lastName: String,
  nationality: String,
  phone: String,
  emergencyContacts: [{
    name, relationship, phone, email, priorityOrder
  }],
  medicalInfo: {
    bloodType, allergies, medications, medicalConditions
  },
  premiumStatus: Boolean,
  ...
}
```

### Location Schema
```javascript
{
  user: ObjectId,
  coordinates: {
    type: 'Point',
    coordinates: [longitude, latitude]
  },
  accuracy: Number,
  formattedAddress: String,
  isCheckIn: Boolean,
  timestamp: Date
}
```

### SafetyReport Schema
```javascript
{
  user: ObjectId,
  reportType: Enum['safe','caution','danger','info'],
  title: String,
  description: String,
  location: GeoJSON Point,
  locationName: String,
  upvotes: [ObjectId],
  downvotes: [ObjectId],
  isVerified: Boolean
}
```

## 🔌 WebSocket Events (Socket.io)

### Client → Server
```javascript
socket.emit('location:update', data)
socket.emit('report:new', data)
socket.emit('checkin:new', data)
socket.emit('emergency:trigger', data)
```

### Server → Client
```javascript
socket.on('location:new', data)
socket.on('report:added', data)
socket.on('checkin:added', data)
socket.on('emergency:alert', data)
socket.on('emergency:resolved', data)
```

## 🧪 Testing the API

### Using cURL

**Register User:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe",
    "nationality": "USA"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

**Get Profile (with token):**
```bash
curl http://localhost:5000/api/users/profile \
  -H "Authorization: Bearer <your-token>"
```

### Using Postman

1. Import the API endpoints
2. Set up environment variable for token
3. Test each endpoint systematically

## 🚀 Deployment

### Production Checklist

1. **Set environment variables:**
```bash
NODE_ENV=production
MONGODB_URI=<your-mongo-atlas-uri>
JWT_SECRET=<strong-random-secret>
CLIENT_URL=<your-frontend-url>
```

2. **Install PM2 for process management:**
```bash
npm install -g pm2
pm2 start server.js --name watchdogs-api
pm2 save
pm2 startup
```

3. **Set up HTTPS (using nginx or certbot)**

4. **Configure CORS for production domain**

### Deploy to Heroku

```bash
# Login to Heroku
heroku login

# Create app
heroku create watchdogs-api

# Add MongoDB addon
heroku addons:create mongolab:sandbox

# Set env variables
heroku config:set JWT_SECRET=<your-secret>
heroku config:set CLIENT_URL=<your-frontend-url>

# Deploy
git push heroku main
```

### Deploy to AWS/DigitalOcean

1. Set up Ubuntu server
2. Install Node.js and MongoDB
3. Clone repository
4. Install dependencies
5. Configure nginx reverse proxy
6. Set up SSL with Let's Encrypt
7. Use PM2 for process management

## 🔧 Configuration

### MongoDB Indexes

The application automatically creates these indexes:
- User: email (unique)
- Location: 2dsphere (geospatial), user + timestamp
- SafetyReport: 2dsphere, reportType + createdAt, user
- Document: user + expiryDate
- Emergency: 2dsphere, user + status

### File Upload Limits

- Max file size: 5MB (configurable in .env)
- Allowed types: JPEG, PNG, PDF, DOC, DOCX
- Storage: Local filesystem (uploads/ directory)

## 📈 Performance

- **Geospatial queries** optimized with 2dsphere indexes
- **Caching** can be added with Redis
- **Rate limiting** already implemented
- **Pagination** on list endpoints

## 🔒 Security Features

✅ Helmet.js for HTTP headers
✅ CORS configuration
✅ JWT authentication
✅ Password hashing (bcrypt)
✅ Input validation
✅ Rate limiting
✅ File upload restrictions

## 📝 Next Steps for Enhancement

1. **External API Integration:**
   - Google Maps API for geocoding
   - Google Translate API for real translation
   - Twilio for SMS notifications
   - SendGrid for emails
   - Weather API for alerts

2. **Advanced Features:**
   - Redis caching
   - Email verification
   - Password reset functionality
   - Admin dashboard
   - Analytics and reporting
   - Push notifications (FCM)

3. **ML Integration:**
   - Real AI model for safety predictions
   - Recommendation engine training
   - Anomaly detection

## 🐛 Troubleshooting

**MongoDB Connection Error:**
```bash
# Make sure MongoDB is running
sudo systemctl start mongod
# Or run manually
mongod --dbpath /path/to/data
```

**Port Already in Use:**
```bash
# Find and kill process on port 5000
lsof -ti:5000 | xargs kill -9
# Or change PORT in .env
```

**Module Not Found:**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

## 📞 Support

For issues or questions:
- Check the API documentation
- Review error logs in console
- Test endpoints with Postman
- Verify MongoDB connection

## 📄 License

ISC

---

**Built with:** Node.js, Express, MongoDB, Socket.io, JWT

**Ready for production!** 🚀
