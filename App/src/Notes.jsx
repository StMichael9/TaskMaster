import React, { useState, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import "./Styles/Notes.css";

const Notes = () => {
  // Initialize with notes from localStorage for instant loading
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
        
        // Fall back to general notes if user-specific not found
        const savedNotes = localStorage.getItem("stickyNotes");
        return savedNotes ? JSON.parse(savedNotes) : [];
      }
      
      return [];
    } catch (error) {
      console.error("Error loading notes from localStorage:", error);
      return [];
    }
  });

  const [newNoteText, setNewNoteText] = useState("");
  const [newNoteColor, setNewNoteColor] = useState("#f8e16c");
  const [newNoteFont, setNewNoteFont] = useState("'Caveat', cursive");
  const [newNoteTextColor, setNewNoteTextColor] = useState("#000000");
  const [animatingNoteId, setAnimatingNoteId] = useState(null);
  const [loading, setLoading] = useState(false); // Start with false to show content immediately
  const [error, setError] = useState(null);
  const [showFontDropdown, setShowFontDropdown] = useState(false);
  const [userId, setUserId] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false); // New state for background syncing
  const gridRef = useRef(null);
  const fontDropdownRef = useRef(null);

  // Rest of your constants remain the same
  const fontOptions = [
    { name: "Handwritten", value: "'Caveat', cursive" },
    { name: "Sans Serif", value: "'Arial', sans-serif" },
    { name: "Serif", value: "'Georgia', serif" },
    { name: "Monospace", value: "'Courier New', monospace" },
    { name: "Cursive", value: "'Brush Script MT', cursive" },
  ];

  const textColors = [
    "#000000", "#1e40af", "#047857", "#7c2d12", 
    "#7e22ce", "#be123c", "#334155"
  ];

  const noteColors = [
    "#f8e16c", "#f5a97f", "#c5e1a5", "#80deea",
    "#ef9a9a", "#ce93d8", "#b0bec5", "#ffcc80"
  ];

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

  // Set userId from localStorage
  useEffect(() => {
    try {
      const userData = JSON.parse(localStorage.getItem("userInfo") || "{}");
      if (userData.id) {
        setUserId(userData.id);
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  }, []);

  // Fetch notes from server in the background after component mounts
  useEffect(() => {
    if (userId) {
      fetchNotesInBackground();
    }
  }, [userId]);

  // Fetch notes without blocking the UI
  const fetchNotesInBackground = async () => {
    setIsSyncing(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setIsSyncing(false);
        return;
      }

      const response = await fetch(`${API_URL}/notes`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        localStorage.removeItem("token");
        setIsSyncing(false);
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to fetch notes");
      }

      const data = await response.json();
      
      // Only update if we got data from the server
      if (data && data.length > 0) {
        setNotes(data);
        
        // Cache the notes in localStorage
        if (userId) {
          localStorage.setItem(`notes_${userId}`, JSON.stringify(data));
        }
        localStorage.setItem("stickyNotes", JSON.stringify(data));
      }
    } catch (err) {
      console.error("Error fetching notes:", err);
      // Don't show error to user since this is background sync
    } finally {
      setIsSyncing(false);
    }
  };

  // Add a note - optimistic update with background sync
  const addNote = async () => {
    if (newNoteText.trim() === "") return;

    const rotation = Math.random() * 6 - 3; // Random rotation between -3 and 3 degrees

    // Create a temporary ID for immediate display
    const tempId = uuidv4();
    
    const newNote = {
      id: tempId, // Use temporary ID for optimistic update
      text: newNoteText,
      color: newNoteColor,
      textColor: newNoteTextColor,
      font: newNoteFont,
      rotation: rotation,
      pinned: false,
      createdAt: new Date().toISOString(),
      _isOptimistic: true // Flag to identify this is not yet saved to server
    };

    // Optimistically add to state
    setNotes(prevNotes => [newNote, ...prevNotes]);
    setNewNoteText("");
    setAnimatingNoteId(tempId);

    // Scroll to show the new note animation
    if (gridRef.current) {
      gridRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    // Clear animating state after animation completes
    setTimeout(() => {
      setAnimatingNoteId(null);
    }, 800);

    // Save to localStorage immediately
    const updatedNotes = [newNote, ...notes];
    if (userId) {
      localStorage.setItem(`notes_${userId}`, JSON.stringify(updatedNotes));
    }
    localStorage.setItem("stickyNotes", JSON.stringify(updatedNotes));

    // Then try to save to server in background
    try {
      const token = localStorage.getItem("token");
      if (!token) return; // Skip server save if not authenticated

      const response = await fetch(`${API_URL}/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          text: newNote.text,
          color: newNote.color,
          textColor: newNote.textColor,
          font: newNote.font,
          rotation: newNote.rotation,
          pinned: newNote.pinned
        }),
      });

      if (!response.ok) throw new Error("Failed to create note");

      // Get the real note with server-generated ID
      const savedNote = await response.json();
      
      // Replace the optimistic note with the real one
      setNotes(prevNotes => 
        prevNotes.map(note => 
          note.id === tempId ? { ...savedNote } : note
        )
      );
      
      // Update localStorage with the real note
      const updatedNotesWithServer = notes.map(note => 
        note.id === tempId ? { ...savedNote } : note
      );
      
      if (userId) {
        localStorage.setItem(`notes_${userId}`, JSON.stringify(updatedNotesWithServer));
      }
      localStorage.setItem("stickyNotes", JSON.stringify(updatedNotesWithServer));
      
    } catch (err) {
      console.error("Error adding note to server:", err);
      // Note remains in UI with temporary ID
    }
  };

  // Update a note - optimistic update with background sync
  const updateNoteText = async (id, newText, updates = {}) => {
    // First update locally for immediate feedback
    setNotes(
      notes.map((note) => 
        note.id === id ? { ...note, text: newText, ...updates } : note
      )
    );
    
    // Update localStorage immediately
    const updatedNotes = notes.map(note => 
      note.id === id ? { ...note, text: newText, ...updates } : note
    );
    
    if (userId) {
      localStorage.setItem(`notes_${userId}`, JSON.stringify(updatedNotes));
    }
    localStorage.setItem("stickyNotes", JSON.stringify(updatedNotes));

    // Check if this is an optimistic note that hasn't been saved to server yet
    const note = notes.find((n) => n.id === id);
    if (note && note._isOptimistic) return;

    // Then try to update on server in background
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

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
      // Note remains updated in UI regardless of server error
    }
  };

  // Update note font
  const updateNoteFont = async (id, font) => {
    const note = notes.find((n) => n.id === id);
    if (note) {
      updateNoteText(id, note.text, { font });
    }
  };

  // Update note text color
  const updateNoteTextColor = async (id, textColor) => {
    const note = notes.find((n) => n.id === id);
    if (note) {
      updateNoteText(id, note.text, { textColor });
    }
  };

  // Toggle pinned status - optimistic update
  const togglePinned = async (id) => {
    const note = notes.find((note) => note.id === id);
    if (!note) return;

    const newPinnedStatus = !note.pinned;

    // Update locally first
    setNotes(
      notes.map((note) =>
        note.id === id ? { ...note, pinned: newPinnedStatus } : note
      )
    );
    
    // Update localStorage
    const updatedNotes = notes.map(note => 
      note.id === id ? { ...note, pinned: newPinnedStatus } : note
    );
    
    if (userId) {
      localStorage.setItem(`notes_${userId}`, JSON.stringify(updatedNotes));
    }
    localStorage.setItem("stickyNotes", JSON.stringify(updatedNotes));

    // Skip server update for optimistic notes
    if (note._isOptimistic) return;

    // Update server in background
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

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
    }
  };

  // Delete note - optimistic update
  const deleteNote = async (id) => {
    // Add animation first
    const noteElement = document.getElementById(`note-${id}`);
    if (noteElement) {
      noteElement.classList.add("note-exit");
    }

    // Remove from state after animation
    setTimeout(() => {
      setNotes(notes.filter((note) => note.id !== id));
    }, 400);

    // Update localStorage immediately
    const updatedNotes = notes.filter(note => note.id !== id);
    if (userId) {
      localStorage.setItem(`notes_${userId}`, JSON.stringify(updatedNotes));
    }
    localStorage.setItem("stickyNotes", JSON.stringify(updatedNotes));

    // Check if this is a local-only note
    const note = notes.find((n) => n.id === id);
    const isLocalOnly = note && note._isOptimistic;

    // If it's a local-only note, we don't need to call the API
    if (isLocalOnly) return;

    // Delete from server in background
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(`${API_URL}/notes/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to delete note");
    } catch (err) {
      console.error("Error deleting note:", err);
    }
  };

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
            className={`font-option ${showFontDropdown ? "selected" : ""}`}
            style={{ fontFamily: newNoteFont }}
            aria-label={`Select ${newNoteFont} font`}
          >
            {fontOptions.find((font) => font.value === newNoteFont)?.name ||
              "Select Font"}
          </button>
          {showFontDropdown && (
            <div
              className="absolute top-full left-0 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 shadow-md z-10"
              ref={fontDropdownRef}
            >
              {fontOptions.map((font) => (
                <button
                  key={font.value}
                  onClick={() => {
                    setNewNoteFont(font.value);
                    setShowFontDropdown(false);
                  }}
                  className={`font-option block w-full px-4 py-2 text-left ${
                    newNoteFont === font.value
                      ? "bg-gray-100 dark:bg-gray-700"
                      : ""
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
              style={{
                backgroundColor: color,
                color: color === "#000000" ? "#ffffff" : "#000000",
              }}
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