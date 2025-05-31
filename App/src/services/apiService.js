import { getToken, refreshToken } from '../Auth/authService';

const API_URL = "https://taskmaster-1-wf5e.onrender.com";

// Helper function for API calls
export const apiCall = async (endpoint, method = 'GET', body = null) => {
  try {
    // Get a fresh token
    const token = await getToken();
    
    if (!token) {
      throw new Error('Not authenticated');
    }
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${API_URL}${endpoint}`, options);
    
    // If unauthorized, try refreshing token once
    if (response.status === 401) {
      try {
        await refreshToken();
        const newToken = await getToken();
        
        // Retry the request with new token
        options.headers.Authorization = `Bearer ${newToken}`;
        const retryResponse = await fetch(`${API_URL}${endpoint}`, options);
        
        if (!retryResponse.ok) {
          throw new Error(`API error: ${retryResponse.status}`);
        }
        
        return await retryResponse.json();
      } catch (refreshError) {
        console.error('Token refresh failed during API call:', refreshError);
        throw new Error('Session expired. Please log in again.');
      }
    }
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`API call error (${endpoint}):`, error);
    throw error;
  }
};

// Example API functions
export const getTasks = () => apiCall('/tasks');
export const getProjects = () => apiCall('/projects');
export const getNotes = () => apiCall('/notes');
// Add more API functions as needed