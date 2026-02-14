
import { supabase } from '../src/lib/supabase';
import { Product, ProductCategory, Warehouse, Department, InventoryStock, StockMovement, UnitOfMeasure, Task, Vendor, Client } from '../types';

// Generic Fetch Helper
async function fetchTable<T>(tableName: string) {
    const { data, error } = await supabase.from(tableName).select('*');
    if (error) {
        console.error(`Error fetching ${tableName}:`, error);
        return [];
    }
    return data as T[];
}

export const dataService = {
    // --- Products ---
    async getProducts() { return fetchTable<Product>('products'); },
    async createProduct(product: Omit<Product, 'id' | 'created_at'>) {
        const { data, error } = await supabase.from('products').insert([product]).select().single();
        if (error) throw error;
        return data;
    },

    // --- Warehouses ---
    async getWarehouses() { return fetchTable<Warehouse>('warehouses'); },
    async createWarehouse(warehouse: Omit<Warehouse, 'id'>) {
        const { data, error } = await supabase.from('warehouses').insert([warehouse]).select().single();
        if (error) throw error;
        return data;
    },

    // --- Departments ---
    async getDepartments() { return fetchTable<Department>('departments'); },

    // --- Inventory ---
    async getInventory() { return fetchTable<InventoryStock>('inventory_stock'); },

    // --- Movements ---
    async getMovements() {
        // Join is more complex, for now specific query might be needed or view
        return fetchTable<StockMovement>('stock_movements');
    },

    async createInboundMovement(movement: any, inventoryUpdates: any[]) {
        // This requires a transaction (RPC) or sequential operations
        // For MVP, we will do sequential but it's not atomic without RPC

        // 1. Create Movement
        const { data: mov, error: movError } = await supabase.from('stock_movements').insert([movement]).select().single();
        if (movError) throw movError;

        // 2. Update/Insert Inventory
        for (const update of inventoryUpdates) {
            // Check if exists
            const { data: existing } = await supabase
                .from('inventory_stock')
                .select('id, quantity_on_hand')
                .match({
                    warehouse_id: update.warehouse_id,
                    product_id: update.product_id
                })
                .single();

            if (existing) {
                await supabase
                    .from('inventory_stock')
                    .update({ quantity_on_hand: existing.quantity_on_hand + update.quantity })
                    .eq('id', existing.id);
            } else {
                await supabase.from('inventory_stock').insert([update]);
            }
        }
        return mov;
    },

    async createOutboundMovement(movement: any, inventoryUpdates: any[]) {
        const { data: mov, error: movError } = await supabase.from('stock_movements').insert([movement]).select().single();
        if (movError) throw movError;

        for (const update of inventoryUpdates) {
            const { data: existing } = await supabase
                .from('inventory_stock')
                .select('id, quantity_on_hand')
                .match({
                    warehouse_id: update.warehouse_id,
                    product_id: update.product_id
                })
                .single();

            if (existing) {
                await supabase
                    .from('inventory_stock')
                    .update({ quantity_on_hand: existing.quantity_on_hand - update.quantity })
                    .eq('id', existing.id);
            }
        }
        return mov;
    },

    // --- Partners ---
    async getVendors() { return fetchTable<Vendor>('vendors'); },
    async getClients() { return fetchTable<Client>('clients'); },

    // --- Settings (Mocked for now as they might not be in DB yet) ---
    // Categories/UOM/Tasks might not have tables in the generated schema yet if we missed them
    // Assuming they are managed via simple CRUD if tables exist, or LocalStorage fallback
};
