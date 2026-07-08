import React from 'react';
import './Stats.css';

const Stats = ({ title, value, icon, color, trend, subtitle, onClick }) => {
  return (
    <div 
      className={`stat-card ${onClick ? 'clickable' : ''}`}
      onClick={onClick}
      style={{ borderLeftColor: color || '#667eea' }}
    >
      <div className="stat-icon" style={{ color: color || '#667eea' }}>
        {icon || '📊'}
      </div>
      <div className="stat-content">
        <div className="stat-label">{title || 'Stat'}</div>
        <div className="stat-value" style={{ color: color || '#111827' }}>
          {value || '0'}
        </div>
        {subtitle && <div className="stat-subtitle">{subtitle}</div>}
        {trend && (
          <div className={`stat-trend ${trend.direction}`}>
            <span className="trend-icon">
              {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'}
            </span>
            <span className="trend-value">{trend.value}</span>
            <span className="trend-label">{trend.label}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// Grid wrapper component for multiple stats
export const StatsGrid = ({ children, columns = 4 }) => {
  return (
    <div 
      className="stats-grid" 
      style={{ 
        gridTemplateColumns: `repeat(auto-fit, minmax(${columns === 2 ? '300px' : '250px'}, 1fr))` 
      }}
    >
      {children}
    </div>
  );
};

export default Stats;
