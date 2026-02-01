import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import InboundModal from './components/InboundModal';
import OutboundModal from './components/OutboundModal';
import InternalRequisitionModal from './components/InternalRequisitionModal';
import ProductModal from './components/ProductModal';
import GenericFormModal from './components/GenericFormModal';
import GenericList, { Column } from './components/GenericList';
import { MainMenu, StockMovement, MovementType, InventoryStock, Warehouse, Department, Product, ProductCategory, UnitOfMeasure, Task, ProductType } from './types';
import { Download, Upload } from 'lucide-react';

// Keys for LocalStorage
const STORAGE_KEYS = {
  INVENTORY: 'nexus_inventory',
  MOVEMENTS: 'nexus_movements',
  PRODUCTS: 'nexus_products',
  WAREHOUSES: 'nexus_warehouses',
  DEPARTMENTS: 'nexus_departments',
  CATEGORIES: 'nexus_categories',
  UOM: 'nexus_uom',
  TASKS: 'nexus_tasks'
};

const App: React.FC = () => {
  const [currentMenu, setCurrentMenu] = useState<MainMenu>('dashboard');
  const [currentSubMenu, setCurrentSubMenu] = useState<string | null>('overview');

  // State with persistence
  const [inventory, setInventory] = useState<InventoryStock[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [uoms, setUoms] = useState<UnitOfMeasure[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  const [showInbound, setShowInbound] = useState(false);
  const [showOutbound, setShowOutbound] = useState(false);
  const [showInternalReq, setShowInternalReq] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);

  // Generic Modals State
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showUOMModal, setShowUOMModal] = useState(false);
  const [showWarehouseModal, setShowWarehouseModal] = useState(false);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);

  // Load from LocalStorage on mount
  useEffect(() => {
    const loadData = (key: string, setter: React.Dispatch<React.SetStateAction<any[]>>) => {
      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          setter(JSON.parse(saved));
        } catch (e) {
          console.error(`Failed to parse ${key}`, e);
        }
      }
    };

    loadData(STORAGE_KEYS.INVENTORY, setInventory);
    loadData(STORAGE_KEYS.MOVEMENTS, setMovements);
    loadData(STORAGE_KEYS.PRODUCTS, setProducts);
    loadData(STORAGE_KEYS.WAREHOUSES, setWarehouses);
    loadData(STORAGE_KEYS.DEPARTMENTS, setDepartments);
    loadData(STORAGE_KEYS.CATEGORIES, setCategories);
    loadData(STORAGE_KEYS.UOM, setUoms);
    loadData(STORAGE_KEYS.TASKS, setTasks);
  }, []);

  // Save to LocalStorage on change
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(inventory)); }, [inventory]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify(movements)); }, [movements]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products)); }, [products]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.WAREHOUSES, JSON.stringify(warehouses)); }, [warehouses]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.DEPARTMENTS, JSON.stringify(departments)); }, [departments]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories)); }, [categories]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.UOM, JSON.stringify(uoms)); }, [uoms]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks)); }, [tasks]);

  const handleNavigation = (menu: MainMenu, subMenu: string | null) => {
    setCurrentMenu(menu);
    setCurrentSubMenu(subMenu);

    // Quick Actions Handling
    if (menu === 'inbound' && subMenu === 'grn') setShowInbound(true);
    if (menu === 'outbound' && subMenu === 'dispatch') setShowOutbound(true);
    if (menu === 'internal_req' && subMenu === 'new_req') setShowInternalReq(true);
  };

  // --- Handlers for Adding Data ---

  // 1. Categories
  const handleAddCategory = () => setShowCategoryModal(true);
  const handleCategorySubmit = (data: Record<string, string>) => {
    setCategories(prev => [...prev, { id: `cat-${Date.now()}`, name: data.name }]);
    setShowCategoryModal(false);
  };

  // 2. UOM
  const handleAddUOM = () => setShowUOMModal(true);
  const handleUOMSubmit = (data: Record<string, string>) => {
    setUoms(prev => [...prev, { id: `uom-${Date.now()}`, name: data.name, symbol: data.symbol }]);
    setShowUOMModal(false);
  };

  // 3. Warehouses
  const handleAddWarehouse = () => setShowWarehouseModal(true);
  const handleWarehouseSubmit = (data: Record<string, string>) => {
    setWarehouses(prev => [...prev, { id: `wh-${Date.now()}`, name: data.name, location: data.location, isActive: true }]);
    setShowWarehouseModal(false);
  };

  // 4. Departments
  const handleAddDepartment = () => setShowDeptModal(true);
  const handleDeptSubmit = (data: Record<string, string>) => {
    setDepartments(prev => [...prev, { id: `dept-${Date.now()}`, name: data.name, costCenterCode: data.costCenter, budgetCap: 0 }]);
    setShowDeptModal(false);
  };

  // 5. Tasks
  const handleAddTask = () => setShowTaskModal(true);
  const handleTaskSubmit = (data: Record<string, string>) => {
    setTasks(prev => [...prev, {
      id: `task-${Date.now()}`,
      title: data.title,
      status: 'pending',
      dueDate: new Date().toISOString().split('T')[0],
      priority: 'medium'
    }]);
    setShowTaskModal(false);
  };

  // 6. Products
  const handleAddProduct = () => setShowProductModal(true);
  const handleProductSubmit = (productData: Omit<Product, 'id'>) => {
    setProducts(prev => [...prev, { ...productData, id: `prod-${Date.now()}` }]);
    setShowProductModal(false);
  };

  // --- Column Definitions ---
  const inventoryColumns: Column<InventoryStock>[] = [
    { header: 'اسم الصنف', accessor: 'productName' },
    { header: 'SKU', accessor: 'sku', className: 'font-mono text-xs' },
    { header: 'المستودع', render: (i) => warehouses.find(w => w.id === i.warehouseId)?.name || i.warehouseId },
    { header: 'الرصيد', accessor: 'quantityOnHand', className: 'font-bold' },
    { header: 'المحجوز', accessor: 'quantityReserved' },
    {
      header: 'الحالة',
      render: (i) => {
        const prod = products.find(p => p.id === i.productId);
        const min = prod?.minReorderLevel || 10;
        const available = i.quantityOnHand - i.quantityReserved;
        return available < min ?
          <span className="text-red-600 font-bold text-xs bg-red-100 px-2 py-1 rounded">منخفض</span> :
          <span className="text-green-600 text-xs bg-green-100 px-2 py-1 rounded">متوفر</span>;
      }
    }
  ];

  const categoryColumns: Column<ProductCategory>[] = [{ header: 'اسم الفئة', accessor: 'name' }];
  const uomColumns: Column<UnitOfMeasure>[] = [{ header: 'اسم الوحدة', accessor: 'name' }, { header: 'الرمز', accessor: 'symbol' }];
  const warehouseColumns: Column<Warehouse>[] = [{ header: 'اسم المستودع', accessor: 'name' }, { header: 'الموقع', accessor: 'location' }];
  const departmentColumns: Column<Department>[] = [{ header: 'اسم القسم', accessor: 'name' }, { header: 'مركز التكلفة', accessor: 'costCenterCode' }];
  const productColumns: Column<Product>[] = [{ header: 'SKU', accessor: 'sku' }, { header: 'الاسم', accessor: 'name' }, { header: 'التكلفة', accessor: 'currentAvgCost' }];

  const taskColumns: Column<Task>[] = [
    { header: 'المهمة', accessor: 'title' },
    { header: 'الحالة', render: t => t.status === 'pending' ? 'قيد الانتظار' : 'مكتمل' },
    { header: 'الأولوية', accessor: 'priority' },
    { header: 'التاريخ', accessor: 'dueDate' }
  ];

  // Logic for Stock Alerts (Low Inventory)
  const alertInventory = inventory.filter(i => {
    const prod = products.find(p => p.id === i.productId);
    return (i.quantityOnHand - i.quantityReserved) < (prod?.minReorderLevel || 10);
  });

  // Transaction Handlers
  const handleInboundSubmit = (data: any) => {
    const prod = products.find(p => p.id === data.selectedProduct);

    const newMovement: StockMovement = {
      id: `mov-${Date.now()}`,
      date: new Date().toISOString(),
      type: MovementType.IN,
      productId: data.selectedProduct,
      productName: prod?.name || 'Unknown',
      quantity: data.quantity,
      referenceDocId: data.poNumber,
      user: 'Admin',
      warehouseToId: data.selectedWarehouse
    };

    setInventory(prev => {
      // البحث عن نفس المنتج في نفس المستودع
      const idx = prev.findIndex(i =>
        i.productId === data.selectedProduct &&
        i.warehouseId === data.selectedWarehouse
      );

      if (idx >= 0) {
        // تحديث الكمية للصنف الموجود
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          quantityOnHand: updated[idx].quantityOnHand + data.quantity
        };
        return updated;
      }

      // إضافة صنف جديد في المستودع
      return [...prev, {
        id: `stk-${Date.now()}`,
        warehouseId: data.selectedWarehouse,
        locationId: 'GEN',
        productId: data.selectedProduct,
        productName: prod?.name || 'Unknown',
        productType: prod?.type || ProductType.RESALE,
        sku: prod?.sku || '',
        quantityOnHand: data.quantity,
        quantityReserved: 0
      }];
    });
    setMovements(prev => [newMovement, ...prev]);
    setShowInbound(false);
  };

  const handleOutboundSubmit = (data: any) => {
    // Logic for outbound
    const invItem = inventory.find(i => i.id === data.selectedInventoryId);
    if (!invItem) return;

    const newMovement: StockMovement = {
      id: `mov-${Date.now()}`,
      date: new Date().toISOString(),
      type: MovementType.OUT,
      productId: invItem.productId,
      productName: invItem.productName,
      warehouseFromId: invItem.warehouseId,
      quantity: data.quantity,
      referenceDocId: data.soNumber,
      user: 'Admin'
    };

    setInventory(prev => prev.map(item => {
      if (item.id === data.selectedInventoryId) {
        return { ...item, quantityOnHand: item.quantityOnHand - data.quantity };
      }
      return item;
    }));

    setMovements(prev => [newMovement, ...prev]);
    setShowOutbound(false);
  };

  const handleInternalReqSubmit = () => setShowInternalReq(false);


  // Render Content
  const renderContent = () => {
    switch (currentMenu) {
      case 'dashboard':
        if (currentSubMenu === 'overview') return <Dashboard movements={movements} inventory={inventory} />;
        if (currentSubMenu === 'alerts') return <GenericList data={alertInventory} columns={inventoryColumns} title="تنبيهات المخزون (منخفض)" searchKeys={['productName', 'sku']} />;
        if (currentSubMenu === 'pending') return <GenericList data={tasks} columns={taskColumns} title="المهام المعلقة" searchKeys={['title']} onAdd={handleAddTask} />;
        break;
      case 'master_data':
        if (currentSubMenu === 'items') return <GenericList data={products} columns={productColumns} title="تعريف الأصناف" searchKeys={['name', 'sku']} onAdd={handleAddProduct} />;
        if (currentSubMenu === 'categories') return <GenericList data={categories} columns={categoryColumns} title="فئات الأصناف" searchKeys={['name']} onAdd={handleAddCategory} onDelete={(item) => setCategories(prev => prev.filter(c => c.id !== item.id))} />;
        if (currentSubMenu === 'uom') return <GenericList data={uoms} columns={uomColumns} title="وحدات القياس" searchKeys={['name', 'symbol']} onAdd={handleAddUOM} onDelete={(item) => setUoms(prev => prev.filter(u => u.id !== item.id))} />;
        if (currentSubMenu === 'warehouses') return <GenericList data={warehouses} columns={warehouseColumns} title="المستودعات والتقسيمات" searchKeys={['name', 'location']} onAdd={handleAddWarehouse} onDelete={(item) => setWarehouses(prev => prev.filter(w => w.id !== item.id))} />;
        if (currentSubMenu === 'departments') return <GenericList data={departments} columns={departmentColumns} title="الأقسام ومراكز التكلفة" searchKeys={['name', 'costCenterCode']} onAdd={handleAddDepartment} onDelete={(item) => setDepartments(prev => prev.filter(d => d.id !== item.id))} />;
        break;
      case 'inventory':
      case 'inbound': // For now fallback to inventory list for other menus
        return <GenericList data={inventory} columns={inventoryColumns} title="المخزون" searchKeys={['productName', 'sku']} />;
      default:
        // Use GenericList even for 'Under Construction' pages to allow Search/Filter if data exists
        return <GenericList data={[]} columns={[]} title="قيد الإنشاء" searchKeys={[]} />;
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans dir-rtl">
      <Sidebar
        currentMenu={currentMenu}
        currentSubMenu={currentSubMenu}
        onNavigate={handleNavigation}
      />
      <main className="flex-1 mr-64 p-8 overflow-y-auto h-screen custom-scrollbar">
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 capitalize">نظام ادارة المخزون شركة توصيل ون</h2>
            <p className="text-slate-500">{currentMenu} / {currentSubMenu}</p>
          </div>
          <div className="flex gap-4">
            <button onClick={() => setShowInbound(true)} className="px-4 py-2 bg-white text-slate-700 border rounded-lg hover:bg-slate-50 flex items-center gap-2"><Download size={16} /> استلام</button>
            <button onClick={() => setShowOutbound(true)} className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 flex items-center gap-2"><Upload size={16} /> صرف</button>
          </div>
        </header>

        <div className="animate-in fade-in duration-300 h-full pb-20">
          {renderContent()}
        </div>
      </main>

      {/* Main Action Modals */}
      {showInbound && (
        <InboundModal
          onClose={() => setShowInbound(false)}
          onSubmit={handleInboundSubmit}
          inventory={inventory}
          products={products}
        />
      )}
      {showOutbound && (
        <OutboundModal
          onClose={() => setShowOutbound(false)}
          onSubmit={handleOutboundSubmit}
          inventory={inventory}
        />
      )}
      {showInternalReq && <InternalRequisitionModal onClose={() => setShowInternalReq(false)} onSubmit={handleInternalReqSubmit} inventory={inventory} />}

      {/* Entity Modals */}
      {showProductModal && <ProductModal onClose={() => setShowProductModal(false)} onSubmit={handleProductSubmit} existingProducts={products} />}

      {showCategoryModal && (
        <GenericFormModal
          title="إضافة فئة جديدة"
          fields={[{ name: 'name', label: 'اسم الفئة', required: true }]}
          onClose={() => setShowCategoryModal(false)}
          onSubmit={handleCategorySubmit}
        />
      )}

      {showUOMModal && (
        <GenericFormModal
          title="إضافة دورة قياس"
          fields={[
            { name: 'name', label: 'اسم الوحدة', required: true },
            { name: 'symbol', label: 'رمز الوحدة (مثال: كجم)', required: true }
          ]}
          onClose={() => setShowUOMModal(false)}
          onSubmit={handleUOMSubmit}
        />
      )}

      {showWarehouseModal && (
        <GenericFormModal
          title="إضافة مستودع"
          fields={[
            { name: 'name', label: 'اسم المستودع', required: true },
            { name: 'location', label: 'الموقع الجغرافي', required: true }
          ]}
          onClose={() => setShowWarehouseModal(false)}
          onSubmit={handleWarehouseSubmit}
        />
      )}

      {showDeptModal && (
        <GenericFormModal
          title="إضافة قسم"
          fields={[
            { name: 'name', label: 'اسم القسم', required: true },
            { name: 'costCenter', label: 'رمز مركز التكلفة', required: true }
          ]}
          onClose={() => setShowDeptModal(false)}
          onSubmit={handleDeptSubmit}
        />
      )}

      {showTaskModal && (
        <GenericFormModal
          title="إضافة مهمة جديدة"
          fields={[{ name: 'title', label: 'عنوان المهمة', required: true }]}
          onClose={() => setShowTaskModal(false)}
          onSubmit={handleTaskSubmit}
        />
      )}

    </div>
  );
};

export default App;