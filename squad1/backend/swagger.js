const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SB100 Cientometria API',
      version: '1.0.0',
      description: 'API completa para busca, extração de metadados e curadoria de artigos científicos.',
    },
    servers: [
      {
        url: '/api',
        description: 'Servidor API',
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
      schemas: {
        Article: {
          type: 'object',
          properties: {
            _id: { type: 'integer' },
            title: { type: 'string' },
            subtitle: { type: 'string' },
            authors: { type: 'string' },
            year: { type: 'string' },
            doi: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'Aprovado por IA', 'Rejeitado', 'Aprovado Manualmente'] },
            category: { type: 'string' },
            documentUrl: { type: 'string' },
            aiFeedback: { type: 'object' },
            curatorFeedback: { type: 'string' },
            feedbackOnAi: { type: 'object' }
          }
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            username: { type: 'string' },
            email: { type: 'string' },
            role: { type: 'string', enum: ['admin', 'cientometria', 'visualizador'] },
            is_active: { type: 'boolean' }
          }
        }
      }
    },
    security: [{ bearerAuth: [] }],
    paths: {
      '/login': {
        post: {
          tags: ['Autenticação'],
          summary: 'Realiza login no sistema',
          security: [],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    username: { type: 'string' },
                    password: { type: 'string' }
                  }
                }
              }
            }
          },
          responses: {
            200: { description: 'Login bem sucedido' },
            401: { description: 'Credenciais inválidas' }
          }
        }
      },
      '/register': {
        post: {
          tags: ['Administração'],
          summary: 'Registra um novo usuário',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    username: { type: 'string' },
                    email: { type: 'string' },
                    password: { type: 'string' },
                    role: { type: 'string' }
                  }
                }
              }
            }
          },
          responses: { 201: { description: 'Usuário criado' } }
        }
      },
      '/users': {
        get: {
          tags: ['Administração'],
          summary: 'Lista todos os usuários',
          responses: { 200: { content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/User' } } } } } }
        }
      },
      '/curation': {
        get: {
          tags: ['Curadoria'],
          summary: 'Lista todos os artigos na fila de curadoria',
          responses: { 200: { content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Article' } } } } } }
        }
      },
      '/trigger-curation': {
        post: {
          tags: ['Curadoria'],
          summary: 'Inicia o processo de curadoria em lote (IA)',
          responses: { 200: { description: 'Processo iniciado' } }
        }
      },
      '/trigger-curation-single': {
        post: {
          tags: ['Curadoria'],
          summary: 'Inicia curadoria de um único artigo',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    workId: { type: 'string', description: 'ID do artigo (_id)' },
                    forceSave: { type: 'boolean' }
                  }
                }
              }
            }
          },
          responses: { 200: { description: 'Análise concluída' } }
        }
      },
      '/manual-approval': {
        post: {
          tags: ['Curadoria'],
          summary: 'Aprova um artigo manualmente',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    workId: { type: 'string' },
                    curatorFeedback: { type: 'string' },
                    feedbackOnAi: { type: 'object' }
                  }
                }
              }
            }
          },
          responses: { 200: { description: 'Artigo aprovado' } }
        }
      },
      '/search': {
        post: {
          tags: ['Busca'],
          summary: 'Busca artigos no OpenAlex',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    search_terms: { type: 'string' },
                    start_year: { type: 'integer' },
                    end_year: { type: 'integer' }
                  }
                }
              }
            }
          },
          responses: { 200: { description: 'Resultados da busca' } }
        }
      },
      '/extract-metadata': {
        post: {
          tags: ['Extração'],
          summary: 'Extrai metadados de um arquivo PDF carregado',
          requestBody: {
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  properties: {
                    file: { type: 'string', format: 'binary' },
                    title: { type: 'string' }
                  }
                }
              }
            }
          },
          responses: { 200: { description: 'Metadados extraídos' } }
        }
      },
      '/manual-rejection': {
        post: {
          tags: ['Curadoria'],
          summary: 'Rejeita um artigo manualmente',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    workId: { type: 'string' },
                    curatorFeedback: { type: 'string' },
                    feedbackOnAi: { type: 'object' }
                  }
                }
              }
            }
          },
          responses: { 200: { description: 'Artigo rejeitado' } }
        }
      },
      '/articles/status/{status}': {
        get: {
          tags: ['Artigos'],
          summary: 'Busca artigos por status',
          parameters: [
            { name: 'status', in: 'path', required: true, schema: { type: 'string' } }
          ],
          responses: { 200: { description: 'Lista de artigos' } }
        }
      },
      '/resolve-conflict': {
        post: {
          tags: ['Curadoria'],
          summary: 'Resolve um conflito detectado pela IA',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    articleId: { type: 'string' },
                    resolution: { type: 'string', enum: ['keep_existing', 'overwrite_chunk'] },
                    conflictingId: { type: 'string' }
                  }
                }
              }
            }
          },
          responses: { 200: { description: 'Conflito resolvido' } }
        }
      },
      '/categorize-single': {
        post: {
          tags: ['Curadoria'],
          summary: 'Categoriza um artigo usando IA',
          requestBody: {
            content: { 'application/json': { schema: { type: 'object', properties: { workId: { type: 'string' } } } } }
          },
          responses: { 200: { description: 'Categoria definida' } }
        }
      },
      '/batch-upload-zip': {
        post: {
          tags: ['Extração'],
          summary: 'Faz upload de um ZIP com vários PDFs para processamento',
          requestBody: {
            content: {
              'multipart/form-data': {
                schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } }
              }
            }
          },
          responses: { 200: { description: 'Processamento iniciado' } }
        }
      },
      '/batch-progress': {
        get: {
          tags: ['Extração'],
          summary: 'Consulta o progresso do processamento em lote',
          responses: { 200: { description: 'Objeto de progresso' } }
        }
      },
      '/fix-titles': {
        post: {
          tags: ['Manutenção'],
          summary: 'Tenta recuperar títulos ausentes no banco',
          responses: { 200: { description: 'Títulos atualizados' } }
        }
      },
      '/save': {
        post: {
          tags: ['Busca'],
          summary: 'Salva artigos selecionados da busca OpenAlex',
          requestBody: {
            content: { 'application/json': { schema: { type: 'object', properties: { selected_rows: { type: 'array', items: { type: 'object' } } } } } }
          },
          responses: { 200: { description: 'Dados salvos' } }
        }
      },
      '/delete-row': {
        post: {
          tags: ['Manutenção'],
          summary: 'Remove um artigo pelo seu ID de linha',
          requestBody: {
            content: { 'application/json': { schema: { type: 'object', properties: { row_number: { type: 'string' } } } } }
          },
          responses: { 200: { description: 'Registro removido' } }
        }
      },
      '/documents/{filename}': {
        get: {
          tags: ['Documentos'],
          summary: 'Visualiza ou baixa um arquivo PDF',
          parameters: [{ name: 'filename', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Arquivo PDF', content: { 'application/pdf': {} } } }
        }
      },
      '/download-all': {
        get: {
          tags: ['Documentos'],
          summary: 'Baixa todos os documentos curados em um ZIP',
          responses: { 200: { description: 'Arquivo ZIP', content: { 'application/zip': {} } } }
        }
      },
      '/manual-insert': {
        post: {
          tags: ['Extração'],
          summary: 'Insere um artigo manualmente (com ou sem PDF)',
          requestBody: {
            content: {
              'multipart/form-data': {
                schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' }, title: { type: 'string' }, category: { type: 'string' } } }
              }
            }
          },
          responses: { 201: { description: 'Inserido com sucesso' } }
        }
      },
      '/articles/{id}': {
        put: {
          tags: ['Artigos'],
          summary: 'Atualiza os dados de um artigo',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Article' } } } },
          responses: { 200: { description: 'Artigo atualizado' } }
        }
      },
      '/health': {
        get: {
          tags: ['Sistema'],
          summary: 'Verifica saúde da API',
          security: [],
          responses: { 200: { description: 'API está online' } }
        }
      },
      '/base-url': {
        get: {
          tags: ['Sistema'],
          summary: 'Obtém a URL base da rede configurada',
          responses: { 200: { description: 'URL Base' } }
        }
      },
      '/llm-logs': {
        get: {
          tags: ['Sistema'],
          summary: 'Obtém logs recentes do processamento LLM',
          responses: { 200: { description: 'Logs de texto' } }
        }
      }
    }
  },
  apis: [], // Usando definição manual para garantir que todas apareçam
};

const specs = swaggerJsdoc(options);

const swaggerOptions = {
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'list',
  },
  customSiteTitle: "Ciento API - Swagger Documentation",
};

module.exports = {
  swaggerUi,
  specs,
  swaggerOptions,
};
