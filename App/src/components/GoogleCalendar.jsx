import React, { useState, useEffect } from 'react';
import { gapi } from 'gapi-script';

const GoogleCalendarIntegration = ({ onEventsLoaded }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Your Google API credentials
  const API_KEY = 'YOUR_API_KEY';
  const CLIENT_ID = 'YOUR_CLIENT_ID';
  const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'];
  const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly';

  useEffect(() => {
    // Load the Google API client library
    const loadGapiClient = () => {
      gapi.load('client:auth2', initClient);
    };

    const initClient = () => {
      gapi.client.init({
        apiKey: API_KEY,
        clientId: CLIENT_ID,
        discoveryDocs: DISCOVERY_DOCS,
        scope: SCOPES,
      }).then(() => {
        // Listen for sign-in state changes
        gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);
        
        // Handle the initial sign-in state
        updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
      }).catch(err => {
        setError('Error initializing Google API client: ' + err.message);
      });
    };

    const updateSigninStatus = (isSignedIn) => {
      setIsAuthenticated(isSignedIn);
      if (isSignedIn) {
        listUpcomingEvents();
      }
    };

    // Add the Google API script to the document
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.async = true;
    script.defer = true;
    script.onload = loadGapiClient;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleAuthClick = () => {
    if (!isAuthenticated) {
      gapi.auth2.getAuthInstance().signIn();
    } else {
      gapi.auth2.getAuthInstance().signOut();
    }
  };

  const listUpcomingEvents = () => {
    setIsLoading(true);
    gapi.client.calendar.events.list({
      'calendarId': 'primary',
      'timeMin': (new Date()).toISOString(),
      'showDeleted': false,
      'singleEvents': true,
      'maxResults': 10,
      'orderBy': 'startTime'
    }).then(response => {
      const events = response.result.items;
      setEvents(events);
      setIsLoading(false);
      
      // Pass events to parent component
      if (onEventsLoaded) {
        onEventsLoaded(events);
      }
    }).catch(err => {
      setError('Error fetching calendar events: ' + err.message);
      setIsLoading(false);
    });
  };

  const createTaskFromEvent = (event) => {
    const task = {
      id: Date.now(),
      text: event.summary,
      completed: false,
      createdAt: new Date().toISOString(),
      priority: "medium",
      category: "Calendar",
      dueDate: event.start.dateTime || event.start.date,
      googleEventId: event.id
    };
    
    // Get existing tasks
    const existingTasks = JSON.parse(localStorage.getItem("tasks") || "[]");
    
    // Check if this event is already imported
    const isAlreadyImported = existingTasks.some(t => t.googleEventId === event.id);
    
    if (!isAlreadyImported) {
      // Add new task
      const updatedTasks = [...existingTasks, task];
      localStorage.setItem("tasks", JSON.stringify(updatedTasks));
      return true;
    }
    
    return false;
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
      <h2 className="text-lg font-semibold mb-4">Google Calendar Integration</h2>
      
      <button 
        onClick={handleAuthClick}
        className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
      >
        {isAuthenticated ? 'Sign Out' : 'Connect Google Calendar'}
      </button>
      
      {isAuthenticated && (
        <div>
          <button 
            onClick={listUpcomingEvents}
            className="mb-4 ml-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Refresh Events'}
          </button>
          
          {events.length > 0 ? (
            <div>
              <h3 className="text-md font-medium mb-2">Upcoming Events</h3>
              <ul className="space-y-2">
                {events.map(event => (
                  <li key={event.id} className="flex items-center justify-between border-b pb-2">
                    <div>
                      <p className="font-medium">{event.summary}</p>
                      <p className="text-sm text-gray-500">
                        {event.start.dateTime ? new Date(event.start.dateTime).toLocaleString() : new Date(event.start.date).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const added = createTaskFromEvent(event);
                        if (added) {
                          alert('Event added as task!');
                        } else {
                          alert('Event already imported as task');
                        }
                      }}
                      className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700"
                    >
                      Add as Task
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-gray-500">No upcoming events found.</p>
          )}
        </div>
      )}
      
      {error && (
        <div className="mt-4 p-2 bg-red-100 text-red-800 rounded">
          {error}
        </div>
      )}
    </div>
  );
};

export default GoogleCalendarIntegration;