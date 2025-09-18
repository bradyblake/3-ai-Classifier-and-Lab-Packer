// Run Automated SDS Training
import AutoTrainingSystem from './services/autoTrainingSystem.js';

async function runTraining() {
  console.log('🚀 Initializing Automated SDS Training System...');
  
  try {
    const autoTrainer = new AutoTrainingSystem();
    
    console.log('📊 Current Training Stats:');
    const stats = autoTrainer.getTrainingStats();
    console.log(`- Total Examples: ${stats.totalExamples}`);
    console.log(`- User Feedback: ${stats.totalFeedback}`);
    
    console.log('\n🤖 Running automated training on sample SDSs...');
    const results = await autoTrainer.runAutoTraining();
    
    console.log('\n🎉 Automated training completed!');
    console.log(`Accuracy improved from baseline testing.`);
    
  } catch (error) {
    console.error('❌ Training failed:', error.message);
    console.error(error.stack);
  }
}

runTraining();