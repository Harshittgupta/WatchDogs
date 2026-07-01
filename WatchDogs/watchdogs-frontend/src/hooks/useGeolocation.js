import { useState, useCallback, useRef } from 'react';

const useGeolocation = () => {
  const [location, setLocation] = useState(null);
  const [locationDetails, setLocationDetails] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const mountedRef = useRef(true);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  const geoOptions = {
    enableHighAccuracy: true,
    timeout: 20000,
    maximumAge: 0
  };

  const calculateDistance = useCallback((lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
    
    const R = 6371e3;
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }, []);

  const reverseGeocode = useCallback(async (lat, lng) => {
    try {
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
        { 
          headers: { 'Accept': 'application/json' },
          cache: 'no-store'
        }
      );

      if (response.ok) {
        const data = await response.json();
        const locality = data.locality || data.city;
        const neighbourhood = data.localityInfo?.informative?.find(i => i.name && i.order <= 3)?.name;
        const road = data.localityInfo?.informative?.find(i => i.description === 'road' || i.order === 1)?.name;

        const addressParts = [];
        if (road) addressParts.push(road);
        if (neighbourhood && neighbourhood !== locality) addressParts.push(neighbourhood);
        if (locality) addressParts.push(locality);
        if (data.principalSubdivision) addressParts.push(data.principalSubdivision);
        if (data.countryName) addressParts.push(data.countryName);

        return {
          formatted_address: addressParts.filter(Boolean).join(', '),
          locality,
          city: locality,
          state: data.principalSubdivision,
          country: data.countryName
        };
      }
    } catch (error) {
      console.warn('Geocoding failed:', error.message);
    }
    return null;
  }, []);

  const getLocationQuality = useCallback((accuracy) => {
    if (!accuracy) return null;

    let quality = 'unknown';
    let securityLevel = 'low';
    let emergencyReadiness = 'not-ready';

    if (accuracy <= 50) {
      quality = 'good';
      securityLevel = 'good';
      emergencyReadiness = 'ready';
    } else if (accuracy <= 200) {
      quality = 'fair';
      securityLevel = 'moderate';
      emergencyReadiness = 'acceptable';
    } else if (accuracy <= 1000) {
      quality = 'poor';
      securityLevel = 'low';
      emergencyReadiness = 'limited';
    } else {
      quality = 'very-poor';
      securityLevel = 'minimal';
      emergencyReadiness = 'unreliable';
    }

    return { quality, securityLevel, emergencyReadiness, accuracy };
  }, []);

  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return Promise.reject(new Error('Geolocation not supported'));
    }

    setLoading(true);
    setError(null);

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          if (!mountedRef.current) return;

          const coords = position.coords;
          
          // Check if accuracy is too poor and retry
          if (coords.accuracy > 1000 && retryCountRef.current < maxRetries) {
            console.log(`Poor accuracy (${Math.round(coords.accuracy)}m), retry ${retryCountRef.current + 1}/${maxRetries}...`);
            retryCountRef.current++;
            
            // Wait a bit and try again
            setTimeout(() => {
              getCurrentLocation().then(resolve).catch(reject);
            }, 2000);
            return;
          }

          // Reset retry count on success
          retryCountRef.current = 0;

          const locationData = {
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy,
            timestamp: new Date(position.timestamp)
          };

          setLocation(locationData);
          setError(null);
          setLoading(false);

          // Get address
          try {
            const details = await reverseGeocode(coords.latitude, coords.longitude);
            if (details && mountedRef.current) {
              setLocationDetails(details);
            }
          } catch (err) {
            console.warn('Geocoding failed:', err);
          }

          resolve(locationData);
        },
        (error) => {
          if (!mountedRef.current) return;

          retryCountRef.current++;
          let errorMessage = 'Unable to retrieve location';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied. Enable location permissions in browser settings.';
              setError(errorMessage);
              setLoading(false);
              reject(error);
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'GPS signal unavailable. Move to area with clear sky view.';
              if (retryCountRef.current < maxRetries) {
                console.log(`GPS unavailable, retry ${retryCountRef.current}/${maxRetries}...`);
                setTimeout(() => {
                  getCurrentLocation().then(resolve).catch(reject);
                }, 3000);
              } else {
                setError(errorMessage);
                setLoading(false);
                reject(error);
              }
              break;
            case error.TIMEOUT:
              errorMessage = 'GPS timeout';
              if (retryCountRef.current < maxRetries) {
                console.log(`GPS timeout, retry ${retryCountRef.current}/${maxRetries}...`);
                setTimeout(() => {
                  getCurrentLocation().then(resolve).catch(reject);
                }, 2000);
              } else {
                setError(errorMessage + ` after ${maxRetries} attempts`);
                setLoading(false);
                reject(error);
              }
              break;
            default:
              errorMessage = `GPS error (Code: ${error.code})`;
              setError(errorMessage);
              setLoading(false);
              reject(error);
          }
        },
        geoOptions
      );
    });
  }, [reverseGeocode, geoOptions]);

  return {
    location,
    locationDetails,
    error,
    loading,
    getCurrentLocation,
    getLocationQuality,
    calculateDistance
  };
};

export default useGeolocation;