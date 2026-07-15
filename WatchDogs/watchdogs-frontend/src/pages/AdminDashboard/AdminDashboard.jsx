import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../../context/NotificationContext';
import './AdminDashboard.css';
import api from '../../config/api';

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  
  const [tab, setTab] = useState('overview');
  const [dashboardData, setDashboardData] = useState(null);
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [pendingIds, setPendingIds] = useState([]);
  const [emergencies, setEmergencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20 });

  // Check if user is admin
  useEffect(() => {
    if (user && user.role !== 'admin') {
      showNotification('Error', 'Access denied. Admin only.', 'error');
      navigate('/dashboard');
    }
  }, [user, navigate, showNotification]);

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/admin/dashboard');
      
      if (data.success) {
        setDashboardData(data.dashboard);
      } else {
        showNotification('Error', data.message, 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      showNotification('Error', 'Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async (page = 1) => {
    try {
      const { data } = await api.get('/admin/users', {
        params: { page, limit: pagination.limit }
      });
      
      if (data.success) {
        setUsers(data.users);
        setPagination({ ...pagination, page: data.page, total: data.total, pages: data.pages });
      }
    } catch (error) {
      console.error('Error:', error);
      showNotification('Error', 'Failed to fetch users', 'error');
    }
  };

  const fetchReports = async (page = 1, pending = false) => {
    try {
      const endpoint = pending ? 'reports/pending' : 'reports';
      const { data } = await api.get(`/admin/${endpoint}`, {
        params: { page, limit: pagination.limit }
      });
      
      if (data.success) {
        setReports(data.reports);
        setPagination({ ...pagination, page: data.page, total: data.total, pages: data.pages });
      }
    } catch (error) {
      console.error('Error:', error);
      showNotification('Error', 'Failed to fetch reports', 'error');
    }
  };

  const fetchAlerts = async (page = 1) => {
    try {
      const { data } = await api.get('/admin/alerts', {
        params: { page, limit: pagination.limit, active: true }
      });
      
      if (data.success) {
        setAlerts(data.alerts);
        setPagination({ ...pagination, page: data.page, total: data.total, pages: data.pages });
      }
    } catch (error) {
      console.error('Error:', error);
      showNotification('Error', 'Failed to fetch alerts', 'error');
    }
  };

  const fetchPendingDigitalIds = async (page = 1) => {
    try {
      const { data } = await api.get('/admin/digital-ids/pending', {
        params: { page, limit: pagination.limit }
      });
      
      if (data.success) {
        setPendingIds(data.digitalIds);
        setPagination({ ...pagination, page: data.page, total: data.total, pages: data.pages });
      }
    } catch (error) {
      console.error('Error:', error);
      showNotification('Error', 'Failed to fetch pending IDs', 'error');
    }
  };

  const fetchEmergencies = async (page = 1) => {
    try {
      const { data } = await api.get('/admin/emergencies/active');
      
      if (data.success) {
        setEmergencies(data.emergencies);
      }
    } catch (error) {
      console.error('Error:', error);
      showNotification('Error', 'Failed to fetch emergencies', 'error');
    }
  };

  const updateUser = async (userId, updates) => {
    try {
      const { data } = await api.put(`/admin/users/${userId}`, updates);
      
      if (data.success) {
        showNotification('Success', 'User updated successfully', 'success');
        fetchUsers(pagination.page);
      } else {
        showNotification('Error', data.message, 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      showNotification('Error', 'Failed to update user', 'error');
    }
  };

  const verifyReport = async (reportId) => {
    try {
      const { data } = await api.put(`/admin/reports/${reportId}/verify`);
      
      if (data.success) {
        showNotification('Success', 'Report verified', 'success');
        fetchReports(pagination.page, true);
      } else {
        showNotification('Error', data.message, 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      showNotification('Error', 'Failed to verify report', 'error');
    }
  };

  const deleteReport = async (reportId) => {
    if (!window.confirm('Are you sure you want to delete this report?')) return;
    
    try {
      const { data } = await api.delete(`/admin/reports/${reportId}`);
      
      if (data.success) {
        showNotification('Success', 'Report deleted', 'success');
        fetchReports(pagination.page, true);
      } else {
        showNotification('Error', data.message, 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      showNotification('Error', 'Failed to delete report', 'error');
    }
  };

  const createAlert = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const alertData = {
      alertType: formData.get('alertType'),
      severity: formData.get('severity'),
      title: formData.get('title'),
      message: formData.get('message'),
      detailedInfo: formData.get('detailedInfo'),
      location: {
        type: 'Point',
        coordinates: [
          parseFloat(formData.get('longitude')),
          parseFloat(formData.get('latitude'))
        ]
      },
      affectedArea: {
        country: formData.get('country'),
        city: formData.get('city'),
        state: formData.get('state'),
        radius: parseFloat(formData.get('radius'))
      },
      recommendedActions: formData.get('recommendedActions')
        ?.split('\n')
        .filter(a => a.trim()),
      safetyTips: formData.get('safetyTips')
        ?.split('\n')
        .filter(t => t.trim()),
      validUntil: formData.get('validUntil') || null
    };

    try {
      const { data } = await api.post('/admin/alerts/create', alertData);

      if (data.success) {
        showNotification('Success', 'Alert created and broadcasted!', 'success');
        e.target.reset();
        fetchDashboardData();
      } else {
        showNotification('Error', data.message, 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      showNotification('Error', 'Failed to create alert', 'error');
    }
  };

  const deactivateAlert = async (alertId) => {
    if (!window.confirm('Deactivate this alert?')) return;
    
    try {
      const { data } = await api.put(`/admin/alerts/${alertId}/deactivate`);
      
      if (data.success) {
        showNotification('Success', 'Alert deactivated', 'success');
        fetchAlerts(pagination.page);
      } else {
        showNotification('Error', data.message, 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      showNotification('Error', 'Failed to deactivate alert', 'error');
    }
  };

  const verifyDigitalId = async (idId, status, notes) => {
    try {
      const { data } = await api.put(`/admin/digital-ids/${idId}/verify`, { status, notes });
      
      if (data.success) {
        showNotification('Success', `Digital ID ${status}`, 'success');
        fetchPendingDigitalIds(pagination.page);
      } else {
        showNotification('Error', data.message, 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      showNotification('Error', 'Failed to verify digital ID', 'error');
    }
  };

  const resolveEmergency = async (emergencyId, resolution) => {
    try {
      const { data } = await api.put(`/admin/emergencies/${emergencyId}/resolve`, { resolution });
      
      if (data.success) {
        showNotification('Success', 'Emergency resolved', 'success');
        fetchEmergencies();
      } else {
        showNotification('Error', data.message, 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      showNotification('Error', 'Failed to resolve emergency', 'error');
    }
  };

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="loading">Loading admin dashboard...</div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <div>
          <h1>👨‍💼 Admin Dashboard</h1>
          <p>Manage platform, users, and safety features</p>
        </div>
        <button onClick={() => navigate('/dashboard')}>← Back to Main</button>
      </div>

      <div className="admin-tabs">
        <button 
          className={tab === 'overview' ? 'active' : ''}
          onClick={() => setTab('overview')}
        >
          📊 Overview
        </button>
        <button 
          className={tab === 'users' ? 'active' : ''}
          onClick={() => { setTab('users'); fetchUsers(1); }}
        >
          👥 Users ({dashboardData?.overview.totalUsers || 0})
        </button>
        <button 
          className={tab === 'reports' ? 'active' : ''}
          onClick={() => { setTab('reports'); fetchReports(1, true); }}
        >
          📝 Reports ({dashboardData?.overview.pendingReports || 0})
        </button>
        <button 
          className={tab === 'alerts' ? 'active' : ''}
          onClick={() => { setTab('alerts'); fetchAlerts(1); }}
        >
          🚨 Alerts ({dashboardData?.overview.activeAlerts || 0})
        </button>
        <button 
          className={tab === 'create-alert' ? 'active' : ''}
          onClick={() => setTab('create-alert')}
        >
          ➕ Create Alert
        </button>
        <button 
          className={tab === 'digitalids' ? 'active' : ''}
          onClick={() => { setTab('digitalids'); fetchPendingDigitalIds(1); }}
        >
          🆔 Verify IDs ({dashboardData?.overview.pendingDigitalIds || 0})
        </button>
        <button 
          className={tab === 'emergencies' ? 'active' : ''}
          onClick={() => { setTab('emergencies'); fetchEmergencies(); }}
        >
          🚑 Emergencies ({dashboardData?.overview.activeEmergencies || 0})
        </button>
      </div>

      <div className="admin-content">
        {/* OVERVIEW TAB */}
        {tab === 'overview' && dashboardData && (
          <>
            <h2>📊 Platform Overview</h2>
            <div className="overview-grid">
              <div className="stat-card">
                <h3>👥 Total Users</h3>
                <div className="stat-number">{dashboardData.overview.totalUsers}</div>
                <small>+{dashboardData.overview.newUsersLast30Days} this month</small>
                <small>🟢 {dashboardData.overview.activeUsersLast7Days} active (7d)</small>
              </div>

              <div className="stat-card">
                <h3>⭐ Premium Users</h3>
                <div className="stat-number">{dashboardData.overview.premiumUsers}</div>
                <small>{((dashboardData.overview.premiumUsers / dashboardData.overview.totalUsers) * 100).toFixed(1)}% of total</small>
              </div>

              <div className="stat-card">
                <h3>📝 Safety Reports</h3>
                <div className="stat-number">{dashboardData.overview.totalReports}</div>
                <small>✅ {dashboardData.overview.verifiedReports} verified</small>
                <small>⏳ {dashboardData.overview.pendingReports} pending</small>
                <small>🚩 {dashboardData.overview.flaggedReports} flagged</small>
              </div>

              <div className="stat-card alert">
                <h3>🚑 Active Emergencies</h3>
                <div className="stat-number">{dashboardData.overview.activeEmergencies}</div>
                <small>{dashboardData.overview.totalEmergencies} total</small>
                <small>✅ {dashboardData.overview.resolvedEmergencies} resolved</small>
              </div>

              <div className="stat-card">
                <h3>🚨 Active Alerts</h3>
                <div className="stat-number">{dashboardData.overview.activeAlerts}</div>
                <small>🔴 {dashboardData.overview.criticalAlerts} critical</small>
                <small>📅 {dashboardData.overview.alertsCreatedLast7Days} created (7d)</small>
              </div>

              <div className="stat-card">
                <h3>🆔 Digital IDs</h3>
                <div className="stat-number">{dashboardData.overview.verifiedDigitalIds}</div>
                <small>⏳ {dashboardData.overview.pendingDigitalIds} pending</small>
                <small>❌ {dashboardData.overview.rejectedDigitalIds} rejected</small>
              </div>

              <div className="stat-card">
                <h3>⏱️ Avg Response Time</h3>
                <div className="stat-number">
                  {Math.round(dashboardData.emergencyStats.avgResponseTime)} min
                </div>
                <small>Emergency resolution</small>
              </div>

              <div className="stat-card">
                <h3>📈 Reports Today</h3>
                <div className="stat-number">{dashboardData.overview.reportsLast24Hours}</div>
                <small>Last 24 hours</small>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="recent-activity">
              <h3>🕐 Recent Activity</h3>
              <div className="activity-grid">
                <div className="activity-section">
                  <h4>Recent Alerts</h4>
                  {dashboardData.recentActivity.alerts.map(alert => (
                    <div key={alert._id} className="activity-item">
                      <span className={`severity-badge ${alert.severity}`}>
                        {alert.severity}
                      </span>
                      <span>{alert.title}</span>
                      <small>{new Date(alert.createdAt).toLocaleString()}</small>
                    </div>
                  ))}
                </div>

                <div className="activity-section">
                  <h4>Recent Reports</h4>
                  {dashboardData.recentActivity.reports.map(report => (
                    <div key={report._id} className="activity-item">
                      <span className="type-badge">{report.reportType}</span>
                      <span>{report.title}</span>
                      <small>{new Date(report.createdAt).toLocaleString()}</small>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* USERS TAB */}
        {tab === 'users' && (
          <>
            <h2>👥 User Management</h2>
            <div className="users-table">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Verified</th>
                    <th>Premium</th>
                    <th>Role</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user._id}>
                      <td>{user.firstName} {user.lastName}</td>
                      <td>{user.email}</td>
                      <td>{user.isVerified ? '✅' : '❌'}</td>
                      <td>{user.premiumStatus ? '⭐' : '-'}</td>
                      <td>{user.role}</td>
                      <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div className="action-buttons">
                          {!user.isVerified && (
                            <button 
                              onClick={() => updateUser(user._id, { isVerified: true })}
                              className="btn-verify"
                            >
                              Verify
                            </button>
                          )}
                          {!user.premiumStatus && (
                            <button 
                              onClick={() => updateUser(user._id, { premiumStatus: true })}
                              className="btn-premium"
                            >
                              Premium
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination.pages > 1 && (
              <div className="pagination">
                <button 
                  onClick={() => fetchUsers(pagination.page - 1)}
                  disabled={pagination.page === 1}
                >
                  Previous
                </button>
                <span>Page {pagination.page} of {pagination.pages}</span>
                <button 
                  onClick={() => fetchUsers(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}

        {/* REPORTS TAB */}
        {tab === 'reports' && (
          <>
            <h2>📝 Pending Reports</h2>
            <div className="reports-table">
              {reports.length === 0 ? (
                <div className="empty-state">
                  <h3>No pending reports</h3>
                  <p>All reports are verified!</p>
                </div>
              ) : (
                reports.map(report => (
                  <div key={report._id} className="report-item">
                    <div className="report-header">
                      <div className="report-info">
                        <h4>{report.title}</h4>
                        <p>Type: {report.reportType}</p>
                        <p>By: {report.user?.firstName} {report.user?.lastName} ({report.user?.email})</p>
                        <p>Location: {report.location?.city}, {report.location?.country}</p>
                        <p>Created: {new Date(report.createdAt).toLocaleString()}</p>
                        {report.isFlagged && (
                          <p className="flagged">🚩 FLAGGED</p>
                        )}
                      </div>
                      <div className="report-actions">
                        <button 
                          onClick={() => verifyReport(report._id)}
                          className="btn-verify"
                        >
                          ✓ Verify
                        </button>
                        <button 
                          onClick={() => deleteReport(report._id)}
                          className="btn-delete"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                    <div className="report-description">
                      <p>{report.description}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {pagination.pages > 1 && (
              <div className="pagination">
                <button 
                  onClick={() => fetchReports(pagination.page - 1, true)}
                  disabled={pagination.page === 1}
                >
                  Previous
                </button>
                <span>Page {pagination.page} of {pagination.pages}</span>
                <button 
                  onClick={() => fetchReports(pagination.page + 1, true)}
                  disabled={pagination.page === pagination.pages}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}

        {/* ALERTS TAB */}
        {tab === 'alerts' && (
          <>
            <h2>🚨 Active Alerts</h2>
            <div className="alerts-grid">
              {alerts.length === 0 ? (
                <div className="empty-state">
                  <h3>No active alerts</h3>
                  <p>Create one using the Create Alert tab</p>
                </div>
              ) : (
                alerts.map(alert => (
                  <div key={alert._id} className={`alert-card severity-${alert.severity}`}>
                    <div className="alert-header">
                      <h4>{alert.title}</h4>
                      <span className={`severity-badge ${alert.severity}`}>
                        {alert.severity}
                      </span>
                    </div>
                    <p>{alert.message}</p>
                    <div className="alert-meta">
                      <span>Type: {alert.alertType}</span>
                      <span>Views: {alert.views}</span>
                      <span>Acknowledged: {alert.acknowledgedBy?.length || 0}</span>
                    </div>
                    <div className="alert-actions">
                      <button 
                        onClick={() => deactivateAlert(alert._id)}
                        className="btn-deactivate"
                      >
                        Deactivate
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* CREATE ALERT TAB */}
        {tab === 'create-alert' && (
          <>
            <h2>➕ Create New Alert</h2>
            <form onSubmit={createAlert} className="create-alert-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Alert Type *</label>
                  <select name="alertType" required>
                    <option value="">Select type...</option>
                    <option value="weather">🌧️ Weather</option>
                    <option value="natural_disaster">🌊 Natural Disaster</option>
                    <option value="health">💊 Health</option>
                    <option value="security">🔒 Security</option>
                    <option value="political">🏛️ Political</option>
                    <option value="traffic">🚗 Traffic</option>
                    <option value="event">🎉 Event</option>
                    <option value="travel_advisory">✈️ Travel Advisory</option>
                    <option value="other">📌 Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Severity *</label>
                  <select name="severity" required>
                    <option value="">Select severity...</option>
                    <option value="critical">🔴 Critical</option>
                    <option value="high">🟠 High</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="low">🟢 Low</option>
                    <option value="info">🔵 Info</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Title *</label>
                <input type="text" name="title" required placeholder="e.g., Heavy Rainfall Alert" />
              </div>

              <div className="form-group">
                <label>Message *</label>
                <textarea 
                  name="message" 
                  required 
                  rows="3"
                  placeholder="Brief message about the alert..."
                ></textarea>
              </div>

              <div className="form-group">
                <label>Detailed Information</label>
                <textarea 
                  name="detailedInfo" 
                  rows="4"
                  placeholder="Additional details about the situation..."
                ></textarea>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Latitude *</label>
                  <input 
                    type="number" 
                    name="latitude" 
                    step="0.000001" 
                    required 
                    placeholder="19.0760"
                  />
                </div>
                <div className="form-group">
                  <label>Longitude *</label>
                  <input 
                    type="number" 
                    name="longitude" 
                    step="0.000001" 
                    required 
                    placeholder="72.8777"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Country *</label>
                  <input type="text" name="country" required placeholder="India" />
                </div>
                <div className="form-group">
                  <label>State</label>
                  <input type="text" name="state" placeholder="Maharashtra" />
                </div>
                <div className="form-group">
                  <label>City *</label>
                  <input type="text" name="city" required placeholder="Mumbai" />
                </div>
                <div className="form-group">
                  <label>Radius (km) *</label>
                  <input type="number" name="radius" defaultValue="50" required />
                </div>
              </div>

              <div className="form-group">
                <label>Recommended Actions (one per line)</label>
                <textarea 
                  name="recommendedActions" 
                  rows="3"
                  placeholder="Stay indoors&#10;Avoid affected areas&#10;Monitor updates"
                ></textarea>
              </div>

              <div className="form-group">
                <label>Safety Tips (one per line)</label>
                <textarea 
                  name="safetyTips" 
                  rows="3"
                  placeholder="Keep emergency supplies ready&#10;Have emergency contacts handy"
                ></textarea>
              </div>

              <div className="form-group">
                <label>Valid Until (optional)</label>
                <input type="datetime-local" name="validUntil" />
              </div>

              <button type="submit" className="btn-create">
                🚀 Create & Broadcast Alert
              </button>
            </form>
          </>
        )}

        {/* DIGITAL IDS TAB */}
        {tab === 'digitalids' && (
          <>
            <h2>🆔 Pending Digital ID Verifications</h2>
            <div className="digital-ids-grid">
              {pendingIds.length === 0 ? (
                <div className="empty-state">
                  <h3>No pending verifications</h3>
                  <p>All digital IDs are processed!</p>
                </div>
              ) : (
                pendingIds.map(digitalId => (
                  <div key={digitalId._id} className="digital-id-card">
                    <div className="id-photo">
                      {digitalId.profilePhoto ? (
                        <img src={digitalId.profilePhoto} alt="Profile" />
                      ) : (
                        <div className="no-photo">👤</div>
                      )}
                    </div>
                    <div className="id-details">
                      <h4>{digitalId.user?.firstName} {digitalId.user?.lastName}</h4>
                      <p>📧 {digitalId.user?.email}</p>
                      <p>📱 {digitalId.phoneNumber}</p>
                      <p>🆔 {digitalId.idNumber}</p>
                      <p>📅 Submitted: {new Date(digitalId.createdAt).toLocaleDateString()}</p>
                      <span className={`status-badge ${digitalId.verificationStatus}`}>
                        {digitalId.verificationStatus}
                      </span>
                    </div>
                    <div className="id-actions">
                      <button 
                        onClick={() => verifyDigitalId(digitalId._id, 'verified', 'Approved by admin')}
                        className="btn-verify"
                      >
                        ✓ Verify
                      </button>
                      <button 
                        onClick={() => {
                          const notes = prompt('Rejection reason:');
                          if (notes) verifyDigitalId(digitalId._id, 'rejected', notes);
                        }}
                        className="btn-delete"
                      >
                        ✗ Reject
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* EMERGENCIES TAB */}
        {tab === 'emergencies' && (
          <>
            <h2>🚑 Active Emergencies</h2>
            <div className="emergencies-list">
              {emergencies.length === 0 ? (
                <div className="empty-state">
                  <h3>No active emergencies</h3>
                  <p>All clear! ✅</p>
                </div>
              ) : (
                emergencies.map(emergency => (
                  <div key={emergency._id} className="emergency-card">
                    <div className="emergency-header">
                      <div>
                        <h4>🚨 {emergency.emergencyType}</h4>
                        <p><strong>User:</strong> {emergency.user?.firstName} {emergency.user?.lastName}</p>
                        <p><strong>Phone:</strong> {emergency.user?.phone}</p>
                      </div>
                      <span className="emergency-level">{emergency.emergencyLevel}</span>
                    </div>
                    <div className="emergency-details">
                      <p><strong>Triggered:</strong> {new Date(emergency.triggeredAt).toLocaleString()}</p>
                      <p><strong>Message:</strong> {emergency.message}</p>
                      {emergency.location && (
                        <div className="emergency-location">
                          📍 {emergency.location.coordinates[1]}, {emergency.location.coordinates[0]}
                        </div>
                      )}
                    </div>
                    <button 
                      onClick={() => {
                        const resolution = prompt('Resolution notes:');
                        if (resolution) resolveEmergency(emergency._id, resolution);
                      }}
                      className="btn-resolve"
                    >
                      ✓ Mark as Resolved
                    </button>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;