
import { supabase } from '../src/lib/supabase';
import { Product, ProductCategory, Warehouse, Department, InventoryStock, StockMovement, UnitOfMeasure, Task, Vendor, Client, Beneficiary, StockIssueRequest, PurchaseOrder, PurchaseOrderItem, FinancialTransaction, CompanyBranch } from '../types';

// --- Sort Support ---
export interface SortOptions {
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
}

const MOVEMENT_SORT_FIELDS: Record<string, string> = {
    created_at: 'created_at',
    transaction_date: 'transaction_date',
    updated_at: 'updated_at',
    id: 'id',
    quantity: 'quantity',
    type: 'type'
};

const ISSUE_REQUEST_SORT_FIELDS: Record<string, string> = {
    created_at: 'created_at',
    updated_at: 'updated_at',
    approved_at: 'approved_at',
    issued_at: 'issued_at',
    id: 'id',
    status: 'status',
    request_code: 'request_code'
};

const resolveSortField = (field: string | undefined, allowlist: Record<string, string>, defaultField: string): string => {
    if (!field) return defaultField;
    return allowlist[field] || defaultField;
};

// --- Mappers ---

const mapProduct = (p: any): Product => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    description: p.description,
    categoryId: p.category_id,
    type: p.type,
    minReorderLevel: p.min_reorder_level,
    currentAvgCost: p.current_wac_cost,
    isSerialized: p.is_serialized,
    isBatchTracked: p.is_batch_tracked,
    unit: p.uom_id,
    expenseAccountCode: p.expense_account_code,
    warehouseId: p.default_warehouse_id,
    vendorId: p.preferred_vendor_id,
    departmentId: p.default_department_id
});

const mapInventory = (i: any): InventoryStock => ({
    id: i.id,
    warehouseId: i.warehouse_id,
    locationId: i.location_id,
    productId: i.product_id,
    productName: i.products?.name || 'Unknown',
    productType: i.products?.type || 'RESALE',
    sku: i.products?.sku || '',
    quantityOnHand: Number(i.quantity_on_hand || 0),
    quantityReserved: Number(i.quantity_reserved || 0)
});

const mapWarehouse = (w: any): Warehouse => ({
    id: w.id,
    name: w.name,
    location: w.location_address,
    isActive: w.is_active
});

const mapDepartment = (d: any): Department => ({
    id: d.id,
    name: d.name,
    costCenterCode: d.cost_center_code,
    budgetCap: Number(d.budget_cap || 0)
});

const mapVendor = (v: any): Vendor => ({
    id: v.id,
    vendorCode: v.vendor_code,
    name: v.name,
    contactPerson: v.contact_person,
    phone: v.phone,
    address: v.address,
    taxId: v.tax_id,
    paymentTerms: v.payment_terms,
    currentBalance: Number(v.current_balance || 0),
    creditLimit: v.credit_limit,
    cashPercentage: v.cash_percentage,
    commissionPerUnit: v.commission_per_unit
});

const mapClient = (c: any): Client => ({
    id: c.id,
    clientCode: c.client_code,
    name: c.name,
    contactPerson: c.contact_person,
    phone: c.phone,
    gpsLocation: c.gps_location,
    category: c.category,
    collectionPeriodDays: c.collection_period_days,
    currentBalance: Number(c.current_balance || 0),
    creditLimit: Number(c.credit_limit || 0),
    isActive: c.is_active
});

const mapBranch = (b: any): CompanyBranch => ({
    id: b.id,
    nameAr: b.name_ar,
    nameEn: b.name_en,
    createdAt: b.created_at,
    updatedAt: b.updated_at
});

const mapBeneficiary = (b: any): Beneficiary => ({
    id: b.id,
    beneficiaryCode: b.beneficiary_code,
    type: b.type,
    name: b.name,
    phone: b.phone,
    departmentId: b.department_id,
    departmentName: b.departments?.name,
    isActive: b.is_active,
    createdAt: b.created_at,
    updatedAt: b.updated_at
});

const mapIssueRequest = (r: any): StockIssueRequest => ({
    id: r.id,
    requestCode: r.request_code,
    beneficiaryId: r.beneficiary_id,
    beneficiaryName: r.inventory_beneficiaries?.name,
    beneficiaryType: r.beneficiary_type,
    departmentId: r.department_id,
    productId: r.product_id,
    productName: r.products?.name,
    quantity: Number(r.quantity || 0),
    purpose: r.purpose,
    status: r.status,
    notes: r.notes,
    requestedBy: r.requested_by,
    approvedBy: r.approved_by,
    approvedAt: r.approved_at,
    issuedAt: r.issued_at,
    receiverEmployeeName: r.receiver_employee_name,
    issuedMovementId: r.issued_movement_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at
});

const enrichIssueRequestWithStock = async (request: StockIssueRequest): Promise<StockIssueRequest> => {
    try {
        const { data: stockData } = await supabase
            .from('inventory_stock')
            .select('quantity_on_hand, quantity_reserved')
            .eq('product_id', request.productId);

        const stock = (stockData || []).reduce((acc, curr) => ({
            onHand: acc.onHand + Number(curr.quantity_on_hand || 0),
            reserved: acc.reserved + Number(curr.quantity_reserved || 0)
        }), { onHand: 0, reserved: 0 });

        return {
            ...request,
            quantityOnHand: stock.onHand,
            quantityReserved: stock.reserved,
            availableQuantity: stock.onHand - stock.reserved
        };
    } catch (e) {
        console.error("Error enriching request with stock:", e);
        return {
            ...request,
            quantityOnHand: 0,
            quantityReserved: 0,
            availableQuantity: 0
        };
    }
};

const mapPurchaseOrder = (po: any): PurchaseOrder => {
    const items: PurchaseOrderItem[] = (po.purchase_order_items || []).map((item: any) => ({
        id: item.id,
        purchaseOrderId: item.purchase_order_id,
        productId: item.product_id,
        productName: item.products?.name,
        sku: item.products?.sku,
        orderedQty: Number(item.quantity_ordered || 0),
        receivedQty: Number(item.quantity_received || 0),
        unitCost: Number(item.unit_cost || 0),
        warehouseId: item.warehouse_id,
        warehouseName: item.warehouses?.name,
        lineTotal: Number(item.line_total || 0)
    }));

    return {
        id: po.id,
        poNumber: po.po_number,
        vendorId: po.vendor_id,
        vendorName: po.vendors?.name,
        orderDate: po.order_date,
        expectedDate: po.expected_date,
        status: po.status,
        notes: po.notes,
        totalAmount: Number(po.total_amount || 0),
        approvedBy: po.approved_by,
        approvedAt: po.approved_at,
        receivedAt: po.received_at,
        createdBy: po.created_by,
        createdAt: po.created_at,
        updatedAt: po.updated_at,
        items
    };
};

const mapMovement = (m: any): StockMovement => ({
    id: m.id,
    date: m.transaction_date,
    type: m.type,
    productId: m.product_id,
    productName: m.product_name,
    warehouseFromId: m.warehouse_from_id,
    warehouseToId: m.warehouse_to_id,
    departmentId: m.department_id,
    quantity: Number(m.quantity || 0),
    referenceDocId: m.reference_doc_id,
    user: m.created_by || 'System',
    vendorId: m.vendor_id,
    clientId: m.client_id,
    unitCost: Number(m.unit_cost || 0),
    totalAmount: Number(m.total_amount || 0),
    createdAt: m.created_at
});

export const dataService = {
    // --- Products ---
    async getProducts() {
        const { data, error } = await supabase.from('products').select('*').eq('is_deleted', false);
        if (error) return [];
        return data.map(mapProduct);
    },
    async createProduct(product: any) {
        const { data, error } = await supabase.from('products').insert([product]).select().single();
        if (error) throw error;
        return mapProduct(data);
    },
    async updateProduct(id: string, updates: any) {
        const { data, error } = await supabase.from('products').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return mapProduct(data);
    },

    // --- Inventory ---
    async getInventory() {
        const { data, error } = await supabase
            .from('inventory_stock')
            .select('*, products(name, sku, type)');
        if (error) return [];
        return data.map(mapInventory);
    },
    async getProductStock(productId: string) {
        const { data, error } = await supabase
            .from('inventory_stock')
            .select('quantity_on_hand, quantity_reserved')
            .eq('product_id', productId);

        if (error) throw error;

        const summary = (data || []).reduce((acc, curr) => ({
            onHand: acc.onHand + Number(curr.quantity_on_hand || 0),
            reserved: acc.reserved + Number(curr.quantity_reserved || 0)
        }), { onHand: 0, reserved: 0 });

        return {
            ...summary,
            available: summary.onHand - summary.reserved
        };
    },

    // --- Movements ---
    async getMovements(sort?: SortOptions) {
        const sortField = resolveSortField(sort?.sortBy, MOVEMENT_SORT_FIELDS, 'created_at');
        const ascending = (sort?.sortDir || 'desc') === 'asc';
        const { data, error } = await supabase
            .from('stock_movements')
            .select('*')
            .order(sortField, { ascending });
        if (error) return [];
        return data.map(mapMovement);
    },

    async createInboundMovement(movement: any, inventoryUpdates: any[]) {
        const { data, error } = await supabase.rpc('process_inbound_movement', {
            p_movement: movement,
            p_inventory_items: inventoryUpdates
        });
        if (error) throw error;
        return data; // returns the movement ID
    },

    async createOutboundMovement(movement: any, inventoryUpdates: any[]) {
        const { data, error } = await supabase.rpc('process_outbound_movement', {
            p_movement: movement,
            p_inventory_items: inventoryUpdates
        });
        if (error) throw error;
        return data;
    },

    // --- Warehouses ---
    async getWarehouses() {
        const { data, error } = await supabase.from('warehouses').select('*').eq('is_deleted', false);
        if (error) return [];
        return data.map(mapWarehouse);
    },
    async createWarehouse(warehouse: any) {
        const { data, error } = await supabase.from('warehouses').insert([warehouse]).select().single();
        if (error) throw error;
        return mapWarehouse(data);
    },
    async updateWarehouse(id: string, updates: any) {
        const { data, error } = await supabase.from('warehouses').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return mapWarehouse(data);
    },

    // --- Departments ---
    async getDepartments() {
        const { data, error } = await supabase.from('departments').select('*').eq('is_deleted', false);
        if (error) return [];
        return data.map(mapDepartment);
    },
    async createDepartment(dept: any) {
        const { data, error } = await supabase.from('departments').insert([dept]).select().single();
        if (error) throw error;
        return mapDepartment(data);
    },
    async updateDepartment(id: string, updates: any) {
        const { data, error } = await supabase.from('departments').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return mapDepartment(data);
    },

    // --- Vendors ---
    async getVendors() {
        const { data, error } = await supabase.from('vendors').select('*').eq('is_deleted', false);
        if (error) return [];
        return data.map(mapVendor);
    },
    async createVendor(vendor: any) {
        const { data, error } = await supabase.from('vendors').insert([vendor]).select().single();
        if (error) throw error;
        return mapVendor(data);
    },
    async updateVendor(id: string, updates: any) {
        const { data, error } = await supabase.from('vendors').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return mapVendor(data);
    },

    // --- Clients ---
    async getClients() {
        const { data, error } = await supabase.from('clients').select('*').eq('is_deleted', false);
        if (error) return [];
        return data.map(mapClient);
    },
    async createClient(client: any) {
        const { data, error } = await supabase.from('clients').insert([client]).select().single();
        if (error) throw error;
        return mapClient(data);
    },
    async updateClient(id: string, updates: any) {
        const { data, error } = await supabase.from('clients').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return mapClient(data);
    },

    // --- Beneficiaries (External Clients, Drivers, Employees) ---
    async getBeneficiaries() {
        const { data, error } = await supabase
            .from('inventory_beneficiaries')
            .select('*, departments(name)')
            .eq('is_deleted', false)
            .order('created_at', { ascending: false });
        if (error) return [];
        return data.map(mapBeneficiary);
    },
    async createBeneficiary(beneficiary: any) {
        const { data, error } = await supabase
            .from('inventory_beneficiaries')
            .insert([beneficiary])
            .select('*, departments(name)')
            .single();
        if (error) throw error;
        return mapBeneficiary(data);
    },
    async updateBeneficiary(id: string, updates: any) {
        const { data, error } = await supabase
            .from('inventory_beneficiaries')
            .update(updates)
            .eq('id', id)
            .select('*, departments(name)')
            .single();
        if (error) throw error;
        return mapBeneficiary(data);
    },

    // --- Stock Issue Requests (Uniforms, Delivery Bags, Consumable Custody) ---
    async getIssueRequests(sort?: SortOptions) {
        const sortField = resolveSortField(sort?.sortBy, ISSUE_REQUEST_SORT_FIELDS, 'created_at');
        const ascending = (sort?.sortDir || 'desc') === 'asc';

        // Fetch requests
        const { data: requests, error } = await supabase
            .from('stock_issue_requests')
            .select('*, inventory_beneficiaries(name), products(name)')
            .eq('is_deleted', false)
            .order(sortField, { ascending });

        if (error) return [];
        if (!requests || requests.length === 0) return [];

        // Fetch aggregate stock for all products in these requests
        const productIds = Array.from(new Set(requests.map(r => r.product_id).filter(id => !!id)));

        const { data: stockData } = await supabase
            .from('inventory_stock')
            .select('product_id, quantity_on_hand, quantity_reserved')
            .in('product_id', productIds);

        const stockMap = (stockData || []).reduce((acc: any, curr: any) => {
            const pid = curr.product_id;
            if (!acc[pid]) acc[pid] = { onHand: 0, reserved: 0 };
            acc[pid].onHand += Number(curr.quantity_on_hand || 0);
            acc[pid].reserved += Number(curr.quantity_reserved || 0);
            return acc;
        }, {});

        return requests.map(r => {
            const mapped = mapIssueRequest(r);
            const stock = stockMap[r.product_id] || { onHand: 0, reserved: 0 };
            return {
                ...mapped,
                quantityOnHand: stock.onHand,
                quantityReserved: stock.reserved,
                availableQuantity: stock.onHand - stock.reserved
            };
        });
    },
    async createIssueRequest(request: any) {
        const { data, error } = await supabase
            .from('stock_issue_requests')
            .insert([request])
            .select('*, inventory_beneficiaries(name), products(name)')
            .single();
        if (error) throw error;
        return enrichIssueRequestWithStock(mapIssueRequest(data));
    },
    async updateIssueRequest(id: string, updates: any) {
        const { data, error } = await supabase
            .from('stock_issue_requests')
            .update(updates)
            .eq('id', id)
            .select('*, inventory_beneficiaries(name), products(name)')
            .single();
        if (error) throw error;
        return enrichIssueRequestWithStock(mapIssueRequest(data));
    },
    async approveIssueRequest(requestId: string, approvedBy: string) {
        const { data, error } = await supabase.rpc('approve_stock_issue', {
            p_request_id: requestId,
            p_approved_by: approvedBy
        });

        if (error) throw error;

        const result = data as any;
        if (!result.success) {
            const err = new Error(result.message);
            (err as any).code = result.error_code;
            (err as any).details = result.details;
            throw err;
        }

        // Return the updated request
        const { data: updated } = await supabase
            .from('stock_issue_requests')
            .select('*, inventory_beneficiaries(name), products(name)')
            .eq('id', requestId)
            .single();

        return enrichIssueRequestWithStock(mapIssueRequest(updated));
    },
    async rejectIssueRequest(requestId: string, rejectedBy: string, reason?: string) {
        const { data, error } = await supabase.rpc('reject_stock_issue', {
            p_request_id: requestId,
            p_rejected_by: rejectedBy,
            p_reason: reason || null
        });

        if (error) throw error;

        const result = data as any;
        if (!result.success) throw new Error(result.message);

        const { data: updated } = await supabase
            .from('stock_issue_requests')
            .select('*, inventory_beneficiaries(name), products(name)')
            .eq('id', requestId)
            .single();

        return enrichIssueRequestWithStock(mapIssueRequest(updated));
    },
    async processIssueRequest(params: {
        request_id: string;
        receiver_employee_name?: string | null;
        issued_by?: string | null;
        notes?: string | null;
    }) {
        // Double check availability before RPC call
        const { data: req } = await supabase
            .from('stock_issue_requests')
            .select('product_id, quantity, status')
            .eq('id', params.request_id)
            .single();

        if (req.status === 'ISSUED') throw new Error('الطلب تم صرفه مسبقاً');

        const stock = await this.getProductStock(req.product_id);
        if (stock.available < req.quantity) {
            throw new Error(`المخزون غير كافٍ. المتاح: ${stock.available}, المطلوب: ${req.quantity}`);
        }

        const { data, error } = await supabase.rpc('execute_stock_issue', {
            p_request_id: params.request_id,
            p_receiver_name: params.receiver_employee_name || null,
            p_issued_by: params.issued_by || null,
            p_notes: params.notes || null
        });

        if (error) throw error;

        const result = data as any;
        if (!result.success) {
            const err = new Error(result.message);
            (err as any).code = result.error_code;
            (err as any).details = result.details;
            throw err;
        }

        return result.movement_id as string;
    },

    // --- Purchase Orders ---
    async getPurchaseOrders() {
        const { data, error } = await supabase
            .from('purchase_orders')
            .select('*, vendors(name), purchase_order_items(*, products(name, sku), warehouses(name))')
            .eq('is_deleted', false)
            .order('created_at', { ascending: false });
        if (error) return [];
        return data.map(mapPurchaseOrder);
    },

    async createPurchaseOrder(payload: {
        po_number: string;
        vendor_id: string;
        order_date: string;
        expected_date?: string | null;
        notes?: string | null;
        created_by?: string | null;
        items: Array<{
            product_id: string;
            warehouse_id?: string | null;
            quantity_ordered: number;
            unit_cost: number;
            notes?: string | null;
        }>;
    }) {
        const total = payload.items.reduce((sum, item) => sum + (Number(item.quantity_ordered) * Number(item.unit_cost)), 0);

        const { data: poRow, error: poError } = await supabase
            .from('purchase_orders')
            .insert([{
                po_number: payload.po_number,
                vendor_id: payload.vendor_id,
                order_date: payload.order_date,
                expected_date: payload.expected_date || null,
                status: 'DRAFT',
                notes: payload.notes || null,
                total_amount: total,
                created_by: payload.created_by || null
            }])
            .select('*')
            .single();

        if (poError) throw poError;

        const itemRows = payload.items.map(item => ({
            purchase_order_id: poRow.id,
            product_id: item.product_id,
            warehouse_id: item.warehouse_id || null,
            quantity_ordered: Number(item.quantity_ordered),
            quantity_received: 0,
            unit_cost: Number(item.unit_cost),
            line_total: Number(item.quantity_ordered) * Number(item.unit_cost),
            notes: item.notes || null
        }));

        const { error: itemsError } = await supabase
            .from('purchase_order_items')
            .insert(itemRows);
        if (itemsError) throw itemsError;

        const { data: createdPo, error: fetchError } = await supabase
            .from('purchase_orders')
            .select('*, vendors(name), purchase_order_items(*, products(name, sku), warehouses(name))')
            .eq('id', poRow.id)
            .single();
        if (fetchError) throw fetchError;
        return mapPurchaseOrder(createdPo);
    },

    async approvePurchaseOrder(id: string, approvedBy: string) {
        const { data, error } = await supabase
            .from('purchase_orders')
            .update({
                status: 'APPROVED',
                approved_by: approvedBy,
                approved_at: new Date().toISOString()
            })
            .eq('id', id)
            .select('*, vendors(name), purchase_order_items(*, products(name, sku), warehouses(name))')
            .single();
        if (error) throw error;
        return mapPurchaseOrder(data);
    },

    async receivePurchaseOrder(params: {
        purchase_order_id: string;
        receipt_items: Array<{
            purchase_order_item_id: string;
            quantity_received: number;
            warehouse_id?: string | null;
        }>;
        user_name?: string;
        notes?: string;
    }) {
        const { data, error } = await supabase.rpc('process_purchase_receipt', {
            p_po_id: params.purchase_order_id,
            p_receipt_items: params.receipt_items,
            p_user_name: params.user_name || null,
            p_notes: params.notes || null
        });
        if (error) throw error;
        return data as number;
    },

    // --- Settings (UOM & Categories) ---
    async getCategories() {
        const { data, error } = await supabase.from('product_categories').select('*').eq('is_deleted', false);
        if (error) return [];
        return data as ProductCategory[];
    },
    async createCategory(cat: any) {
        const { data, error } = await supabase.from('product_categories').insert([cat]).select().single();
        if (error) throw error;
        return data as ProductCategory;
    },
    async updateCategory(id: string, updates: any) {
        const { data, error } = await supabase.from('product_categories').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data as ProductCategory;
    },

    async getUOMs() {
        const { data, error } = await supabase.from('uoms').select('*').eq('is_deleted', false);
        if (error) return [];
        return data as UnitOfMeasure[];
    },
    async createUOM(uom: any) {
        const { data, error } = await supabase.from('uoms').insert([uom]).select().single();
        if (error) throw error;
        return data as UnitOfMeasure;
    },
    async updateUOM(id: string, updates: any) {
        const { data, error } = await supabase.from('uoms').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data as UnitOfMeasure;
    },

    // --- Delete Helpers (Soft Delete) ---
    async deleteProduct(id: string) { return supabase.from('products').update({ is_deleted: true }).eq('id', id); },
    async deleteWarehouse(id: string) { return supabase.from('warehouses').update({ is_deleted: true }).eq('id', id); },
    async deleteDepartment(id: string) { return supabase.from('departments').update({ is_deleted: true }).eq('id', id); },
    async deleteCategory(id: string) { return supabase.from('product_categories').update({ is_deleted: true }).eq('id', id); },
    async deleteUOM(id: string) { return supabase.from('uoms').update({ is_deleted: true }).eq('id', id); },
    async deleteVendor(id: string) { return supabase.from('vendors').update({ is_deleted: true }).eq('id', id); },
    async deleteClient(id: string) { return supabase.from('clients').update({ is_deleted: true }).eq('id', id); },
    async deleteBeneficiary(id: string) { return supabase.from('inventory_beneficiaries').update({ is_deleted: true }).eq('id', id); },
    async deleteIssueRequest(id: string) { return supabase.from('stock_issue_requests').update({ is_deleted: true }).eq('id', id); },

    // --- Serialization ---
    async generateProductSerials(params: {
        product_id: string,
        warehouse_id: string,
        movement_id: string,
        start_number: number,
        prefix?: string,
        suffix?: string,
        quantity: number
    }) {
        // Convert parameter names to match PostgreSQL function parameters
        const dbParams = {
            p_product_id: params.product_id,
            p_warehouse_id: params.warehouse_id,
            p_movement_id: params.movement_id,
            p_start_number: params.start_number,
            p_prefix: params.prefix || null,
            p_suffix: params.suffix || null,
            p_quantity: params.quantity
        };

        const { data, error } = await supabase.rpc('generate_product_serials', dbParams);
        if (error) throw error;
        return data;
    },
    async getProductSerials(productId: string) {
        const { data, error } = await supabase
            .from('product_serials')
            .select('*')
            .eq('product_id', productId)
            .eq('is_deleted', false);
        if (error) return [];
        return data.map(s => ({
            id: s.id,
            productId: s.product_id,
            serialNumber: s.serial_number,
            status: s.status,
            warehouseId: s.warehouse_id,
            locationId: s.location_id,
            movementInId: s.movement_in_id,
            movementOutId: s.movement_out_id,
            createdAt: s.created_at
        }));
    },

    // --- Financial ---
    async getFinancialLedger(entityType?: 'VENDOR' | 'CLIENT', entityId?: string) {
        let query = supabase
            .from('financial_ledger')
            .select('*')
            .order('transaction_date', { ascending: false });

        // Normalize entityType case
        if (entityType) query = query.eq('entity_type', entityType.toUpperCase());

        // Validate entityId isn't string "undefined" or "null"
        if (entityId && entityId !== 'undefined' && entityId !== 'null') {
            query = query.eq('entity_id', entityId);
        }

        const { data, error } = await query;

        if (error) {
            console.error('[getFinancialLedger] Supabase error:', {
                message: error.message,
                details: (error as any).details,
                hint: (error as any).hint,
                code: (error as any).code,
                entityType,
                entityId
            });
            throw error;
        }

        console.log('[getFinancialLedger] rows:', data?.length, { entityType, entityId });

        return (data ?? []).map((item: any) => ({
            id: item.id,
            entityType: item.entity_type,
            entityId: item.entity_id,
            entityName: item.entity_name || 'Unknown',
            transactionDate: item.transaction_date,
            type: item.type,
            amount: Number(item.amount || 0),
            balanceAfter: Number(item.balance_after || 0),
            referenceDocId: item.reference_doc_id,
            notes: item.notes,
            dueDate: item.due_date,
            paidDate: item.paid_date
        }));
    },

    // --- Delivery Bags (Refactored) ---
    async getDeliveryBags() {
        const { data, error } = await supabase
            .from('delivery_bags_report_view')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return (data || []).map((bag: any) => ({
            serialId: bag.serial_id,
            bagNo: bag.bag_no,
            productName: bag.product_name,
            branchName: bag.branch_name,
            status: bag.status,
            suppliedAt: bag.supplied_at,
            issuedAt: bag.issued_at,
            currentDriverId: bag.current_driver_id,
            driverName: bag.driver_name_display,
            isIssued: bag.is_issued,
            createdAt: bag.created_at
        }));
    },

    async getBagEvents(bagNo?: string, driverId?: string) {
        let query = supabase
            .from('stock_movements')
            .select(`
                *,
                user:user_id(name),
                beneficiary:beneficiary_id(name)
            `)
            .order('transaction_date', { ascending: false });

        if (bagNo) query = query.eq('serial_number', bagNo);
        if (driverId) query = query.eq('beneficiary_id', driverId);

        const { data, error } = await query;
        if (error) throw error;

        return (data || []).map((ev: any) => ({
            id: ev.id,
            bagNo: ev.serial_number,
            type: ev.type,
            date: ev.transaction_date,
            beneficiaryName: ev.beneficiary?.name, // Driver involved
            userName: ev.user?.name, // Issued By
            notes: ev.notes
        }));
    },

    async registerBagProduct(payload: { serialNo: string; productId: string; warehouseId: string; userId: string; notes?: string }) {
        const { data, error } = await supabase.rpc('register_bag_serial', {
            p_serial_number: payload.serialNo,
            p_product_id: payload.productId,
            p_warehouse_id: payload.warehouseId || null,
            p_user_id: payload.userId,
            p_notes: payload.notes
        });
        if (error) throw error;
        const res = data as any;
        if (!res.success) throw new Error(res.message);
        return res;
    },

    async issueBagSerial(serialId: string, driverId: string, userId: string, notes: string) {
        const { data, error } = await supabase.rpc('issue_bag_serial', {
            p_serial_id: serialId,
            p_driver_id: driverId,
            p_user_id: userId,
            p_notes: notes
        });
        if (error) throw error;
        const res = data as any;
        if (!res.success) throw new Error(res.message);
        return res;
    },

    async receiveBagSerial(serialId: string, status: string | null, userId: string, notes: string) {
        const { data, error } = await supabase.rpc('receive_bag_serial', {
            p_serial_id: serialId,
            p_status: status || null,
            p_user_id: userId,
            p_notes: notes
        });
        if (error) throw error;
        const res = data as any;
        if (!res.success) throw new Error(res.message);
        return res;
    },

    async transferBagSerial(serialId: string, newDriverId: string, userId: string, notes: string) {
        const { data, error } = await supabase.rpc('transfer_bag_serial', {
            p_serial_id: serialId,
            p_new_driver_id: newDriverId,
            p_user_id: userId,
            p_notes: notes
        });
        if (error) throw error;
        const res = data as any;
        if (!res.success) throw new Error(res.message);
        return res;
    },

    // --- Branches ---
    async getBranches() {
        const { data, error } = await supabase.from('company_branches').select('*').order('id', { ascending: true });
        if (error) return [];
        return data.map(mapBranch);
    },
    async createBranch(branch: Partial<CompanyBranch>) {
        const { data, error } = await supabase.from('company_branches').insert([{
            name_ar: branch.nameAr,
            name_en: branch.nameEn
        }]).select().single();
        if (error) throw error;
        return mapBranch(data);
    },
    async updateBranch(id: number, updates: Partial<CompanyBranch>) {
        const { data, error } = await supabase.from('company_branches').update({
            name_ar: updates.nameAr,
            name_en: updates.nameEn
        }).eq('id', id).select().single();
        if (error) throw error;
        return mapBranch(data);
    },
    async deleteBranch(id: number) {
        const { error } = await supabase.from('company_branches').delete().eq('id', id);
        return { error };
    }
};
