export interface AuditEntry {
  id: string;
  timestamp: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  traderId: string;
  entityId: string;
  field?: string;
  previousValue: unknown;
  newValue: unknown;
}

export interface AuditFilterState {
  action: '' | 'CREATE' | 'UPDATE' | 'DELETE';
  dateFrom: string;
  dateTo: string;
}
