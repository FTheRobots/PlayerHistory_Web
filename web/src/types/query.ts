export type QueryOperator =
  | 'eq'
  | 'ne'
  | 'in'
  | 'notIn'
  | 'contains'
  | 'startsWith'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'between'
  | 'isNull'
  | 'isNotNull';

export type QueryMode = 'events' | 'count' | 'groupBy' | 'topN' | 'timeseries';

export interface QueryFilter {
  field: string;
  op: QueryOperator;
  value?: string | number | boolean | string[];
  valueTo?: string | number;
}

export interface EventQueryRequest {
  filters?: QueryFilter[];
  mode?: QueryMode;
  groupBy?: string | string[];
  order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  timeseriesInterval?: 'hour' | 'day';
}

export interface QueryFieldDefinition {
  field: string;
  label: string;
  type: 'text' | 'number' | 'timestamp' | 'boolean';
  operators: QueryOperator[];
  description?: string;
  eventHints?: string[];
}

export interface QueryPreset {
  id: string;
  name: string;
  description: string;
  query: EventQueryRequest;
}

export interface QueryGroupRow {
  key: string;
  keys: Record<string, string | number | null>;
  count: number;
}

export interface EventQueryResult {
  mode: QueryMode;
  total: number;
  limit?: number;
  offset?: number;
  events?: import('./index').PlayerEvent[];
  count?: number;
  groups?: QueryGroupRow[];
  timeseries?: Array<{ bucket: string; count: number }>;
}

export interface SavedQueryRecord {
  id: number;
  name: string;
  description?: string;
  query: EventQueryRequest;
  isWatch: boolean;
  lastMatchCount?: number;
  lastWatchAt?: string;
}

export interface QueryWatchAlert {
  id: number;
  message: string;
  matchCount: number;
  previousCount: number;
  createdAt: string;
  read: boolean;
}
