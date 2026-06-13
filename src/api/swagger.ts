import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AgentForge44 API',
      version: '1.0.0',
      description: 'API для визуального конструктора мультиагентных систем'
    },
    servers: [
      { url: 'http://localhost:3000' }
    ]
  },
  apis: ['./server.ts', './src/api/*.ts']
};

const swaggerSpec = swaggerJsdoc(options);

export function setupSwagger(app: Express) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}
