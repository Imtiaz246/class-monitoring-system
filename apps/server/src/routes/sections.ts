import { Hono } from "hono";
import { zValidator } from "../utils/validation";
import { createSectionSchema, uuidParamSchema } from "../utils/validation";
import { requireAdmin } from "../middleware/auth";
import { AppError, createError } from "../utils/errors";
import type { HonoContext } from "../utils/types";
import { SectionService } from "../services/section.service";

const sectionsRouter = new Hono<HonoContext>();

// Create a section
sectionsRouter.post('/', requireAdmin, zValidator('json', createSectionSchema), async (c) => {
  try {
    const data = c.req.valid("json");
    const user = c.get("user")!;
    
    const result = await SectionService.createSection(data, user.id);
    return c.json(result, 201);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('Create section error:', error);
    throw createError.internalServer('Failed to create section');
  }
});

// Get section by batch id
sectionsRouter.get('/:id', zValidator('param', uuidParamSchema), async (c) => {
  try {
    const { id: batchId } = c.req.valid("param");
    
    const result = await SectionService.getSectionsByBatchId(batchId);
    return c.json(result, 200);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('Get sections error:', error);
    throw createError.internalServer("Failed to fetch sections");
  }
});

export { sectionsRouter };