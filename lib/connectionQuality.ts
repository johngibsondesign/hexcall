/**
 * Connection Quality Helper
 * Determines connection quality based on latency, jitter, and packet loss
 */

export type ConnectionQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'disconnected';

export interface ConnectionMetrics {
  latency?: number;
  jitter?: number;
  packetLoss?: number;
}

/**
 * Calculate connection quality from metrics
 */
export function getConnectionQuality(metrics?: ConnectionMetrics): ConnectionQuality {
  if (!metrics) return 'disconnected';
  
  const { latency = 0, jitter = 0, packetLoss = 0 } = metrics;
  
  // If no data, consider disconnected
  if (latency === 0 && jitter === 0 && packetLoss === 0) {
    return 'disconnected';
  }
  
  // Scoring system (lower is better)
  let score = 0;
  
  // Latency scoring (ms)
  if (latency > 250) score += 3;
  else if (latency > 150) score += 2;
  else if (latency > 80) score += 1;
  
  // Jitter scoring (ms)
  if (jitter > 50) score += 3;
  else if (jitter > 30) score += 2;
  else if (jitter > 15) score += 1;
  
  // Packet loss scoring (%)
  if (packetLoss > 5) score += 4;
  else if (packetLoss > 2) score += 3;
  else if (packetLoss > 1) score += 2;
  else if (packetLoss > 0.5) score += 1;
  
  // Map score to quality
  if (score === 0) return 'excellent';
  if (score <= 2) return 'good';
  if (score <= 5) return 'fair';
  return 'poor';
}

/**
 * Get color for connection quality
 */
export function getQualityColor(quality: ConnectionQuality): string {
  switch (quality) {
    case 'excellent':
      return 'rgb(34, 197, 94)'; // green-500
    case 'good':
      return 'rgb(132, 204, 22)'; // lime-500
    case 'fair':
      return 'rgb(234, 179, 8)'; // yellow-500
    case 'poor':
      return 'rgb(239, 68, 68)'; // red-500
    case 'disconnected':
      return 'rgb(107, 114, 128)'; // gray-500
  }
}

/**
 * Get ring color classes for Tailwind
 */
export function getQualityRingClass(quality: ConnectionQuality): string {
  switch (quality) {
    case 'excellent':
      return 'ring-green-500';
    case 'good':
      return 'ring-lime-500';
    case 'fair':
      return 'ring-yellow-500';
    case 'poor':
      return 'ring-red-500';
    case 'disconnected':
      return 'ring-gray-500';
  }
}

/**
 * Get quality label for display
 */
export function getQualityLabel(quality: ConnectionQuality): string {
  switch (quality) {
    case 'excellent':
      return 'Excellent';
    case 'good':
      return 'Good';
    case 'fair':
      return 'Fair';
    case 'poor':
      return 'Poor';
    case 'disconnected':
      return 'Disconnected';
  }
}

/**
 * Get quality description
 */
export function getQualityDescription(metrics?: ConnectionMetrics): string {
  if (!metrics) return 'No connection data';
  
  const { latency = 0, jitter = 0, packetLoss = 0 } = metrics;
  
  if (latency === 0 && jitter === 0 && packetLoss === 0) {
    return 'No connection data';
  }
  
  return `${latency}ms • ${jitter.toFixed(1)}ms jitter • ${packetLoss.toFixed(1)}% loss`;
}
