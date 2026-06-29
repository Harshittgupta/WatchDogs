export const emergencyService = {
  // Trigger emergency alert
  triggerEmergency: async (emergencyData) => {
    const response = await api.post('/emergency/trigger', emergencyData);
    return response.data;
  },

  // Get emergency contacts
  getEmergencyContacts: async (location) => {
    const response = await api.get(`/emergency/contacts?location=${location}`);
    return response.data;
  },

  // Update emergency status
  updateEmergencyStatus: async (emergencyId, status) => {
    const response = await api.put(`/emergency/${emergencyId}/status`, { status });
    return response.data;
  },

  // Get emergency history
  getEmergencyHistory: async (userId) => {
    const response = await api.get(`/emergency/history/${userId}`);
    return response.data;
  },

  // Share location with emergency services
  shareLocationWithEmergency: async (emergencyId, locationData) => {
    const response = await api.post(`/emergency/${emergencyId}/share-location`, locationData);
    return response.data;
  }
};