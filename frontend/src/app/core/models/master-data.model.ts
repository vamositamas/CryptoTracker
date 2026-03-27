export type MasterDataType = 'tokens' | 'trade-types' | 'positions';

export interface MasterDataToken {
  id: string;
  symbol: string;
  name: string;
}

export interface MasterDataItem {
  id: string;
  name: string;
}

export type MasterDataEntry = MasterDataToken | MasterDataItem;

export interface MasterDataConfig {
  type: MasterDataType;
  tabLabel: string;
  singularLabel: string;
  fieldLabel: string;
  emptyLabel: string;
  addLabel: string;
}

export interface ApiError {
  code: string;
  message: string;
  field?: string;
}
