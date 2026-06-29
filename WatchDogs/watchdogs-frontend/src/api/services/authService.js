// ALWAYS use mock data - no real API calls
const USE_MOCK = true;

export const authService = {
  login: async (credentials) => {
    // ALWAYS use mock mode
    console.log('Using MOCK login');
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Check credentials (accept demo or any email)
    if (credentials.email === 'demo@watchdogs.com' || credentials.email.includes('@')) {
      return {
        success: true,
        data: {
          user: {
            id: 'demo_user_1',
            firstName: credentials.email.split('@')[0],
            lastName: 'User',
            email: credentials.email,
            nationality: 'United States',
            phoneNumber: '+1-555-0123',
            role: 'tourist',
            isVerified: true
          },
          token: 'mock_jwt_token_' + Date.now()
        }
      };
    } else {
      throw new Error('Invalid credentials');
    }
  },

  register: async (userData) => {
    console.log('Using MOCK register');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newUser = {
      id: 'user_' + Date.now(),
      ...userData,
      password: undefined,
      isVerified: false,
      createdAt: new Date()
    };
    
    return {
      success: true,
      data: {
        user: newUser,
        token: 'mock_jwt_token_' + Date.now()
      }
    };
  },

  logout: async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return { success: true };
  },

  refreshToken: async () => {
    return { success: true, token: 'mock_token_refresh' };
  },

  getCurrentUser: async () => {
    const user = JSON.parse(localStorage.getItem('tourist_safety_user') || '{}');
    return { success: true, data: user };
  },

  updateProfile: async (userId, data) => {
    return { success: true, data: { ...data } };
  },

  forgotPassword: async (email) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return { success: true, message: 'Reset email sent' };
  },

  resetPassword: async (token, newPassword) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return { success: true };
  }
};