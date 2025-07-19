import { createOpenAPIApp } from '../lib/swagger';
import { authRouter } from './auth-openapi';
import { usersRouter } from './users-openapi';
import { batchesRouter } from './batches-openapi';
import { sectionsRouter } from './sections-openapi';
import { roomsRouter } from './rooms-openapi';
import { coursesRouter } from './courses-openapi';

// Create unified API documentation
const apiDocsRouter = createOpenAPIApp();

// Mount all OpenAPI routes under unified documentation
apiDocsRouter.route('/auth', authRouter);
apiDocsRouter.route('/users', usersRouter);
apiDocsRouter.route('/batches', batchesRouter);
apiDocsRouter.route('/sections', sectionsRouter);
apiDocsRouter.route('/rooms', roomsRouter);
apiDocsRouter.route('/courses', coursesRouter);

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
      },
      {
        name: 'Section Management',
        description: 'Section creation, retrieval, and management endpoints',
        path: '/sections',
        swaggerUI: '/sections/ui',
        openAPISpec: '/sections/doc'
      },
      {
        name: 'Room Management',
        description: 'Room creation, retrieval, update, and deletion endpoints',
        path: '/rooms',
        swaggerUI: '/rooms/ui',
        openAPISpec: '/rooms/doc'
      },
      {
        name: 'Course Management',
        description: 'Course creation, retrieval, update, deletion, and teacher assignment endpoints',
        path: '/courses',
        swaggerUI: '/courses/ui',
        openAPISpec: '/courses/doc'
      }
    ],
    note: 'Visit the individual Swagger UI endpoints to explore the APIs'
  });
});

export { apiDocsRouter };