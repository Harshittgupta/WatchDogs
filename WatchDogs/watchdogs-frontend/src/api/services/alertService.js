export const alertService = {
  // Get all alerts for user
  getAlerts: async (userId) => {
    const response = await api.get(`/alerts/user/${userId}`);
    return response.data;
  },

  // Create new alert
  createAlert: async (alertData) => {
    const response = await api.post('/alerts', alertData);
    return response.data;
  },

  // Update alert
  updateAlert: async (alertId, data) => {
    const response = await api.put(`/alerts/${alertId}`, data);
    return response.data;
  },

  // Dismiss alert
  dismissAlert: async (alertId) => {
    const response = await api.delete(`/alerts/${alertId}`);
    return response.data;
  },

  // Get alerts by location
  getAlertsByLocation: async (lat, lng, radius = 10000) => {
    const response = await api.get(`/alerts/location?lat=${lat}&lng=${lng}&radius=${radius}`);
    return response.data;
  },

  // Mark alert as read
  markAsRead: async (alertId) => {
    const response = await api.patch(`/alerts/${alertId}/read`);
    return response.data;
  }
};