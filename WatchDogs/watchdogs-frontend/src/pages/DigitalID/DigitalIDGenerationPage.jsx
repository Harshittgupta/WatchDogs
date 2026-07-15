import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './DigitalIDGenerationPage.css';

const DigitalIDGenerationPage = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [step, setStep] = useState(1);
  const [hasDigitalId, setHasDigitalId] = useState(false);
  const [digitalId, setDigitalId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    personalInfo: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      dateOfBirth: '',
      gender: '',
      nationality: user?.nationality || '',
      photo: null
    },
    kycDocuments: [{
      documentType: 'passport',
      documentNumber: '',
      issuingCountry: '',
      issueDate: '',
      expiryDate: '',
      documentImage: null
    }],
    travelInfo: {
      entryPoint: '',
      entryType: 'airport',
      entryDate: new Date().toISOString().split('T')[0],
      exitDate: '',
      destinations: [''],
      purposeOfVisit: 'tourism',
      accommodation: ''
    },
    accessPin: ''
  });

  useEffect(() => {
    checkDigitalId();
  }, []);

  const checkDigitalId = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('🔍 Checking for existing digital ID...');
      
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/digital-id/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      console.log('Status response:', data);
      
      if (data.hasDigitalId) {
        // Fetch full digital ID
        const idResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/digital-id/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const idData = await idResponse.json();
        
        console.log('Digital ID data:', idData);
        
        if (idData.success) {
          setDigitalId(idData.digitalId);
          setHasDigitalId(true);
          
          // Update user context with digitalId reference
          if (updateUser && user) {
            updateUser({
              ...user,
              digitalId: idData.digitalId._id
            });
          }
        }
      }
    } catch (error) {
      console.error('Error checking digital ID:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
    // Clear error for this field
    setErrors(prev => ({
      ...prev,
      [`${section}.${field}`]: null
    }));
  };

  const handleDocumentChange = (index, field, value) => {
    const newDocs = [...formData.kycDocuments];
    newDocs[index] = { ...newDocs[index], [field]: value };
    setFormData(prev => ({...prev, kycDocuments: newDocs }));
    // Clear error for this field
    setErrors(prev => ({
      ...prev,
      [`kycDocuments[${index}].${field}`]: null
    }));
  };

  const handleFileUpload = async (file, section, field, index = 0) => {
    console.log('🔍 handleFileUpload called');
    console.log('File:', file);
    console.log('Section:', section);
    console.log('Field:', field);
    console.log('Index:', index);
    
    if (!file) {
      console.log('❌ No file selected');
      alert('Please select a file');
      return;
    }
    
    console.log('File details:');
    console.log('- Name:', file.name);
    console.log('- Size:', file.size, 'bytes');
    console.log('- Type:', file.type);
    
    // Validate file size (max 10MB for PDFs, 5MB for images)
    const maxSize = file.type === 'application/pdf' ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
    const maxSizeMB = file.type === 'application/pdf' ? '10MB' : '5MB';
    
    if (file.size > maxSize) {
      console.log('❌ File too large');
      setErrors(prev => ({
        ...prev,
        [`${section}.${field}`]: `File size must be less than ${maxSizeMB}`
      }));
      alert(`File is too large. Maximum size is ${maxSizeMB}`);
      return;
    }

    // Validate file type (images and PDFs)
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      console.log('❌ Invalid file type:', file.type);
      setErrors(prev => ({
        ...prev,
        [`${section}.${field}`]: 'Only images (JPG, PNG, GIF, WebP) and PDF files are allowed'
      }));
      alert('Invalid file type. Please upload an image or PDF file.');
      return;
    }

    console.log('✅ File validation passed, converting to base64...');

    // Convert to base64
    const reader = new FileReader();
    
    reader.onloadend = () => {
      console.log('✅ File converted to base64');
      console.log('Base64 length:', reader.result?.length);
      console.log('Data URL prefix:', reader.result?.substring(0, 50));
      
      if (section === 'personalInfo') {
        setFormData(prev => ({
          ...prev,
          personalInfo: { ...prev.personalInfo, [field]: reader.result }
        }));
        console.log('✅ Photo saved to personalInfo');
      } else if (section === 'kycDocuments') {
        const newDocs = [...formData.kycDocuments];
        newDocs[index] = { ...newDocs[index], [field]: reader.result };
        setFormData(prev => ({ ...prev, kycDocuments: newDocs }));
        console.log(`✅ Document image saved to kycDocuments[${index}]`);
      }
      
      // Clear error
      setErrors(prev => ({
        ...prev,
        [`${section}.${field}`]: null
      }));
      
      alert('✅ File uploaded successfully!');
    };
    
    reader.onerror = () => {
      console.log('❌ Failed to read file');
      setErrors(prev => ({
        ...prev,
        [`${section}.${field}`]: 'Failed to read file'
      }));
      alert('Failed to read file. Please try again.');
    };
    
    reader.readAsDataURL(file);
  };

  // Validation function for each step
  const validateStep = (currentStep) => {
    const newErrors = {};

    if (currentStep === 1) {
      // Validate personal info
      if (!formData.personalInfo.firstName.trim()) {
        newErrors['personalInfo.firstName'] = 'First name is required';
      }
      if (!formData.personalInfo.lastName.trim()) {
        newErrors['personalInfo.lastName'] = 'Last name is required';
      }
      if (!formData.personalInfo.dateOfBirth) {
        newErrors['personalInfo.dateOfBirth'] = 'Date of birth is required';
      } else {
        // Validate age (must be at least 18 years old)
        const dob = new Date(formData.personalInfo.dateOfBirth);
        const today = new Date();
        const age = today.getFullYear() - dob.getFullYear();
        if (age < 18) {
          newErrors['personalInfo.dateOfBirth'] = 'You must be at least 18 years old';
        }
        if (dob > today) {
          newErrors['personalInfo.dateOfBirth'] = 'Date of birth cannot be in the future';
        }
      }
      if (!formData.personalInfo.gender) {
        newErrors['personalInfo.gender'] = 'Gender is required';
      }
      if (!formData.personalInfo.nationality.trim()) {
        newErrors['personalInfo.nationality'] = 'Nationality is required';
      }
    }

    if (currentStep === 2) {
      // Validate KYC documents
      if (!formData.kycDocuments[0].documentNumber.trim()) {
        newErrors['kycDocuments[0].documentNumber'] = 'Document number is required';
      }
      if (!formData.kycDocuments[0].issuingCountry.trim()) {
        newErrors['kycDocuments[0].issuingCountry'] = 'Issuing country is required';
      }
      if (!formData.kycDocuments[0].expiryDate) {
        newErrors['kycDocuments[0].expiryDate'] = 'Expiry date is required';
      } else {
        // Validate expiry date is in the future
        const expiry = new Date(formData.kycDocuments[0].expiryDate);
        if (expiry < new Date()) {
          newErrors['kycDocuments[0].expiryDate'] = 'Document has expired';
        }
      }
      // Validate issue date is before expiry date
      if (formData.kycDocuments[0].issueDate && formData.kycDocuments[0].expiryDate) {
        const issue = new Date(formData.kycDocuments[0].issueDate);
        const expiry = new Date(formData.kycDocuments[0].expiryDate);
        if (issue >= expiry) {
          newErrors['kycDocuments[0].issueDate'] = 'Issue date must be before expiry date';
        }
      }
    }

    if (currentStep === 4) {
      // Validate PIN
      if (!formData.accessPin) {
        newErrors['accessPin'] = '6-digit PIN is required';
      } else if (!/^\d{6}$/.test(formData.accessPin)) {
        newErrors['accessPin'] = 'PIN must be exactly 6 digits';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    console.log('🔄 Moving to next step from step', step);
    if (validateStep(step)) {
      setStep(step + 1);
      console.log('✅ Validation passed, moving to step', step + 1);
    } else {
      console.log('❌ Validation failed');
      alert('Please fix the errors before proceeding');
    }
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    console.log('📤 Submitting Digital ID...');
    
    // Final validation
    if (!validateStep(4)) {
      alert('Please fix the errors before submitting');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Prepare the data - ensure all required fields are present
      const submitData = {
        personalInfo: {
          firstName: formData.personalInfo.firstName.trim(),
          lastName: formData.personalInfo.lastName.trim(),
          dateOfBirth: formData.personalInfo.dateOfBirth,
          gender: formData.personalInfo.gender,
          nationality: formData.personalInfo.nationality.trim(),
          ...(formData.personalInfo.photo && { photo: formData.personalInfo.photo })
        },
        kycDocuments: formData.kycDocuments.map(doc => ({
          documentType: doc.documentType,
          documentNumber: doc.documentNumber.trim(),
          issuingCountry: doc.issuingCountry.trim(),
          ...(doc.issueDate && { issueDate: doc.issueDate }),
          ...(doc.expiryDate && { expiryDate: doc.expiryDate }),
          ...(doc.documentImage && { documentImage: doc.documentImage })
        })),
        travelInfo: {
          ...(formData.travelInfo.entryPoint && { entryPoint: formData.travelInfo.entryPoint }),
          entryType: formData.travelInfo.entryType,
          ...(formData.travelInfo.entryDate && { entryDate: formData.travelInfo.entryDate }),
          ...(formData.travelInfo.exitDate && { exitDate: formData.travelInfo.exitDate }),
          destinations: formData.travelInfo.destinations.filter(d => d.trim()),
          purposeOfVisit: formData.travelInfo.purposeOfVisit,
          ...(formData.travelInfo.accommodation && { accommodation: formData.travelInfo.accommodation })
        },
        accessPin: formData.accessPin
      };

      console.log('Submitting data:', JSON.stringify(submitData, null, 2));

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/digital-id/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(submitData)
      });

      const data = await response.json();
      
      console.log('Response:', data);
      
      if (response.ok && data.success) {
        console.log('✅ Digital ID generated successfully!');
        setDigitalId(data.digitalId);
        setHasDigitalId(true);
        
        // Update user context
        if (updateUser && user) {
          updateUser({
            ...user,
            digitalId: data.digitalId._id
          });
        }
        
        alert('✅ Digital ID generated successfully!');
      } else {
        // Show detailed error message
        console.error('Error response:', data);
        let errorMessage = data.message || 'Error generating Digital ID';
        
        if (data.error) {
          errorMessage += `\n\nDetails: ${data.error}`;
        }
        
        if (data.errors && Array.isArray(data.errors)) {
          errorMessage += '\n\nErrors:\n' + data.errors.map(e => `- ${e.field}: ${e.message}`).join('\n');
        }
        
        if (data.requiredFields) {
          errorMessage += '\n\nRequired fields: ' + data.requiredFields.join(', ');
        }
        
        alert(errorMessage);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Failed to generate Digital ID. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateInformation = () => {
    console.log('✏️ Entering edit mode...');
    
    // Pre-fill form with existing data
    if (digitalId) {
      setFormData({
        personalInfo: digitalId.personalInfo || formData.personalInfo,
        kycDocuments: digitalId.kycDocuments?.length > 0 ? digitalId.kycDocuments : formData.kycDocuments,
        travelInfo: digitalId.travelInfo || formData.travelInfo,
        accessPin: '' // Don't pre-fill PIN for security
      });
    }
    
    // Switch to edit mode
    setHasDigitalId(false);
    setStep(1);
  };

  const downloadQR = () => {
    if (!digitalId?.qrCode) {
      alert('QR code not available');
      return;
    }
    
    try {
      const link = document.createElement('a');
      link.href = digitalId.qrCode;
      link.download = `watchdogs-digital-id-${digitalId.idNumber}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      console.log('✅ QR code downloaded');
    } catch (error) {
      console.error('Error downloading QR:', error);
      alert('Failed to download QR code');
    }
  };

  if (loading) {
    return (
      <div className="digital-id-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Display existing Digital ID
  if (hasDigitalId && digitalId) {
    return (
      <div className="digital-id-page">
        <div className="digital-id-card">
          <div className="card-header">
            <h1>🆔 WatchDogs Digital ID</h1>
            <span className={`status-badge status-${digitalId.verificationStatus}`}>
              {digitalId.verificationStatus}
            </span>
          </div>

          <div className="id-info">
            <h2>{digitalId.personalInfo.firstName} {digitalId.personalInfo.lastName}</h2>
            <p className="id-number">ID: {digitalId.idNumber}</p>
          </div>

          <div className="verification-progress">
            <h3>Verification Progress</h3>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${digitalId.verificationPercentage || 0}%` }}
              ></div>
            </div>
          </div>

          <div className="id-sections">
            <div className="id-section">
              <h3>📋 KYC Documents</h3>
              {digitalId.kycDocuments?.length > 0 ? (
                <p>✅ {digitalId.kycDocuments.length} document(s) uploaded</p>
              ) : (
                <p>⚠️ No documents uploaded</p>
              )}
            </div>

            <div className="id-section">
              <h3>✈️ Travel Information</h3>
              {digitalId.travelInfo?.entryPoint ? (
                <p>✅ Travel info completed</p>
              ) : (
                <p>⚠️ Travel info incomplete</p>
              )}
            </div>
          </div>

          <div className="usage-stats">
            <h3>📊 Usage Statistics</h3>
            <div className="stats-grid">
              <div className="stat">
                <span className="stat-value">{digitalId.usageCount || 0}</span>
                <span className="stat-label">TIMES USED</span>
              </div>
              <div className="stat">
                <span className="stat-value">{digitalId.lastUsed ? 'Never' : new Date(digitalId.lastUsed).toLocaleDateString()}</span>
                <span className="stat-label">LAST USED</span>
              </div>
              <div className="stat">
                <span className="stat-value">{new Date(digitalId.expiresAt).toLocaleDateString()}</span>
                <span className="stat-label">EXPIRES ON</span>
              </div>
            </div>
          </div>

          {digitalId.qrCode && (
            <div className="qr-section">
              <h3>QR Code</h3>
              <div className="qr-code">
                <img src={digitalId.qrCode} alt="QR Code" />
              </div>
              <button onClick={downloadQR} className="btn-download">
                📥 Download QR
              </button>
            </div>
          )}

          <div className="card-actions">
            <button onClick={() => navigate('/dashboard')} className="btn-secondary">
              Back to Dashboard
            </button>
            <button onClick={handleUpdateInformation} className="btn-primary">
              ✏️ Update Information
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Digital ID Creation Form
  return (
    <div className="digital-id-page">
      <div className="form-container">
        <div className="form-header">
          <h1>Generate Digital ID</h1>
          <div className="step-indicator">
            <span className={step >= 1 ? 'active' : ''}>1</span>
            <span className={step >= 2 ? 'active' : ''}>2</span>
            <span className={step >= 3 ? 'active' : ''}>3</span>
            <span className={step >= 4 ? 'active' : ''}>4</span>
          </div>
        </div>

        {/* Step 1: Personal Information */}
        {step === 1 && (
          <div className="form-step">
            <h2>Personal Information</h2>
            
            <div className="form-group">
              <label>Profile Photo (Optional)</label>
              <div className="file-upload-area">
                <button 
                  type="button"
                  className="upload-btn"
                  onClick={() => document.getElementById('photo-input').click()}
                >
                  📷 Upload Photo
                </button>
                <input
                  id="photo-input"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      console.log('📷 Photo selected:', file.name);
                      handleFileUpload(file, 'personalInfo', 'photo');
                    }
                  }}
                  style={{ display: 'none' }}
                />
                <small>JPG, PNG, GIF or WebP (Max 5MB)</small>
              </div>
              {formData.personalInfo.photo && (
                <div className="file-preview">
                  <img src={formData.personalInfo.photo} alt="Preview" />
                  <button onClick={() => handleInputChange('personalInfo', 'photo', null)}>
                    ❌ Remove
                  </button>
                </div>
              )}
              {errors['personalInfo.photo'] && (
                <span className="error">{errors['personalInfo.photo']}</span>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>First Name *</label>
                <input
                  type="text"
                  value={formData.personalInfo.firstName}
                  onChange={(e) => handleInputChange('personalInfo', 'firstName', e.target.value)}
                  placeholder="Enter first name"
                />
                {errors['personalInfo.firstName'] && (
                  <span className="error">{errors['personalInfo.firstName']}</span>
                )}
              </div>

              <div className="form-group">
                <label>Last Name *</label>
                <input
                  type="text"
                  value={formData.personalInfo.lastName}
                  onChange={(e) => handleInputChange('personalInfo', 'lastName', e.target.value)}
                  placeholder="Enter last name"
                />
                {errors['personalInfo.lastName'] && (
                  <span className="error">{errors['personalInfo.lastName']}</span>
                )}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Date of Birth *</label>
                <input
                  type="date"
                  value={formData.personalInfo.dateOfBirth}
                  onChange={(e) => handleInputChange('personalInfo', 'dateOfBirth', e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                />
                {errors['personalInfo.dateOfBirth'] && (
                  <span className="error">{errors['personalInfo.dateOfBirth']}</span>
                )}
              </div>

              <div className="form-group">
                <label>Gender *</label>
                <select
                  value={formData.personalInfo.gender}
                  onChange={(e) => handleInputChange('personalInfo', 'gender', e.target.value)}
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
                {errors['personalInfo.gender'] && (
                  <span className="error">{errors['personalInfo.gender']}</span>
                )}
              </div>
            </div>

            <div className="form-group">
              <label>Nationality *</label>
              <input
                type="text"
                value={formData.personalInfo.nationality}
                onChange={(e) => handleInputChange('personalInfo', 'nationality', e.target.value)}
                placeholder="e.g., Indian, American"
              />
              {errors['personalInfo.nationality'] && (
                <span className="error">{errors['personalInfo.nationality']}</span>
              )}
            </div>

            <div className="form-actions">
              <button onClick={() => navigate('/dashboard')} className="btn-secondary">
                Cancel
              </button>
              <button onClick={handleNext} className="btn-primary">
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: KYC Documents */}
        {step === 2 && (
          <div className="form-step">
            <h2>KYC Documents</h2>
            
            <div className="form-group">
              <label>Document Type *</label>
              <select
                value={formData.kycDocuments[0].documentType}
                onChange={(e) => handleDocumentChange(0, 'documentType', e.target.value)}
              >
                <option value="passport">Passport</option>
                <option value="visa">Visa</option>
                <option value="national_id">National ID</option>
                <option value="driving_license">Driving License</option>
              </select>
            </div>

            <div className="form-group">
              <label>Document Number *</label>
              <input
                type="text"
                value={formData.kycDocuments[0].documentNumber}
                onChange={(e) => handleDocumentChange(0, 'documentNumber', e.target.value)}
                placeholder="Enter document number"
              />
              {errors['kycDocuments[0].documentNumber'] && (
                <span className="error">{errors['kycDocuments[0].documentNumber']}</span>
              )}
            </div>

            <div className="form-group">
              <label>Issuing Country *</label>
              <input
                type="text"
                value={formData.kycDocuments[0].issuingCountry}
                onChange={(e) => handleDocumentChange(0, 'issuingCountry', e.target.value)}
                placeholder="e.g., India, USA"
              />
              {errors['kycDocuments[0].issuingCountry'] && (
                <span className="error">{errors['kycDocuments[0].issuingCountry']}</span>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Issue Date</label>
                <input
                  type="date"
                  value={formData.kycDocuments[0].issueDate}
                  onChange={(e) => handleDocumentChange(0, 'issueDate', e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                />
                {errors['kycDocuments[0].issueDate'] && (
                  <span className="error">{errors['kycDocuments[0].issueDate']}</span>
                )}
              </div>

              <div className="form-group">
                <label>Expiry Date *</label>
                <input
                  type="date"
                  value={formData.kycDocuments[0].expiryDate}
                  onChange={(e) => handleDocumentChange(0, 'expiryDate', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
                {errors['kycDocuments[0].expiryDate'] && (
                  <span className="error">{errors['kycDocuments[0].expiryDate']}</span>
                )}
              </div>
            </div>

            <div className="form-group">
              <label>Document Image/PDF (Optional)</label>
              <div className="file-upload-area">
                <button 
                  type="button"
                  className="upload-btn"
                  onClick={() => document.getElementById('document-input').click()}
                >
                  📄 Upload Document
                </button>
                <input
                  id="document-input"
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      console.log('📄 Document selected:', file.name);
                      handleFileUpload(file, 'kycDocuments', 'documentImage', 0);
                    }
                  }}
                  style={{ display: 'none' }}
                />
                <small>JPG, PNG, PDF (Max 10MB)</small>
              </div>
              {formData.kycDocuments[0]?.documentImage && (
                <div className="file-preview">
                  {formData.kycDocuments[0].documentImage.startsWith('data:application/pdf') ? (
                    <div className="pdf-preview">
                      <span>📄 PDF Document Uploaded</span>
                    </div>
                  ) : (
                    <img src={formData.kycDocuments[0].documentImage} alt="Document" />
                  )}
                  <button onClick={() => handleDocumentChange(0, 'documentImage', null)}>
                    ❌ Remove
                  </button>
                </div>
              )}
              {errors['kycDocuments[0].documentImage'] && (
                <span className="error">{errors['kycDocuments[0].documentImage']}</span>
              )}
            </div>

            <div className="form-actions">
              <button onClick={handleBack} className="btn-secondary">
                ← Back
              </button>
              <button onClick={handleNext} className="btn-primary">
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Travel Information */}
        {step === 3 && (
          <div className="form-step">
            <h2>Travel Information</h2>
            
            <div className="form-group">
              <label>Entry Point</label>
              <input
                type="text"
                value={formData.travelInfo.entryPoint}
                onChange={(e) => handleInputChange('travelInfo', 'entryPoint', e.target.value)}
                placeholder="e.g., Mumbai International Airport"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Entry Type</label>
                <select
                  value={formData.travelInfo.entryType}
                  onChange={(e) => handleInputChange('travelInfo', 'entryType', e.target.value)}
                >
                  <option value="airport">Airport</option>
                  <option value="seaport">Seaport</option>
                  <option value="land_border">Land Border</option>
                </select>
              </div>

              <div className="form-group">
                <label>Purpose of Visit</label>
                <select
                  value={formData.travelInfo.purposeOfVisit}
                  onChange={(e) => handleInputChange('travelInfo', 'purposeOfVisit', e.target.value)}
                >
                  <option value="tourism">Tourism</option>
                  <option value="business">Business</option>
                  <option value="education">Education</option>
                  <option value="medical">Medical</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Entry Date</label>
                <input
                  type="date"
                  value={formData.travelInfo.entryDate}
                  onChange={(e) => handleInputChange('travelInfo', 'entryDate', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Exit Date</label>
                <input
                  type="date"
                  value={formData.travelInfo.exitDate}
                  onChange={(e) => handleInputChange('travelInfo', 'exitDate', e.target.value)}
                  min={formData.travelInfo.entryDate}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Accommodation</label>
              <input
                type="text"
                value={formData.travelInfo.accommodation}
                onChange={(e) => handleInputChange('travelInfo', 'accommodation', e.target.value)}
                placeholder="Hotel name or address"
              />
            </div>

            <div className="form-actions">
              <button onClick={handleBack} className="btn-secondary">
                ← Back
              </button>
              <button onClick={handleNext} className="btn-primary">
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Security */}
        {step === 4 && (
          <div className="form-step">
            <h2>Set Access PIN</h2>
            <p>Create a 6-digit PIN to secure your Digital ID</p>
            
            <div className="form-group">
              <label>6-Digit PIN *</label>
              <input
                type="password"
                maxLength="6"
                value={formData.accessPin}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  setFormData(prev => ({...prev, accessPin: value}));
                  setErrors(prev => ({...prev, accessPin: null}));
                }}
                placeholder="Enter 6-digit PIN"
              />
              {errors['accessPin'] && (
                <span className="error">{errors['accessPin']}</span>
              )}
            </div>

            <div className="form-actions">
              <button onClick={handleBack} className="btn-secondary">
                ← Back
              </button>
              <button 
                onClick={handleSubmit} 
                className="btn-primary"
                disabled={loading}
              >
                {loading ? 'Generating...' : '✅ Generate Digital ID'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DigitalIDGenerationPage;