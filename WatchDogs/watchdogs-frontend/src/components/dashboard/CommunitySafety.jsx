import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import './CommunitySafety.css';

const CommunitySafety = () => {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('feed');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  
  const [formData, setFormData] = useState({
    reportType: 'crime',
    title: '',
    description: '',
    severity: 'medium',
    locationName: '',
    latitude: null,
    longitude: null,
    images: []
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadReports();
  }, [filter]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      console.log('📥 Loading reports with filter:', filter);
      
      const queryParams = new URLSearchParams();
      if (filter !== 'all') {
        queryParams.append('reportType', filter);
      }
      queryParams.append('page', '1');
      queryParams.append('limit', '20');
      
      const response = await fetch(`http://localhost:5000/api/reports/feed?${queryParams}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      console.log('✅ Reports loaded:', data);
      
      if (data.success) {
        setReports(data.reports || []);
      } else {
        console.error('Failed to load reports:', data.message);
        alert('Failed to load reports: ' + data.message);
      }
    } catch (error) {
      console.error('❌ Error loading reports:', error);
      alert('Failed to load community reports');
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length + formData.images.length > 5) {
      alert('❌ Maximum 5 images allowed');
      return;
    }

    console.log('📷 Uploading images:', files.length);

    try {
      // Convert images to base64
      const imagePromises = files.map(file => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      });

      const base64Images = await Promise.all(imagePromises);
      
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...base64Images]
      }));

      console.log('✅ Images uploaded successfully');
      alert('✅ Images uploaded successfully');
    } catch (error) {
      console.error('❌ Failed to upload images:', error);
      alert('Failed to upload images');
    }
  };

  const removeImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const getCurrentLocation = () => {
    console.log('📍 Getting current location...');
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('✅ Location captured:', position.coords);
          
          setFormData(prev => ({
            ...prev,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          }));
          
          // Reverse geocode to get address
          fetch(`https://nominatim.openstreetmap.org/reverse?lat=${position.coords.latitude}&lon=${position.coords.longitude}&format=json`)
            .then(res => res.json())
            .then(data => {
              const address = data.display_name || 'Current Location';
              setFormData(prev => ({
                ...prev,
                locationName: address
              }));
              alert('✅ Location captured successfully');
            })
            .catch(err => {
              console.error('Failed to get address:', err);
              setFormData(prev => ({
                ...prev,
                locationName: `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`
              }));
              alert('✅ Location captured');
            });
        },
        (error) => {
          console.error('❌ Location error:', error);
          alert('Failed to get location. Please enter manually.');
        }
      );
    } else {
      alert('Geolocation is not supported by your browser');
    }
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();

    console.log('📤 Submitting report:', formData);

    if (!formData.title.trim() || !formData.description.trim()) {
      alert('❌ Please fill all required fields');
      return;
    }

    if (!formData.locationName.trim()) {
      alert('❌ Please enter a location or use current location');
      return;
    }

    setSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      
      // Prepare data
      const submitData = {
        reportType: formData.reportType,
        title: formData.title.trim(),
        description: formData.description.trim(),
        locationName: formData.locationName.trim(),
        latitude: formData.latitude || 0,
        longitude: formData.longitude || 0,
        images: formData.images
      };

      console.log('Submitting data:', submitData);

      const response = await fetch('http://localhost:5000/api/reports/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(submitData)
      });

      const data = await response.json();
      console.log('Response:', data);

      if (data.success) {
        console.log('✅ Report submitted successfully');
        alert('✅ Report submitted successfully! Thank you for helping the community.');

        // Reset form
        setFormData({
          reportType: 'crime',
          title: '',
          description: '',
          severity: 'medium',
          locationName: '',
          latitude: null,
          longitude: null,
          images: []
        });

        setActiveTab('feed');
        loadReports();
      } else {
        console.error('Failed to submit:', data.message);
        alert('❌ Failed to submit report: ' + data.message);
      }
    } catch (error) {
      console.error('❌ Error submitting report:', error);
      alert('Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpvote = async (reportId) => {
    try {
      const token = localStorage.getItem('token');
      
      console.log('👍 Upvoting report:', reportId);
      
      const response = await fetch(`http://localhost:5000/api/reports/${reportId}/upvote`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Upvoted successfully');
        
        // Update local state
        setReports(prev =>
          prev.map(report =>
            report.id === reportId
              ? { 
                  ...report, 
                  upvotes: data.upvotes,
                  hasUpvoted: data.hasUpvoted
                }
              : report
          )
        );
      }
    } catch (error) {
      console.error('❌ Failed to upvote:', error);
      alert('Failed to upvote report');
    }
  };

  const handleDownvote = async (reportId) => {
    try {
      const token = localStorage.getItem('token');
      
      console.log('👎 Downvoting report:', reportId);
      
      const response = await fetch(`http://localhost:5000/api/reports/${reportId}/downvote`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Downvoted successfully');
        
        // Update local state
        setReports(prev =>
          prev.map(report =>
            report.id === reportId
              ? { 
                  ...report, 
                  downvotes: data.downvotes,
                  hasDownvoted: data.hasDownvoted
                }
              : report
          )
        );
      }
    } catch (error) {
      console.error('❌ Failed to downvote:', error);
      alert('Failed to downvote report');
    }
  };

  const getReportIcon = (type) => {
    const icons = {
      safe: '✅',
      caution: '⚠️',
      danger: '🚨',
      info: 'ℹ️',
      crime: '🚨',
      health: '🏥',
      accident: '🚗',
      other: '📌'
    };
    return icons[type] || '📌';
  };

  const getReportColor = (type) => {
    const colors = {
      safe: '#10b981',
      caution: '#f59e0b',
      danger: '#ef4444',
      info: '#3b82f6',
      crime: '#ef4444',
      health: '#f59e0b',
      accident: '#f59e0b',
      other: '#6b7280'
    };
    return colors[type] || '#6b7280';
  };

  const renderFeed = () => (
    <div className="feed-container">
      <div className="feed-header">
        <h3>🗺️ Community Safety Reports</h3>
        <div className="filter-buttons">
          {['all', 'safe', 'caution', 'danger', 'info'].map(type => (
            <button
              key={type}
              className={`filter-btn ${filter === type ? 'active' : ''}`}
              onClick={() => setFilter(type)}
            >
              {getReportIcon(type)} {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading reports...</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <h3>No reports found</h3>
          <p>Be the first to share safety information with the community</p>
          <button
            className="submit-report-btn"
            onClick={() => setActiveTab('submit')}
          >
            📝 Submit First Report
          </button>
        </div>
      ) : (
        <div className="reports-list">
          {reports.map(report => (
            <div 
              key={report.id} 
              className="report-card"
              style={{ borderLeftColor: getReportColor(report.reportType) }}
            >
              <div className="report-header">
                <div className="report-user">
                  <div className="user-avatar">
                    {report.user?.avatar ? (
                      <img src={report.user.avatar} alt={report.user.name} />
                    ) : (
                      <span>👤</span>
                    )}
                  </div>
                  <div className="user-info">
                    <div className="user-name">
                      {report.user?.name || 'Anonymous'}
                      {report.user?.verified && (
                        <span className="verified-badge">✓</span>
                      )}
                    </div>
                    <div className="report-meta">
                      <span className="report-location">
                        📍 {report.location}
                      </span>
                      <span className="report-time">
                        {new Date(report.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div 
                  className="report-type-badge"
                  style={{ background: getReportColor(report.reportType) + '20' }}
                >
                  {getReportIcon(report.reportType)}
                </div>
              </div>

              <div className="report-content">
                <h4>{report.title}</h4>
                <p>{report.description}</p>
              </div>

              {report.isVerified && (
                <div className="verified-indicator">
                  ✅ Verified by authorities
                </div>
              )}

              <div className="report-footer">
                <button
                  className={`helpful-btn ${report.hasUpvoted ? 'active' : ''}`}
                  onClick={() => handleUpvote(report.id)}
                >
                  👍 {report.upvotes || 0}
                </button>
                <button
                  className={`helpful-btn ${report.hasDownvoted ? 'active' : ''}`}
                  onClick={() => handleDownvote(report.id)}
                >
                  👎 {report.downvotes || 0}
                </button>
                <button className="share-btn">
                  🔗 Share
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderSubmitForm = () => (
    <div className="submit-form-container">
      <h3>📝 Submit Safety Report</h3>
      <p className="form-subtitle">Help your community stay safe by sharing incidents</p>

      <form onSubmit={handleSubmitReport} className="report-form">
        <div className="form-group">
          <label>Report Type *</label>
          <select
            name="reportType"
            value={formData.reportType}
            onChange={handleFormChange}
            required
          >
            <option value="safe">✅ Safe - Good to know</option>
            <option value="caution">⚠️ Caution - Be aware</option>
            <option value="danger">🚨 Danger - Avoid area</option>
            <option value="info">ℹ️ Info - General update</option>
          </select>
        </div>

        <div className="form-group">
          <label>Title *</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleFormChange}
            placeholder="Brief description of the incident"
            required
          />
        </div>

        <div className="form-group">
          <label>Description *</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleFormChange}
            placeholder="Provide detailed information about the incident..."
            rows={5}
            required
          />
        </div>

        <div className="form-group">
          <label>Location *</label>
          <input
            type="text"
            name="locationName"
            value={formData.locationName}
            onChange={handleFormChange}
            placeholder="Enter location or use current location"
            required
          />
          <button
            type="button"
            className="location-btn"
            onClick={getCurrentLocation}
          >
            📍 Use Current Location
          </button>
          {formData.latitude && formData.longitude && (
            <small className="location-info">
              ✅ Location: {formData.latitude.toFixed(4)}, {formData.longitude.toFixed(4)}
            </small>
          )}
        </div>

        <div className="form-group">
          <label>Images (Optional, max 5)</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
            disabled={formData.images.length >= 5}
          />
          {formData.images.length > 0 && (
            <div className="uploaded-images">
              {formData.images.map((img, idx) => (
                <div key={idx} className="uploaded-image">
                  <img src={img} alt={`Upload ${idx + 1}`} />
                  <button
                    type="button"
                    className="remove-image-btn"
                    onClick={() => removeImage(idx)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="cancel-btn"
            onClick={() => {
              setActiveTab('feed');
              setFormData({
                reportType: 'crime',
                title: '',
                description: '',
                severity: 'medium',
                locationName: '',
                latitude: null,
                longitude: null,
                images: []
              });
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="submit-btn"
            disabled={submitting}
          >
            {submitting ? 'Submitting...' : '📤 Submit Report'}
          </button>
        </div>
      </form>
    </div>
  );

  return (
    <div className="community-safety">
      <div className="community-header">
        <h2>🛡️ Community Safety</h2>
        <p>Share and discover real-time safety information from travelers like you</p>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'feed' ? 'active' : ''}`}
          onClick={() => setActiveTab('feed')}
        >
          📱 Community Feed
        </button>
        <button
          className={`tab ${activeTab === 'submit' ? 'active' : ''}`}
          onClick={() => setActiveTab('submit')}
        >
          📝 Submit Report
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'feed' ? renderFeed() : renderSubmitForm()}
      </div>
    </div>
  );
};

export default CommunitySafety;