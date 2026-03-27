import * as XLSX from 'xlsx';
import { CreateTradeDto } from '../../core/models/trade.model';

const HEADER_MAP: Record<string, keyof ParsedTradeRow> = {
  type: 'type',
  tradetype: 'type',
  position: 'tradePosition',
  tradeposition: 'tradePosition',
  token: 'token',
  tokenname: 'token',
  symbol: 'token',
  leverage: 'leverage',
  volume: 'volume',
  buyprice: 'buyPrice',
  sellprice: 'sellPrice',
  cost: 'brokerCost',
  brokercost: 'brokerCost',
  closedate: 'closeDate',
  date: 'closeDate',
};

interface ParsedTradeRow {
  type?: unknown;
  tradePosition?: unknown;
  token?: unknown;
  leverage?: unknown;
  volume?: unknown;
  buyPrice?: unknown;
  sellPrice?: unknown;
  brokerCost?: unknown;
  closeDate?: unknown;
}

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\[[^\]]*\]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

function normalizeRow(row: Record<string, unknown>): ParsedTradeRow {
  return Object.entries(row).reduce<ParsedTradeRow>((normalized, [header, value]) => {
    const key = HEADER_MAP[normalizeHeader(header)];
    if (!key) {
      return normalized;
    }

    normalized[key] = value;
    return normalized;
  }, {});
}

function parseRequiredString(value: unknown, field: string, rowNumber: number): string {
  const text = String(value ?? '').trim();
  if (!text) {
    throw new Error(`Row ${rowNumber}: ${field} is required`);
  }
  return text;
}

function parseNumber(value: unknown, field: string, rowNumber: number, fallback?: number): number {
  if ((value === '' || value === null || value === undefined) && fallback !== undefined) {
    return fallback;
  }

  if (typeof value === 'number') {
    return value;
  }

  const text = String(value ?? '').trim();
  if (!text) {
    throw new Error(`Row ${rowNumber}: ${field} is required`);
  }

  const normalized = text.includes(',') && !text.includes('.')
    ? text.replace(/\s+/g, '').replace(',', '.')
    : text.replace(/\s+/g, '').replace(/,/g, '');
  const parsed = Number(normalized);

  if (!Number.isFinite(parsed)) {
    throw new Error(`Row ${rowNumber}: ${field} must be a valid number`);
  }

  return parsed;
}

function formatDateParts(year: number, month: number, day: number): string {
  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

function parseCloseDate(value: unknown, rowNumber: number): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === 'number') {
    const parts = XLSX.SSF.parse_date_code(value);
    if (!parts) {
      throw new Error(`Row ${rowNumber}: closeDate must be a valid date`);
    }
    return formatDateParts(parts.y, parts.m, parts.d);
  }

  const text = String(value ?? '').trim();
  if (!text) {
    throw new Error(`Row ${rowNumber}: closeDate is required`);
  }

  const dottedMatch = text.match(/^(\d{4})[./-](\d{2})[./-](\d{2})$/);
  if (dottedMatch) {
    return `${dottedMatch[1]}-${dottedMatch[2]}-${dottedMatch[3]}`;
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Row ${rowNumber}: closeDate must be a valid date`);
  }

  return parsed.toISOString().slice(0, 10);
}

function normalizeTradePosition(value: string, rowNumber: number): 'long' | 'short' {
  const normalized = value.trim().toLowerCase();
  if (normalized !== 'long' && normalized !== 'short') {
    throw new Error(`Row ${rowNumber}: position must be LONG or SHORT`);
  }
  return normalized;
}

export function mapImportedTradeRow(row: Record<string, unknown>, rowNumber: number): CreateTradeDto {
  const normalized = normalizeRow(row);
  const token = parseRequiredString(normalized.token, 'token', rowNumber).toUpperCase();

  return {
    token,
    position: token,
    tradePosition: normalizeTradePosition(parseRequiredString(normalized.tradePosition, 'position', rowNumber), rowNumber),
    type: parseRequiredString(normalized.type, 'type', rowNumber).toLowerCase(),
    brokerCost: parseNumber(normalized.brokerCost, 'brokerCost', rowNumber, 0),
    leverage: parseNumber(normalized.leverage, 'leverage', rowNumber),
    volume: parseNumber(normalized.volume, 'volume', rowNumber),
    buyPrice: parseNumber(normalized.buyPrice, 'buyPrice', rowNumber),
    sellPrice: parseNumber(normalized.sellPrice, 'sellPrice', rowNumber),
    closeDate: parseCloseDate(normalized.closeDate, rowNumber),
  };
}

function isMeaningfulRow(row: Record<string, unknown>): boolean {
  return Object.values(row).some((value) => {
    if (typeof value === 'number') {
      return !Number.isNaN(value);
    }
    return String(value ?? '').trim() !== '';
  });
}

export async function readTradeWorkbook(file: File): Promise<CreateTradeDto[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error('The Excel file does not contain any sheets');
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: true,
  }).filter(isMeaningfulRow);

  if (rows.length === 0) {
    throw new Error('The Excel file does not contain any trade rows');
  }

  return rows.map((row, index) => mapImportedTradeRow(row, index + 2));
}