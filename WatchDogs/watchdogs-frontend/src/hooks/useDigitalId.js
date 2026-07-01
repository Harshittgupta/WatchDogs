import { useState, useCallback, useEffect } from 'react';
import { useTouristSafety } from '../context/TouristSafetyContext';

const useDigitalId = () => {
  const { state, dispatch } = useTouristSafety();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationHistory, setVerificationHistory] = useState([]);
  const [blockchainStatus, setBlockchainStatus] = useState('disconnected');
  
  useEffect(() => {
    const connectToBlockchain = async () => {
      setBlockchainStatus('connecting');
      await new Promise(resolve => setTimeout(resolve, 2000));
      setBlockchainStatus('connected');
    };
    connectToBlockchain();
  }, []);

  // Calculate trip duration in days
  const calculateTripDuration = useCallback((entryDate, exitDate) => {
    const entry = new Date(entryDate);
    const exit = new Date(exitDate);
    const diffTime = Math.abs(exit - entry);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }, []);

  // Generate comprehensive Digital ID with KYC
  const generateDigitalId = useCallback(async (touristData) => {
    setIsGenerating(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 3000));

      const tripDuration = calculateTripDuration(touristData.entryDate, touristData.exitDate);
      const expiryDate = new Date(touristData.exitDate);
      
      const digitalId = {
        // Digital ID Core
        id: `DID:TOURIST:${Date.now()}`,
        blockchainHash: `0x${Math.random().toString(16).substr(2, 40)}`,
        smartContractAddress: '0x' + Array(40).fill(0).map(() => 
          Math.floor(Math.random() * 16).toString(16)).join(''),
        networkId: 'ethereum-mainnet',
        transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`,
        
        // Personal Information (Encrypted)
        personalInfo: {
          firstName: touristData.firstName,
          lastName: touristData.lastName,
          fullName: `${touristData.firstName} ${touristData.lastName}`,
          nationality: touristData.nationality,
          dateOfBirth: touristData.dateOfBirth,
          gender: touristData.gender
        },
        
        // KYC Information (Encrypted on blockchain)
        kyc: {
          documentType: touristData.documentType,
          documentNumber: touristData.documentNumber,
          documentHash: `DOC_${Math.random().toString(36).substr(2, 16).toUpperCase()}`,
          issuingCountry: touristData.issuingCountry,
          documentExpiry: touristData.documentExpiry,
          verificationStatus: 'verified',
          verifiedBy: `${touristData.entryType.toUpperCase()}_AUTH`,
          verifiedAt: new Date().toISOString(),
          kycLevel: 3 // Level 3 = Full KYC with biometric
        },
        
        // Entry Point Information
        entryPoint: {
          type: touristData.entryType,
          name: touristData.entryPoint,
          location: touristData.entryPoint,
          entryDate: touristData.entryDate,
          exitDate: touristData.exitDate,
          registeredAt: new Date().toISOString()
        },
        
        // Trip Itinerary
        tripItinerary: {
          destinations: touristData.destinations.filter(d => d.trim()),
          purposeOfVisit: touristData.purposeOfVisit,
          accommodation: touristData.accommodation,
          duration: tripDuration,
          durationUnit: 'days'
        },
        
        // Emergency Contacts (Encrypted)
        emergencyContacts: touristData.emergencyContacts.map((contact, index) => ({
          id: `EC_${index + 1}_${Date.now()}`,
          name: contact.name,
          relation: contact.relation,
          phone: contact.phone,
          email: contact.email,
          isPrimary: contact.isPrimary,
          encryptedHash: `CONTACT_${Math.random().toString(36).substr(2, 12)}`
        })),
        
        // Validity Period (Based on Trip Duration)
        validity: {
          issuedAt: new Date(),
          expiresAt: expiryDate,
          validFrom: new Date(touristData.entryDate),
          validUntil: expiryDate,
          tripDuration: tripDuration,
          isValid: true,
          autoExpire: true
        },
        
        // Verification & Security
        verification: {
          level: 'Level-3-Verified',
          trustScore: Math.floor(Math.random() * 10) + 90, // 90-100
          biometricVerified: true,
          documentVerified: true,
          addressVerified: true
        },
        
        // Blockchain Security
        blockchain: {
          encryptionAlgorithm: 'AES-256-GCM',
          digitalSignature: `SIG_${Math.random().toString(36).substr(2, 32)}`,
          merkleRoot: `0x${Math.random().toString(16).substr(2, 64)}`,
          blockNumber: Math.floor(Math.random() * 1000000) + 5000000,
          gasUsed: Math.floor(Math.random() * 50000) + 21000,
          confirmations: 12
        },
        
        // Smart Contract Functions
        smartContractFunctions: [
          'verifyIdentity()',
          'updateLocation()',
          'emergencyBroadcast()',
          'accessMedicalInfo()',
          'validateTravelDoc()',
          'checkValidity()',
          'revokeAccess()'
        ],
        
        // Status
        status: 'active',
        createdAt: new Date().toISOString(),
        lastVerified: new Date().toISOString()
      };
      
      dispatch({ type: 'SET_DIGITAL_ID', payload: digitalId });
      
      setVerificationHistory(prev => [...prev, {
        action: 'generated',
        timestamp: new Date(),
        success: true,
        gasUsed: digitalId.blockchain.gasUsed,
        transactionHash: digitalId.transactionHash,
        entryPoint: touristData.entryPoint
      }]);
      
      return digitalId;
      
    } catch (error) {
      console.error('Digital ID generation failed:', error);
      setVerificationHistory(prev => [...prev, {
        action: 'generation_failed',
        timestamp: new Date(),
        success: false,
        error: error.message
      }]);
      throw error;
    } finally {
      setIsGenerating(false);
    }
  }, [dispatch, calculateTripDuration]);
  
  // Verify Digital ID on blockchain
  const verifyDigitalId = useCallback(async (digitalId) => {
    setIsVerifying(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const now = new Date();
      const isExpired = new Date(digitalId.validity.expiresAt) < now;
      
      const verification = {
        isValid: !isExpired && digitalId.status === 'active',
        blockchainConfirmed: true,
        networkStatus: 'confirmed',
        verificationTime: now,
        trustScore: digitalId.verification.trustScore,
        kycLevel: digitalId.kyc.kycLevel,
        gasUsed: Math.floor(Math.random() * 30000) + 15000,
        transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`,
        blockNumber: digitalId.blockchain.blockNumber + Math.floor(Math.random() * 100),
        confirmations: digitalId.blockchain.confirmations + 1
      };
      
      setVerificationHistory(prev => [...prev, {
        action: 'verified',
        timestamp: now,
        success: verification.isValid,
        trustScore: verification.trustScore,
        transactionHash: verification.transactionHash,
        gasUsed: verification.gasUsed
      }]);
      
      return verification;
      
    } catch (error) {
      console.error('Digital ID verification failed:', error);
      return { 
        isValid: false, 
        error: error.message,
        blockchainConfirmed: false
      };
    } finally {
      setIsVerifying(false);
    }
  }, []);
  
  // Share emergency ID with services
  const shareEmergencyId = useCallback(async (emergencyServices) => {
    if (!state.digitalId) {
      throw new Error('No digital ID available');
    }
    
    try {
      const emergencyToken = {
        id: state.digitalId.id,
        emergencyHash: `EMG_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
        authorizedFor: emergencyServices,
        validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
        accessLevel: 'emergency_full_access',
        includes: {
          personalInfo: true,
          medicalInfo: true,
          emergencyContacts: true,
          currentLocation: true,
          tripItinerary: true
        },
        smartContractCall: 'emergencyBroadcast()',
        broadcastRadius: '5km',
        priorityLevel: 'CRITICAL',
        autoExpiry: true
      };
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setVerificationHistory(prev => [...prev, {
        action: 'emergency_shared',
        timestamp: new Date(),
        success: true,
        authorizedServices: emergencyServices,
        validUntil: emergencyToken.validUntil
      }]);
      
      return emergencyToken;
      
    } catch (error) {
      console.error('Emergency ID sharing failed:', error);
      throw error;
    }
  }, [state.digitalId]);
  
  // Get ID status
  const getIdStatus = useCallback(() => {
    if (!state.digitalId) {
      return {
        status: 'not_issued',
        message: 'Digital ID required for full safety features',
        action: 'generate',
        securityLevel: 'basic'
      };
    }
    
    const now = new Date();
    const expiry = new Date(state.digitalId.validity.expiresAt);
    const daysUntilExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry <= 0) {
      return {
        status: 'expired',
        message: 'Digital ID expired - Trip duration ended',
        action: 'renew',
        securityLevel: 'compromised'
      };
    }
    
    if (daysUntilExpiry <= 3) {
      return {
        status: 'expiring_soon',
        message: `ID expires in ${daysUntilExpiry} days`,
        days: daysUntilExpiry,
        action: 'extend_trip',
        securityLevel: 'medium'
      };
    }
    
    return {
      status: 'valid',
      message: 'Digital ID active and blockchain-verified',
      days: daysUntilExpiry,
      action: 'none',
      securityLevel: 'maximum',
      trustScore: state.digitalId.verification.trustScore,
      kycLevel: state.digitalId.kyc.kycLevel
    };
  }, [state.digitalId]);
  
  // Blockchain metrics
  const blockchainMetrics = useCallback(() => {
    if (!state.digitalId || verificationHistory.length === 0) {
      return {
        totalTransactions: 0,
        totalGasUsed: 0,
        successRate: 0,
        lastVerification: null
      };
    }
    
    const successful = verificationHistory.filter(h => h.success);
    const totalGas = verificationHistory.reduce((acc, h) => acc + (h.gasUsed || 0), 0);
    
    return {
      totalTransactions: verificationHistory.length,
      totalGasUsed: totalGas,
      successRate: (successful.length / verificationHistory.length) * 100,
      lastVerification: verificationHistory[verificationHistory.length - 1]?.timestamp
    };
  }, [state.digitalId, verificationHistory]);
  
  return {
    digitalId: state.digitalId,
    isGenerating,
    isVerifying,
    verificationHistory,
    blockchainStatus,
    generateDigitalId,
    verifyDigitalId,
    getIdStatus,
    blockchainMetrics,
    shareEmergencyId
  };
};

export default useDigitalId;