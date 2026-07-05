import api from '../config/api';

export const locationService = {
  // Update current location
  updateLocation: async (locationData) => {
    try {
      const response = await api.post('/location/update', locationData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get current location
  getCurrentLocation: async () => {
    try {
      const response = await api.get('/location/current');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get location history
  getLocationHistory: async (params = {}) => {
    try {
      const response = await api.get('/location/history', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Check in at location
  checkIn: async (data) => {
    try {
      const response = await api.post('/location/check-in', data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get nearby check-ins
  getNearbyCheckIns: async (latitude, longitude, radius = 10) => {
    try {
      const response = await api.get('/location/nearby-checkins', {
        params: { latitude, longitude, radius }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }
};