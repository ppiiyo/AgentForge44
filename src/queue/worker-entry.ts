import dotenv from 'dotenv';
dotenv.config();

import { logger } from '../utils/logger.js';
import './executionQueue.js'; // Registers the BullMQ worker and processes pipeline runs

logger.info('[Executor Worker] Standalone AgentForge pipeline execution worker started.');
