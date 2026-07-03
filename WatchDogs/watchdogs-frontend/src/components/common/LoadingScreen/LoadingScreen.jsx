import React from 'react';
import './LoadingScreen.css';

const LoadingScreen = ({ message = 'Loading your safety dashboard...' }) => {
  return (
    <div className="loading-screen">
      <div className="loading-content">
        <div className="loading-logo">
          <h1>🛡️ WatchDogs</h1>
        </div>
        <div className="loading-spinner-container">
          <div className="loading-spinner"></div>
          <p className="loading-message">{message}</p>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
