import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '@components/common/Button/Button';
import './NotFound.css';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="not-found">
      <div className="not-found__content">
        <div className="not-found__icon">🛡️</div>
        <h1 className="not-found__code">404</h1>
        <h2 className="not-found__title">Page Not Found</h2>
        <p className="not-found__message">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="not-found__actions">
          <Button 
            onClick={() => navigate('/')}
            leftIcon="🏠"
          >
            Go Home
          </Button>
          <Button 
            onClick={() => navigate(-1)}
            variant="secondary"
            leftIcon="←"
          >
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;