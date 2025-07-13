import { createOpenAPIApp } from '../lib/swagger';
import { authRouter } from './auth-openapi';
import { usersRouter } from './users-openapi';
import { batchesRouter } from './batches-openapi';

// Create unified API documentation
const apiDocsRouter = createOpenAPIApp();

// Mount all OpenAPI routes under unified documentation
apiDocsRouter.route('/auth', authRouter);
apiDocsRouter.route('/users', usersRouter);
apiDocsRouter.route('/batches', batchesRouter);

// Add a custom route to list all available documentation sections
apiDocsRouter.get('/sections', (c) => {
  return c.json({
    message: 'Available API Documentation Sections',
    sections: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization endpoints',
        path: '/auth',
        swaggerUI: '/auth/ui',
        openAPISpec: '/auth/doc'
      },
      {
        name: 'User Management', 
        description: 'User creation, retrieval, and management endpoints',
        path: '/users',
        swaggerUI: '/users/ui',
        openAPISpec: '/users/doc'
      },
      {
        name: 'Batch Management',
        description: 'Batch creation, retrieval, and management endpoints',
        path: '/batches',
        swaggerUI: '/batches/ui',
        openAPISpec: '/batches/doc'
      }
    ],
    note: 'Visit the individual Swagger UI endpoints to explore the APIs'
  });
});

export { apiDocsRouter };