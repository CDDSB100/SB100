const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SB100 Scientometrics API',
      version: '1.0.0',
      description: 'API para busca e curadoria de artigos científicos (Cientometria)',
    },
    servers: [
      {
        url: 'https://sb100cientometria.optin.com.br',
        description: 'Servidor de Produção',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./server.js', './src/controllers/*.js'], // Caminhos para os arquivos com anotações
};

const specs = swaggerJsdoc(options);

const swaggerOptions = {
  swaggerOptions: {
    persistAuthorization: true,
  },
  customJs: '/api-docs/custom.js',
  customSiteTitle: "SB100 API Documentation",
};

module.exports = {
  swaggerUi,
  specs,
  swaggerOptions,
};
