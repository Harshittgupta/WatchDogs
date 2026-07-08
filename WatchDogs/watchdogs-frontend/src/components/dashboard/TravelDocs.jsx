import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import './TravelDocs.css';

const TravelDocs = () => {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('documents');
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  
  const [uploadData, setUploadData] = useState({
    documentType: 'passport',
    documentName: '',
    documentNumber: '',
    issueCountry: '',
    issueDate: '',
    expiryDate: '',
    provider: '',
    notes: '',
    file: null
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, [filter]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      console.log('📥 Loading documents with filter:', filter);
      
      const queryParams = filter !== 'all' ? `?documentType=${filter}` : '';
      
      const response = await fetch(`http://localhost:5000/api/documents/list${queryParams}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      console.log('✅ Documents loaded:', data);
      
      if (data.success) {
        setDocuments(data.documents || []);
      } else {
        console.error('Failed to load documents:', data.message);
        alert('Failed to load documents: ' + data.message);
      }
    } catch (error) {
      console.error('❌ Error loading documents:', error);
      alert('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    console.log('📄 File selected:', file.name, file.type, file.size);

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert('❌ File size must be less than 5MB');
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      alert('❌ Only JPG, PNG, and PDF files are allowed');
      return;
    }

    setUploadData(prev => ({ ...prev, file }));
    console.log('✅ File ready for upload');
  };

  const handleUploadChange = (e) => {
    const { name, value } = e.target;
    setUploadData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleUploadDocument = async (e) => {
    e.preventDefault();

    console.log('📤 Uploading document:', uploadData);

    if (!uploadData.file) {
      alert('❌ Please select a file');
      return;
    }

    if (!uploadData.documentName.trim()) {
      alert('❌ Please enter document name');
      return;
    }

    setUploading(true);

    try {
      const token = localStorage.getItem('token');
      
      // Create FormData
      const formData = new FormData();
      formData.append('document', uploadData.file);
      formData.append('documentType', uploadData.documentType);
      formData.append('documentName', uploadData.documentName.trim());
      
      if (uploadData.documentNumber) formData.append('documentNumber', uploadData.documentNumber);
      if (uploadData.issueCountry) formData.append('issueCountry', uploadData.issueCountry);
      if (uploadData.issueDate) formData.append('issueDate', uploadData.issueDate);
      if (uploadData.expiryDate) formData.append('expiryDate', uploadData.expiryDate);
      if (uploadData.provider) formData.append('provider', uploadData.provider);
      if (uploadData.notes) formData.append('notes', uploadData.notes);

      console.log('Uploading to server...');

      const response = await fetch('http://localhost:5000/api/documents/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      console.log('Response:', data);

      if (data.success) {
        console.log('✅ Document uploaded successfully');
        alert('✅ Document uploaded successfully!');

        // Reset form
        setUploadData({
          documentType: 'passport',
          documentName: '',
          documentNumber: '',
          issueCountry: '',
          issueDate: '',
          expiryDate: '',
          provider: '',
          notes: '',
          file: null
        });

        // Clear file input
        const fileInput = document.getElementById('file-input');
        if (fileInput) fileInput.value = '';

        setShowUploadModal(false);
        loadDocuments();
      } else {
        console.error('Upload failed:', data.message);
        alert('❌ Failed to upload document: ' + data.message);
      }
    } catch (error) {
      console.error('❌ Error uploading document:', error);
      alert('Failed to upload document. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleViewDocument = async (doc) => {
    try {
      console.log('👁️ Viewing document:', doc.id);
      
      const token = localStorage.getItem('token');
      
      const response = await fetch(`http://localhost:5000/api/documents/${doc.id}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSelectedDoc(data.document);
        setShowViewModal(true);
      } else {
        alert('Failed to load document details');
      }
    } catch (error) {
      console.error('❌ Error viewing document:', error);
      alert('Failed to view document');
    }
  };

  const handleDownloadDocument = async (docId, fileName) => {
    try {
      console.log('⬇️ Downloading document:', docId);
      
      const token = localStorage.getItem('token');
      
      const response = await fetch(`http://localhost:5000/api/documents/${docId}/download`, {
        headers: { 
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        console.log('✅ Document downloaded');
        alert('✅ Document downloaded successfully!');
      } else {
        alert('Failed to download document');
      }
    } catch (error) {
      console.error('❌ Error downloading document:', error);
      alert('Failed to download document');
    }
  };

  const handleDeleteDocument = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      return;
    }

    try {
      console.log('🗑️ Deleting document:', docId);
      
      const token = localStorage.getItem('token');
      
      const response = await fetch(`http://localhost:5000/api/documents/${docId}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Document deleted');
        alert('✅ Document deleted successfully!');
        setDocuments(prev => prev.filter(doc => doc.id !== docId));
        setShowViewModal(false);
      } else {
        alert('Failed to delete document: ' + data.message);
      }
    } catch (error) {
      console.error('❌ Error deleting document:', error);
      alert('Failed to delete document');
    }
  };

  const getDocumentIcon = (type) => {
    const icons = {
      passport: '🛂',
      visa: '✈️',
      insurance: '🏥',
      vaccination: '💉',
      id: '🆔',
      other: '📄'
    };
    return icons[type] || '📄';
  };

  const getStatusColor = (status) => {
    const colors = {
      valid: '#10b981',
      'expiring-soon': '#f59e0b',
      expired: '#ef4444',
      unknown: '#6b7280'
    };
    return colors[status] || '#6b7280';
  };

  const getStatusText = (status) => {
    const texts = {
      valid: '✅ Valid',
      'expiring-soon': '⚠️ Expiring Soon',
      expired: '❌ Expired',
      unknown: '❓ Unknown'
    };
    return texts[status] || 'Unknown';
  };

  const renderDocuments = () => (
    <div className="documents-container">
      <div className="documents-header">
        <h3>📁 My Documents</h3>
        <button 
          className="upload-btn"
          onClick={() => setShowUploadModal(true)}
        >
          ➕ Upload Document
        </button>
      </div>

      <div className="filter-bar">
        {['all', 'passport', 'visa', 'insurance', 'vaccination', 'id', 'other'].map(type => (
          <button
            key={type}
            className={`filter-btn ${filter === type ? 'active' : ''}`}
            onClick={() => setFilter(type)}
          >
            {getDocumentIcon(type)} {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading documents...</p>
        </div>
      ) : documents.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <h3>No documents found</h3>
          <p>Upload your first document to get started</p>
          <button
            className="upload-btn-large"
            onClick={() => setShowUploadModal(true)}
          >
            ➕ Upload Document
          </button>
        </div>
      ) : (
        <div className="documents-grid">
          {documents.map(doc => (
            <div 
              key={doc.id} 
              className="document-card"
              onClick={() => handleViewDocument(doc)}
            >
              <div className="doc-icon-large">
                {getDocumentIcon(doc.documentType)}
              </div>
              
              <div className="doc-info">
                <h4>{doc.documentName}</h4>
                {doc.documentNumber && (
                  <p className="doc-number">#{doc.documentNumber}</p>
                )}
                {doc.issueCountry && (
                  <p className="doc-country">🌍 {doc.issueCountry}</p>
                )}
              </div>

              {doc.expiryDate && (
                <div 
                  className="doc-status"
                  style={{ background: getStatusColor(doc.status) + '20', color: getStatusColor(doc.status) }}
                >
                  {getStatusText(doc.status)}
                  {doc.daysToExpiry !== null && doc.daysToExpiry >= 0 && (
                    <span className="days-left">
                      {doc.daysToExpiry} days left
                    </span>
                  )}
                </div>
              )}

              <div className="doc-footer">
                <small>Uploaded {new Date(doc.createdAt).toLocaleDateString()}</small>
              </div>

              <div className="doc-actions" onClick={(e) => e.stopPropagation()}>
                <button
                  className="action-icon-btn"
                  onClick={() => handleDownloadDocument(doc.id, doc.fileName)}
                  title="Download"
                >
                  ⬇️
                </button>
                <button
                  className="action-icon-btn delete"
                  onClick={() => handleDeleteDocument(doc.id)}
                  title="Delete"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderUploadModal = () => {
    if (!showUploadModal) return null;

    return (
      <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <button className="modal-close" onClick={() => setShowUploadModal(false)}>
            ×
          </button>

          <h2>📤 Upload Document</h2>

          <form onSubmit={handleUploadDocument} className="upload-form">
            <div className="form-group">
              <label>Document Type *</label>
              <select
                name="documentType"
                value={uploadData.documentType}
                onChange={handleUploadChange}
                required
              >
                <option value="passport">🛂 Passport</option>
                <option value="visa">✈️ Visa</option>
                <option value="insurance">🏥 Insurance</option>
                <option value="vaccination">💉 Vaccination Certificate</option>
                <option value="id">🆔 National ID</option>
                <option value="other">📄 Other</option>
              </select>
            </div>

            <div className="form-group">
              <label>Document Name *</label>
              <input
                type="text"
                name="documentName"
                value={uploadData.documentName}
                onChange={handleUploadChange}
                placeholder="e.g., Indian Passport, US Visa"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Document Number</label>
                <input
                  type="text"
                  name="documentNumber"
                  value={uploadData.documentNumber}
                  onChange={handleUploadChange}
                  placeholder="e.g., A1234567"
                />
              </div>

              <div className="form-group">
                <label>Issue Country</label>
                <input
                  type="text"
                  name="issueCountry"
                  value={uploadData.issueCountry}
                  onChange={handleUploadChange}
                  placeholder="e.g., India"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Issue Date</label>
                <input
                  type="date"
                  name="issueDate"
                  value={uploadData.issueDate}
                  onChange={handleUploadChange}
                />
              </div>

              <div className="form-group">
                <label>Expiry Date</label>
                <input
                  type="date"
                  name="expiryDate"
                  value={uploadData.expiryDate}
                  onChange={handleUploadChange}
                />
              </div>
            </div>

            {uploadData.documentType === 'insurance' && (
              <div className="form-group">
                <label>Provider</label>
                <input
                  type="text"
                  name="provider"
                  value={uploadData.provider}
                  onChange={handleUploadChange}
                  placeholder="e.g., ICICI Lombard"
                />
              </div>
            )}

            <div className="form-group">
              <label>Notes</label>
              <textarea
                name="notes"
                value={uploadData.notes}
                onChange={handleUploadChange}
                placeholder="Add any additional notes..."
                rows={3}
              />
            </div>

            <div className="form-group">
              <label>Upload File * (JPG, PNG, PDF - Max 5MB)</label>
              <input
                id="file-input"
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={handleFileSelect}
                required
              />
              {uploadData.file && (
                <div className="file-selected">
                  ✅ {uploadData.file.name} ({(uploadData.file.size / 1024).toFixed(2)} KB)
                </div>
              )}
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowUploadModal(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={uploading}
              >
                {uploading ? 'Uploading...' : '📤 Upload Document'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderViewModal = () => {
    if (!showViewModal || !selectedDoc) return null;

    return (
      <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
        <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
          <button className="modal-close" onClick={() => setShowViewModal(false)}>
            ×
          </button>

          <div className="view-header">
            <div className="view-icon">
              {getDocumentIcon(selectedDoc.documentType)}
            </div>
            <h2>{selectedDoc.documentName}</h2>
          </div>

          <div className="view-details">
            <div className="detail-row">
              <span className="detail-label">Type:</span>
              <span className="detail-value">
                {selectedDoc.documentType.charAt(0).toUpperCase() + selectedDoc.documentType.slice(1)}
              </span>
            </div>

            {selectedDoc.documentNumber && (
              <div className="detail-row">
                <span className="detail-label">Document Number:</span>
                <span className="detail-value">{selectedDoc.documentNumber}</span>
              </div>
            )}

            {selectedDoc.issueCountry && (
              <div className="detail-row">
                <span className="detail-label">Issue Country:</span>
                <span className="detail-value">{selectedDoc.issueCountry}</span>
              </div>
            )}

            {selectedDoc.issueDate && (
              <div className="detail-row">
                <span className="detail-label">Issue Date:</span>
                <span className="detail-value">
                  {new Date(selectedDoc.issueDate).toLocaleDateString()}
                </span>
              </div>
            )}

            {selectedDoc.expiryDate && (
              <div className="detail-row">
                <span className="detail-label">Expiry Date:</span>
                <span className="detail-value">
                  {new Date(selectedDoc.expiryDate).toLocaleDateString()}
                </span>
              </div>
            )}

            {selectedDoc.provider && (
              <div className="detail-row">
                <span className="detail-label">Provider:</span>
                <span className="detail-value">{selectedDoc.provider}</span>
              </div>
            )}

            {selectedDoc.notes && (
              <div className="detail-row">
                <span className="detail-label">Notes:</span>
                <span className="detail-value">{selectedDoc.notes}</span>
              </div>
            )}

            <div className="detail-row">
              <span className="detail-label">File Name:</span>
              <span className="detail-value">{selectedDoc.fileName}</span>
            </div>

            <div className="detail-row">
              <span className="detail-label">Uploaded:</span>
              <span className="detail-value">
                {new Date(selectedDoc.createdAt).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="view-actions">
            <button
              className="action-btn primary"
              onClick={() => handleDownloadDocument(selectedDoc._id, selectedDoc.fileName)}
            >
              ⬇️ Download
            </button>
            <button
              className="action-btn danger"
              onClick={() => handleDeleteDocument(selectedDoc._id)}
            >
              🗑️ Delete
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="travel-docs">
      <div className="docs-page-header">
        <h1>📚 DigiLocker</h1>
        <p>Securely store and manage all your travel documents in one place</p>
      </div>

      {renderDocuments()}
      {renderUploadModal()}
      {renderViewModal()}
    </div>
  );
};

export default TravelDocs;