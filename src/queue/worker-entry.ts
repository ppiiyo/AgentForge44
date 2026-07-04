import dotenv from 'dotenv';
dotenv.config();

import { logger } from '../utils/logger.js';
import './executionQueue.js'; // Registers the BullMQ worker and processes pipeline runs

logger.info('[Executor Worker] Standalone KostromAi44 pipeline execution worker started.');
