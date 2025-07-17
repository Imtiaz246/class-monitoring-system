import { createOpenAPIApp } from '../lib/swagger';
import { authRouter } from './auth-openapi';
import { usersRouter } from './users-openapi';
import { batchesRouter } from './batches-openapi';
import { sectionsRouter } from './sections-openapi';
import { roomsRouter } from './rooms-openapi';

// Create unified documentation app that combines all OpenAPI specs
const unifiedDocsApp = createOpenAPIApp();

// Mount all routes under the unified app
unifiedDocsApp.route('/auth', authRouter);
unifiedDocsApp.route('v1/users', usersRouter);
unifiedDocsApp.route('v1/batches', batchesRouter);
unifiedDocsApp.route('v1/sections', sectionsRouter);
unifiedDocsApp.route('v1/rooms', roomsRouter);

// The unified app will automatically combine all mounted routes
// and generate a single OpenAPI spec with all endpoints

export { unifiedDocsApp };