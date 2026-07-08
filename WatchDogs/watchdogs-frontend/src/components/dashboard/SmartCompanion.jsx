import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import api from '../../config/api';
import './SmartCompanion.css';

const SmartCompanion = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const messagesEndRef = useRef(null);
  
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(true);

  useEffect(() => {
    loadSuggestions();
    initializeConversation();
    getUserLocation();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getUserLocation = async () => {
    try {
      setLocationLoading(true);
      
      // Check if geolocation is available
      if (!navigator.geolocation) {
        console.log('Geolocation not supported');
        setLocationLoading(false);
        return;
      }

      // Get user's current position
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          };
          
          setUserLocation(location);
          console.log('📍 Location obtained:', location);
          
          // Reverse geocode to get address
          reverseGeocode(location.latitude, location.longitude);
          
          setLocationLoading(false);
        },
        (error) => {
          console.error('Location error:', error);
          setLocationLoading(false);
          
          // Use fallback location or show message
          if (error.code === 1) {
            showNotification('Info', 'Location access denied. Using default location.', 'info');
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000
        }
      );
    } catch (error) {
      console.error('Failed to get location:', error);
      setLocationLoading(false);
    }
  };

  const reverseGeocode = async (lat, lng) => {
    try {
      // Using a simple reverse geocoding (you can use Google Maps API if available)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
      );
      const data = await response.json();
      
      if (data && data.address) {
        const locationStr = `${data.address.city || data.address.town || data.address.village || ''}, ${data.address.country || ''}`;
        setUserLocation(prev => ({
          ...prev,
          address: locationStr,
          city: data.address.city || data.address.town,
          country: data.address.country
        }));
        console.log('📍 Location address:', locationStr);
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
    }
  };

  const initializeConversation = async () => {
    try {
      const response = await api.post('/ai/conversation/start');
      setConversationId(response.data.conversationId);
      
      // Add welcome message
      const welcomeMessage = {
        id: Date.now(),
        type: 'ai',
        text: `Hello ${user?.firstName || 'traveler'}! 👋 I'm your AI travel companion powered by Google Gemini. I can help you with safety tips, local recommendations, emergency assistance, and travel advice. What would you like to know?`,
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    } catch (error) {
      console.error('Failed to initialize conversation:', error);
      showNotification('Error', 'Failed to initialize AI companion', 'error');
    }
  };

  const loadSuggestions = async () => {
    try {
      const response = await api.get('/ai/suggestions');
      setSuggestions(response.data.suggestions || [
        { icon: '🛡️', text: 'Safety tips for my location' },
        { icon: '🍽️', text: 'Best local restaurants' },
        { icon: '🚨', text: 'What to do in an emergency?' },
        { icon: '🗺️', text: 'Tourist attractions nearby' },
        { icon: '🚕', text: 'Safe transportation options' },
        { icon: '💊', text: 'Find nearby hospitals' },
        { icon: '🌍', text: 'Local customs and culture' },
        { icon: '🏨', text: 'Safe accommodation tips' },
        { icon: '📱', text: 'Important emergency numbers' },
        { icon: '💰', text: 'How to avoid scams?' },
        { icon: '🌙', text: 'Safety tips for night travel' },
        { icon: '👥', text: 'Meeting locals safely' }
      ]);
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    }
  };

  const handleSendMessage = async (messageText = input) => {
    if (!messageText.trim() || loading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      text: messageText.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Prepare context with location
      const context = {
        userId: user?._id,
        userName: user?.firstName,
        preferences: user?.preferences
      };

      // Add location to context if available
      if (userLocation) {
        context.location = userLocation.address || `${userLocation.latitude}, ${userLocation.longitude}`;
        context.city = userLocation.city;
        context.country = userLocation.country;
        context.coordinates = {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude
        };
      }

      const response = await api.post('/ai/chat', {
        message: messageText.trim(),
        conversationId,
        context
      });

      const aiMessage = {
        id: Date.now() + 1,
        type: 'ai',
        text: response.data.response,
        timestamp: new Date(),
        suggestions: response.data.suggestions || []
      };

      setMessages(prev => [...prev, aiMessage]);

      // Update conversation ID if needed
      if (response.data.conversationId) {
        setConversationId(response.data.conversationId);
      }

    } catch (error) {
      console.error('Failed to send message:', error);
      
      const errorMessage = {
        id: Date.now() + 1,
        type: 'ai',
        text: "I apologize, but I'm having trouble processing your request right now. For urgent safety concerns, please contact local emergency services immediately. You can also try rephrasing your question.",
        timestamp: new Date(),
        isError: true
      };

      setMessages(prev => [...prev, errorMessage]);
      showNotification('Error', 'Failed to get AI response. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    handleSendMessage(suggestion.text);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearConversation = async () => {
    try {
      if (conversationId) {
        await api.delete(`/ai/conversation/${conversationId}`);
      }
      setMessages([]);
      setConversationId(null);
      initializeConversation();
      showNotification('Success', 'Conversation cleared', 'success');
    } catch (error) {
      console.error('Failed to clear conversation:', error);
      showNotification('Error', 'Failed to clear conversation', 'error');
    }
  };

  return (
    <div className="smart-companion">
      <div className="companion-header">
        <div className="header-info">
          <h2>🤖 AI Travel Companion</h2>
          <p>Ask me anything about your travel safety and destinations</p>
          {userLocation && userLocation.address && (
            <div className="location-badge">
              <span className="location-icon">📍</span>
              <span>{userLocation.address}</span>
            </div>
          )}
          {locationLoading && (
            <div className="location-badge">
              <span className="location-icon">📍</span>
              <span>Getting your location...</span>
            </div>
          )}
        </div>
        <button 
          className="clear-btn"
          onClick={clearConversation}
          disabled={messages.length === 0}
          title="Clear conversation"
        >
          🗑️ Clear Chat
        </button>
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div className="suggestions-container">
          <h3>💡 Quick Questions</h3>
          <div className="suggestions-grid">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                className="suggestion-btn"
                onClick={() => handleSuggestionClick(suggestion)}
                disabled={loading}
                title={suggestion.text}
              >
                <span className="suggestion-icon">{suggestion.icon}</span>
                <span className="suggestion-text">{suggestion.text}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="messages-container">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`message ${message.type} ${message.isError ? 'error' : ''}`}
          >
            <div className="message-avatar">
              {message.type === 'user' ? '👤' : '🤖'}
            </div>
            <div className="message-content">
              <div className="message-text">{message.text}</div>
              <div className="message-time">
                {new Date(message.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
              {message.suggestions && message.suggestions.length > 0 && (
                <div className="follow-up-suggestions">
                  <p className="follow-up-label">You might also want to know:</p>
                  {message.suggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      className="follow-up-btn"
                      onClick={() => handleSendMessage(suggestion)}
                      disabled={loading}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="message ai loading">
            <div className="message-avatar">🤖</div>
            <div className="message-content">
              <div className="message-text">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="input-container">
        <div className="input-wrapper">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything about your travel safety..."
            disabled={loading}
            rows={1}
            className="message-input"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!input.trim() || loading}
            className="send-btn"
            title="Send message"
          >
            {loading ? '⏳' : '📤'} Send
          </button>
        </div>
        <div className="input-hint">
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>
    </div>
  );
};

export default SmartCompanion;