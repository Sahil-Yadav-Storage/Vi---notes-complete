const express = require('express');
const auth = require('../middleware/auth');
const Session = require('../models/Session');
const { extractFeatures } = require('../services/featureExtractor');
const classifier = require('../services/classifier');
const { crossVerify } = require('../services/crossVerifier');
const { generateReport } = require('../services/reportGenerator');

const router = express.Router();

// All session routes require authentication
router.use(auth);

// POST /api/sessions — save session + run full analysis pipeline
router.post('/', async (req, res) => {
  try {
    const { events, stats, textLength, text } = req.body;

    if (!events || !stats) {
      return res.status(400).json({ error: 'Missing required fields: events, stats' });
    }

    // 1. Extract features
    const features = extractFeatures(events, stats, text || '');

    // 2. ML classification
    const mlResult = classifier.predict(features);

    // 3. Cross-verification
    const flags = crossVerify(features, stats, textLength || (text ? text.length : 0));

    // 4. Generate authenticity report
    const report = generateReport(features, mlResult, flags);

    // 5. Save everything
    const session = new Session({
      userId: req.user.id,
      events,
      stats,
      text: text || '',
      textLength: textLength || (text ? text.length : 0),
      features,
      report,
    });
    const saved = await session.save();

    return res.status(201).json({
      id: saved._id,
      message: 'Session saved',
      report,
    });
  } catch (err) {
    console.error('Error saving session:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/sessions/:id/report — retrieve stored report
router.get('/:id/report', async (req, res) => {
  try {
    const session = await Session.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    return res.json(session.report || { error: 'No report available' });
  } catch (err) {
    console.error('Error fetching report:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/sessions — list user sessions
router.get('/', async (req, res) => {
  try {
    const sessions = await Session.find({ userId: req.user.id })
      .select('text textLength report.confidenceScore report.label createdAt')
      .sort({ createdAt: -1 })
      .limit(50);

    return res.json(sessions);
  } catch (err) {
    console.error('Error listing sessions:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
