// ProfilePage.jsx - Complete Working Version with Real-Time Updates

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './ProfilePage.css';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    nationality: '',
    dateOfBirth: '',
    profilePicture: ''
  });

  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [newContact, setNewContact] = useState({
    name: '',
    relationship: '',
    phone: '',
    email: '',
    priorityOrder: 1
  });

  const [medicalInfo, setMedicalInfo] = useState({
    bloodType: '',
    allergies: [],
    medications: [],
    medicalConditions: [],
    emergencyNotes: ''
  });

  const [newAllergy, setNewAllergy] = useState('');
  const [newMedication, setNewMedication] = useState('');
  const [newCondition, setNewCondition] = useState('');

  useEffect(() => {
    if (user) {
      console.log('👤 Loading user data:', user);
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        nationality: user.nationality || '',
        dateOfBirth: user.dateOfBirth ? user.dateOfBirth.split('T')[0] : '',
        profilePicture: user.profilePicture || ''
      });
      setEmergencyContacts(user.emergencyContacts || []);
      setMedicalInfo(user.medicalInfo || {
        bloodType: '',
        allergies: [],
        medications: [],
        medicalConditions: [],
        emergencyNotes: ''
      });
    }
  }, [user]);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Profile saved, updating context...');
        
        // Update auth context with fresh user data
        if (updateUser) {
          updateUser(data.user);
        }
        
        setEditing(false);
        alert('✅ Profile updated successfully!');
      } else {
        alert('Failed to update profile: ' + data.message);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmergencyContact = async () => {
    if (!newContact.name || !newContact.phone) {
      alert('❌ Name and phone are required');
      return;
    }

    console.log('➕ Adding emergency contact:', newContact);

    const updatedContacts = [...emergencyContacts, {
      ...newContact,
      priorityOrder: emergencyContacts.length + 1
    }];
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ emergencyContacts: updatedContacts })
      });

      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Contact added, updating UI...');
        
        // ✅ Update local state immediately (UI updates instantly)
        setEmergencyContacts(updatedContacts);
        
        // ✅ Update auth context (keeps everything in sync)
        if (updateUser) {
          updateUser(data.user);
        }
        
        // Reset form
        setNewContact({
          name: '',
          relationship: '',
          phone: '',
          email: '',
          priorityOrder: 1
        });
        
        alert('✅ Emergency contact added successfully!');
      } else {
        alert('❌ Failed to add contact: ' + data.message);
      }
    } catch (error) {
      console.error('❌ Error adding contact:', error);
      alert('❌ Failed to add contact. Check console for details.');
    }
  };

  const handleDeleteContact = async (index) => {
    if (!confirm('Remove this emergency contact?')) return;

    console.log('🗑️ Deleting contact at index:', index);

    const updatedContacts = emergencyContacts.filter((_, i) => i !== index);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ emergencyContacts: updatedContacts })
      });

      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Contact deleted, updating UI...');
        
        // ✅ Update local state immediately
        setEmergencyContacts(updatedContacts);
        
        // ✅ Update auth context
        if (updateUser) {
          updateUser(data.user);
        }
        
        alert('✅ Contact removed');
      } else {
        alert('❌ Failed to remove contact: ' + data.message);
      }
    } catch (error) {
      console.error('❌ Error removing contact:', error);
      alert('❌ Failed to remove contact');
    }
  };

  const handleSaveMedicalInfo = async () => {
    console.log('🏥 Saving medical info:', medicalInfo);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ medicalInfo })
      });

      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Medical info saved, updating context...');
        
        // ✅ Update auth context
        if (updateUser) {
          updateUser(data.user);
        }
        
        alert('✅ Medical information updated!');
      } else {
        alert('❌ Failed to update medical info: ' + data.message);
      }
    } catch (error) {
      console.error('❌ Error updating medical info:', error);
      alert('❌ Failed to update medical information');
    }
  };

  const handleAddAllergy = () => {
    if (newAllergy.trim()) {
      console.log('➕ Adding allergy:', newAllergy);
      setMedicalInfo({
        ...medicalInfo,
        allergies: [...(medicalInfo.allergies || []), newAllergy.trim()]
      });
      setNewAllergy('');
    }
  };

  const handleAddMedication = () => {
    if (newMedication.trim()) {
      console.log('➕ Adding medication:', newMedication);
      setMedicalInfo({
        ...medicalInfo,
        medications: [...(medicalInfo.medications || []), newMedication.trim()]
      });
      setNewMedication('');
    }
  };

  const handleAddCondition = () => {
    if (newCondition.trim()) {
      console.log('➕ Adding condition:', newCondition);
      setMedicalInfo({
        ...medicalInfo,
        medicalConditions: [...(medicalInfo.medicalConditions || []), newCondition.trim()]
      });
      setNewCondition('');
    }
  };

  const handleRemoveItem = (array, index, field) => {
    console.log(`🗑️ Removing ${field} at index:`, index);
    const updated = array.filter((_, i) => i !== index);
    setMedicalInfo({
      ...medicalInfo,
      [field]: updated
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    console.log('📷 Uploading image:', file.name);

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData({
        ...formData,
        profilePicture: reader.result
      });
    };
    reader.readAsDataURL(file);
  };

  // Debug: Check if updateUser exists
  useEffect(() => {
    console.log('🔍 Debug - updateUser function exists:', !!updateUser);
  }, [updateUser]);

  return (
    <div className="profile-page">
      <div className="profile-container">
        {/* Header */}
        <div className="profile-header">
          <button onClick={() => navigate('/dashboard')} className="back-button">
            ← Back
          </button>
          <h1>My Profile</h1>
          <button onClick={() => navigate('/settings')} className="settings-link">
            ⚙️ Settings
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="profile-tabs">
          <button
            className={`tab ${activeTab === 'personal' ? 'active' : ''}`}
            onClick={() => setActiveTab('personal')}
          >
            👤 Personal Info
          </button>
          <button
            className={`tab ${activeTab === 'emergency' ? 'active' : ''}`}
            onClick={() => setActiveTab('emergency')}
          >
            🚨 Emergency Contacts
          </button>
          <button
            className={`tab ${activeTab === 'medical' ? 'active' : ''}`}
            onClick={() => setActiveTab('medical')}
          >
            🏥 Medical Info
          </button>
        </div>

        {/* Personal Information Tab */}
        {activeTab === 'personal' && (
          <div className="profile-content">
            <div className="profile-card">
              <div className="card-header">
                <h2>Personal Information</h2>
                {!editing ? (
                  <button onClick={() => setEditing(true)} className="btn-edit">
                    ✏️ Edit
                  </button>
                ) : (
                  <div className="edit-actions">
                    <button onClick={() => setEditing(false)} className="btn-cancel">
                      Cancel
                    </button>
                    <button onClick={handleSaveProfile} className="btn-save" disabled={loading}>
                      {loading ? 'Saving...' : '💾 Save'}
                    </button>
                  </div>
                )}
              </div>

              <div className="profile-photo-section">
                <div className="profile-photo">
                  {formData.profilePicture ? (
                    <img src={formData.profilePicture} alt="Profile" />
                  ) : (
                    <div className="photo-placeholder">
                      {formData.firstName?.[0]}{formData.lastName?.[0]}
                    </div>
                  )}
                </div>
                {editing && (
                  <div className="photo-upload">
                    <label htmlFor="photo-input" className="upload-label">
                      📷 Change Photo
                    </label>
                    <input
                      id="photo-input"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      style={{ display: 'none' }}
                    />
                  </div>
                )}
              </div>

              <div className="profile-fields">
                <div className="field-group">
                  <label>First Name</label>
                  {editing ? (
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                    />
                  ) : (
                    <p>{formData.firstName}</p>
                  )}
                </div>

                <div className="field-group">
                  <label>Last Name</label>
                  {editing ? (
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                    />
                  ) : (
                    <p>{formData.lastName}</p>
                  )}
                </div>

                <div className="field-group">
                  <label>Email</label>
                  <p>{formData.email}</p>
                  <small>Email cannot be changed</small>
                </div>

                <div className="field-group">
                  <label>Phone</label>
                  {editing ? (
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="+91 9876543210"
                    />
                  ) : (
                    <p>{formData.phone || 'Not set'}</p>
                  )}
                </div>

                <div className="field-group">
                  <label>Nationality</label>
                  {editing ? (
                    <input
                      type="text"
                      name="nationality"
                      value={formData.nationality}
                      onChange={handleInputChange}
                      placeholder="e.g., Indian"
                    />
                  ) : (
                    <p>{formData.nationality || 'Not set'}</p>
                  )}
                </div>

                <div className="field-group">
                  <label>Date of Birth</label>
                  {editing ? (
                    <input
                      type="date"
                      name="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={handleInputChange}
                    />
                  ) : (
                    <p>{formData.dateOfBirth ? new Date(formData.dateOfBirth).toLocaleDateString() : 'Not set'}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="profile-stats">
              <div className="stat-card">
                <div className="stat-icon">🆔</div>
                <div className="stat-info">
                  <h3>Digital ID</h3>
                  <p>{user?.digitalId ? 'Active' : 'Not created'}</p>
                  <button onClick={() => navigate('/digital-id')} className="stat-link">
                    {user?.digitalId ? 'View' : 'Create'} →
                  </button>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">🚨</div>
                <div className="stat-info">
                  <h3>Emergency Contacts</h3>
                  <p>{emergencyContacts.length} contacts</p>
                  <button onClick={() => setActiveTab('emergency')} className="stat-link">
                    Manage →
                  </button>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">🏥</div>
                <div className="stat-info">
                  <h3>Medical Info</h3>
                  <p>{medicalInfo?.bloodType ? 'Completed' : 'Incomplete'}</p>
                  <button onClick={() => setActiveTab('medical')} className="stat-link">
                    Update →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Emergency Contacts Tab */}
        {activeTab === 'emergency' && (
          <div className="profile-content">
            <div className="profile-card">
              <div className="card-header">
                <h2>Emergency Contacts</h2>
                <p className="card-subtitle">
                  These contacts will be notified if you trigger an emergency
                </p>
              </div>

              {/* Existing Contacts */}
              <div className="contacts-list">
                {emergencyContacts.length === 0 ? (
                  <div className="empty-state">
                    <p>No emergency contacts added yet</p>
                    <small>Add at least one contact for emergency situations</small>
                  </div>
                ) : (
                  emergencyContacts.map((contact, index) => (
                    <div key={index} className="contact-item">
                      <div className="contact-info">
                        <div className="contact-icon">
                          {contact.name[0]?.toUpperCase()}
                        </div>
                        <div className="contact-details">
                          <h4>{contact.name}</h4>
                          <p>{contact.relationship}</p>
                          <p className="contact-phone">📞 {contact.phone}</p>
                          {contact.email && <p className="contact-email">📧 {contact.email}</p>}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteContact(index)}
                        className="btn-delete-contact"
                      >
                        🗑️
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Add New Contact Form */}
              <div className="add-contact-form">
                <h3>Add New Contact</h3>
                <div className="form-grid">
                  <input
                    type="text"
                    placeholder="Name *"
                    value={newContact.name}
                    onChange={(e) => setNewContact({...newContact, name: e.target.value})}
                  />
                  <input
                    type="text"
                    placeholder="Relationship (e.g., Mother, Friend)"
                    value={newContact.relationship}
                    onChange={(e) => setNewContact({...newContact, relationship: e.target.value})}
                  />
                  <input
                    type="tel"
                    placeholder="Phone Number *"
                    value={newContact.phone}
                    onChange={(e) => setNewContact({...newContact, phone: e.target.value})}
                  />
                  <input
                    type="email"
                    placeholder="Email (optional)"
                    value={newContact.email}
                    onChange={(e) => setNewContact({...newContact, email: e.target.value})}
                  />
                </div>
                <button onClick={handleAddEmergencyContact} className="btn-add-contact">
                  ➕ Add Contact
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Medical Information Tab */}
        {activeTab === 'medical' && (
          <div className="profile-content">
            <div className="profile-card">
              <div className="card-header">
                <h2>Medical Information</h2>
                <p className="card-subtitle">
                  This information will be shared with emergency responders
                </p>
              </div>

              <div className="medical-fields">
                <div className="field-group">
                  <label>Blood Type</label>
                  <select
                    value={medicalInfo.bloodType}
                    onChange={(e) => setMedicalInfo({...medicalInfo, bloodType: e.target.value})}
                  >
                    <option value="">Select Blood Type</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>

                <div className="field-group">
                  <label>Allergies</label>
                  <div className="tag-input">
                    <input
                      type="text"
                      placeholder="Add allergy (e.g., Peanuts, Penicillin)"
                      value={newAllergy}
                      onChange={(e) => setNewAllergy(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddAllergy()}
                    />
                    <button onClick={handleAddAllergy} className="btn-add-tag">+</button>
                  </div>
                  <div className="tags-list">
                    {medicalInfo.allergies?.map((allergy, index) => (
                      <span key={index} className="tag">
                        {allergy}
                        <button onClick={() => handleRemoveItem(medicalInfo.allergies, index, 'allergies')}>×</button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="field-group">
                  <label>Current Medications</label>
                  <div className="tag-input">
                    <input
                      type="text"
                      placeholder="Add medication"
                      value={newMedication}
                      onChange={(e) => setNewMedication(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddMedication()}
                    />
                    <button onClick={handleAddMedication} className="btn-add-tag">+</button>
                  </div>
                  <div className="tags-list">
                    {medicalInfo.medications?.map((med, index) => (
                      <span key={index} className="tag">
                        {med}
                        <button onClick={() => handleRemoveItem(medicalInfo.medications, index, 'medications')}>×</button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="field-group">
                  <label>Medical Conditions</label>
                  <div className="tag-input">
                    <input
                      type="text"
                      placeholder="Add condition (e.g., Diabetes, Asthma)"
                      value={newCondition}
                      onChange={(e) => setNewCondition(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddCondition()}
                    />
                    <button onClick={handleAddCondition} className="btn-add-tag">+</button>
                  </div>
                  <div className="tags-list">
                    {medicalInfo.medicalConditions?.map((condition, index) => (
                      <span key={index} className="tag">
                        {condition}
                        <button onClick={() => handleRemoveItem(medicalInfo.medicalConditions, index, 'medicalConditions')}>×</button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="field-group">
                  <label>Emergency Notes</label>
                  <textarea
                    placeholder="Any other important medical information for emergency responders..."
                    value={medicalInfo.emergencyNotes}
                    onChange={(e) => setMedicalInfo({...medicalInfo, emergencyNotes: e.target.value})}
                    rows={4}
                  />
                </div>

                <button onClick={handleSaveMedicalInfo} className="btn-save-medical">
                  💾 Save Medical Information
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;