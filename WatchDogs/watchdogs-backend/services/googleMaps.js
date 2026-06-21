// services/googleMaps.js
const { Client } = require('@googlemaps/google-maps-services-js');

const client = new Client({});

/**
 * Get directions between two points
 * @param {Object} origin - {latitude, longitude}
 * @param {Object} destination - {latitude, longitude}
 * @returns {Object} - {distance, duration, polyline}
 */
async function getDirections(origin, destination) {
  try {
    const response = await client.directions({
      params: {
        origin: `${origin.latitude},${origin.longitude}`,
        destination: `${destination.latitude},${destination.longitude}`,
        key: process.env.GOOGLE_MAPS_API_KEY,
        mode: 'driving',
        traffic_model: 'best_guess',
        departure_time: 'now'
      },
      timeout: 10000
    });
    
    if (response.data.status === 'OK' && response.data.routes.length > 0) {
      const route = response.data.routes[0];
      const leg = route.legs[0];
      
      return {
        distance: leg.distance.value / 1000, // Convert to kilometers
        duration: leg.duration.value / 60, // Convert to minutes
        polyline: route.overview_polyline.points,
        steps: leg.steps.map(step => ({
          distance: step.distance.text,
          duration: step.duration.text,
          instruction: step.html_instructions.replace(/<[^>]*>/g, '') // Remove HTML tags
        }))
      };
    }
    
    console.error('Google Maps Directions Error:', response.data.status);
    return null;
  } catch (error) {
    console.error('Google Maps Directions Error:', error.message);
    
    // Fallback to Haversine formula if Google Maps fails
    const distance = calculateHaversineDistance(
      origin.latitude, origin.longitude,
      destination.latitude, destination.longitude
    );
    
    const duration = (distance / 30) * 60; // Assume 30 km/h average speed
    
    return {
      distance,
      duration,
      polyline: null,
      steps: []
    };
  }
}

/**
 * Get ETA between two points
 * @param {Object} origin - {latitude, longitude}
 * @param {Object} destination - {latitude, longitude}
 * @returns {Object} - {distance, duration}
 */
async function getETA(origin, destination) {
  try {
    const response = await client.distancematrix({
      params: {
        origins: [`${origin.latitude},${origin.longitude}`],
        destinations: [`${destination.latitude},${destination.longitude}`],
        key: process.env.GOOGLE_MAPS_API_KEY,
        mode: 'driving',
        traffic_model: 'best_guess',
        departure_time: 'now'
      },
      timeout: 10000
    });
    
    if (response.data.status === 'OK' && 
        response.data.rows[0].elements[0].status === 'OK') {
      const element = response.data.rows[0].elements[0];
      return {
        distance: element.distance.value / 1000, // km
        duration: element.duration.value / 60 // minutes
      };
    }
    
    console.error('Google Maps ETA Error:', response.data.status);
    
    // Fallback
    const distance = calculateHaversineDistance(
      origin.latitude, origin.longitude,
      destination.latitude, destination.longitude
    );
    
    return {
      distance,
      duration: (distance / 30) * 60
    };
  } catch (error) {
    console.error('Google Maps ETA Error:', error.message);
    
    // Fallback
    const distance = calculateHaversineDistance(
      origin.latitude, origin.longitude,
      destination.latitude, destination.longitude
    );
    
    return {
      distance,
      duration: (distance / 30) * 60
    };
  }
}

/**
 * Reverse geocode coordinates to address
 * @param {Number} latitude
 * @param {Number} longitude
 * @returns {String} - formatted address
 */
async function reverseGeocode(latitude, longitude) {
  try {
    const response = await client.reverseGeocode({
      params: {
        latlng: `${latitude},${longitude}`,
        key: process.env.GOOGLE_MAPS_API_KEY
      },
      timeout: 10000
    });
    
    if (response.data.status === 'OK' && response.data.results.length > 0) {
      return response.data.results[0].formatted_address;
    }
    
    return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  } catch (error) {
    console.error('Google Maps Reverse Geocode Error:', error.message);
    return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  }
}

/**
 * Geocode address to coordinates
 * @param {String} address
 * @returns {Object} - {latitude, longitude}
 */
async function geocode(address) {
  try {
    const response = await client.geocode({
      params: {
        address,
        key: process.env.GOOGLE_MAPS_API_KEY
      },
      timeout: 10000
    });
    
    if (response.data.status === 'OK' && response.data.results.length > 0) {
      const location = response.data.results[0].geometry.location;
      return {
        latitude: location.lat,
        longitude: location.lng,
        formattedAddress: response.data.results[0].formatted_address
      };
    }
    
    return null;
  } catch (error) {
    console.error('Google Maps Geocode Error:', error.message);
    return null;
  }
}

/**
 * Get place details by place ID
 * @param {String} placeId
 * @returns {Object} - place details
 */
async function getPlaceDetails(placeId) {
  try {
    const response = await client.placeDetails({
      params: {
        place_id: placeId,
        key: process.env.GOOGLE_MAPS_API_KEY,
        fields: ['name', 'formatted_address', 'geometry', 'formatted_phone_number']
      },
      timeout: 10000
    });
    
    if (response.data.status === 'OK') {
      const result = response.data.result;
      return {
        name: result.name,
        address: result.formatted_address,
        phone: result.formatted_phone_number,
        latitude: result.geometry.location.lat,
        longitude: result.geometry.location.lng
      };
    }
    
    return null;
  } catch (error) {
    console.error('Google Maps Place Details Error:', error.message);
    return null;
  }
}

/**
 * Search for places
 * @param {String} query
 * @param {Object} location - {latitude, longitude}
 * @param {Number} radius - in meters
 * @returns {Array} - array of places
 */
async function searchPlaces(query, location, radius = 5000) {
  try {
    const response = await client.placesNearby({
      params: {
        location: `${location.latitude},${location.longitude}`,
        radius,
        keyword: query,
        key: process.env.GOOGLE_MAPS_API_KEY
      },
      timeout: 10000
    });
    
    if (response.data.status === 'OK') {
      return response.data.results.map(place => ({
        placeId: place.place_id,
        name: place.name,
        address: place.vicinity,
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
        rating: place.rating,
        types: place.types
      }));
    }
    
    return [];
  } catch (error) {
    console.error('Google Maps Search Places Error:', error.message);
    return [];
  }
}

/**
 * Calculate distance using Haversine formula (fallback)
 * @param {Number} lat1
 * @param {Number} lon1
 * @param {Number} lat2
 * @param {Number} lon2
 * @returns {Number} - distance in kilometers
 */
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

module.exports = {
  getDirections,
  getETA,
  reverseGeocode,
  geocode,
  getPlaceDetails,
  searchPlaces,
  calculateHaversineDistance
};