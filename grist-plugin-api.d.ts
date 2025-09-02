/**
 * Standalone type definitions for Grist Plugin API
 * Extracted from grist-core with external dependencies removed
 *
 * ## Quick Start Guide
 *
 * ```typescript
 * // 1. Basic widget setup
 * grist.ready({
 *   requiredAccess: 'read table',
 *   columns: ['Name', 'Email']  // columns your widget needs
 * });
 *
 * // 2. Read data (easiest way)
 * const data = await grist.fetchSelectedTable();
 *
 * // 3. Listen for changes
 * grist.onRecord((record) => {
 *   console.log('Selected record:', record);
 * });
 *
 * // 4. Modify data
 * await tableOps.create({fields: {Name: 'John', Email: 'john@example.com'}});
 * ```
 *
 * ## API Overview
 *
 * **Table Operations (Recommended)** - Simple CRUD operations:
 * - `grist.getTable().create()` - Add records
 * - `grist.getTable().update()` - Modify records
 * - `grist.getTable().destroy()` - Delete records
 *
 * **User Actions (Advanced)** - Low-level document modifications:
 * - `grist.docApi.applyUserActions()` - Direct document manipulation
 * - Use for: creating tables, columns, complex operations
 *
 * **Widget API** - Widget configuration:
 * - `grist.getOption()` - Get widget settings
 * - `grist.onOptions()` - Listen for setting changes
 *
 * @version 1.0.0
 * @author Claude Code Assistant
 */

// Basic types
/** Row ID type - can be a number or 'new' for new rows */
export type UIRowId = number | "new";
/** Component execution environment types */
export type ComponentKind = "safeBrowser" | "safePython" | "unsafeNode";

// Grist object codes for encoded cell values
export enum GristObjCode {
  /** List/Array values */
  List = "L",
  /** Lookup values */
  LookUp = "l",
  /** Dictionary/Object values */
  Dict = "O",
  /** DateTime values */
  DateTime = "D",
  /** Date-only values */
  Date = "d",
  /** Skipped/ignored values */
  Skip = "S",
  /** Censored/hidden values */
  Censored = "C",
  /** Reference to another record */
  Reference = "R",
  /** List of references */
  ReferenceList = "r",
  /** Exception/error values */
  Exception = "E",
  /** Pending computation values */
  Pending = "P",
  /** Values that couldn't be unmarshalled */
  Unmarshallable = "U",
  /** Version information */
  Versions = "V",
}

// Cell value types
export type CellValue =
  | number
  | string
  | boolean
  | null
  | [GristObjCode, ...unknown[]];
/** Base Grist column types (without table references) */
export type GristBaseType =
  | "Any"
  | "Attachments"
  | "Bool"
  | "Choice"
  | "ChoiceList"
  | "Date"
  | "DateTime"
  | "Int"
  | "Numeric"
  | "Text";

/** Internal Grist column types (not user-facing) */
export type GristInternalType = "Id" | "ManualSortPos" | "PositionNumber";

/**
 * Reference column types - must specify target table
 * @example 'Ref:Users' for a reference to Users table
 * @example 'RefList:Products' for a reference list to Products table
 */
export type GristRefType = `Ref:${string}`;
export type GristRefListType = `RefList:${string}`;

/**
 * All possible Grist column types for use in ColumnInfo
 * Use this type when specifying column types in user actions
 */
export type GristColumnType =
  | GristBaseType
  | GristInternalType
  | GristRefType
  | GristRefListType;

/**
 * @deprecated Use GristColumnType instead - kept for compatibility
 * Note: 'Ref' and 'RefList' here are incomplete - real references need table names like 'Ref:TableName'
 */
export type GristType = GristBaseType | "Ref" | "RefList";

// Core interfaces
export interface CursorPos {
  /** Row ID to position cursor on */
  rowId?: UIRowId;
  /** Zero-based row index */
  rowIndex?: number;
  /** Zero-based field/column index */
  fieldIndex?: number;
  /** Section ID containing the cursor */
  sectionId?: number;
  /** Row IDs for linking (when cursor affects linked sections) */
  linkingRowIds?: UIRowId[];
}




export interface FetchSelectedOptions {
  /** Keep encoded cell values instead of decoding them */
  keepEncoded?: boolean;
  /** Return format: 'rows' (default) or 'columns' */
  format?: "rows" | "columns";
  /** Which columns to include: 'shown' (default), 'normal', or 'all' */
  includeColumns?: "shown" | "normal" | "all";
  /** Expand reference columns to show display values */
  expandRefs?: boolean;
}

export interface AccessTokenOptions {
  /** Whether the token should be read-only */
  readOnly?: boolean;
}

export interface AccessTokenResult {
  /** The access token string */
  token: string;
  /** Base URL for API requests */
  baseUrl: string;
  /** Token time-to-live in milliseconds */
  ttlMsecs: number;
}

// Core API interfaces
export interface GristAPI {
  /** Render a component at the specified path */
  render(path: string, target: string, options?: any): Promise<number>;
  /** Dispose of a process by ID */
  dispose(procId: number): Promise<void>;
  /** Subscribe to table updates */
  subscribe(tableId: TableId): Promise<void>;
  /** Unsubscribe from table updates */
  unsubscribe(tableId: TableId): Promise<void>;
}

export interface ApplyUserActionsResult {
  /** Action number that got recorded */
  actionNum: number;
  /** Hash of the action that got recorded */
  actionHash: string | null;
  /** Array of return values, one for each user action */
  retValues: any[];
  /** Whether the document was modified */
  isModification: boolean;
}

export interface GristDocAPI {
  /** Get the name of the current document */
  getDocName(): Promise<string>;
  /** Get list of all table IDs in the document */
  listTables(): Promise<TableId[]>;
  /** Fetch complete table data by table ID */
  fetchTable(tableId: TableId): Promise<any>;
  /** Apply user actions to modify the document */
  applyUserActions(
    actions: UserAction[],
    options?: any
  ): Promise<ApplyUserActionsResult>;
  /** Get an access token for out-of-band API access */
  getAccessToken(options: AccessTokenOptions): Promise<AccessTokenResult>;
}

export interface GristView {
  /** Fetch data from the currently selected table */
  fetchSelectedTable(options?: FetchSelectedOptions): Promise<any>;
  /** Fetch a specific record from the selected table */
  fetchSelectedRecord(
    rowId: number,
    options?: FetchSelectedOptions
  ): Promise<any>;
  /** Allow this widget to control selection in linked sections */
  allowSelectBy(): Promise<void>;
  /** Set which rows are selected (null clears selection) */
  setSelectedRows(rowIds: number[] | null): Promise<void>;
  /** Set the cursor position */
  setCursorPos(pos: CursorPos): Promise<void>;
}

// Data structures
export interface BulkColValues {
  /** Column values organized by column ID, with arrays for bulk operations */
  [colId: string]: CellValue[];
}

export interface RowRecord {
  /** The row ID */
  id: number;
  /** Column values keyed by column ID */
  [colId: string]: CellValue;
}

export interface RowRecords {
  /** Array of row IDs */
  id: number[];
  /** Column value arrays keyed by column ID */
  [colId: string]: CellValue[];
}

// DocApi types for table operations
export type RecordId = number;

export interface NewRecord {
  /** Field values for the new record */
  fields?: { [colId: string]: CellValue };
}

export interface Record {
  /** The record ID */
  id: number;
  /** Field values keyed by column ID */
  fields: { [colId: string]: CellValue };
}

export interface AddOrUpdateRecord {
  /** Required fields to match existing records (can include id) */
  require: { [colId: string]: CellValue } & { id?: number };
  /** Fields to update or set on new records */
  fields?: { [colId: string]: CellValue };
}

export interface MinimalRecord {
  /** The record ID */
  id: number;
}

// Table operation options
export interface OpOptions {
  /** Whether to parse string values based on column types */
  parseStrings?: boolean;
}

export interface TableUpsertOptions extends OpOptions {
  /** Whether to add new records (default: true) */
  add?: boolean;
  /** Whether to update existing records (default: true) */
  update?: boolean;
  /** How to handle multiple matches: 'none', 'first' (default), 'all' */
  onMany?: "none" | "first" | "all";
  /** Whether to allow empty require conditions */
  allowEmptyRequire?: boolean;
}

// Widget API
export interface WidgetAPI {
  /** Get a widget configuration option by key */
  getOption(key: string): Promise<any>;
  /** Set a widget configuration option */
  setOption(key: string, value: any): Promise<void>;
  /** Set multiple widget configuration options */
  setOptions(options: Record<string, any>): Promise<void>;
  /** Get all widget configuration options */
  getOptions(): Promise<Record<string, any>>;
  /** Clear all widget configuration options */
  clearOptions(): Promise<void>;
}

// Custom Section API
export interface WidgetColumnMap {
  /** Maps widget column names to Grist column IDs or arrays of IDs */
  [widgetCol: string]: string | string[] | null;
}

export type ColumnsToMap = Array<string | { name: string; optional?: boolean }>;

/** Widget access levels */
export type AccessLevel = "none" | "read table" | "full";

export interface InteractionOptions {
  /** Whether the widget has custom configuration options */
  hasCustomOptions?: boolean;
  /** Columns the widget wants to map */
  columns?: ColumnsToMap;
  /** Required access level for the widget */
  requiredAccess?: AccessLevel;
  /** Whether the widget can control selection in linked sections */
  allowSelectBy?: boolean;
  /** Callback when user wants to edit widget options */
  onEditOptions?: () => unknown;
}

export interface CustomSectionAPI {
  /** Get current column mappings */
  mappings(): Promise<WidgetColumnMap | null>;
  /** Configure widget interaction options */
  configure(options: InteractionOptions): Promise<void>;
}

// Table Operations with proper overloads
export interface TableOperations {
  /** Get the table ID this operations object refers to */
  getTableId(): Promise<TableId>;
  /** Create a single record */
  create(records: NewRecord, options?: OpOptions): Promise<MinimalRecord>;
  /** Create multiple records */
  create(records: NewRecord[], options?: OpOptions): Promise<MinimalRecord[]>;
  /** Update single or multiple records */
  update(records: Record | Record[], options?: OpOptions): Promise<void>;
  /** Delete records by ID */
  destroy(recordIds: RecordId | RecordId[]): Promise<void>;
  /** Insert or update records (upsert operation) */
  upsert(
    records: AddOrUpdateRecord | AddOrUpdateRecord[],
    options?: TableUpsertOptions
  ): Promise<void>;
}

// User Actions for applyUserActions

// Type aliases for clarity
export type TableId = string;
export type ColumnId = string;
export type RowId = number;
export type ViewId = number;
export type PageId = number;
/** View section types (parentKey values) */
export type ViewType = "record" | "single" | "chart" | "custom";

/** RecalcWhen constants for when formulas should recalculate */
export enum RecalcWhen {
  /** Calculate on new records or when any field in recalcDeps changes */
  DEFAULT = 0,
  /** Don't calculate automatically (user can trigger manually) */
  NEVER = 1,
  /** Calculate on new records and on manual updates to any data field */
  MANUAL_UPDATES = 2,
}

export interface ColumnInfo {
  /** The column identifier */
  id: ColumnId;
  /** Column data type (use 'Ref:TableName' for references) */
  type?: GristColumnType;
  /** Display label for the column */
  label?: string;
  /** Column description */
  description?: string;
  /** Formula expression (for formula columns) */
  formula?: string;
  /** Whether this is a formula column */
  isFormula?: boolean;
  /** JSON string of widget-specific options */
  widgetOptions?: string;
  /** Whether column ID is independent of label changes */
  untieColIdFromLabel?: boolean;
  /** Row ID of column record to use for display (for Reference columns) */
  visibleCol?: number;
  /** Row ID of column record for display values */
  displayCol?: number;
  /** Row ID of column record for reverse references */
  reverseCol?: number;
  /** Column ID for reverse references (deprecated, use reverseCol) */
  reverseColId?: ColumnId;
  /** Row ID of summary source column (for summary tables) */
  summarySourceCol?: number;
  /** List of conditional formatting rule column IDs */
  rules?: number[];
  /** When to recalculate formula for data columns */
  recalcWhen?: RecalcWhen;
  /** List of column IDs that trigger recalculation (when recalcWhen is DEFAULT) */
  recalcDeps?: number[];
}

// Options for AddOrUpdate user actions
export interface ActionUpsertOptions {
  /** How to handle multiple matching records: 'first' (default), 'all', or 'none' */
  onMany?: "first" | "all" | "none";
  /** Whether to update existing records (default: true) */
  update?: boolean;
  /** Whether to add new records (default: true) */
  add?: boolean;
  /** Whether to allow empty require conditions */
  allowEmptyRequire?: boolean;
}

// Table Actions
/**
 * Create a new table
 * @example ['AddTable', 'Users', [
 *   {id: 'Name', type: 'Text', label: 'Full Name'},
 *   {id: 'Manager', type: 'Ref:Users', label: 'Direct Manager'},
 *   {id: 'Salary', type: 'Numeric', formula: '$Base + $Bonus', isFormula: false, recalcWhen: RecalcWhen.DEFAULT}
 * ]]
 */
export type AddTableAction = [
  "AddTable",
  TableId, // Table identifier
  ColumnInfo[] // Array of column definitions
];
export type RemoveTableAction = [
  "RemoveTable",
  TableId // Table to remove
];
export type RenameTableAction = [
  "RenameTable",
  TableId, // Current table ID
  TableId // New table ID
];

// Column Actions
export type AddColumnAction = [
  "AddColumn",
  TableId, // Target table
  ColumnId, // New column ID
  Partial<ColumnInfo> // Column configuration
];
export type AddHiddenColumnAction = [
  "AddHiddenColumn",
  TableId, // Target table
  ColumnId, // New column ID (will be hidden from UI)
  Partial<ColumnInfo> // Column configuration
];
export type AddVisibleColumnAction = [
  "AddVisibleColumn",
  TableId, // Target table
  ColumnId, // New column ID (will be visible in UI)
  Partial<ColumnInfo> // Column configuration
];
export type RemoveColumnAction = [
  "RemoveColumn",
  TableId, // Target table
  ColumnId // Column to remove
];
export type RenameColumnAction = [
  "RenameColumn",
  TableId, // Target table
  ColumnId, // Current column ID
  ColumnId // New column ID
];
export type ModifyColumnAction = [
  "ModifyColumn",
  TableId, // Target table
  ColumnId, // Column to modify
  Partial<ColumnInfo> // New column properties
];

// Row/Record Actions
export type AddRecordAction = [
  "AddRecord",
  TableId, // Target table
  RowId, // Row ID for the new record
  Record<ColumnId, CellValue> // Column values {columnId: value}
];
export type BulkAddRecordAction = [
  "BulkAddRecord",
  TableId, // Target table
  RowId[], // Array of row IDs
  BulkColValues // {columnId: [value1, value2, ...]}
];
export type UpdateRecordAction = [
  "UpdateRecord",
  TableId, // Target table
  RowId, // Row ID to update
  Record<ColumnId, CellValue> // New values {columnId: value}
];
export type BulkUpdateRecordAction = [
  "BulkUpdateRecord",
  TableId, // Target table
  RowId[], // Array of row IDs to update
  BulkColValues // {columnId: [value1, value2, ...]}
];
export type RemoveRecordAction = [
  "RemoveRecord",
  TableId, // Target table
  RowId // Row ID to remove
];
export type BulkRemoveRecordAction = [
  "BulkRemoveRecord",
  TableId, // Target table
  RowId[] // Array of row IDs to remove
];
/**
 * Insert or update a record (upsert operation)
 * @example ['AddOrUpdateRecord', 'Users', {Email: 'john@example.com'}, {Name: 'John Doe', Active: true}]
 */
export type AddOrUpdateRecordAction = [
  "AddOrUpdateRecord",
  TableId, // Target table
  Record<ColumnId, CellValue>, // Require: find existing record by these values
  Record<ColumnId, CellValue>, // Fields to update or set on new record
  ActionUpsertOptions? // Options for upsert behavior
];
export type BulkAddOrUpdateRecordAction = [
  "BulkAddOrUpdateRecord",
  TableId, // Target table
  Record<ColumnId, CellValue[]>, // Require: find records by these column arrays
  BulkColValues, // Fields to update {columnId: [value1, value2, ...]}
  ActionUpsertOptions? // Options for upsert behavior
];
export type ReplaceTableDataAction = [
  "ReplaceTableData",
  TableId, // Target table
  RowId[], // New row IDs (replaces all existing)
  BulkColValues // All new data {columnId: [value1, value2, ...]}
];

// View Actions
export type AddViewAction = [
  "AddView",
  TableId, // Table for the view
  ViewType, // Type of view: 'record', 'single', 'chart', 'custom'
  string // View name
];
export type RemoveViewAction = [
  "RemoveView",
  ViewId // View ID to remove
];
export type CreateViewSectionAction = [
  "CreateViewSection",
  TableId, // Source table
  ViewId, // Target view
  ViewType, // Section type
  ColumnId[], // Columns to include
  number? // Insert position (optional)
];

// Page Actions
export type AddPageAction = [
  "AddPage",
  string, // Page name
  ViewId? // Associated view ID (optional)
];
export type RemovePageAction = [
  "RemovePage",
  PageId // Page ID to remove
];

// Common User Actions
export type UserAction =
  | AddTableAction
  | RemoveTableAction
  | RenameTableAction
  | AddColumnAction
  | AddHiddenColumnAction
  | AddVisibleColumnAction
  | RemoveColumnAction
  | RenameColumnAction
  | ModifyColumnAction
  | AddRecordAction
  | BulkAddRecordAction
  | UpdateRecordAction
  | BulkUpdateRecordAction
  | RemoveRecordAction
  | BulkRemoveRecordAction
  | AddOrUpdateRecordAction
  | BulkAddOrUpdateRecordAction
  | ReplaceTableDataAction
  | AddViewAction
  | RemoveViewAction
  | CreateViewSectionAction
  | AddPageAction
  | RemovePageAction;

/**
 * Main grist object interface - the global `grist` object available in widgets
 *
 * ## Common Usage Patterns:
 *
 * **Most Common**: Use helper methods directly on `grist`
 * - `grist.fetchSelectedTable()` - Get current table data
 * - `grist.getTable().create()` - Add records to current table
 * - `grist.onRecord()` - Listen for selection changes
 *
 * **Advanced**: Use specific API objects for complex operations
 * - `grist.docApi.applyUserActions()` - Low-level document changes
 * - `grist.viewApi.setCursorPos()` - Control UI cursor position
 * - `grist.sectionApi.configure()` - Configure widget behavior
 */
export interface GristPluginAPI {
  // Core APIs
  /** Low-level API for rendering and process management */
  api: GristAPI;
  /** Document-level operations (tables, actions, etc.) */
  docApi: GristDocAPI & GristView;
  /** View-level operations (selection, cursor, etc.) */
  viewApi: GristView;
  /** Widget configuration and options */
  widgetApi: WidgetAPI;
  /** Custom section configuration */
  sectionApi: CustomSectionAPI;

  // Helper functions
  /** Get table operations for a specific table (or current selected table) */
  getTable(tableId?: TableId): TableOperations;
  /** Get an access token for API access */
  getAccessToken(options?: AccessTokenOptions): Promise<AccessTokenResult>;
  /** Get the currently selected table ID */
  getSelectedTableId(): Promise<TableId>;
  /** Get the currently selected table ID synchronously (may return undefined) */
  getSelectedTableIdSync(): TableId | undefined;

  // Event handlers
  /** Listen for changes to the selected record */
  onRecord(
    callback: (
      data: RowRecord | null,
      mappings: WidgetColumnMap | null
    ) => unknown,
    options?: FetchSelectedOptions
  ): void;
  /** Listen for changes to selected records (multiple selection) */
  onRecords(
    callback: (data: RowRecord[], mappings: WidgetColumnMap | null) => unknown,
    options?: FetchSelectedOptions
  ): void;
  /** Listen for new record creation */
  onNewRecord(callback: (mappings: WidgetColumnMap | null) => unknown): void;
  /** Listen for widget option changes */
  onOptions(
    callback: (options: any, settings: InteractionOptions) => unknown
  ): void;

  // Utility functions
  /** Fetch data from the currently selected table */
  fetchSelectedTable(options?: FetchSelectedOptions): Promise<any>;
  /** Fetch a specific record from the selected table */
  fetchSelectedRecord(
    rowId: number,
    options?: FetchSelectedOptions
  ): Promise<any>;
  /** Allow this widget to control selection in linked sections */
  allowSelectBy(): Promise<void>;
  /** Set which rows are selected */
  setSelectedRows(rowIds: number[] | null): Promise<void>;
  /** Set the cursor position */
  setCursorPos(pos: CursorPos): Promise<void>;
  /** Get a widget configuration option */
  getOption(key: string): Promise<any>;
  /** Set a widget configuration option */
  setOption(key: string, value: any): Promise<void>;
  /** Set multiple widget configuration options */
  setOptions(options: Record<string, any>): Promise<void>;
  /** Get all widget configuration options */
  getOptions(): Promise<Record<string, any>>;
  /** Clear all widget configuration options */
  clearOptions(): Promise<void>;
  /** Map raw data using column mappings */
  mapColumnNames(data: any, options?: any): any;
  /** Reverse map data using column mappings */
  mapColumnNamesBack(data: any, options?: any): any;

  // Initialization
  /** Initialize the widget with interaction settings */
  ready(settings?: InteractionOptions): void;
  /** Enable keyboard shortcuts for the widget */
  enableKeyboardShortcuts(): void;
}

// Global grist object (for browser environments)
declare global {
  const grist: GristPluginAPI;
}

export default GristPluginAPI;
