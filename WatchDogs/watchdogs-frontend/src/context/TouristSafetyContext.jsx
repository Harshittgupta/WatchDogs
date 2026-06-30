import React, { createContext, useContext, useReducer, useCallback } from 'react';

// Initial state
const initialState = {
  activeAlerts: [],
  safetyScore: 85,
  batteryLevel: 78,
  digitalId: null, // Added digital ID to initial state
  location: {
    lat: null,
    lng: null,
    area: 'Unknown',
    accuracy: null,
    locationDetails: null,
    quality: null,
    timestamp: null
  },
  tourist: {
    id: 'tourist_001',
    name: 'Tourist User',
    nationality: 'International'
  },
  isTracking: true,
  emergencyContacts: [
    { name: 'National Emergency', number: '112', type: 'emergency', description: 'All emergency services' },
    { name: 'Police', number: '100', type: 'police', description: 'Police emergency' },
    { name: 'Fire Brigade', number: '101', type: 'fire', description: 'Fire emergency' },
    { name: 'Ambulance', number: '102', type: 'medical', description: 'Medical emergency' }
  ],
  safeZones: [],
  incidents: []
};

// Reducer with FIXED actions
const reducer = (state, action) => {
  console.log('🔧 Context Reducer:', action.type, action.payload);
  
  switch (action.type) {
    case 'CLEAR_ALL_ALERTS':
      console.log('🗑️ Context: Clearing all alerts');
      return {
        ...state,
        activeAlerts: [] // This should empty the alerts array
      };

    case 'RESET_ALL_STATE':
      console.log('🔄 Context: Resetting all state');
      return {
        ...initialState, // Reset to initial state
        location: state.location // Keep location data
      };

    case 'ADD_ALERT':
      return {
        ...state,
        activeAlerts: [...state.activeAlerts, {
          id: Date.now(),
          timestamp: new Date(),
          ...action.payload
        }]
      };

    case 'REMOVE_ALERT':
      return {
        ...state,
        activeAlerts: state.activeAlerts.filter(alert => alert.id !== action.payload)
      };

    case 'UPDATE_SAFETY_SCORE':
      return {
        ...state,
        safetyScore: action.payload
      };

    case 'UPDATE_BATTERY':
      return {
        ...state,
        batteryLevel: action.payload
      };

    case 'UPDATE_LOCATION':
      return {
        ...state,
        location: {
          ...state.location,
          ...action.payload
        }
      };

    case 'SET_TRACKING':
      return {
        ...state,
        isTracking: action.payload
      };

    case 'ADD_INCIDENT':
      return {
        ...state,
        incidents: [...state.incidents, {
          id: Date.now(),
          timestamp: new Date(),
          ...action.payload
        }]
      };

    // Added the missing SET_DIGITAL_ID case
    case 'SET_DIGITAL_ID':
      console.log('🔐 Context: Setting digital ID', action.payload);
      return {
        ...state,
        digitalId: action.payload
      };

    default:
      return state;
  }
};

// Context
const TouristSafetyContext = createContext();

// Provider component
export const TouristSafetyProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const addAlert = useCallback((alert) => {
    dispatch({ type: 'ADD_ALERT', payload: alert });
  }, []);

  const removeAlert = useCallback((alertId) => {
    dispatch({ type: 'REMOVE_ALERT', payload: alertId });
  }, []);

  const updateSafetyScore = useCallback((score) => {
    dispatch({ type: 'UPDATE_SAFETY_SCORE', payload: score });
  }, []);

  const value = {
    state,
    dispatch,
    addAlert,
    removeAlert,
    updateSafetyScore
  };

  return (
    <TouristSafetyContext.Provider value={value}>
      {children}
    </TouristSafetyContext.Provider>
  );
};

// Custom hook
export const useTouristSafety = () => {
  const context = useContext(TouristSafetyContext);
  if (!context) {
    throw new Error('useTouristSafety must be used within a TouristSafetyProvider');
  }
  return context;
};
