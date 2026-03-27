export interface ApiErrorShape {
  code: string;
  message: string;
  field?: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: ApiErrorShape;
}

/**
 * Validates the 7 raw fields of a create/update trade request.
 * Returns the first validation failure found, or { valid: true }.
 */
export function validateCreateTradeDto(body: Record<string, unknown>): ValidationResult {
  const required: Array<[string, string]> = [
    ['type', 'Trade type is required'],
    ['position', 'Token / position is required'],
  ];

  for (const [field, message] of required) {
    if (!body[field] || typeof body[field] !== 'string' || (body[field] as string).trim() === '') {
      return { valid: false, error: { code: 'VALIDATION_ERROR', message, field } as ApiErrorShape };
    }
  }

  if ('tradePosition' in body) {
    const tradePosition = body['tradePosition'];
    if (typeof tradePosition !== 'string' || tradePosition.trim() === '') {
      return {
        valid: false,
        error: { code: 'VALIDATION_ERROR', message: 'Trade position is required', field: 'tradePosition' },
      };
    }
  }

  const positiveNumbers: Array<[string, string]> = [
    ['leverage', 'Leverage must be a number greater than 0'],
    ['volume', 'Volume must be a number greater than 0'],
    ['buyPrice', 'Buy price must be a number greater than 0'],
    ['sellPrice', 'Sell price must be a number greater than 0'],
  ];

  for (const [field, message] of positiveNumbers) {
    const value = body[field];
    if (value === undefined || value === null || value === '') {
      return { valid: false, error: { code: 'VALIDATION_ERROR', message: `${field.charAt(0).toUpperCase() + field.slice(1)} is required`, field } };
    }
    const num = Number(value);
    if (isNaN(num) || num <= 0) {
      return { valid: false, error: { code: 'VALIDATION_ERROR', message, field } };
    }
  }

  if (body['brokerCost'] !== undefined && body['brokerCost'] !== null && body['brokerCost'] !== '') {
    const brokerCost = Number(body['brokerCost']);
    if (isNaN(brokerCost) || brokerCost < 0) {
      return {
        valid: false,
        error: { code: 'VALIDATION_ERROR', message: 'Broker cost must be a number greater than or equal to 0', field: 'brokerCost' },
      };
    }
  }

  const closeDate = body['closeDate'];
  if (!closeDate || typeof closeDate !== 'string' || closeDate.trim() === '') {
    return { valid: false, error: { code: 'VALIDATION_ERROR', message: 'Close date is required', field: 'closeDate' } };
  }
  const parsedDate = Date.parse(closeDate as string);
  if (isNaN(parsedDate)) {
    return {
      valid: false,
      error: { code: 'VALIDATION_ERROR', message: 'Close date must be a valid date string', field: 'closeDate' },
    };
  }

  return { valid: true };
}
