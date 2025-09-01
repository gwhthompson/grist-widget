/**
 * Standalone type definitions for Grist Plugin API
 * Extracted from grist-core with external dependencies removed
 */

// Basic types
export type UIRowId = number | 'new'
export type ComponentKind = 'safeBrowser' | 'safePython' | 'unsafeNode'

// Grist object codes for encoded cell values
export enum GristObjCode {
  List = 'L',
  LookUp = 'l',
  Dict = 'O',
  DateTime = 'D',
  Date = 'd',
  Skip = 'S',
  Censored = 'C',
  Reference = 'R',
  ReferenceList = 'r',
  Exception = 'E',
  Pending = 'P',
  Unmarshallable = 'U',
  Versions = 'V',
}

// Cell value types
export type CellValue =
  | number
  | string
  | boolean
  | null
  | [GristObjCode, ...unknown[]]
export type GristType =
  | 'Any'
  | 'Attachments'
  | 'Blob'
  | 'Bool'
  | 'Choice'
  | 'ChoiceList'
  | 'Date'
  | 'DateTime'
  | 'Id'
  | 'Int'
  | 'ManualSortPos'
  | 'Numeric'
  | 'PositionNumber'
  | 'Ref'
  | 'RefList'
  | 'Text'

// Core interfaces
export interface CursorPos {
  rowId?: UIRowId
  rowIndex?: number
  fieldIndex?: number
  sectionId?: number
  linkingRowIds?: UIRowId[]
}

export interface FetchSelectedOptions {
  keepEncoded?: boolean
  format?: 'rows' | 'columns'
  includeColumns?: 'shown' | 'normal' | 'all'
  expandRefs?: boolean
}

export interface AccessTokenOptions {
  readOnly?: boolean
}

export interface AccessTokenResult {
  token: string
  baseUrl: string
  ttlMsecs: number
}

// Core API interfaces
export interface GristAPI {
  render: (path: string, target: string, options?: any) => Promise<number>
  dispose: (procId: number) => Promise<void>
  subscribe: (tableId: string) => Promise<void>
  unsubscribe: (tableId: string) => Promise<void>
}

export interface GristDocAPI {
  getDocName: () => Promise<string>
  listTables: () => Promise<string[]>
  fetchTable: (tableId: string) => Promise<any>
  applyUserActions: (actions: any[][], options?: any) => Promise<any>
  getAccessToken: (options: AccessTokenOptions) => Promise<AccessTokenResult>
}

export interface GristView {
  fetchSelectedTable: (options?: FetchSelectedOptions) => Promise<any>
  fetchSelectedRecord: (
    rowId: number,
    options?: FetchSelectedOptions
  ) => Promise<any>
  allowSelectBy: () => Promise<void>
  setSelectedRows: (rowIds: number[] | null) => Promise<void>
  setCursorPos: (pos: CursorPos) => Promise<void>
}

// Data structures
export interface BulkColValues {
  [colId: string]: CellValue[]
}

export interface RowRecord {
  id: number
  [colId: string]: CellValue
}

export interface RowRecords {
  id: number[]
  [colId: string]: CellValue[]
}

// DocApi types for table operations
export type RecordId = number

export interface NewRecord {
  fields?: { [colId: string]: CellValue }
}

export interface Record {
  id: number
  fields: { [colId: string]: CellValue }
}

export interface AddOrUpdateRecord {
  require: { [colId: string]: CellValue } & { id?: number }
  fields?: { [colId: string]: CellValue }
}

export interface MinimalRecord {
  id: number
}

// Table operation options
export interface OpOptions {
  parseStrings?: boolean
}

export interface UpsertOptions extends OpOptions {
  add?: boolean
  update?: boolean
  onMany?: 'none' | 'first' | 'all'
  allowEmptyRequire?: boolean
}

// Widget API
export interface WidgetAPI {
  getOption: (key: string) => Promise<any>
  setOption: (key: string, value: any) => Promise<void>
  setOptions: (options: Record<string, any>) => Promise<void>
  getOptions: () => Promise<Record<string, any>>
  clearOptions: () => Promise<void>
}

// Custom Section API
export interface WidgetColumnMap {
  [widgetCol: string]: string | string[] | null
}

export type ColumnsToMap = Array<string | { name: string, optional?: boolean }>

export interface InteractionOptions {
  hasCustomOptions?: boolean
  columns?: ColumnsToMap
  requiredAccess?: 'none' | 'read table' | 'full'
  allowSelectBy?: boolean
  onEditOptions?: () => unknown
}

export interface CustomSectionAPI {
  mappings: () => Promise<WidgetColumnMap | null>
  configure: (options: InteractionOptions) => Promise<void>
}

// Table Operations with proper overloads
export interface TableOperations {
  getTableId: () => Promise<string>
  create: ((
    records: NewRecord,
    options?: OpOptions
  ) => Promise<MinimalRecord>) &
  ((records: NewRecord[], options?: OpOptions) => Promise<MinimalRecord[]>)
  update: (records: Record | Record[], options?: OpOptions) => Promise<void>
  destroy: (recordIds: RecordId | RecordId[]) => Promise<void>
  upsert: (
    records: AddOrUpdateRecord | AddOrUpdateRecord[],
    options?: UpsertOptions
  ) => Promise<void>
}

// Main grist object interface (simplified)
export interface GristPluginAPI {
  // Core APIs
  api: GristAPI
  docApi: GristDocAPI & GristView
  viewApi: GristView
  widgetApi: WidgetAPI
  sectionApi: CustomSectionAPI

  // Helper functions
  getTable: (tableId?: string) => TableOperations
  getAccessToken: (options?: AccessTokenOptions) => Promise<AccessTokenResult>
  getSelectedTableId: () => Promise<string>
  getSelectedTableIdSync: () => string | undefined

  // Event handlers
  onRecord: (
    callback: (
      data: RowRecord | null,
      mappings: WidgetColumnMap | null
    ) => unknown,
    options?: FetchSelectedOptions
  ) => void
  onRecords: (
    callback: (data: RowRecord[], mappings: WidgetColumnMap | null) => unknown,
    options?: FetchSelectedOptions
  ) => void
  onNewRecord: (
    callback: (mappings: WidgetColumnMap | null) => unknown
  ) => void
  onOptions: (
    callback: (options: any, settings: InteractionOptions) => unknown
  ) => void

  // Utility functions
  fetchSelectedTable: (options?: FetchSelectedOptions) => Promise<any>
  fetchSelectedRecord: (
    rowId: number,
    options?: FetchSelectedOptions
  ) => Promise<any>
  allowSelectBy: () => Promise<void>
  setSelectedRows: (rowIds: number[] | null) => Promise<void>
  setCursorPos: (pos: CursorPos) => Promise<void>
  getOption: (key: string) => Promise<any>
  setOption: (key: string, value: any) => Promise<void>
  setOptions: (options: Record<string, any>) => Promise<void>
  getOptions: () => Promise<Record<string, any>>
  clearOptions: () => Promise<void>
  mapColumnNames: (data: any, options?: any) => any
  mapColumnNamesBack: (data: any, options?: any) => any

  // Initialization
  ready: (settings?: InteractionOptions) => void
  enableKeyboardShortcuts: () => void
}

// Global grist object (for browser environments)
declare global {
  const grist: GristPluginAPI
}

export default GristPluginAPI
