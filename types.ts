// Enums for standardizing values
export enum MovementType {
  IN = 'IN', // Purchase Receipt
  OUT = 'OUT', // Sales Dispatch
  TRANSFER = 'TRANSFER', // Internal Transfer
  ADJUSTMENT = 'ADJUSTMENT', // Stock Take Correction
  CONSUMPTION = 'CONSUMPTION' // Internal Dept Usage
}

export enum ProductType {
  RESALE = 'RESALE',
  CONSUMABLE = 'CONSUMABLE',
  RAW_MATERIAL = 'RAW_MATERIAL',
  ASSET = 'ASSET'
}

export enum LocationType {
  ZONE = 'ZONE',
  RACK = 'RACK',
  BIN = 'BIN'
}

// Financial Enums
export enum PaymentTerms {
  CASH = 'CASH', // Immediate payment
  CREDIT = 'CREDIT', // Full amount to balance
  HYBRID_SALES_LINKED = 'HYBRID_SALES_LINKED' // Part cash, part commission
}

export enum TransactionType {
  INVOICE = 'INVOICE',
  PAYMENT = 'PAYMENT',
  RETURN = 'RETURN',
  CREDIT_NOTE = 'CREDIT_NOTE',
  DEBIT_NOTE = 'DEBIT_NOTE'
}

export enum EntityType {
  VENDOR = 'VENDOR',
  CLIENT = 'CLIENT'
}

export type BeneficiaryType = 'EXTERNAL_CLIENT' | 'DELIVERY_DRIVER' | 'COMPANY_EMPLOYEE' | 'INTERNAL';
export type IssuePurpose = 'UNIFORM' | 'DELIVERY_BAG' | 'CONSUMABLE_CUSTODY' | 'CUSTODY';
export type IssueRequestStatus = 'PENDING' | 'APPROVED' | 'ISSUED' | 'REJECTED';

// Entity Interfaces

export interface Warehouse {
  id: string;
  name: string;
  location: string;
  isActive: boolean;
}

export interface Department {
  id: string;
  name: string;
  costCenterCode: string;
  budgetCap: number;
}

export interface CompanyBranch {
  id: number;
  nameAr: string;
  nameEn: string;
  createdAt: string;
  updatedAt: string;
}

export interface Location {
  id: string;
  warehouseId: string;
  zone: string;
  aisle: string;
  rack: string;
  shelf: string;
  binCode: string; // Generated unique string
}

export interface ProductCategory {
  id: string;
  name: string;
  parentId?: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  categoryId: string;
  type: ProductType; // New field for Mixed Inventory
  minReorderLevel: number;
  currentAvgCost: number; // WAC
  isSerialized: boolean;
  isBatchTracked: boolean;
  unit: string;
  uomId?: string;
  expenseAccountCode?: string; // For consumables
  warehouseId?: string; // Default Warehouse
  vendorId?: string; // Preferred Vendor
  departmentId?: string; // Default Department
}

export interface Batch {
  id: string;
  productId: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
}

export interface ProductSerial {
  id: string;
  productId: string;
  serialNumber: string;
  status: 'AVAILABLE' | 'SOLD' | 'RESERVED' | 'DAMAGED';
  warehouseId?: string;
  locationId?: string;
  movementInId?: string;
  movementOutId?: string;
  createdAt: string;
}

export interface InventoryStock {
  id: string;
  warehouseId: string;
  locationId: string;
  productId: string;
  productName: string;
  productType: ProductType;
  sku: string;
  quantityOnHand: number;
  quantityReserved: number;
  batches?: Batch[];
}

export interface StockMovement {
  id: string;
  date: string;
  type: MovementType;
  productId: string;
  productName: string;
  warehouseFromId?: string;
  warehouseToId?: string;
  departmentId?: string; // Linked for CONSUMPTION
  quantity: number;
  referenceDocId: string;
  user: string;
  vendorId?: string; // Link to vendor for IN movements
  clientId?: string; // Link to client for OUT movements
  unitCost?: number; // Cost per unit
  totalAmount?: number; // Total transaction amount
  createdAt?: string;
}

// Financial Interfaces

export interface Vendor {
  id: string;
  vendorCode: string; // Added to match DB
  name: string;
  contactPerson: string;
  phone: string;
  address: string;
  taxId: string;
  paymentTerms: PaymentTerms;
  currentBalance: number; // Amount we owe them
  creditLimit?: number;
  // Hybrid/Sales-linked config
  cashPercentage?: number; // For HYBRID (e.g., 30% cash)
  commissionPerUnit?: number; // For sales-linked payments
}

export interface Client {
  id: string;
  clientCode: string; // Added to match DB
  name: string;
  contactPerson: string;
  phone: string;
  gpsLocation: string; // Lat/Long or address
  category: string; // e.g., Retail, Wholesale
  collectionPeriodDays: number; // e.g., 15, 30 days
  currentBalance: number; // Amount they owe us
  creditLimit: number;
  isActive: boolean;
}

export interface Beneficiary {
  id: string;
  beneficiaryCode: string;
  type: BeneficiaryType;
  name: string;
  phone?: string;
  departmentId?: string;
  departmentName?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StockIssueRequest {
  id: string;
  requestCode: string;
  beneficiaryId: string;
  beneficiaryName?: string;
  beneficiaryType: BeneficiaryType;
  departmentId?: string;
  productId: string;
  productName?: string;
  quantity: number;
  purpose: IssuePurpose;
  status: IssueRequestStatus;
  notes?: string;
  requestedBy?: string;
  approvedBy?: string;
  approvedAt?: string;
  issuedAt?: string;
  receiverEmployeeName?: string;
  issuedMovementId?: string;
  createdAt: string;
  updatedAt: string;
  // Stock Snapshot fields
  quantityOnHand?: number;
  quantityReserved?: number;
  availableQuantity?: number;
}

export type PurchaseOrderStatus =
  | 'DRAFT'
  | 'APPROVED'
  | 'PARTIALLY_RECEIVED'
  | 'RECEIVED'
  | 'CANCELLED';

export interface PurchaseOrderItem {
  id: string;
  purchaseOrderId: string;
  productId: string;
  productName?: string;
  sku?: string;
  orderedQty: number;
  receivedQty: number;
  unitCost: number;
  warehouseId?: string;
  warehouseName?: string;
  lineTotal: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendorId: string;
  vendorName?: string;
  orderDate: string;
  expectedDate?: string;
  status: PurchaseOrderStatus;
  notes?: string;
  totalAmount: number;
  approvedBy?: string;
  approvedAt?: string;
  receivedAt?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  items: PurchaseOrderItem[];
}

export interface FinancialTransaction {
  id: string;
  entityType: EntityType;
  entityId: string; // Vendor or Client ID
  entityName: string;
  transactionDate: string;
  type: TransactionType;
  amount: number;
  balanceAfter: number;
  referenceDocId: string; // Link to StockMovement or Invoice
  notes?: string;
  dueDate?: string; // For invoices
  paidDate?: string; // For payments
}

export interface CollectionAlert {
  id: string;
  clientId: string;
  clientName: string;
  invoiceId: string;
  invoiceDate: string;
  dueDate: string;
  amount: number;
  daysOverdue: number;
  currentBalance: number;
}

// --- Delivery Bags (Refactored) ---
export type BagStatus = 'AVAILABLE' | 'ISSUED' | 'SOLD' | 'RESERVED' | 'DAMAGED' | 'LOST'; // Matches serial_status_enum + UI logic
export type BagEventType = 'SUPPLY_TO_WAREHOUSE' | 'ISSUE_TO_DRIVER' | 'RECEIVE_FROM_DRIVER' | 'RECEIVE_AND_ISSUE' | 'STATUS_CHANGE';

export interface DeliveryBag {
  serialId: string;
  bagNo: string; // serial_number
  productName: string;
  branchName?: string;
  status: BagStatus;
  suppliedAt?: string;
  issuedAt?: string;
  currentDriverId?: string;
  driverName?: string;
  isIssued: boolean;
  // Extra fields for UI if needed
  createdAt?: string;
}

export interface BagEvent {
  // Uses stock_movements now, but we can map it
  id: string; // movement id
  bagNo: string;
  type: 'IN' | 'OUT' | 'TRANSFER';
  date: string;
  beneficiaryName?: string; // driver
  userName?: string; // performed by
  notes?: string;
}

// UI State Management
export type MainMenu =
  | 'dashboard'
  | 'master_data'
  | 'vendors'
  | 'clients'
  | 'inbound'
  | 'outbound'
  | 'internal_req'
  | 'inventory'
  | 'financial'
  | 'delivery_bags'
  | 'reports'
  | 'admin';

export type SubMenu = string;

export interface UnitOfMeasure {
  id: string;
  name: string;
  symbol: string;
}

export interface Task {
  id: string;
  title: string;
  status: 'pending' | 'completed';
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
}

// ============================================
// PERMISSIONS SYSTEM TYPES
// ============================================

export interface Module {
  id: string;
  name: string;
  displayName: string;
  displayNameEn?: string;
  icon?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

export interface Action {
  id: string;
  name: string;
  displayName: string;
  displayNameEn?: string;
  sortOrder: number;
  createdAt: string;
}

export interface ModuleAction {
  moduleId: string;
  actionId: string;
  isAvailable: boolean;
  createdAt: string;
}

export interface Role {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  isSystemRole: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RolePermission {
  roleId: string;
  moduleId: string;
  actionId: string;
  hasPermission: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  roleId: string;
  roleName?: string; // Joined from role
  roleDisplayName?: string; // Joined from role
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserPermission {
  userId: string;
  moduleId: string;
  actionId: string;
  hasPermission: boolean;
  createdAt: string;
  updatedAt: string;
}

// Combined permission data for UI
export interface PermissionMatrix {
  moduleId: string;
  moduleName: string;
  moduleDisplayName: string;
  actionId: string;
  actionName: string;
  actionDisplayName: string;
  hasPermission: boolean;
  source: 'role' | 'user'; // Where permission comes from
  isDirect?: boolean; // True if user-specific override exists
}

// For the permissions grid/table
export interface PermissionGridRow {
  moduleId: string;
  moduleName: string;
  moduleDisplayName: string;
  moduleIcon?: string;
  permissions: {
    [actionName: string]: {
      actionId: string;
      hasPermission: boolean;
      isAvailable: boolean; // From module_actions
      source?: 'role' | 'user';
    };
  };
}

// API request/response types
export interface UpdateRolePermissionsRequest {
  roleId: string;
  permissions: {
    moduleId: string;
    actionId: string;
    hasPermission: boolean;
  }[];
}

export interface UpdateUserPermissionsRequest {
  userId: string;
  permissions: {
    moduleId: string;
    actionId: string;
    hasPermission: boolean;
  }[];
}

export interface UserPermissionsResponse {
  user: User;
  role: Role;
  effectivePermissions: PermissionMatrix[];
  directOverrides: UserPermission[];
}
