import { useEffect } from "react";
import ToDo from "./ToDo";
import Navbar from "./Navbar";
import "./App.css";
import Projects from "./Projects";
import Dashboard from "./Dashboard";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./Auth/Login";
import SignUp from "./Auth/SignUp";
import Notes from "./Notes";
import Settings from "./Settings";
import { SettingsProvider } from "./contexts/SettingsContext";

function App() {
  useEffect(() => {
    // Try to refresh the token when the app starts
    const tryRefreshToken = async () => {
      try {
        const refreshToken = localStorage.getItem("refreshToken");
        if (!refreshToken) return;

        const API_URL = "https://taskmaster-1-wf5e.onrender.com";
        const response = await fetch(`${API_URL}/refresh-token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refreshToken }),
        });

        if (response.ok) {
          const data = await response.json();
          localStorage.setItem("token", data.token);
          localStorage.setItem("refreshToken", data.refreshToken);

          if (data.user) {
            localStorage.setItem("userInfo", JSON.stringify(data.user));
          }

          console.log("Token refreshed successfully on app start");
        }
      } catch (error) {
        console.error("Failed to refresh token on app start:", error);
      }
    };

    tryRefreshToken();
  }, []);

  return (
    <SettingsProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200">
          <Navbar />
          <main className="flex-1 p-4">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/tasks" element={<ToDo />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/notes" element={<Notes />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </SettingsProvider>
  );
}

export default App;
