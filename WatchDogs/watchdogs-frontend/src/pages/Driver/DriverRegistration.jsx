import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './DriverRegistration.css';

const DriverRegistration = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Basic Info, 2: Vehicle Info, 3: Documents
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    dateOfBirth: '',
    gender: '',
    vehicleType: '',
    vehicleMake: '',
    vehicleModel: '',
    vehicleYear: '',
    vehicleColor: '',
    registrationNumber: ''
  });

  const [loading, setLoading] = useState(false);
  const [registeredDriver, setRegisteredDriver] = useState(null);

  const [documents, setDocuments] = useState({
    drivingLicenseFront: null,
    drivingLicenseBack: null,
    aadhaarFront: null,
    aadhaarBack: null,
    panCard: null,
    vehicleRC: null,
    insurance: null,
    vehicleFront: null,
    vehicleBack: null
  });

  const [documentDetails, setDocumentDetails] = useState({
    drivingLicenseNumber: '',
    drivingLicenseExpiry: '',
    aadhaarNumber: '',
    panNumber: '',
    vehicleRCNumber: '',
    insurancePolicyNumber: '',
    insuranceExpiry: ''
  });

  const vehicleTypes = [
    { id: 'bike', name: 'Bike', icon: '🏍️' },
    { id: 'auto', name: 'Auto', icon: '🛺' },
    { id: 'mini', name: 'Mini Car', icon: '🚗' },
    { id: 'sedan', name: 'Sedan', icon: '🚙' },
    { id: 'suv', name: 'SUV', icon: '🚐' }
  ];

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleDocumentDetailsChange = (e) => {
    setDocumentDetails({
      ...documentDetails,
      [e.target.name]: e.target.value
    });
  };

  const handleFileChange = (e, documentType) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size should be less than 5MB');
        return;
      }
      setDocuments({
        ...documents,
        [documentType]: file
      });
    }
  };

  const handleRegister = async () => {
    // Validation
    if (!formData.firstName || !formData.lastName || !formData.email || 
        !formData.phone || !formData.password) {
      alert('❌ Please fill all required fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      alert('❌ Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      alert('❌ Password must be at least 6 characters');
      return;
    }

    if (!/^[0-9]{10}$/.test(formData.phone)) {
      alert('❌ Please enter a valid 10-digit phone number');
      return;
    }

    if (!formData.vehicleType || !formData.vehicleMake || !formData.registrationNumber) {
      alert('❌ Please fill all vehicle details');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/driver/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        alert('✅ Registration successful! Please upload documents.');
        setRegisteredDriver(data.driver);
        localStorage.setItem('driverToken', data.token);
        setStep(3); // Go directly to documents upload (skip OTP)
      } else {
        alert('❌ Registration failed: ' + data.message);
      }
    } catch (error) {
      console.error('Registration error:', error);
      alert('❌ Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadDocuments = async () => {
    // Validate required documents
    if (!documents.drivingLicenseFront || !documents.drivingLicenseBack ||
        !documents.aadhaarFront || !documents.panCard || !documents.vehicleRC ||
        !documents.insurance) {
      alert('❌ Please upload all required documents');
      return;
    }

    setLoading(true);

    try {
      const formDataToSend = new FormData();

      // Append files
      Object.keys(documents).forEach(key => {
        if (documents[key]) {
          formDataToSend.append(key, documents[key]);
        }
      });

      // Append document details
      Object.keys(documentDetails).forEach(key => {
        if (documentDetails[key]) {
          formDataToSend.append(key, documentDetails[key]);
        }
      });

      const token = localStorage.getItem('driverToken');

      const response = await fetch('http://localhost:5000/api/driver/auth/upload-documents', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      });

      const data = await response.json();

      if (data.success) {
        alert('✅ Documents uploaded successfully! Your account is under review.');
        navigate('/driver/dashboard');
      } else {
        alert('❌ Document upload failed: ' + data.message);
      }
    } catch (error) {
      console.error('Document upload error:', error);
      alert('❌ Document upload failed');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="registration-step">
      <h2>👤 Personal Information</h2>

      <div className="form-row">
        <div className="form-group">
          <label>First Name *</label>
          <input
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={handleInputChange}
            placeholder="Enter first name"
          />
        </div>

        <div className="form-group">
          <label>Last Name *</label>
          <input
            type="text"
            name="lastName"
            value={formData.lastName}
            onChange={handleInputChange}
            placeholder="Enter last name"
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Email *</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="Enter email address"
          />
        </div>

        <div className="form-group">
          <label>Phone Number *</label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            placeholder="10-digit mobile number"
            maxLength="10"
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Date of Birth *</label>
          <input
            type="date"
            name="dateOfBirth"
            value={formData.dateOfBirth}
            onChange={handleInputChange}
          />
        </div>

        <div className="form-group">
          <label>Gender *</label>
          <select
            name="gender"
            value={formData.gender}
            onChange={handleInputChange}
          >
            <option value="">Select gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Password *</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            placeholder="Minimum 6 characters"
          />
        </div>

        <div className="form-group">
          <label>Confirm Password *</label>
          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            placeholder="Re-enter password"
          />
        </div>
      </div>

      <button className="btn-primary full-width" onClick={() => setStep(2)}>
        Next: Vehicle Details →
      </button>
    </div>
  );

  const renderStep2 = () => (
    <div className="registration-step">
      <button className="back-btn" onClick={() => setStep(1)}>
        ← Back
      </button>

      <h2>🚗 Vehicle Information</h2>

      <div className="form-group">
        <label>Vehicle Type *</label>
        <div className="vehicle-type-grid">
          {vehicleTypes.map(type => (
            <div
              key={type.id}
              className={`vehicle-type-card ${formData.vehicleType === type.id ? 'selected' : ''}`}
              onClick={() => setFormData({ ...formData, vehicleType: type.id })}
            >
              <span className="vehicle-icon">{type.icon}</span>
              <span className="vehicle-name">{type.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Vehicle Make *</label>
          <input
            type="text"
            name="vehicleMake"
            value={formData.vehicleMake}
            onChange={handleInputChange}
            placeholder="e.g., Honda, Toyota"
          />
        </div>

        <div className="form-group">
          <label>Vehicle Model *</label>
          <input
            type="text"
            name="vehicleModel"
            value={formData.vehicleModel}
            onChange={handleInputChange}
            placeholder="e.g., City, Innova"
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Manufacturing Year *</label>
          <input
            type="number"
            name="vehicleYear"
            value={formData.vehicleYear}
            onChange={handleInputChange}
            placeholder="e.g., 2020"
            min="2000"
            max={new Date().getFullYear() + 1}
          />
        </div>

        <div className="form-group">
          <label>Vehicle Color *</label>
          <input
            type="text"
            name="vehicleColor"
            value={formData.vehicleColor}
            onChange={handleInputChange}
            placeholder="e.g., White, Black"
          />
        </div>
      </div>

      <div className="form-group">
        <label>Registration Number *</label>
        <input
          type="text"
          name="registrationNumber"
          value={formData.registrationNumber}
          onChange={handleInputChange}
          placeholder="e.g., MH01AB1234"
          style={{ textTransform: 'uppercase' }}
        />
      </div>

      <button 
        className="btn-primary full-width" 
        onClick={handleRegister}
        disabled={loading}
      >
        {loading ? 'Registering...' : 'Register & Continue →'}
      </button>
    </div>
  );

  const renderStep3 = () => (
    <div className="registration-step">
      <h2>📄 Upload Documents</h2>
      <p className="step-description">
        Please upload clear photos of your documents. All documents are required for verification.
      </p>

      <div className="documents-section">
        <h3>🪪 Driving License</h3>
        <div className="form-row">
          <div className="form-group">
            <label>License Number *</label>
            <input
              type="text"
              name="drivingLicenseNumber"
              value={documentDetails.drivingLicenseNumber}
              onChange={handleDocumentDetailsChange}
              placeholder="DL Number"
            />
          </div>
          <div className="form-group">
            <label>Expiry Date *</label>
            <input
              type="date"
              name="drivingLicenseExpiry"
              value={documentDetails.drivingLicenseExpiry}
              onChange={handleDocumentDetailsChange}
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Front Side *</label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => handleFileChange(e, 'drivingLicenseFront')}
            />
            {documents.drivingLicenseFront && (
              <span className="file-name">✅ {documents.drivingLicenseFront.name}</span>
            )}
          </div>
          <div className="form-group">
            <label>Back Side *</label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => handleFileChange(e, 'drivingLicenseBack')}
            />
            {documents.drivingLicenseBack && (
              <span className="file-name">✅ {documents.drivingLicenseBack.name}</span>
            )}
          </div>
        </div>
      </div>

      <div className="documents-section">
        <h3>🪪 Aadhaar Card</h3>
        <div className="form-group">
          <label>Aadhaar Number *</label>
          <input
            type="text"
            name="aadhaarNumber"
            value={documentDetails.aadhaarNumber}
            onChange={handleDocumentDetailsChange}
            placeholder="1234-5678-9012"
            maxLength="14"
          />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Front Side *</label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => handleFileChange(e, 'aadhaarFront')}
            />
            {documents.aadhaarFront && (
              <span className="file-name">✅ {documents.aadhaarFront.name}</span>
            )}
          </div>
          <div className="form-group">
            <label>Back Side</label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => handleFileChange(e, 'aadhaarBack')}
            />
            {documents.aadhaarBack && (
              <span className="file-name">✅ {documents.aadhaarBack.name}</span>
            )}
          </div>
        </div>
      </div>

      <div className="documents-section">
        <h3>💳 PAN Card</h3>
        <div className="form-group">
          <label>PAN Number *</label>
          <input
            type="text"
            name="panNumber"
            value={documentDetails.panNumber}
            onChange={handleDocumentDetailsChange}
            placeholder="ABCDE1234F"
            maxLength="10"
            style={{ textTransform: 'uppercase' }}
          />
        </div>
        <div className="form-group">
          <label>PAN Card Image *</label>
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={(e) => handleFileChange(e, 'panCard')}
          />
          {documents.panCard && (
            <span className="file-name">✅ {documents.panCard.name}</span>
          )}
        </div>
      </div>

      <div className="documents-section">
        <h3>🚗 Vehicle Documents</h3>
        <div className="form-group">
          <label>RC Number *</label>
          <input
            type="text"
            name="vehicleRCNumber"
            value={documentDetails.vehicleRCNumber}
            onChange={handleDocumentDetailsChange}
            placeholder="Vehicle RC Number"
          />
        </div>
        <div className="form-group">
          <label>Registration Certificate (RC) *</label>
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={(e) => handleFileChange(e, 'vehicleRC')}
          />
          {documents.vehicleRC && (
            <span className="file-name">✅ {documents.vehicleRC.name}</span>
          )}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Insurance Policy Number *</label>
            <input
              type="text"
              name="insurancePolicyNumber"
              value={documentDetails.insurancePolicyNumber}
              onChange={handleDocumentDetailsChange}
              placeholder="Insurance Policy No."
            />
          </div>
          <div className="form-group">
            <label>Insurance Expiry *</label>
            <input
              type="date"
              name="insuranceExpiry"
              value={documentDetails.insuranceExpiry}
              onChange={handleDocumentDetailsChange}
            />
          </div>
        </div>
        <div className="form-group">
          <label>Insurance Certificate *</label>
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={(e) => handleFileChange(e, 'insurance')}
          />
          {documents.insurance && (
            <span className="file-name">✅ {documents.insurance.name}</span>
          )}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Vehicle Photo (Front)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(e, 'vehicleFront')}
            />
            {documents.vehicleFront && (
              <span className="file-name">✅ {documents.vehicleFront.name}</span>
            )}
          </div>
          <div className="form-group">
            <label>Vehicle Photo (Back)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(e, 'vehicleBack')}
            />
            {documents.vehicleBack && (
              <span className="file-name">✅ {documents.vehicleBack.name}</span>
            )}
          </div>
        </div>
      </div>

      <button 
        className="btn-primary full-width" 
        onClick={handleUploadDocuments}
        disabled={loading}
      >
        {loading ? 'Uploading...' : '✅ Submit Documents'}
      </button>
    </div>
  );

  return (
    <div className="driver-registration">
      <div className="registration-header">
        <h1>🚕 Join WatchDogs as a Driver</h1>
        <p>Start earning by driving with us</p>
      </div>

      <div className="step-indicator">
        <div className={`step ${step >= 1 ? 'active' : ''}`}>
          <span className="step-number">1</span>
          <span className="step-label">Personal Info</span>
        </div>
        <div className={`step ${step >= 2 ? 'active' : ''}`}>
          <span className="step-number">2</span>
          <span className="step-label">Vehicle Info</span>
        </div>
        <div className={`step ${step >= 3 ? 'active' : ''}`}>
          <span className="step-number">3</span>
          <span className="step-label">Documents</span>
        </div>
      </div>

      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
    </div>
  );
};

export default DriverRegistration;