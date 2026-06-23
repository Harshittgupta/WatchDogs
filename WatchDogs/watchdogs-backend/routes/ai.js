const express = require('express');
const router = express.Router();
const SafetyReport = require('../models/SafetyReport');
const { protect } = require('../middleware/auth');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);


const MODEL_NAME = 'gemini-2.5-flash';

// Store conversations in memory (use MongoDB in production)
const conversations = new Map();

// @route   POST /api/ai/safety-prediction
// @desc    Get AI safety prediction for location
// @access  Private
router.post('/safety-prediction', protect, async (req, res) => {
  try {
    const { latitude, longitude, timestamp } = req.body;

    // Get current time or use provided timestamp
    const currentTime = timestamp ? new Date(timestamp) : new Date();
    const hour = currentTime.getHours();
    const dayOfWeek = currentTime.getDay();

    // Basic AI logic (in production, this would use ML model)
    let riskScore = 20; // Base risk
    let riskLevel = 'low';
    let tips = [];
    let factors = [];

    // Time-based risk
    const isNight = hour >= 22 || hour < 6;
    const isEarlyMorning = hour >= 6 && hour < 9;
    const isEvening = hour >= 18 && hour < 22;
    const isRushHour = isEarlyMorning || isEvening;

    if (isNight) {
      riskScore += 35;
      tips.push('It\'s nighttime - stay in well-lit areas');
      tips.push('Use verified taxi services only');
      tips.push('Share your location with trusted contacts');
      factors.push('nighttime');
    } else if (isRushHour) {
      riskScore += 10;
      tips.push('Peak traffic hours - allow extra travel time');
      tips.push('Watch your belongings in crowded areas');
      factors.push('rush-hour');
    } else {
      tips.push('Good time for sightseeing');
      tips.push('Popular attractions are less crowded now');
      factors.push('daytime', 'low-crowd');
    }

    // Day of week risk
    if (dayOfWeek === 0 || dayOfWeek === 6) { // Weekend
      riskScore += 5;
      factors.push('weekend');
    }

    // Get recent reports in area to adjust score
    const recentReports = await SafetyReport.find({
      isActive: true,
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Last 7 days
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: 2000 // 2km radius
        }
      }
    }).limit(20);

    // Adjust based on recent reports
    const dangerReports = recentReports.filter(r => r.reportType === 'danger').length;
    const cautionReports = recentReports.filter(r => r.reportType === 'caution').length;
    const safeReports = recentReports.filter(r => r.reportType === 'safe').length;

    if (dangerReports > 2) {
      riskScore += 30;
      tips.push('Multiple danger reports in this area');
      tips.push('Consider alternative routes');
      factors.push('danger-reports');
    } else if (cautionReports > 3) {
      riskScore += 15;
      tips.push('Some caution reports nearby');
      tips.push('Stay alert and aware');
      factors.push('caution-reports');
    } else if (safeReports > 5) {
      riskScore -= 10;
      factors.push('verified-safe-area');
    }

    // Determine risk level
    if (riskScore >= 70) {
      riskLevel = 'high';
    } else if (riskScore >= 40) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'low';
    }

    // Cap risk score
    riskScore = Math.max(0, Math.min(100, riskScore));
    const safetyScore = 100 - riskScore;

    res.json({
      success: true,
      prediction: {
        safetyScore,
        riskScore,
        riskLevel,
        factors,
        tips,
        timeOfDay: isNight ? 'Night' : isRushHour ? 'Rush Hour' : 'Day',
        basedOn: {
          timeAnalysis: true,
          communityReports: recentReports.length,
          historicalData: false // Would be true with real ML model
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error generating safety prediction',
      error: error.message
    });
  }
});

// @route   POST /api/ai/recommendations
// @desc    Get AI recommendations for area
// @access  Private
router.post('/recommendations', protect, async (req, res) => {
  try {
    const { latitude, longitude, type = 'all' } = req.body;

    // Mock recommendations (in production, integrate with Google Places API)
    const allRecommendations = [
      {
        id: 1,
        type: 'restaurant',
        icon: '🍽️',
        title: 'Safe Dining Near You',
        description: 'Highly rated restaurants within 1km with verified safety standards',
        distance: '0.5km',
        safetyScore: 95,
        coordinates: { latitude: latitude + 0.005, longitude: longitude + 0.005 }
      },
      {
        id: 2,
        type: 'attraction',
        icon: '🏛️',
        title: 'Tourist-Friendly Attractions',
        description: 'Popular sites with good safety records and tourist police presence',
        distance: '1.2km',
        safetyScore: 92,
        coordinates: { latitude: latitude + 0.01, longitude: longitude - 0.005 }
      },
      {
        id: 3,
        type: 'transport',
        icon: '🚕',
        title: 'Safe Transportation Hub',
        description: 'Official taxi stand with verified drivers and fair pricing',
        distance: '0.3km',
        safetyScore: 88,
        coordinates: { latitude: latitude - 0.002, longitude: longitude + 0.003 }
      },
      {
        id: 4,
        type: 'medical',
        icon: '🏥',
        title: 'Tourist-Friendly Hospital',
        description: 'International hospital with English-speaking staff',
        distance: '2.1km',
        safetyScore: 98,
        coordinates: { latitude: latitude + 0.015, longitude: longitude + 0.01 }
      }
    ];

    let recommendations = allRecommendations;
    if (type !== 'all') {
      recommendations = allRecommendations.filter(r => r.type === type);
    }

    res.json({
      success: true,
      count: recommendations.length,
      recommendations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error generating recommendations',
      error: error.message
    });
  }
});

// @route   GET /api/ai/cultural-tips
// @desc    Get cultural etiquette tips for location
// @access  Private
router.get('/cultural-tips', protect, async (req, res) => {
  try {
    const { country = 'India' } = req.query;

    // Mock cultural tips (in production, maintain a database)
    const tipsDatabase = {
      'India': [
        { icon: '👕', tip: 'Dress modestly when visiting religious sites' },
        { icon: '🙏', tip: 'Remove shoes before entering homes and temples' },
        { icon: '🤝', tip: 'Use right hand for giving and receiving items' },
        { icon: '📸', tip: 'Ask permission before photographing locals' },
        { icon: '💰', tip: 'Bargaining is expected in local markets' }
      ],
      'Japan': [
        { icon: '🙇', tip: 'Bow when greeting people' },
        { icon: '🥢', tip: 'Never stick chopsticks upright in rice' },
        { icon: '🔇', tip: 'Keep your voice down in public places' },
        { icon: '👞', tip: 'Remove shoes when entering homes' },
        { icon: '🎁', tip: 'Give and receive gifts with both hands' }
      ]
    };

    const tips = tipsDatabase[country] || tipsDatabase['India'];

    res.json({
      success: true,
      country,
      tips
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching cultural tips',
      error: error.message
    });
  }
});

// @route   POST /api/ai/translate
// @desc    Translate emergency phrases
// @access  Private
router.post('/translate', protect, async (req, res) => {
  try {
    const { phrase, targetLanguage = 'hi' } = req.body;

    // Mock translations (in production, integrate Google Translate API)
    const translations = {
      'Help!': {
        'hi': 'मदद!',
        'es': '¡Ayuda!',
        'fr': 'Au secours!',
        'de': 'Hilfe!'
      },
      'Police': {
        'hi': 'पुलिस',
        'es': 'Policía',
        'fr': 'Police',
        'de': 'Polizei'
      },
      'Hospital': {
        'hi': 'अस्पताल',
        'es': 'Hospital',
        'fr': 'Hôpital',
        'de': 'Krankenhaus'
      },
      'I need help': {
        'hi': 'मुझे मदद चाहिए',
        'es': 'Necesito ayuda',
        'fr': 'J\'ai besoin d\'aide',
        'de': 'Ich brauche Hilfe'
      },
      'Where is...?': {
        'hi': 'कहाँ है...?',
        'es': '¿Dónde está...?',
        'fr': 'Où est...?',
        'de': 'Wo ist...?'
      }
    };

    const translation = translations[phrase]?.[targetLanguage] || phrase;

    res.json({
      success: true,
      original: phrase,
      translated: translation,
      targetLanguage
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error translating phrase',
      error: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════
// IMPROVED AI CHAT ROUTE WITH LOCATION-AWARE RESPONSES
// ═══════════════════════════════════════════════════════════════

// @route   POST /api/ai/chat
// @desc    AI chat endpoint with improved location-aware responses
// @access  Private
router.post('/chat', protect, async (req, res) => {
  try {
    const { message, conversationId, context } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    // Get or create conversation history
    let history = conversations.get(conversationId) || [];

    // Initialize AI model with latest working model
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    
    // Start chat with history
    const chat = model.startChat({
      history: history.map(h => ({
        role: h.role,
        parts: [{ text: h.text }]
      })),
      generationConfig: {
        temperature: 0.9,        // INCREASED for more creative, specific responses
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 2048    // INCREASED for longer responses
      }
    });

    // Build ENHANCED contextual prompt that FORCES location usage
    let systemPrompt = `You are WatchDogs AI, a knowledgeable travel safety expert. You provide SPECIFIC, ACTIONABLE advice.

CRITICAL RULES:
1. Always use the user's actual location in your response
2. Provide specific place names, streets, neighborhoods
3. Give actual emergency numbers for their country
4. Recommend real local services when possible
5. If you lack specific info, admit it but provide best available advice
6. Keep responses conversational and friendly
7. Be concise but informative (2-4 paragraphs max)
8. Never give generic advice - always make it location-specific`;

    // Add location context if available
    if (context && context.location) {
      systemPrompt += `

USER'S CURRENT LOCATION:
📍 Location: ${context.location}
🏙️ City: ${context.city || 'Unknown'}
🌍 Country: ${context.country || 'Unknown'}`;

      if (context.coordinates) {
        systemPrompt += `
🗺️ Coordinates: ${context.coordinates.latitude}, ${context.coordinates.longitude}`;
      }

      systemPrompt += `

IMPORTANT: The user is currently in ${context.city || context.location}. 
- YOU MUST mention "${context.city || context.location}" specifically in your response
- Provide ${context.city}-specific advice, not generic travel tips
- Reference local landmarks, neighborhoods, or services in ${context.city}
- Use emergency numbers for ${context.country}
- If asking about restaurants/hospitals, mention actual areas or neighborhoods in ${context.city}
- Example: Instead of "use verified taxis", say "use Ola or Uber in ${context.city}"
- Example: Instead of "call emergency services", say "Mumbai Police: 100, Ambulance: 102"`;
    } else {
      systemPrompt += `

NOTE: User location is not available. Ask for their location to provide better assistance.`;
    }

    // User's question
    const fullPrompt = `${systemPrompt}

USER'S QUESTION: "${message.trim()}"

YOUR RESPONSE (remember to mention ${context?.city || 'their location'} specifically):`;

    console.log('🤖 AI Request:', {
      location: context?.city || context?.location || 'No location',
      messageLength: message.length,
      historyLength: history.length
    });

    // Get AI response
    const result = await chat.sendMessage(fullPrompt);
    const response = result.response.text();

    console.log('✅ AI Response received:', {
      length: response.length,
      preview: response.substring(0, 100) + '...'
    });

    // Update conversation history
    history.push({ 
      role: 'user', 
      text: message.trim(),
      timestamp: new Date()
    });
    history.push({ 
      role: 'model', 
      text: response,
      timestamp: new Date()
    });
    
    // Keep only last 20 messages (10 exchanges) to manage memory
    if (history.length > 20) {
      history = history.slice(-20);
    }
    
    conversations.set(conversationId, history);

    // Generate contextual follow-up suggestions
    const suggestions = generateSuggestions(message, response, context);

    res.json({
      success: true,
      response: response,
      conversationId,
      suggestions,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('❌ AI Chat Error:', error);
    
    // Provide better fallback response
    const errorMsg = error.message || '';
    const isModelError = errorMsg.includes('404') || errorMsg.includes('not found');
    
    res.json({
      success: true,
      response: `I'm experiencing technical difficulties${isModelError ? ' with the AI model' : ''}. For urgent safety concerns, please contact local emergency services immediately (Police: 100, Ambulance: 102 in India). You can try asking your question again.`,
      conversationId: req.body.conversationId,
      suggestions: [
        'What are emergency numbers?',
        'Where is the nearest hospital?',
        'Safe areas in my city?'
      ],
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/ai/conversation/start
// @desc    Start a new conversation
// @access  Private
router.post('/conversation/start', protect, (req, res) => {
  try {
    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    conversations.set(conversationId, []);
    
    console.log('🆕 New conversation started:', conversationId);
    
    res.json({
      success: true,
      conversationId,
      message: 'Conversation started'
    });
  } catch (error) {
    console.error('Error starting conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start conversation'
    });
  }
});

// @route   DELETE /api/ai/conversation/:id
// @desc    Clear/delete a conversation
// @access  Private
router.delete('/conversation/:id', protect, (req, res) => {
  try {
    const { id } = req.params;
    const existed = conversations.has(id);
    
    conversations.delete(id);
    
    console.log('🗑️ Conversation deleted:', id);
    
    res.json({
      success: true,
      message: existed ? 'Conversation cleared' : 'Conversation not found',
      cleared: existed
    });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete conversation'
    });
  }
});

// @route   GET /api/ai/suggestions
// @desc    Get quick question suggestions
// @access  Private
router.get('/suggestions', protect, (req, res) => {
  const suggestions = [
    { icon: '🛡️', text: 'Safety tips for my location' },
    { icon: '🍽️', text: 'Best local restaurants nearby' },
    { icon: '🚨', text: 'What to do in an emergency?' },
    { icon: '🗺️', text: 'Tourist attractions nearby' },
    { icon: '🚕', text: 'Safe transportation options' },
    { icon: '💊', text: 'Find nearby hospitals' },
    { icon: '🌍', text: 'Local customs and culture' },
    { icon: '🏨', text: 'Safe accommodation tips' },
    { icon: '📱', text: 'Important emergency numbers' },
    { icon: '💰', text: 'How to avoid scams?' },
    { icon: '🌙', text: 'Safety tips for night travel' },
    { icon: '👥', text: 'Meeting locals safely' }
  ];

  res.json({
    success: true,
    suggestions
  });
});

// ═══════════════════════════════════════════════════════════════
// IMPROVED HELPER FUNCTION - Location-aware suggestions
// ═══════════════════════════════════════════════════════════════

function generateSuggestions(userMessage, aiResponse, context) {
  const lowerMessage = userMessage.toLowerCase();
  const location = context?.city || context?.location || '';
  
  // Food/Restaurant related
  if (lowerMessage.includes('restaurant') || lowerMessage.includes('food') || 
      lowerMessage.includes('eat') || lowerMessage.includes('dining')) {
    return [
      location ? `What are the local specialties in ${location}?` : 'What are the local specialties?',
      'Are there vegetarian/vegan options nearby?',
      'How safe is street food here?'
    ];
  }
  
  // Safety related
  if (lowerMessage.includes('safety') || lowerMessage.includes('safe') || 
      lowerMessage.includes('danger') || lowerMessage.includes('crime')) {
    return [
      location ? `What areas should I avoid in ${location}?` : 'What areas should I avoid?',
      'Emergency numbers I should save?',
      'Safe transportation options here?'
    ];
  }
  
  // Accommodation related
  if (lowerMessage.includes('hotel') || lowerMessage.includes('accommodation') || 
      lowerMessage.includes('stay') || lowerMessage.includes('hostel')) {
    return [
      location ? `What neighborhoods are safest in ${location}?` : 'What neighborhoods are safest?',
      'How to avoid booking scams?',
      'Best areas for tourists?'
    ];
  }
  
  // Transportation related
  if (lowerMessage.includes('transport') || lowerMessage.includes('taxi') || 
      lowerMessage.includes('uber') || lowerMessage.includes('bus')) {
    return [
      'Is public transport safe here?',
      'Which ride-sharing apps work here?',
      'Typical taxi fares?'
    ];
  }
  
  // Attractions/Activities
  if (lowerMessage.includes('attraction') || lowerMessage.includes('visit') || 
      lowerMessage.includes('see') || lowerMessage.includes('activity') || 
      lowerMessage.includes('tourist')) {
    return [
      location ? `Other must-see places in ${location}?` : 'Other must-see places nearby?',
      'Safety tips for tourists?',
      'Best time to visit attractions?'
    ];
  }
  
  // Emergency related
  if (lowerMessage.includes('emergency') || lowerMessage.includes('help') || 
      lowerMessage.includes('police') || lowerMessage.includes('hospital')) {
    return [
      'Where is the nearest embassy?',
      location ? `Best hospitals in ${location}?` : 'Medical facilities nearby?',
      'What if I lose my passport?'
    ];
  }
  
  // Generic fallback suggestions with location
  return [
    location ? `Tell me about local customs in ${location}` : 'Tell me about local customs',
    'What are the emergency contact numbers?',
    'Safe places for solo travelers?'
  ];
}

// Cleanup old conversations (runs every hour)
setInterval(() => {
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  
  for (const [id, history] of conversations.entries()) {
    if (history.length === 0) continue;
    
    const lastMessage = history[history.length - 1];
    if (lastMessage.timestamp && new Date(lastMessage.timestamp).getTime() < oneHourAgo) {
      conversations.delete(id);
      console.log('🧹 Cleaned up old conversation:', id);
    }
  }
}, 60 * 60 * 1000); // Every hour

module.exports = router;