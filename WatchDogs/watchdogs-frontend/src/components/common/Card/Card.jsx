import React from 'react';
import './Card.css';

const Card = ({
  children,
  title,
  subtitle,
  actions,
  hoverable = false,
  className = '',
  ...props
}) => {
  return (
    <div className={`card ${hoverable ? 'card--hoverable' : ''} ${className}`} {...props}>
      {(title || subtitle || actions) && (
        <div className="card__header">
          <div className="card__header-content">
            {title && <h3 className="card__title">{title}</h3>}
            {subtitle && <p className="card__subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="card__actions">{actions}</div>}
        </div>
      )}
      <div className="card__body">{children}</div>
    </div>
  );
};

export default Card;