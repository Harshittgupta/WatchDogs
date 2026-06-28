export const APP_NAME = 'WatchDogs';
export const APP_VERSION = '1.0.0';

export const ALERT_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

export const ALERT_TYPES = {
  GEOFENCE: 'geofence',
  WEATHER: 'weather',
  SECURITY: 'security',
  HEALTH: 'health',
  EMERGENCY: 'emergency',
  SYSTEM: 'system'
};

export const EMERGENCY_CONTACTS = {
  UNIVERSAL: '112',
  POLICE: '100',
  FIRE: '101',
  AMBULANCE: '102',
  DISASTER: '108',
  WOMEN_SAFETY: '1091',
  CHILD_SAFETY: '1098',
  TOURIST_HELP: '1363',
  CYBER_CRIME: '1930'
};

export const LOCATION_ACCURACY = {
  EXCELLENT: { max: 5, label: 'Excellent', color: '#10b981' },
  VERY_GOOD: { max: 15, label: 'Very Good', color: '#34d399' },
  GOOD: { max: 50, label: 'Good', color: '#6ee7b7' },
  FAIR: { max: 200, label: 'Fair', color: '#fbbf24' },
  POOR: { max: 1000, label: 'Poor', color: '#f87171' },
  VERY_POOR: { max: Infinity, label: 'Very Poor', color: '#ef4444' }
};

export const SAFETY_SCORE_RANGES = {
  SAFE: { min: 80, label: 'Safe', color: '#10b981', icon: '✅' },
  CAUTION: { min: 60, label: 'Caution', color: '#fbbf24', icon: '⚠️' },
  RISK: { min: 40, label: 'Risk', color: '#f97316', icon: '🟠' },
  DANGER: { min: 0, label: 'Danger', color: '#ef4444', icon: '🚨' }
};

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_DATA: 'tourist_safety_user',
  PREFERENCES: 'watchdogs-preferences',
  DIGITAL_ID: 'digital_id',
  LAST_LOCATION: 'last_location',
  ALERTS: 'watchdogs-alerts'
};

export const ROUTES = {
  HOME: '/',
  SIGN_IN: '/signin',
  SIGN_UP: '/signup',
  DASHBOARD: '/dashboard',
  PROFILE: '/profile',
  SETTINGS: '/settings',
  ALERTS: '/alerts',
  EMERGENCY: '/emergency',
  NOT_FOUND: '/404'
};

export const GPS_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 30000,
  maximumAge: 0
};