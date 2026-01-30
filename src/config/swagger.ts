import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: '🎓 Farmy API Documentation',
            version: '1.0.0',
            description: `
# Welcome to Farmy API

A comprehensive farm management platform API.
      `.trim(),
            contact: {
                name: 'Farmy API Support',
                email: 'support@farmy.tn',
            },
        },
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Enter your JWT token obtained from the `/api/auth/login` endpoint',
                },
            },
        },
        servers: [
            {
                url: `http://localhost:${process.env.PORT}/api` || 'http://localhost:5000/api',
                description: '🏠 Local Development Server',
            },
        ],
    },
    apis: [
        path.join(__dirname, '../routes/*.ts'),
        path.join(__dirname, '../routes/*.js'),
    ],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

const swaggerUiOptions = {
    customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info { margin: 30px 0; }
    .swagger-ui .info .title { font-size: 2.5em; }
    .swagger-ui .scheme-container { background: #fafafa; padding: 15px; border-radius: 4px; }
  `,
    customSiteTitle: 'Farmy API Docs',
    swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        filterCaseSensitive: false,
        tryItOutEnabled: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
    },
};

export { swaggerUi, swaggerSpec, swaggerUiOptions };
