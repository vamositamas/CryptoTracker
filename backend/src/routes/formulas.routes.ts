import { Request, Response, Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permission.middleware';
import {
  EditableFormulaInput,
  FormulaDefinition,
  REQUIRED_EDITABLE_FORMULA_FIELDS,
  formulaService,
} from '../services/formula.service';

const router = Router();
router.use(authMiddleware);
router.use(requirePermission('formulas:manage'));

interface FormulaRequestBody {
  formulas?: EditableFormulaInput[];
}

function toResponse(definitions: FormulaDefinition[]) {
  return definitions.map((definition) => ({
    field: definition.field,
    expression: definition.expression,
    variables: definition.variables,
    required: REQUIRED_EDITABLE_FORMULA_FIELDS.includes(definition.field as (typeof REQUIRED_EDITABLE_FORMULA_FIELDS)[number]),
  }));
}

router.get('/', (_req: Request, res: Response) => {
  res.json({ formulas: toResponse(formulaService.getEditableDefinitions()) });
});

router.post('/preview', async (req: Request, res: Response) => {
  const formulas = (req.body as FormulaRequestBody | undefined)?.formulas;

  if (!Array.isArray(formulas)) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'formulas must be an array',
        field: 'formulas',
      },
    });
    return;
  }

  try {
    const preview = formulaService.previewEditableDefinitions(formulas);
    res.json({ formulas: toResponse(preview) });
  } catch (err) {
    res.status(400).json({
      error: {
        code: 'INVALID_FORMULA_CONFIG',
        message: (err as Error).message,
      },
    });
  }
});

router.put('/', async (req: Request, res: Response) => {
  const formulas = (req.body as FormulaRequestBody | undefined)?.formulas;

  if (!Array.isArray(formulas)) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'formulas must be an array',
        field: 'formulas',
      },
    });
    return;
  }

  try {
    const saved = await formulaService.replaceEditableDefinitions(formulas);
    res.json({ formulas: toResponse(saved) });
  } catch (err) {
    res.status(400).json({
      error: {
        code: 'INVALID_FORMULA_CONFIG',
        message: (err as Error).message,
      },
    });
  }
});

export default router;