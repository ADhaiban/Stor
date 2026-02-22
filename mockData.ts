
import {
    InventoryStock,
    StockMovement,
    Warehouse,
    Department,
    Product,
    ProductType,
    Vendor,
    Client,
    PaymentTerms,
    Module,
    Action,
    Role,
    User,
    ProductCategory,
    UnitOfMeasure
} from './types';

export const categories: ProductCategory[] = [
    { id: '50000001-0000-0000-0000-000000000001', name: 'الهواتف الذكية' },
    { id: '50000001-0000-0000-0000-000000000002', name: 'الأجهزة اللوحية' },
    { id: '50000001-0000-0000-0000-000000000003', name: 'الملحقات والإكسسوارات' },
    { id: '50000001-0000-0000-0000-000000000004', name: 'القرطاسية والأدوات المكتبية' }
];

export const uoms: UnitOfMeasure[] = [
    { id: '60000001-0000-0000-0000-000000000001', name: 'حبة', symbol: 'pc' },
    { id: '60000001-0000-0000-0000-000000000002', name: 'كرتون', symbol: 'ctn' },
    { id: '60000001-0000-0000-0000-000000000003', name: 'متر', symbol: 'm' },
    { id: '60000001-0000-0000-0000-000000000004', name: 'كيلوجرام', symbol: 'kg' },
    { id: '60000001-0000-0000-0000-000000000005', name: 'طقم', symbol: 'set' }
];

export const warehouses: Warehouse[] = [
    {
        id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        name: 'المستودع الرئيسي',
        location: 'الرياض - المنطقة الصناعية',
        isActive: true
    },
    {
        id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
        name: 'مستودع الشرقية',
        location: 'الدمام - الميناء',
        isActive: true
    }
];

export const departments: Department[] = [
    {
        id: 'dept-1',
        name: 'العمليات',
        costCenterCode: 'OPS-001',
        budgetCap: 50000
    },
    {
        id: 'dept-2',
        name: 'المبيعات',
        costCenterCode: 'SAL-001',
        budgetCap: 20000
    }
];

export const products: Product[] = [
    {
        id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
        sku: 'iphone-15-pro',
        name: 'iPhone 15 Pro 256GB',
        description: 'Apple Smartphone',
        type: ProductType.RESALE,
        minReorderLevel: 10,
        currentAvgCost: 4200,
        isSerialized: true,
        isBatchTracked: false,
        unit: 'كارتون',
        categoryId: '50000001-0000-0000-0000-000000000001'
    },
    {
        id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
        sku: 'samsung-s24',
        name: 'Samsung S24 Ultra',
        description: 'Samsung Smartphone',
        type: ProductType.RESALE,
        minReorderLevel: 5,
        currentAvgCost: 3800,
        isSerialized: true,
        isBatchTracked: false,
        unit: 'كارتون',
        categoryId: '50000001-0000-0000-0000-000000000001'
    },
    {
        id: 'paper-a4-uuid',
        sku: 'paper-a4',
        name: 'ورق طباعة A4',
        description: 'كرتون 500 ورقة',
        type: ProductType.CONSUMABLE,
        minReorderLevel: 20,
        currentAvgCost: 15,
        isSerialized: false,
        isBatchTracked: false,
        unit: 'كرتون',
        categoryId: '50000001-0000-0000-0000-000000000004'
    }
];

export const inventory: InventoryStock[] = [
    {
        id: 'inv-1',
        warehouseId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        locationId: 'loc-1',
        productId: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
        productName: 'iPhone 15 Pro 256GB',
        productType: ProductType.RESALE,
        sku: 'iphone-15-pro',
        quantityOnHand: 50,
        quantityReserved: 0
    }
];

export const movements: StockMovement[] = [];

export const vendors: Vendor[] = [
    {
        id: 'v-1',
        vendorCode: 'VEN-001',
        name: 'شركة التوريدات المتحدة',
        contactPerson: 'أحمد محمد',
        phone: '+966501234567',
        address: 'الرياض',
        taxId: '123456789',
        paymentTerms: PaymentTerms.HYBRID_SALES_LINKED,
        currentBalance: 0,
        cashPercentage: 30,
        commissionPerUnit: 5
    }
];

export const clients: Client[] = [
    {
        id: 'c-1',
        clientCode: 'CLI-001',
        name: 'سوبر ماركت النخيل',
        contactPerson: 'فهد السعيد',
        phone: '+966504567890',
        gpsLocation: '24.7136,46.6753',
        category: 'Retail',
        collectionPeriodDays: 15,
        currentBalance: 0,
        creditLimit: 50000,
        isActive: true
    }
];

// --- Permissions Mock Data ---

export const modules: Module[] = [
    { id: '1', name: 'dashboard', displayName: 'لوحة المعلومات', icon: 'LayoutDashboard', sortOrder: 1, isActive: true, createdAt: '' },
    { id: '2', name: 'products', displayName: 'المنتجات', icon: 'Package', sortOrder: 2, isActive: true, createdAt: '' },
    { id: '3', name: 'inventory', displayName: 'المخزون', icon: 'Archive', sortOrder: 3, isActive: true, createdAt: '' },
    { id: '4', name: 'users', displayName: 'المستخدمون', icon: 'UserCog', sortOrder: 4, isActive: true, createdAt: '' },
    { id: '5', name: 'roles', displayName: 'الأدوار والصلاحيات', icon: 'Shield', sortOrder: 5, isActive: true, createdAt: '' }
];

export const actions: Action[] = [
    { id: 'a1', name: 'view', displayName: 'عرض', sortOrder: 1, createdAt: '' },
    { id: 'a2', name: 'create', displayName: 'إنشاء', sortOrder: 2, createdAt: '' },
    { id: 'a3', name: 'update', displayName: 'تعديل', sortOrder: 3, createdAt: '' },
    { id: 'a4', name: 'delete', displayName: 'حذف', sortOrder: 4, createdAt: '' }
];

export const roles: Role[] = [
    {
        id: '30000001-0000-0000-0000-000000000001',
        name: 'admin',
        displayName: 'مدير النظام',
        description: 'صلاحيات كاملة على جميع أجزاء النظام',
        isSystemRole: true,
        isActive: true,
        createdAt: '',
        updatedAt: ''
    },
    {
        id: '30000001-0000-0000-0000-000000000002',
        name: 'manager',
        displayName: 'مدير مخزن',
        description: 'إدارة المخزون والعمليات اليومية',
        isSystemRole: false,
        isActive: true,
        createdAt: '',
        updatedAt: ''
    }
];

export const users: User[] = [
    {
        id: '40000001-0000-0000-0000-000000000001',
        name: 'مدير النظام',
        email: 'admin@tawseel.com',
        roleId: '30000001-0000-0000-0000-000000000001',
        roleDisplayName: 'مدير النظام',
        isActive: true,
        createdAt: '',
        updatedAt: ''
    }
];