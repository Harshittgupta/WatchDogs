import api from '../config/api';

const alertService = {
  // Get all alerts for current user
  getAlerts: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      
      if (filters.type) params.append('type', filters.type);
      if (filters.severity) params.append('severity', filters.severity);
      if (filters.status) params.append('status', filters.status);
      if (filters.page) params.append('page', filters.page);
      if (filters.limit) params.append('limit', filters.limit);

      const response = await api.get(`/alerts?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error getting alerts:', error);
      throw error;
    }
  },

  // Get alerts near a location
  getNearbyAlerts: async (latitude, longitude, radius = 50) => {
    try {
      const response = await api.get('/alerts/active', {
        params: { latitude, longitude, radius }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting nearby alerts:', error);
      throw error;
    }
  },

  // Get alert by ID
  getAlertById: async (alertId) => {
    try {
      const response = await api.get(`/alerts/${alertId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting alert by ID:', error);
      throw error;
    }
  },

  // Create new alert (admin only)
  createAlert: async (alertData) => {
    try {
      const response = await api.post('/alerts', alertData);
      return response.data;
    } catch (error) {
      console.error('Error creating alert:', error);
      throw error;
    }
  },

  // Update alert (admin only)
  updateAlert: async (alertId, updates) => {
    try {
      const response = await api.put(`/alerts/${alertId}`, updates);
      return response.data;
    } catch (error) {
      console.error('Error updating alert:', error);
      throw error;
    }
  },

  // Delete alert (admin only)
  deleteAlert: async (alertId) => {
    try {
      const response = await api.delete(`/alerts/${alertId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting alert:', error);
      throw error;
    }
  },

  // Mark alert as read
  markAsRead: async (alertId) => {
    try {
      const response = await api.patch(`/alerts/${alertId}/read`);
      return response.data;
    } catch (error) {
      console.error('Error marking alert as read:', error);
      throw error;
    }
  },

  // Mark all alerts as read
  markAllAsRead: async () => {
    try {
      const response = await api.patch('/alerts/read-all');
      return response.data;
    } catch (error) {
      console.error('Error marking all alerts as read:', error);
      throw error;
    }
  },

  // Get unread alert count
  getUnreadCount: async () => {
    try {
      const response = await api.get('/alerts/unread/count');
      return response.data;
    } catch (error) {
      console.error('Error getting unread count:', error);
      throw error;
    }
  },

  // Acknowledge alert
  acknowledgeAlert: async (alertId) => {
    try {
      const response = await api.post(`/alerts/${alertId}/acknowledge`);
      return response.data;
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      throw error;
    }
  },

  // Share alert
  shareAlert: async (alertId) => {
    try {
      const response = await api.post(`/alerts/${alertId}/share`);
      return response.data;
    } catch (error) {
      console.error('Error sharing alert:', error);
      throw error;
    }
  },

  // Subscribe to alert notifications
  subscribeToAlerts: async (preferences) => {
    try {
      const response = await api.post('/alerts/subscribe', { preferences });
      return response.data;
    } catch (error) {
      console.error('Error subscribing to alerts:', error);
      throw error;
    }
  },

  // Unsubscribe from alert notifications
  unsubscribeFromAlerts: async () => {
    try {
      const response = await api.post('/alerts/unsubscribe');
      return response.data;
    } catch (error) {
      console.error('Error unsubscribing from alerts:', error);
      throw error;
    }
  },

  // Report false alert
  reportFalseAlert: async (alertId, reason) => {
    try {
      const response = await api.post(`/alerts/${alertId}/report`, { reason });
      return response.data;
    } catch (error) {
      console.error('Error reporting alert:', error);
      throw error;
    }
  },

  // Get alert statistics
  getAlertStats: async () => {
    try {
      const response = await api.get('/alerts/stats/summary');
      return response.data;
    } catch (error) {
      console.error('Error getting alert stats:', error);
      // Return default stats on error
      return {
        success: true,
        stats: {
          activeAlerts: 0,
          last24Hours: 0,
          last7Days: 0,
          bySeverity: {},
          byType: {}
        }
      };
    }
  },

  // Get alerts by type
  getAlertsByType: async (type, severity = null, limit = 20) => {
    try {
      const params = { type, limit };
      if (severity) params.severity = severity;
      
      const response = await api.get('/alerts/filter/by-type', { params });
      return response.data;
    } catch (error) {
      console.error('Error getting alerts by type:', error);
      throw error;
    }
  },

  // Get user's acknowledged alerts
  getAcknowledgedAlerts: async () => {
    try {
      const response = await api.get('/alerts/my/acknowledged');
      return response.data;
    } catch (error) {
      console.error('Error getting acknowledged alerts:', error);
      throw error;
    }
  }
};

export default alertService;