export const digitalIdService = {
  // Generate digital ID
  generateDigitalId: async (userData) => {
    const response = await api.post('/digital-id/generate', userData);
    return response.data;
  },

  // Verify digital ID
  verifyDigitalId: async (digitalId) => {
    const response = await api.post('/digital-id/verify', { digitalId });
    return response.data;
  },

  // Get digital ID details
  getDigitalId: async (userId) => {
    const response = await api.get(`/digital-id/user/${userId}`);
    return response.data;
  },

  // Update digital ID
  updateDigitalId: async (digitalIdId, data) => {
    const response = await api.put(`/digital-id/${digitalIdId}`, data);
    return response.data;
  },

  // Revoke digital ID
  revokeDigitalId: async (digitalIdId) => {
    const response = await api.delete(`/digital-id/${digitalIdId}`);
    return response.data;
  },

  // Share digital ID for emergency
  shareDigitalIdEmergency: async (digitalIdId, emergencyId) => {
    const response = await api.post(`/digital-id/${digitalIdId}/share-emergency`, { emergencyId });
    return response.data;
  },

  // Get blockchain transaction status
  getBlockchainStatus: async (transactionHash) => {
    const response = await api.get(`/digital-id/blockchain/status/${transactionHash}`);
    return response.data;
  }
};