export const mockUsers = [
  {
    id: 'demo_user_1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'demo@watchdogs.com',
    password: 'Demo@123', // For demo only
    nationality: 'United States',
    phoneNumber: '+1-555-0123',
    role: 'tourist',
    isVerified: true,
    preferences: {
      language: 'en',
      notifications: true,
      autoLocation: true
    }
  }
];

export const mockLocations = [
  {
    id: 'loc_1',
    lat: 19.0760,
    lng: 72.8777,
    accuracy: 12,
    area: 'Mumbai, Maharashtra, India',
    timestamp: new Date(),
    quality: {
      rating: 'excellent',
      securityLevel: 'maximum',
      isFreshGPS: true
    }
  }
];

export const mockAlerts = [
  {
    id: 'alert_1',
    type: 'security',
    severity: 'medium',
    message: 'Heavy traffic reported in your area',
    timestamp: new Date(Date.now() - 3600000),
    isRead: false
  },
  {
    id: 'alert_2',
    type: 'weather',
    severity: 'low',
    message: 'Sunny weather expected for the next 3 days',
    timestamp: new Date(Date.now() - 7200000),
    isRead: false
  }
];

export const mockEmergencyContacts = [
  { name: 'Universal Emergency', number: '112', type: 'emergency' },
  { name: 'Police', number: '100', type: 'police' },
  { name: 'Fire Brigade', number: '101', type: 'fire' },
  { name: 'Ambulance', number: '102', type: 'medical' }
];

export const mockDigitalId = {
  id: 'DID:TOURIST:1234567890',
  blockchainHash: '0xabcd1234efgh5678ijkl9012mnop3456',
  issuedAt: new Date(Date.now() - 86400000 * 15),
  expiresAt: new Date(Date.now() + 86400000 * 15),
  isValid: true,
  verificationLevel: 'Level-3-Verified',
  trustScore: 95
};

// Mock API Functions
export const mockAuthService = {
  login: async (credentials) => {
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
    
    const user = mockUsers.find(u => u.email === credentials.email);
    if (!user || credentials.password !== 'Demo@123') {
      throw new Error('Invalid credentials');
    }
    
    return {
      success: true,
      data: {
        user: { ...user, password: undefined },
        token: 'mock_jwt_token_' + Date.now()
      }
    };
  },

  register: async (userData) => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const newUser = {
      id: 'user_' + Date.now(),
      ...userData,
      password: undefined,
      isVerified: false,
      createdAt: new Date()
    };
    
    return {
      success: true,
      data: {
        user: newUser,
        token: 'mock_jwt_token_' + Date.now()
      }
    };
  },

  logout: async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return { success: true };
  }
};

export const mockLocationService = {
  updateLocation: async (locationData) => {
    await new Promise(resolve => setTimeout(resolve, 800));
    return {
      success: true,
      data: { ...locationData, id: 'loc_' + Date.now() }
    };
  },

  getLocationDetails: async (lat, lng) => {
    await new Promise(resolve => setTimeout(resolve, 600));
    return {
      success: true,
      data: mockLocations[0]
    };
  }
};

export const mockEmergencyService = {
  triggerEmergency: async (data) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
      success: true,
      data: {
        id: 'emergency_' + Date.now(),
        status: 'active',
        ...data
      }
    };
  }
};

export const mockAlertService = {
  getAlerts: async () => {
    await new Promise(resolve => setTimeout(resolve, 700));
    return {
      success: true,
      data: mockAlerts
    };
  },

  dismissAlert: async (alertId) => {
    await new Promise(resolve => setTimeout(resolve, 400));
    return { success: true };
  }
};

export const mockDigitalIdService = {
  generateDigitalId: async (userData) => {
    await new Promise(resolve => setTimeout(resolve, 3000)); // Simulate blockchain transaction
    return {
      success: true,
      data: {
        ...mockDigitalId,
        id: 'DID:TOURIST:' + Date.now()
      }
    };
  },

  verifyDigitalId: async (digitalId) => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    return {
      success: true,
      data: {
        isValid: true,
        trustScore: 95,
        verifiedAt: new Date()
      }
    };
  }
};

// Export all mock services
export default {
  auth: mockAuthService,
  location: mockLocationService,
  emergency: mockEmergencyService,
  alert: mockAlertService,
  digitalId: mockDigitalIdService
};