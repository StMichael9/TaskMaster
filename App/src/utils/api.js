
// API configuration
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// You can also add helper functions here if needed
export const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
};
