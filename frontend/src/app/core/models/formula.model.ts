export interface FormulaDefinition {
  field: string;
  expression: string;
  variables: string[];
  required: boolean;
}

export interface FormulaDraft {
  field: string;
  expression: string;
}

export interface ApiError {
  code: string;
  message: string;
  field?: string;
}