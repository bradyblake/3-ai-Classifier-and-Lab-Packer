import { HybridClassificationRouter } from '../services/hybridClassificationService.js';

const router = express.Router();
const classifier = new HybridClassificationRouter();

router.post('/classify', (req, res) => classifier.classify(req, res));
router.get('/health', (req, res) => classifier.health(req, res));

export default router;