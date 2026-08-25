const isParcelDevServer = typeof window !== 'undefined'
  && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  && window.location.port === '5173';

// Parcel local does not proxy /api; Nginx uses relative URLs in Docker.
export const API_BASE = isParcelDevServer ? 'http://localhost:8082' : '';
