/**
 * EPA Manifest Routes
 * 
 * API endpoints for EPA e-Manifest data lead discovery
 */

import express from 'express';
import epaManifestParser from '../services/epaManifestParser.js';

const router = express.Router();

// Search EPA waste generators by zip code
router.get('/search/:zipCode', async (req, res) => {
  try {
    const { zipCode } = req.params;
    const limit = parseInt(req.query.limit) || 100;
    
    console.log(`🏛️ EPA Manifest Search - ZIP: ${zipCode}, Limit: ${limit}`);
    
    // Initialize parser if needed
    await epaManifestParser.initialize();
    
    // Search manifest data
    const generators = await epaManifestParser.searchByZipCode(zipCode, limit);
    
    console.log(`✅ EPA Search complete: ${generators.length} generators found`);
    
    res.json({
      success: true,
      count: generators.length,
      zipCode: zipCode,
      generators: generators,
      dataSource: 'EPA e-Manifest',
      lastUpdated: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ EPA manifest search error:', error);
    res.status(500).json({
      success: false,
      error: 'EPA manifest search failed',
      message: error.message
    });
  }
});

// Get EPA manifest data statistics
router.get('/stats', async (req, res) => {
  try {
    console.log('📊 EPA Manifest stats requested');
    
    // Initialize parser if needed
    await epaManifestParser.initialize();
    
    const stats = await epaManifestParser.getDataStats();
    
    res.json({
      success: true,
      stats: stats,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ EPA manifest stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get EPA manifest stats',
      message: error.message
    });
  }
});

export default router;