// Force Railway URL for all environments during testing
const API_URL = 'https://mbc.chakravue.co.in/api';

// Optional TURN servers configuration for WebRTC (set via Vite env)
// Example in your environment: VITE_TURN_SERVERS='[{"urls":"turn:turn.example.com:3478","username":"user","credential":"pass"}]'
const TURN_SERVERS: RTCIceServer[] = (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_TURN_SERVERS)
  ? JSON.parse((import.meta as any).env.VITE_TURN_SERVERS)
  : [];

console.log('[DEBUG] API_URL:', API_URL);
console.log('[DEBUG] TURN_SERVERS:', TURN_SERVERS);

export { API_URL, TURN_SERVERS };

// Helper function to build API URLs
export function apiUrl(endpoint: string): string {
  return `${API_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
}
