import React, { useState, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import "./Styles/Notes.css";

const Notes = () => {
  const [notes, setNotes] = useState(() => {
    try {
      const token = localStorage.getItem("token");

      // Only load notes if user is authenticated
      if (token) {
        const userData = JSON.parse(localStorage.getItem("userInfo") || "{}");
        const userId = userData.id;

        if (userId) {
          const userNotes = localStorage.getItem(`notes_${userId}`);
          if (userNotes) {
            return JSON.parse(userNotes);
          }
        }

        // Fall back to general notes if user-specific not found but still authenticated
        const savedNotes = localStorage.getItem("stickyNotes");
        return savedNotes ? JSON.parse(savedNotes) : [];
      }

      // If not authenticated, return empty array
      return [];
    } catch (error) {
      console.error("Error loading notes from localStorage:", error);
      return [];
    }
  });
  
  const [newNoteText, setNewNoteText] = useState("");
  const [newNoteColor, setNewNoteColor] = useState("#f8e16c");
  const [newNoteFont, setNewNoteFont] = useState("'Caveat', cursive"); // Default font with proper format
  const [newNoteTextColor, setNewNoteTextColor] = useState("#000000"); // Default text color
  const [animatingNoteId, setAnimatingNoteId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showFontDropdown, setShowFontDropdown] = useState(false);
  const [userId, setUserId] = useState(null);
  const gridRef = useRef(null);
  const fontDropdownRef = useRef(null);

  // Available fonts with proper CSS font-family format
  const fontOptions = [
    { name: "Handwritten", value: "'Caveat', cursive" },
    { name: "Sans Serif", value: "'Arial', sans-serif" },
    { name: "Serif", value: "'Georgia', serif" },
    { name: "Monospace", value: "'Courier New', monospace" },
    { name: "Cursive", value: "'Brush Script MT', cursive" },
  ];

  // Available text colors
  const textColors = [
    "#000000", // Black
    "#1e40af", // Dark Blue
    "#047857", // Dark Green
    "#7c2d12", // Dark Brown
    "#7e22ce", // Purple
    "#be123c", // Dark Red
    "#334155", // Slate
  ];

  // Add this line to get the API URL from environment variables
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

  // Close font dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (fontDropdownRef.current && !fontDropdownRef.current.contains(event.target)) {
        setShowFontDropdown(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Inject all required fonts
  useEffect(() => {
    // Create link elements for each font we want to use
    const fontLinks = [
      "https://fonts.googleapis.com/css2?family=Caveat:wght@400;500;600&display=swap",
      // Add other Google Fonts if needed
    ];
    
    const linkElements = fontLinks.map(href => {
      const link = document.createElement("link");
      link.href = href;
      link.rel = "stylesheet";
      document.head.appendChild(link);
      return link;
    });
    
    // Cleanup function to remove links when component unmounts
    return () => {
      linkElements.forEach(link => {
        if (document.head.contains(link)) {
          document.head.removeChild(link);
        }
      });
    };
  }, []);

  // Add this useEffect to set userId from localStorage
  useEffect(() => {
    // Try to get user ID from localStorage
    try {
      const userData = JSON.parse(localStorage.getItem("userInfo") || "{}");
      if (userData.id) {
        setUserId(userData.id);
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  }, []);

  // Fetch notes from the server
  const fetchNotes = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        // If not authenticated, try to load from localStorage
        const recoveredNotes = recoverNotes();
        if (recoveredNotes.length > 0) {
          setNotes(recoveredNotes);
          setLoading(false);
          return;
        }
        
        // If no recovered notes, show empty list
        setNotes([]);
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/notes`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        // Token expired or invalid
        localStorage.removeItem("token"); // Clear the invalid token
        
        // Try to recover notes from localStorage
        const recoveredNotes = recoverNotes();
        if (recoveredNotes.length > 0) {
          setNotes(recoveredNotes);
          setLoading(false);
          return;
        }
        
        throw new Error("Your session has expired. Please log in again.");
      }

      if (!response.ok) {
        throw new Error("Failed to fetch notes");
      }

      const data = await response.json();
      
      // If server returned empty array but we have local notes, use local notes
      if (data.length === 0) {
        const recoveredNotes = recoverNotes();
        if (recoveredNotes.length > 0) {
          setNotes(recoveredNotes);
          setLoading(false);
          return;
        }
      }
      
      setNotes(data);
      
      // Cache the notes in localStorage
      if (data.length > 0) {
        const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
        const userId = userInfo?.id;
        if (userId) {
          localStorage.setItem(`notes_${userId}`, JSON.stringify(data));
        }
        localStorage.setItem("stickyNotes", JSON.stringify(data));
      }
    } catch (err) {
      console.error("Error fetching notes:", err);
      setError(err.message);

      // Try to recover notes from localStorage as fallback
      const recoveredNotes = recoverNotes();
      if (recoveredNotes.length > 0) {
        setNotes(recoveredNotes);
      }

      // If token expired, redirect to login
      if (err.message.includes("session has expired")) {
        // Use setTimeout to avoid state updates during render
        setTimeout(() => {
          window.location.href = "/login";
        }, 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  // Save notes to localStorage for offline access
  useEffect(() => {
    if (notes.length > 0) {
      try {
        // Always save to both locations for redundancy
        if (userId) {
          // If user is logged in, save to user-specific key
          localStorage.setItem(`notes_${userId}`, JSON.stringify(notes));
        }

        // Always save to general notes key for backward compatibility
        localStorage.setItem("stickyNotes", JSON.stringify(notes));
        
        // Log successful save for debugging
        console.log(`Saved ${notes.length} notes to localStorage`);
      } catch (error) {
        console.error("Error saving notes to localStorage:", error);
      }
    }
  }, [notes, userId]);

  // Add this function to recover notes if they seem to be missing
  const recoverNotes = () => {
    try {
      // Try multiple sources to recover notes
      let recoveredNotes = [];
      
      // Try user-specific notes first
      if (userId) {
        const userNotes = localStorage.getItem(`notes_${userId}`);
        if (userNotes && JSON.parse(userNotes).length > 0) {
          recoveredNotes = JSON.parse(userNotes);
          console.log(`Recovered ${recoveredNotes.length} notes from user-specific storage`);
          return recoveredNotes;
        }
      }
      
      // Try general notes storage
      const generalNotes = localStorage.getItem("stickyNotes");
      if (generalNotes && JSON.parse(generalNotes).length > 0) {
        recoveredNotes = JSON.parse(generalNotes);
        console.log(`Recovered ${recoveredNotes.length} notes from general storage`);
        return recoveredNotes;
      }
      
      return [];
    } catch (error) {
      console.error("Error recovering notes:", error);
      return [];
    }
  };

  // Check for local notes to sync when user logs in
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token && userId) {
      // Check if we have any local-only notes to sync
      const localOnlyNotes = notes.filter(note => note._isLocalOnly);
      if (localOnlyNotes.length > 0) {
        syncLocalNotesToServer();
      }
    }
  }, [userId]);

  // Add a periodic check to ensure notes haven't disappeared
  useEffect(() => {
    // Check every 30 seconds if notes are still there
    const intervalId = setInterval(() => {
      if (notes.length === 0) {
        const recoveredNotes = recoverNotes();
        if (recoveredNotes.length > 0) {
          console.log("Notes disappeared! Recovering from localStorage...");
          setNotes(recoveredNotes);
        }
      }
    }, 30000);
    
    return () => clearInterval(intervalId);
  }, [notes.length]);

  // Add this function to sync local notes with the server
  const syncLocalNotesToServer = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      // Get user info from localStorage
      const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
      const userId = userInfo?.id;
      if (!userId) return;

      // Find local-only notes in the current state
      const localOnlyNotes = notes.filter(note => note._isLocalOnly);
      if (localOnlyNotes.length === 0) return;

      console.log(`Syncing ${localOnlyNotes.length} local notes to server...`);

      // Upload each local note to the server
      for (const note of localOnlyNotes) {
        const { id, _isLocalOnly, ...noteData } = note; // Remove local id and flag

        const response = await fetch(`${API_URL}/notes`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(noteData),
        });

        if (!response.ok) {
          console.error("Failed to sync note to server:", note);
          continue;
        }
      }

      // Fetch all notes from server to ensure consistency
      fetchNotes();
      console.log("Local notes synced to server successfully");
    } catch (err) {
      console.error("Error syncing local notes:", err);
    }
  };

  // Add a note to the server
  const addNote = async () => {
    if (newNoteText.trim() === "") return;

    const rotation = Math.random() * 6 - 3; // Random rotation between -3 and 3 degrees

    const newNote = {
      text: newNoteText,
      color: newNoteColor,
      textColor: newNoteTextColor,
      font: newNoteFont,
      rotation: rotation,
      pinned: false,
      createdAt: new Date().toISOString(),
    };

    try {
      const token = localStorage.getItem("token");
      let savedNote;

      if (token) {
        try {
          const response = await fetch(`${API_URL}/notes`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(newNote),
          });

          if (!response.ok) throw new Error("Failed to create note");

          savedNote = await response.json();
        } catch (err) {
          console.error("Error adding note to server:", err);
          setError(err.message);

          // Fallback to local-only note if API fails
          savedNote = {
            id: uuidv4(),
            ...newNote,
            _isLocalOnly: true, // Flag to indicate this is a local-only note
          };
        }
      } else {
        // If no token, create a local-only note
        savedNote = {
          id: uuidv4(),
          ...newNote,
          _isLocalOnly: true,
        };
      }

      // Add the new note to the state
      setNotes((prevNotes) => [savedNote, ...prevNotes]);
      setNewNoteText("");
      setAnimatingNoteId(savedNote.id);

      // Scroll to show the new note animation
      if (gridRef.current) {
        gridRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }

      // Clear animating state after animation completes
      setTimeout(() => {
        setAnimatingNoteId(null);
      }, 800);
    } catch (err) {
      console.error("Error adding note:", err);
      setError(err.message);
    }
  };

  // Update a note on the server
  const updateNoteText = async (id, newText, updates = {}) => {
    // First update locally for immediate feedback
    setNotes(
      notes.map((note) => 
        note.id === id ? { ...note, text: newText, ...updates } : note
      )
    );

    // Check if this is a local-only note
    const note = notes.find((n) => n.id === id);
    if (note && note._isLocalOnly) return;

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No authentication token found");

      const response = await fetch(`${API_URL}/notes/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: newText, ...updates }),
      });

      if (!response.ok) throw new Error("Failed to update note");
    } catch (err) {
      console.error("Error updating note:", err);
      setError(err.message);

      // Revert the change if the API call fails
      setNotes(
        notes.map((n) => (n.id === id ? { ...n, text: note.text, ...updates } : n))
      );
    }
  };

  // Update note font
  const updateNoteFont = async (id, font) => {
    const note = notes.find(n => n.id === id);
    if (note) {
      updateNoteText(id, note.text, { font });
    }
  };

  // Update note text color
  const updateNoteTextColor = async (id, textColor) => {
    const note = notes.find(n => n.id === id);
    if (note) {
      updateNoteText(id, note.text, { textColor });
    }
  };

  // Toggle pinned status on the server
  const togglePinned = async (id) => {
    // Find the current note and its pinned status
    const note = notes.find((note) => note.id === id);
    if (!note) return;

    const newPinnedStatus = !note.pinned;

    // Update locally first for immediate feedback
    setNotes(
      notes.map((note) =>
        note.id === id ? { ...note, pinned: newPinnedStatus } : note
      )
    );

    // Check if this is a local-only note
    if (note._isLocalOnly) return;

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No authentication token found");

      const response = await fetch(`${API_URL}/notes/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pinned: newPinnedStatus }),
      });

      if (!response.ok) throw new Error("Failed to update note");
    } catch (err) {
      console.error("Error toggling pin status:", err);
      setError(err.message);

      // Revert the change if the API call fails
      setNotes(
        notes.map((n) => (n.id === id ? { ...n, pinned: note.pinned } : n))
      );
    }
  };

  // Delete a note from the server
  const deleteNote = async (id) => {
    // Add animation first
    const noteElement = document.getElementById(`note-${id}`);
    if (noteElement) {
      noteElement.classList.add("note-exit");
    }

    // Check if this is a local-only note
    const note = notes.find((n) => n.id === id);
    const isLocalOnly = note && note._isLocalOnly;

    // Remove from state after animation
    setTimeout(() => {
      setNotes(notes.filter((note) => note.id !== id));
    }, 400);

    // If it's a local-only note, we don't need to call the API
    if (isLocalOnly) return;

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No authentication token found");

      const response = await fetch(`${API_URL}/notes/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to delete note");
    } catch (err) {
      console.error("Error deleting note:", err);
      setError(err.message);
    }
  };

  // Available sticky note colors
  const noteColors = [
    "#f8e16c",
    "#f5a97f",
    "#c5e1a5",
    "#80deea",
    "#ef9a9a",
    "#ce93d8",
    "#b0bec5",
    "#ffcc80",
  ];

  const getAttachment = () => {
    const types = ["pin-top-left", "pin-top-right", "tape-top"];
    return types[Math.floor(Math.random() * types.length)];
  };

  // Keyboard shortcut handling
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      addNote();
    }
  };

  const pinnedNotes = notes.filter((note) => note.pinned);
  const unpinnedNotes = notes.filter((note) => !note.pinned);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-8 text-center">
        My Notes
      </h1>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* New Note Form using our custom new-note-form class */}
      <div className="new-note-form mb-10 max-w-2xl mx-auto">
        <h2 className="text-xl font-semibold mb-4">Create New Note</h2>
        <div className="mb-4">
          <textarea
            value={newNoteText}
            onChange={(e) => setNewNoteText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write your note here..."
            rows="4"
          ></textarea>
          <p className="text-xs mt-1">
            Tip: Press Ctrl+Enter to quickly add a note
          </p>
        </div>

        {/* Color Picker */}
        <div className="color-picker mb-4">
          {noteColors.map((color) => (
            <button
              key={color}
              onClick={() => setNewNoteColor(color)}
              className={`color-option ${
                newNoteColor === color ? "selected" : ""
              }`}
              style={{ backgroundColor: color }}
              aria-label={`Select ${color} color`}
            ></button>
          ))}
        </div>

        {/* Font Picker */}
        <div className="font-picker mb-4 relative">
          <button
            onClick={() => setShowFontDropdown(!showFontDropdown)}
            className={`font-option ${
              showFontDropdown ? "selected" : ""
            }`}
            style={{ fontFamily: newNoteFont }}
            aria-label={`Select ${newNoteFont} font`}
          >
            {fontOptions.find(font => font.value === newNoteFont)?.name || "Select Font"}
          </button>
          {showFontDropdown && (
            <div className="absolute top-full left-0 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 shadow-md z-10" ref={fontDropdownRef}>
              {fontOptions.map((font) => (
                <button
                  key={font.value}
                  onClick={() => {
                    setNewNoteFont(font.value);
                    setShowFontDropdown(false);
                  }}
                  className={`font-option block w-full px-4 py-2 text-left ${
                    newNoteFont === font.value ? "bg-gray-100 dark:bg-gray-700" : ""
                  }`}
                  style={{ fontFamily: font.value }}
                  aria-label={`Select ${font.name} font`}
                >
                  {font.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Text Color Picker */}
        <div className="text-color-picker mb-4">
          {textColors.map((color) => (
            <button
              key={color}
              onClick={() => setNewNoteTextColor(color)}
              className={`text-color-option ${
                newNoteTextColor === color ? "selected" : ""
              }`}
              style={{ backgroundColor: color, color: color === "#000000" ? "#ffffff" : "#000000" }}
              aria-label={`Select ${color} text color`}
            ></button>
          ))}
        </div>

        <button onClick={addNote} className="add-note-button">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-2"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
              clipRule="evenodd"
            />
          </svg>
          Add Note
        </button>
      </div>

      {/* Sticky Notes Grid */}
      <div className="note-grid" ref={gridRef}>
        {notes.length === 0 ? (
          <div className="col-span-full empty-notes">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 mx-auto mb-4 opacity-50"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-xl">
              No notes yet. Create your first sticky note!
            </p>
          </div>
        ) : (
          notes.map((note, index) => {
            const attachment = getAttachment();
            const isAnimating = note.id === animatingNoteId;

            return (
              <div
                id={`note-${note.id}`}
                key={note.id}
                className={`sticky-note ${isAnimating ? "note-appear" : ""}`}
                style={{
                  backgroundColor: note.color,
                  "--rotation": `${note.rotation}deg`,
                  transform: `rotate(${note.rotation}deg)`,
                  animationDelay: `${index * 0.05}s`,
                  fontFamily: note.font,
                  color: note.textColor,
                }}
              >
                {attachment.includes("pin") ? (
                  <div className={`pin ${attachment}`}></div>
                ) : (
                  <div className={`tape ${attachment}`}></div>
                )}

                <textarea
                  value={note.text}
                  onChange={(e) => updateNoteText(note.id, e.target.value)}
                  className="flex-grow border-none focus:ring-0 resize-none"
                ></textarea>

                <div className="folded-corner"></div>
                <div className="shadow-effect"></div>

                <div className="note-footer">
                  <span className="text-xs opacity-75">
                    {new Date(note.createdAt).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => togglePinned(note.id)}
                    className="pin-button"
                    aria-label={note.pinned ? "Unpin note" : "Pin note"}
                  >
                    {note.pinned ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 24 24"
                        fill="red"
                      >
                        <path d="M12 2C10.895 2 10 2.895 10 4V10.586L5.707 14.879C5.316 15.27 5.316 15.902 5.707 16.293C6.098 16.684 6.73 16.684 7.121 16.293L11.414 12H18C19.105 12 20 11.105 20 10V4C20 2.895 19.105 2 18 2H12zM12 0H18C20.209 0 22 1.791 22 4V10C22 12.209 20.209 14 18 14H12L7.707 18.293C6.316 19.684 4.684 19.684 3.293 18.293C1.902 16.902 1.902 15.27 3.293 13.879L7.586 9.586C7.961 9.211 8 8.633 8 8V4C8 1.791 9.791 0 12 0z" />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="red"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 2C10.895 2 10 2.895 10 4V10.586L5.707 14.879C5.316 15.27 5.316 15.902 5.707 16.293C6.098 16.684 6.73 16.684 7.121 16.293L11.414 12H18C19.105 12 20 11.105 20 10V4C20 2.895 19.105 2 18 2H12zM12 0H18C20.209 0 22 1.791 22 4V10C22 12.209 20.209 14 18 14H12L7.707 18.293C6.316 19.684 4.684 19.684 3.293 18.293C1.902 16.902 1.902 15.27 3.293 13.879L7.586 9.586C7.961 9.211 8 8.633 8 8V4C8 1.791 9.791 0 12 0z" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={() => deleteNote(note.id)}
                    className="delete-button"
                    aria-label="Delete note"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.05 4.05a7 7 0 019.9 0l1.414 1.414a1 1 0 010 1.414l-1.414 1.414a7 7 0 01-9.9 0L3.636 6.878a1 1 0 010-1.414L5.05 4.05zm1.414 1.414a5 5 0 017.072 0l.707.707-7.072 7.072-.707-.707a5 5 0 010-7.072z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Notes;