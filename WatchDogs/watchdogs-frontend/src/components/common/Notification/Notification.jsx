import React from 'react';

const Notification = ({ notification, onClose }) => {
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };

  return (
    <div className={`notification notification--${notification.type}`}>
      <div className="notification__icon">
        {icons[notification.type] || icons.info}
      </div>
      <div className="notification__content">
        {notification.title && (
          <div className="notification__title">{notification.title}</div>
        )}
        <div className="notification__message">{notification.message}</div>
      </div>
      <button 
        className="notification__close"
        onClick={onClose}
        aria-label="Close notification"
      >
        ✕
      </button>
    </div>
  );
};

export default Notification;