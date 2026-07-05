import api from '../config/api';

export const aiService = {
  // Get safety prediction
  getSafetyPrediction: async (latitude, longitude, timestamp = null) => {
    try {
      const response = await api.post('/ai/safety-prediction', {
        latitude,
        longitude,
        timestamp
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get recommendations
  getRecommendations: async (latitude, longitude, type = 'all') => {
    try {
      const response = await api.post('/ai/recommendations', {
        latitude,
        longitude,
        type
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get cultural tips
  getCulturalTips: async (country) => {
    try {
      const response = await api.get('/ai/cultural-tips', {
        params: { country }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Translate phrase
  translatePhrase: async (phrase, targetLanguage) => {
    try {
      const response = await api.post('/ai/translate', {
        phrase,
        targetLanguage
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get local alerts
  getLocalAlerts: async (latitude, longitude) => {
    try {
      const response = await api.get('/ai/local-alerts', {
        params: { latitude, longitude }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }
};

//backend stuff 