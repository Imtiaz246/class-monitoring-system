import { createOpenAPIApp } from '../lib/swagger';
import { authRouter } from './auth-openapi';
import { usersRouter } from './users-openapi';

// Create unified documentation app that combines all OpenAPI specs
const unifiedDocsApp = createOpenAPIApp();

// Mount all routes under the unified app
unifiedDocsApp.route('/auth', authRouter);
unifiedDocsApp.route('/users', usersRouter);

// The unified app will automatically combine all mounted routes
// and generate a single OpenAPI spec with all endpoints

export { unifiedDocsApp };