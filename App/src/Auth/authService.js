const API_URL = "https://taskmaster-1-wf5e.onrender.com";

// Function to refresh the token
export const refreshToken = async () => {
  try {
    const refreshToken = localStorage.getItem("refreshToken");
    
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }
    
    const response = await fetch(`${API_URL}/refresh-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken }),
    });
    
    if (!response.ok) {
      throw new Error("Failed to refresh token");
    }
    
    const data = await response.json();
    
    // Update tokens in localStorage
    localStorage.setItem("token", data.token);
    localStorage.setItem("refreshToken", data.refreshToken);
    
    // Update user info if needed
    if (data.user) {
      localStorage.setItem(
        "userInfo",
        JSON.stringify({
          id: data.user.id,
          username: data.user.username,
          isAdmin: data.user.isAdmin || false,
          isPremium: data.user.isPremium || false,
          preferences: data.user.preferences || {},
        })
      );
    }
    
    // Notify components that auth has changed
    window.dispatchEvent(new Event("authChange"));
    
    return data.token;
  } catch (error) {
    console.error("Token refresh failed:", error);
    // Clear auth data if refresh fails
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("userInfo");
    window.dispatchEvent(new Event("authChange"));
    throw error;
  }
};

// Function to check if token is expired (optional but useful)
export const isTokenExpired = (token) => {
  if (!token) return true;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch (e) {
    return true;
  }
};

// Function to get current token, refreshing if needed
export const getToken = async () => {
  const token = localStorage.getItem("token");
  
  if (!token || isTokenExpired(token)) {
    try {
      return await refreshToken();
    } catch (error) {
      return null;
    }
  }
  
  return token;
};