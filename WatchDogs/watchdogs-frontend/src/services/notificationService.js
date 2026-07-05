import api from '../config/api';

class notificationService {
  // Get all notifications for user
  async getNotifications(params = {}) {
    try {
      const response = await api.get('/notifications', {
        params: {
          page: params.page || 1,
          limit: params.limit || 20,
          read: params.read,
          type: params.type
        }
      });

      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Get unread notification count
  async getUnreadCount() {
    try {
      const response = await api.get('/notifications/unread/count');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Mark notification as read
  async markAsRead(id) {
    try {
      const response = await api.put(`/notifications/${id}/read`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Mark all notifications as read
  async markAllAsRead() {
    try {
      const response = await api.put('/notifications/read-all');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Delete notification
  async deleteNotification(id) {
    try {
      const response = await api.delete(`/notifications/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Delete all notifications
  async deleteAllNotifications() {
    try {
      const response = await api.delete('/notifications/all');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Get notification preferences
  async getPreferences() {
    try {
      const response = await api.get('/notifications/preferences');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Update notification preferences
  async updatePreferences(preferences) {
    try {
      const response = await api.put('/notifications/preferences', preferences);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Subscribe to push notifications
  async subscribeToPush(subscription) {
    try {
      const response = await api.post('/notifications/push/subscribe', subscription);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Unsubscribe from push notifications
  async unsubscribeFromPush() {
    try {
      const response = await api.post('/notifications/push/unsubscribe');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Test notification
  async sendTestNotification() {
    try {
      const response = await api.post('/notifications/test');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Handle errors
  handleError(error) {
    if (error.response) {
      const message = error.response.data?.message || 'An error occurred';
      return new Error(message);
    } else if (error.request) {
      return new Error('No response from server. Please check your connection.');
    } else {
      return new Error(error.message || 'An unexpected error occurred');
    }
  }
}

export default new notificationService();