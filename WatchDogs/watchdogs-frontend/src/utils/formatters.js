import { format, formatDistance, formatRelative } from 'date-fns';

export const formatDate = (date, formatStr = 'PPpp') => {
  if (!date) return '';
  return format(new Date(date), formatStr);
};

export const formatTimeAgo = (date) => {
  if (!date) return '';
  return formatDistance(new Date(date), new Date(), { addSuffix: true });
};

export const formatRelativeTime = (date) => {
  if (!date) return '';
  return formatRelative(new Date(date), new Date());
};

export const formatCoordinates = (lat, lng, precision = 6) => {
  if (!lat || !lng) return '';
  return `${lat.toFixed(precision)}, ${lng.toFixed(precision)}`;
};

export const formatDistance = (meters) => {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
};

export const formatAccuracy = (accuracy) => {
  if (!accuracy) return 'Unknown';
  return `±${Math.round(accuracy)}m`;
};

export const formatPhoneNumber = (phone) => {
  if (!phone) return '';
  return phone.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
};

export const formatCurrency = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(amount);
};