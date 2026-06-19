import fs from 'fs';
import path from 'path';
import { swaggerSpec } from '../src/api/swagger.js';

const outputPath = path.join(process.cwd(), 'swagger.json');
fs.writeFileSync(outputPath, JSON.stringify(swaggerSpec, null, 2), 'utf-8');
console.log(`[Swagger] Successfully wrote active Swagger spec to ${outputPath}`);
