import { createOpenAPIApp } from '../lib/swagger';
import { authRouter } from '../routes/open-api/auth-openapi';
import { usersRouter } from '../routes/open-api/users-openapi';
import { batchesRouter } from '../routes/open-api/batches-openapi';
import { sectionsRouter } from '../routes/open-api/sections-openapi';
import { roomsRouter } from '../routes/open-api/rooms-openapi';
import { coursesRouter } from '../routes/open-api/courses-openapi';

// Create unified documentation app that combines all OpenAPI specs
const unifiedDocsApp = createOpenAPIApp();

// Mount all routes under the unified app
unifiedDocsApp.route('/auth', authRouter);
unifiedDocsApp.route('v1/users', usersRouter);
unifiedDocsApp.route('v1/batches', batchesRouter);
unifiedDocsApp.route('v1/sections', sectionsRouter);
unifiedDocsApp.route('v1/rooms', roomsRouter);
unifiedDocsApp.route('v1/courses', coursesRouter);

// The unified app will automatically combine all mounted routes
// and generate a single OpenAPI spec with all endpoints

export { unifiedDocsApp };