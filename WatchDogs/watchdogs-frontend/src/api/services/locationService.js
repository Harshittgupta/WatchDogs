export const locationService = {
  // Update user location
  updateLocation: async (locationData) => {
    const response = await api.post('/location/update', locationData);
    return response.data;
  },

  // Get current location details
  getLocationDetails: async (lat, lng) => {
    const response = await api.get(`/location/details?lat=${lat}&lng=${lng}`);
    return response.data;
  },

  // Get safe zones
  getSafeZones: async (lat, lng, radius = 5000) => {
    const response = await api.get(`/location/safe-zones?lat=${lat}&lng=${lng}&radius=${radius}`);
    return response.data;
  },

  // Check geofence alerts
  checkGeofence: async (lat, lng) => {
    const response = await api.post('/location/geofence-check', { lat, lng });
    return response.data;
  },

  // Get location history
  getLocationHistory: async (userId, startDate, endDate) => {
    const response = await api.get(`/location/history/${userId}?start=${startDate}&end=${endDate}`);
    return response.data;
  }
};