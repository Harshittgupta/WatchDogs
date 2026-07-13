import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button/Button';
import '../PlaceholderPage.css';

const SettingsPage = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('general');

  const sections = [
    { id: 'general', name: '⚙️ General', icon: '⚙️' },
    { id: 'privacy', name: '🔒 Privacy & Security', icon: '🔒' },
    { id: 'notifications', name: '🔔 Notifications', icon: '🔔' },
    { id: 'location', name: '📍 Location Services', icon: '📍' },
    { id: 'emergency', name: '🚨 Emergency Contacts', icon: '🚨' },
  ];

  return (
    <div className="placeholder-page">
      <div className="placeholder-container settings-layout">
        <div className="settings-sidebar">
          <h2>Settings</h2>
          <nav className="settings-nav">
            {sections.map(section => (
              <button
                key={section.id}
                className={`settings-nav-item ${activeSection === section.id ? 'active' : ''}`}
                onClick={() => setActiveSection(section.id)}
              >
                <span className="nav-icon">{section.icon}</span>
                <span>{section.name.replace(/[^\w\s]/gi, '').trim()}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="settings-content">
          <div className="placeholder-icon">{sections.find(s => s.id === activeSection)?.icon}</div>
          <h1>{sections.find(s => s.id === activeSection)?.name}</h1>
          <p className="placeholder-description">
            Customize your WatchDogs experience with comprehensive settings for safety, privacy, and preferences.
          </p>

          <div className="placeholder-features">
            {activeSection === 'general' && (
              <>
                <div className="feature-item">🌐 Language & Region Settings</div>
                <div className="feature-item">🎨 Theme Customization</div>
                <div className="feature-item">⏰ Time Zone Selection</div>
                <div className="feature-item">💾 Data Management</div>
              </>
            )}
            {activeSection === 'privacy' && (
              <>
                <div className="feature-item">🔐 Password Management</div>
                <div className="feature-item">🔑 Two-Factor Authentication</div>
                <div className="feature-item">👁️ Privacy Controls</div>
                <div className="feature-item">📊 Data Sharing Preferences</div>
              </>
            )}
            {activeSection === 'notifications' && (
              <>
                <div className="feature-item">📧 Email Notifications</div>
                <div className="feature-item">📱 Push Notifications</div>
                <div className="feature-item">🔊 Sound & Vibration</div>
                <div className="feature-item">⏰ Do Not Disturb Schedule</div>
              </>
            )}
            {activeSection === 'location' && (
              <>
                <div className="feature-item">🛰️ GPS Tracking Options</div>
                <div className="feature-item">🗺️ Location History</div>
                <div className="feature-item">📍 Geofencing Alerts</div>
                <div className="feature-item">🔋 Battery Optimization</div>
              </>
            )}
            {activeSection === 'emergency' && (
              <>
                <div className="feature-item">👥 Emergency Contacts List</div>
                <div className="feature-item">🚨 Quick Emergency Actions</div>
                <div className="feature-item">🏥 Medical Information</div>
                <div className="feature-item">📞 Local Emergency Numbers</div>
              </>
            )}
          </div>

          <div className="placeholder-actions">
            <Button onClick={() => navigate('/dashboard')} variant="secondary">
              ← Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;