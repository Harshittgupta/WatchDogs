// src/services/reportsService.js
import api from '../config/api';

const reportsService = {
  // Create report
  createReport: async (reportData) => {
    const response = await api.post('/reports/create', {
      reportType: reportData.type,
      title: reportData.title,
      description: reportData.description,
      latitude: reportData.latitude,
      longitude: reportData.longitude,
      locationName: reportData.locationName
    });
    return response.data;
  },

  // Get feed
  getFeed: async (page = 1, limit = 20, reportType = 'all', sortBy = 'recent') => {
    const response = await api.get('/reports/feed', {
      params: { page, limit, reportType, sortBy }
    });
    return response.data;
  },

  // Get nearby reports
  getNearby: async (latitude, longitude, radius = 10, reportType = 'all') => {
    const response = await api.get('/reports/nearby', {
      params: { latitude, longitude, radius, reportType }
    });
    return response.data;
  },

  // Upvote report
  upvote: async (reportId) => {
    const response = await api.post(`/reports/${reportId}/upvote`);
    return response.data;
  },

  // Downvote report
  downvote: async (reportId) => {
    const response = await api.post(`/reports/${reportId}/downvote`);
    return response.data;
  },

  // Delete report
  deleteReport: async (reportId) => {
    const response = await api.delete(`/reports/${reportId}`);
    return response.data;
  },

  // Get stats
  getStats: async () => {
    const response = await api.get('/reports/stats');
    return response.data;
  }
};

export default reportsService;