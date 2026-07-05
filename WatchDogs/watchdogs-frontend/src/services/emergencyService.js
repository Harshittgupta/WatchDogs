import api from '../config/api';

export const emergencyService = {
  // Trigger emergency
  triggerEmergency: async (emergencyData) => {
    try {
      const response = await api.post('/emergency/trigger', emergencyData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Resolve emergency
  resolveEmergency: async (emergencyId, notes) => {
    try {
      const response = await api.put(`/emergency/${emergencyId}/resolve`, { notes });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get emergency status
  getStatus: async () => {
    try {
      const response = await api.get('/emergency/status');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get emergency history
  getHistory: async (params = {}) => {
    try {
      const response = await api.get('/emergency/history', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }
};