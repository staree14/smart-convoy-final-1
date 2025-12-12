/**
 * Animation utilities for convoy route visualization
 */

/**
 * Calculate bearing/heading between two points
 * @param {number} lat1 - Start latitude
 * @param {number} lon1 - Start longitude
 * @param {number} lat2 - End latitude
 * @param {number} lon2 - End longitude
 * @returns {number} Bearing in degrees (0-360)
 */
export function getBearing(lat1, lon1, lat2, lon2) {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const lat1Rad = lat1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;

  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
            Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

  const bearing = Math.atan2(y, x) * 180 / Math.PI;
  return (bearing + 360) % 360;
}

/**
 * Interpolate position between two points
 * @param {Array} start - Start coordinate [lat, lon]
 * @param {Array} end - End coordinate [lat, lon]
 * @param {number} progress - Progress between 0 and 1
 * @returns {Array} Interpolated coordinate [lat, lon]
 */
export function interpolatePosition(start, end, progress) {
  const lat = start[0] + (end[0] - start[0]) * progress;
  const lon = start[1] + (end[1] - start[1]) * progress;
  return [lat, lon];
}

/**
 * Calculate Haversine distance between two points
 * @param {Array} point1 - First coordinate [lat, lon]
 * @param {Array} point2 - Second coordinate [lat, lon]
 * @returns {number} Distance in meters
 */
export function getDistance(point1, point2) {
  const R = 6371000; // Earth's radius in meters
  const lat1 = point1[0] * Math.PI / 180;
  const lat2 = point2[0] * Math.PI / 180;
  const dLat = (point2[0] - point1[0]) * Math.PI / 180;
  const dLon = (point2[1] - point1[1]) * Math.PI / 180;

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate total distance of a route
 * @param {Array} coords - Array of coordinates [[lat, lon], ...]
 * @returns {number} Total distance in meters
 */
export function calculateRouteDistance(coords) {
  if (!coords || coords.length < 2) return 0;

  let totalDistance = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    totalDistance += getDistance(coords[i], coords[i + 1]);
  }

  return totalDistance;
}
