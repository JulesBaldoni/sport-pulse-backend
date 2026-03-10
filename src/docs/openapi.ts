// ─── Reusable schema objects ──────────────────────────────────────────────────

const ErrorResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: false },
    error: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'NOT_FOUND' },
        message: { type: 'string', example: 'Resource not found' },
        details: { description: 'Optional structured error details' },
      },
      required: ['code', 'message'],
    },
  },
  required: ['success', 'error'],
};

const PaginationMetaSchema = {
  type: 'object',
  properties: {
    nextCursor: { type: 'string', nullable: true, example: 'eyJpZCI6IjEyMyJ9' },
    hasMore: { type: 'boolean', example: true },
    count: { type: 'integer', example: 20 },
  },
  required: ['nextCursor', 'hasMore', 'count'],
};

const SportSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string', example: 'Football' },
    slug: { type: 'string', example: 'football' },
    created_at: { type: 'string', format: 'date-time' },
  },
  required: ['id', 'name', 'slug', 'created_at'],
};

const TeamSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    external_id: { type: 'string', example: '85' },
    name: { type: 'string', example: 'Paris Saint-Germain' },
    short_name: { type: 'string', nullable: true, example: 'PSG' },
    logo_url: { type: 'string', nullable: true, example: 'https://media.api-sports.io/football/teams/85.png' },
    sport_id: { type: 'string', format: 'uuid' },
    country: { type: 'string', nullable: true, example: 'France' },
    created_at: { type: 'string', format: 'date-time' },
  },
  required: ['id', 'external_id', 'name', 'sport_id', 'created_at'],
};

const EventStatusSchema = {
  type: 'string',
  enum: ['scheduled', 'live', 'finished', 'cancelled'],
};

const EventSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    external_id: { type: 'string', example: '867946' },
    sport_id: { type: 'string', format: 'uuid' },
    home_team_id: { type: 'string', format: 'uuid' },
    away_team_id: { type: 'string', format: 'uuid' },
    home_score: { type: 'integer', nullable: true, example: 2 },
    away_score: { type: 'integer', nullable: true, example: 1 },
    venue: { type: 'string', nullable: true, example: 'Parc des Princes' },
    competition: { type: 'string', nullable: true, example: 'Ligue 1' },
    status: EventStatusSchema,
    started_at: { type: 'string', format: 'date-time' },
    created_at: { type: 'string', format: 'date-time' },
  },
  required: ['id', 'external_id', 'sport_id', 'home_team_id', 'away_team_id', 'status', 'started_at', 'created_at'],
};

const ArticleStatusSchema = {
  type: 'string',
  enum: ['pending', 'generating', 'published', 'failed'],
};

const ArticleToneSchema = {
  type: 'string',
  enum: ['neutral', 'analytical', 'enthusiastic'],
};

const ArticleLanguageSchema = {
  type: 'string',
  enum: ['fr', 'en'],
};

const ArticleSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    event_id: { type: 'string', format: 'uuid', nullable: true },
    sport_id: { type: 'string', format: 'uuid' },
    title: { type: 'string', example: 'PSG domine l\'OM dans un classique intense' },
    summary: { type: 'string', nullable: true, example: 'Le Paris Saint-Germain a remporté le classique face à l\'Olympique de Marseille.' },
    content: { type: 'string', example: 'Article complet...' },
    tone: ArticleToneSchema,
    language: ArticleLanguageSchema,
    status: ArticleStatusSchema,
    sources: { type: 'array', items: { type: 'string', format: 'uri' } },
    generated_at: { type: 'string', format: 'date-time', nullable: true },
    created_at: { type: 'string', format: 'date-time' },
    deleted_at: { type: 'string', format: 'date-time', nullable: true },
  },
  required: ['id', 'sport_id', 'title', 'content', 'tone', 'language', 'status', 'sources', 'created_at'],
};

const UserSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    email: { type: 'string', format: 'email', example: 'user@example.com' },
    display_name: { type: 'string', nullable: true, example: 'Jules' },
    preferred_sports: { type: 'array', items: { type: 'string' }, example: ['football', 'basketball'] },
    preferred_language: ArticleLanguageSchema,
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
  },
  required: ['id', 'email', 'preferred_sports', 'preferred_language', 'created_at', 'updated_at'],
};

// ─── Common query params ──────────────────────────────────────────────────────

const cursorParam = {
  name: 'cursor',
  in: 'query',
  description: 'Base64url-encoded cursor for pagination (from previous response meta.nextCursor)',
  schema: { type: 'string' },
};

const limitParam = {
  name: 'limit',
  in: 'query',
  description: 'Number of results per page (1–100, default 20)',
  schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
};

const sportIdParam = {
  name: 'sport_id',
  in: 'query',
  description: 'Filter by sport UUID',
  schema: { type: 'string', format: 'uuid' },
};

// ─── Common responses ─────────────────────────────────────────────────────────

const unauthorizedResponse = {
  description: 'Missing or invalid x-user-id header',
  content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
};

const notFoundResponse = {
  description: 'Resource not found',
  content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
};

const validationErrorResponse = {
  description: 'Invalid request parameters or body',
  content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
};

// ─── Spec ─────────────────────────────────────────────────────────────────────

export const openApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'SportPulse API',
    version: '1.0.0',
    description: 'REST API for SportPulse — AI-generated sports news articles based on real match data and sourced press content.',
    contact: { name: 'SportPulse' },
  },
  servers: [
    { url: 'http://localhost:3000', description: 'Development' },
    { url: 'https://api.sportpulse.app', description: 'Production' },
  ],
  tags: [
    { name: 'Health', description: 'Server health check' },
    { name: 'Sports', description: 'Sports categories' },
    { name: 'Events', description: 'Sports events and match results' },
    { name: 'Articles', description: 'AI-generated sports news articles' },
    { name: 'Users', description: 'User preferences' },
  ],
  components: {
    securitySchemes: {
      UserIdHeader: {
        type: 'apiKey',
        in: 'header',
        name: 'x-user-id',
        description: 'User UUID — required for write operations',
      },
    },
    schemas: {
      Sport: SportSchema,
      Team: TeamSchema,
      Event: EventSchema,
      Article: ArticleSchema,
      User: UserSchema,
      PaginationMeta: PaginationMetaSchema,
      ErrorResponse: ErrorResponseSchema,
      ArticleStatus: ArticleStatusSchema,
      ArticleTone: ArticleToneSchema,
      ArticleLanguage: ArticleLanguageSchema,
      EventStatus: EventStatusSchema,
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        description: 'Returns the current server status, timestamp and environment.',
        operationId: 'getHealth',
        responses: {
          '200': {
            description: 'Server is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    timestamp: { type: 'string', format: 'date-time' },
                    environment: { type: 'string', enum: ['development', 'production', 'test'] },
                  },
                  required: ['status', 'timestamp', 'environment'],
                },
              },
            },
          },
        },
      },
    },

    '/api/sports': {
      get: {
        tags: ['Sports'],
        summary: 'List all sports',
        description: 'Returns all available sports ordered alphabetically.',
        operationId: 'listSports',
        responses: {
          '200': {
            description: 'List of sports',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { type: 'array', items: { $ref: '#/components/schemas/Sport' } },
                  },
                },
              },
            },
          },
        },
      },
    },

    '/api/events': {
      get: {
        tags: ['Events'],
        summary: 'List events',
        description: 'Returns a paginated list of sports events, optionally filtered by sport and status.',
        operationId: 'listEvents',
        parameters: [
          sportIdParam,
          {
            name: 'status',
            in: 'query',
            description: 'Filter by event status',
            schema: { $ref: '#/components/schemas/EventStatus' },
          },
          cursorParam,
          limitParam,
        ],
        responses: {
          '200': {
            description: 'Paginated list of events',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        data: { type: 'array', items: { $ref: '#/components/schemas/Event' } },
                        meta: { $ref: '#/components/schemas/PaginationMeta' },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': validationErrorResponse,
        },
      },
    },

    '/api/events/{id}': {
      get: {
        tags: ['Events'],
        summary: 'Get event by ID',
        description: 'Returns a single event with related sport, teams, and article if available.',
        operationId: 'getEventById',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Event UUID',
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': {
            description: 'Event with relations',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Event' },
                  },
                },
              },
            },
          },
          '400': validationErrorResponse,
          '404': notFoundResponse,
        },
      },
    },

    '/api/events/sync': {
      post: {
        tags: ['Events'],
        summary: 'Trigger events sync',
        description: 'Manually triggers the events sync pipeline: fetches recent finished fixtures from the Sports API, upserts teams and events in the database.',
        operationId: 'syncEvents',
        security: [{ UserIdHeader: [] }],
        responses: {
          '200': {
            description: 'Sync completed',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        synced: { type: 'integer', example: 5, description: 'Number of events upserted' },
                      },
                      required: ['synced'],
                    },
                  },
                },
              },
            },
          },
          '401': unauthorizedResponse,
          '502': {
            description: 'Sports API unreachable or returned an error',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
    },

    '/api/articles': {
      get: {
        tags: ['Articles'],
        summary: 'List published articles',
        description: 'Returns a paginated list of published, non-deleted articles. Ordered by creation date descending.',
        operationId: 'listArticles',
        parameters: [
          sportIdParam,
          {
            name: 'language',
            in: 'query',
            description: 'Filter by language',
            schema: { $ref: '#/components/schemas/ArticleLanguage' },
          },
          cursorParam,
          limitParam,
        ],
        responses: {
          '200': {
            description: 'Paginated list of articles',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        data: { type: 'array', items: { $ref: '#/components/schemas/Article' } },
                        meta: { $ref: '#/components/schemas/PaginationMeta' },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': validationErrorResponse,
        },
      },
    },

    '/api/articles/search': {
      get: {
        tags: ['Articles'],
        summary: 'Full-text search articles',
        description: 'Searches published articles using PostgreSQL full-text search on title and content.',
        operationId: 'searchArticles',
        parameters: [
          {
            name: 'q',
            in: 'query',
            required: true,
            description: 'Search query (2–200 characters)',
            schema: { type: 'string', minLength: 2, maxLength: 200 },
          },
          sportIdParam,
          {
            name: 'language',
            in: 'query',
            description: 'Filter by language',
            schema: { $ref: '#/components/schemas/ArticleLanguage' },
          },
          cursorParam,
          limitParam,
        ],
        responses: {
          '200': {
            description: 'Paginated search results',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        data: { type: 'array', items: { $ref: '#/components/schemas/Article' } },
                        meta: { $ref: '#/components/schemas/PaginationMeta' },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': validationErrorResponse,
        },
      },
    },

    '/api/articles/{id}': {
      get: {
        tags: ['Articles'],
        summary: 'Get article by ID',
        description: 'Returns a single published article with related sport and event data.',
        operationId: 'getArticleById',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Article UUID',
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': {
            description: 'Article with relations',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Article' },
                  },
                },
              },
            },
          },
          '400': validationErrorResponse,
          '404': notFoundResponse,
        },
      },
      delete: {
        tags: ['Articles'],
        summary: 'Soft-delete an article',
        description: 'Marks an article as deleted (sets deleted_at). The article is no longer returned in list or search results.',
        operationId: 'deleteArticle',
        security: [{ UserIdHeader: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Article UUID',
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': {
            description: 'Article deleted',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: { deleted: { type: 'boolean', example: true } },
                    },
                  },
                },
              },
            },
          },
          '401': unauthorizedResponse,
          '404': notFoundResponse,
        },
      },
    },

    '/api/articles/generate': {
      post: {
        tags: ['Articles'],
        summary: 'Trigger AI article generation',
        description: 'Creates a pending article record and enqueues an async generation job. The article will be generated by the worker using Mistral AI and press excerpts.',
        operationId: 'generateArticle',
        security: [{ UserIdHeader: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  event_id: { type: 'string', format: 'uuid', description: 'UUID of the event to generate an article for' },
                  language: { $ref: '#/components/schemas/ArticleLanguage' },
                  tone: { $ref: '#/components/schemas/ArticleTone' },
                },
                required: ['event_id'],
              },
            },
          },
        },
        responses: {
          '202': {
            description: 'Article generation queued (async)',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Article' },
                  },
                },
              },
            },
          },
          '400': validationErrorResponse,
          '401': unauthorizedResponse,
          '404': {
            description: 'Event not found',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
          '409': {
            description: 'An article already exists for this event',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
    },

    '/api/users/me': {
      get: {
        tags: ['Users'],
        summary: 'Get current user',
        description: 'Returns the profile and preferences of the authenticated user.',
        operationId: 'getMe',
        security: [{ UserIdHeader: [] }],
        responses: {
          '200': {
            description: 'User profile',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
          '401': unauthorizedResponse,
          '404': notFoundResponse,
        },
      },
    },

    '/api/users/me/preferences': {
      patch: {
        tags: ['Users'],
        summary: 'Update user preferences',
        description: 'Updates the preferred sports and/or language for the authenticated user.',
        operationId: 'updatePreferences',
        security: [{ UserIdHeader: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  preferred_sports: {
                    type: 'array',
                    items: { type: 'string' },
                    example: ['football', 'basketball'],
                    description: 'Array of sport slugs',
                  },
                  preferred_language: { $ref: '#/components/schemas/ArticleLanguage' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Updated user profile',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
          '400': validationErrorResponse,
          '401': unauthorizedResponse,
          '404': notFoundResponse,
        },
      },
    },
  },
};

