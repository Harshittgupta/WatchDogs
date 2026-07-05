import api from '../config/api';

class digitalIdService {
  // Generate new Digital ID
  async generateDigitalId(data) {
    try {
      const response = await api.post('/digital-id/generate', {
        fullName: data.fullName,
        dateOfBirth: data.dateOfBirth,
        nationality: data.nationality,
        passportNumber: data.passportNumber,
        phone: data.phone,
        email: data.email,
        address: data.address,
        photo: data.photo,
        biometricData: data.biometricData
      });

      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Get all user's Digital IDs
  async getUserDigitalIds() {
    try {
      const response = await api.get('/digital-id/user');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Get Digital ID by ID
  async getDigitalIdById(id) {
    try {
      const response = await api.get(`/digital-id/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Update Digital ID
  async updateDigitalId(id, updates) {
    try {
      const response = await api.put(`/digital-id/${id}`, updates);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Delete Digital ID
  async deleteDigitalId(id) {
    try {
      const response = await api.delete(`/digital-id/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Verify Digital ID
  async verifyDigitalId(id) {
    try {
      const response = await api.put(`/digital-id/${id}/verify`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Generate QR Code for Digital ID
  async generateQRCode(id) {
    try {
      const response = await api.get(`/digital-id/${id}/qr-code`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Scan and verify QR Code
  async verifyQRCode(qrData) {
    try {
      const response = await api.post('/digital-id/verify-qr', { qrData });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Upload photo for Digital ID
  async uploadPhoto(file) {
    try {
      const formData = new FormData();
      formData.append('photo', file);

      const response = await api.post('/digital-id/upload-photo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Upload biometric data
  async uploadBiometricData(data) {
    try {
      const response = await api.post('/digital-id/upload-biometric', {
        type: data.type, // 'fingerprint', 'facial', 'iris'
        data: data.data,
        digitalIdId: data.digitalIdId
      });

      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Get Digital ID statistics
  async getDigitalIdStats() {
    try {
      const response = await api.get('/digital-id/stats');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Check if Digital ID is valid
  async checkValidity(id) {
    try {
      const response = await api.get(`/digital-id/${id}/check-validity`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Download Digital ID as PDF
  async downloadAsPDF(id) {
    try {
      const response = await api.get(`/digital-id/${id}/download`, {
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `digital-id-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      return { success: true, message: 'Digital ID downloaded successfully' };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Share Digital ID
  async shareDigitalId(id, shareWith) {
    try {
      const response = await api.post(`/digital-id/${id}/share`, {
        shareWith, // email or phone number
        expiresIn: '7d' // Share link expires in 7 days
      });

      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Revoke shared Digital ID
  async revokeShare(shareId) {
    try {
      const response = await api.delete(`/digital-id/share/${shareId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Request Digital ID verification from authority
  async requestVerification(id) {
    try {
      const response = await api.post(`/digital-id/${id}/request-verification`);
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

export default new digitalIdService();