const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Document = require('../models/Document');
const { protect } = require('../middleware/auth');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = process.env.UPLOAD_PATH || './uploads/documents';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, req.user.id + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 // 5MB default
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only images, PDFs, and documents are allowed'));
  }
});

// @route   POST /api/documents/upload
// @desc    Upload document
// @access  Private
router.post('/upload', protect, upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const { documentType, documentName, documentNumber, issueCountry, issueDate, expiryDate, provider, notes } = req.body;

    const document = await Document.create({
      user: req.user.id,
      documentType,
      documentName,
      documentNumber,
      issueCountry,
      issueDate,
      expiryDate,
      provider,
      notes,
      fileUrl: `/uploads/documents/${req.file.filename}`,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype
    });

    res.status(201).json({
      success: true,
      document
    });
  } catch (error) {
    // Delete file if document creation fails
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      success: false,
      message: 'Error uploading document',
      error: error.message
    });
  }
});

// @route   GET /api/documents/list
// @desc    Get user's documents
// @access  Private
router.get('/list', protect, async (req, res) => {
  try {
    const { documentType } = req.query;
    
    const query = { user: req.user.id };
    if (documentType) {
      query.documentType = documentType;
    }

    const documents = await Document.find(query).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: documents.length,
      documents: documents.map(doc => ({
        id: doc._id,
        documentType: doc.documentType,
        documentName: doc.documentName,
        documentNumber: doc.documentNumber,
        issueCountry: doc.issueCountry,
        issueDate: doc.issueDate,
        expiryDate: doc.expiryDate,
        daysToExpiry: doc.daysToExpiry,
        status: doc.status,
        provider: doc.provider,
        fileName: doc.fileName,
        createdAt: doc.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching documents',
      error: error.message
    });
  }
});

// @route   GET /api/documents/:id
// @desc    Get document details
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    res.json({
      success: true,
      document
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching document',
      error: error.message
    });
  }
});

// @route   GET /api/documents/:id/download
// @desc    Download document file
// @access  Private
router.get('/:id/download', protect, async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    const filePath = path.join(__dirname, '..', document.fileUrl);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    res.download(filePath, document.fileName);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error downloading document',
      error: error.message
    });
  }
});

// @route   PUT /api/documents/:id
// @desc    Update document details
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    const allowedUpdates = ['documentName', 'documentNumber', 'issueCountry', 'issueDate', 'expiryDate', 'provider', 'notes'];
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        document[field] = req.body[field];
      }
    });

    await document.save();

    res.json({
      success: true,
      document
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating document',
      error: error.message
    });
  }
});

// @route   DELETE /api/documents/:id
// @desc    Delete document
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Delete file from filesystem
    const filePath = path.join(__dirname, '..', document.fileUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await document.deleteOne();

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting document',
      error: error.message
    });
  }
});

// @route   GET /api/documents/expiring
// @desc    Get documents expiring soon
// @access  Private
router.get('/expiring/soon', protect, async (req, res) => {
  try {
    const { days = 180 } = req.query; // Default 6 months

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + parseInt(days));

    const documents = await Document.find({
      user: req.user.id,
      expiryDate: {
        $gte: new Date(),
        $lte: expiryDate
      }
    }).sort({ expiryDate: 1 });

    res.json({
      success: true,
      count: documents.length,
      documents
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching expiring documents',
      error: error.message
    });
  }
});

module.exports = router;
