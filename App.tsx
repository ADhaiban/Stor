import React, { useState, useEffect } from 'react';
import { dataService } from './services/api';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import InboundModal from './components/InboundModal';
import OutboundModal from './components/OutboundModal';
import InternalRequisitionModal from './components/InternalRequisitionModal';
import ProductModal from './components/ProductModal';
import PurchaseOrderModal from './components/PurchaseOrderModal';
import PurchaseOrderReceiveModal from './components/PurchaseOrderReceiveModal';
import IssueRequestModal from './components/IssueRequestModal';
import BeneficiaryModal from './components/BeneficiaryModal';
import GenericFormModal from './components/GenericFormModal';
import GenericList, { Column } from './components/GenericList';
import { MainMenu, StockMovement, MovementType, InventoryStock, Warehouse, Department, Product, ProductCategory, UnitOfMeasure, Task, Vendor, Client, Beneficiary, BeneficiaryType, StockIssueRequest, PurchaseOrder, FinancialTransaction } from './types';
import { Download, Upload, Handshake, ShieldCheck, XCircle, Box, ClipboardList, CheckCircle, Truck, History, Trash2, X, Edit } from 'lucide-react';
import { validateVendorForm, parseSupabaseError } from './utils/validation';
import { formatLongDateTime } from './utils/dateFormat';
import AdminPermissions from './components/AdminPermissions';
import { usePermissions } from './services/permissions';
import LoginPage from './components/LoginPage';
import { LogOut } from 'lucide-react';
import BagsList from './components/DeliveryBags/BagsList';
import BagEventsList from './components/DeliveryBags/BagEventsList';
import DriverCustodyList from './components/DeliveryBags/DriverCustodyList';
import BranchesList from './components/BranchesList';

const App: React.FC = () => {
  // Auth State
  const [user, setUser] = useState<{ id: string; name: string } | null>(() => {
    const saved = localStorage.getItem('currentUser');
    return saved ? JSON.parse(saved) : null;
  });

  // Navigation State
  const [currentMenu, setCurrentMenu] = useState<MainMenu>(() => {
    const saved = localStorage.getItem('activeMenu');
    const allowedMenus: MainMenu[] = ['dashboard', 'master_data', 'vendors', 'clients', 'inbound', 'outbound', 'internal_req', 'inventory', 'financial', 'reports', 'admin', 'delivery_bags'];
    if (saved === 'beneficiaries') return 'internal_req';
    if (saved && allowedMenus.includes(saved as MainMenu)) return saved as MainMenu;
    return 'dashboard';
  });
  const [currentSubMenu, setCurrentSubMenu] = useState<string | null>(() =>
    localStorage.getItem('activeSubMenu') || 'overview'
  );

  // Inactivity Timer (10 minutes)
  useEffect(() => {
    if (!user) return;

    let timeoutId: number;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      // 10 minutes = 10 * 60 * 1000 ms
      timeoutId = window.setTimeout(() => {
        handleLogout();
        alert('تم تسجيل الخروج تلقائياً بسبب عدم النشاط لمدة 10 دقائق');
      }, 10 * 60 * 1000);
    };

    // Activity Events
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, resetTimer));

    resetTimer();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(event => document.removeEventListener(event, resetTimer));
    };
  }, [user]);

  const handleLogin = (userId: string, userName: string) => {
    const newUser = { id: userId, name: userName };
    setUser(newUser);
    localStorage.setItem('currentUser', JSON.stringify(newUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('currentUser');
  };

  // Permissions Hook (uses logged-in user)
  const { hasPermission, loading: permsLoading } = usePermissions(user?.id);

  // State with persistence
  const [inventory, setInventory] = useState<InventoryStock[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [uoms, setUoms] = useState<UnitOfMeasure[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [issueRequests, setIssueRequests] = useState<StockIssueRequest[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [financialLedger, setFinancialLedger] = useState<FinancialTransaction[]>([]);

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
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showBeneficiaryModal, setShowBeneficiaryModal] = useState(false);
  const [showIssueRequestModal, setShowIssueRequestModal] = useState(false);
  const [showPurchaseOrderModal, setShowPurchaseOrderModal] = useState(false);
  const [poToReceive, setPoToReceive] = useState<PurchaseOrder | null>(null);
  const [issueToProcess, setIssueToProcess] = useState<StockIssueRequest | null>(null);
  const [issueProcessType, setIssueProcessType] = useState<'ISSUE' | 'REJECT' | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyBeneficiaryId, setHistoryBeneficiaryId] = useState<string | null>(null);
  const [detailRequest, setDetailRequest] = useState<StockIssueRequest | null>(null);
  const [detailTab, setDetailTab] = useState<'info' | 'history'>('info');

  const [initialBeneficiaryType, setInitialBeneficiaryType] = useState<BeneficiaryType | undefined>();
  const [editItem, setEditItem] = useState<any>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delivery Bags State
  const [showBagHistoryModal, setShowBagHistoryModal] = useState(false);
  const [bagHistoryFilters, setBagHistoryFilters] = useState<{ bagId?: string, driverId?: string }>({});

  // Load Data from Supabase
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [invData, movData, prodData, whData, deptData, venData, clientData, beneficiaryData, issueReqData, catData, uomData, poData, ledgerData] = await Promise.all([
          dataService.getInventory(),
          dataService.getMovements(),
          dataService.getProducts(),
          dataService.getWarehouses(),
          dataService.getDepartments(),
          dataService.getVendors(),
          dataService.getClients(),
          dataService.getBeneficiaries(),
          dataService.getIssueRequests(),
          dataService.getCategories(),
          dataService.getUOMs(),
          dataService.getPurchaseOrders(),
          dataService.getFinancialLedger()
        ]);

        setInventory(invData);
        setMovements(movData);
        setProducts(prodData);
        setWarehouses(whData);
        setDepartments(deptData);
        setVendors(venData);
        setClients(clientData);
        setBeneficiaries(beneficiaryData);
        setIssueRequests(issueReqData);
        setCategories(catData);
        setUoms(uomData);
        setPurchaseOrders(poData);
        setFinancialLedger(ledgerData);
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };
    fetchData();
  }, []);

  const handleNavigation = (menu: MainMenu, subMenu: string | null) => {
    setCurrentMenu(menu);
    setCurrentSubMenu(subMenu);

    // Persist to LocalStorage
    localStorage.setItem('activeMenu', menu);
    if (subMenu) localStorage.setItem('activeSubMenu', subMenu);

    // Quick Actions Handling
    if (menu === 'inbound' && subMenu === 'grn') setShowInbound(true);
    if (menu === 'outbound' && subMenu === 'dispatch') setShowOutbound(true);
  };

  // --- Handlers ---

  // 1. Categories
  const handleAddCategory = () => { setEditItem(null); setShowCategoryModal(true); };
  const handleEditCategory = (item: ProductCategory) => { setEditItem(item); setShowCategoryModal(true); };
  const handleCategorySubmit = async (data: Record<string, string>) => {
    try {
      if (editItem) {
        const updated = await dataService.updateCategory(editItem.id, { name: data.name });
        setCategories(prev => prev.map(c => c.id === editItem.id ? updated : c));
      } else {
        const newCat = await dataService.createCategory({ name: data.name });
        setCategories(prev => [...prev, newCat]);
      }
      setShowCategoryModal(false);
      setEditItem(null);
    } catch (e) {
      console.error("Error saving category:", e);
      alert("Error saving category.");
    }
  };

  // 2. UOM
  const handleAddUOM = () => { setEditItem(null); setShowUOMModal(true); };
  const handleEditUOM = (item: UnitOfMeasure) => { setEditItem(item); setShowUOMModal(true); };
  const handleUOMSubmit = async (data: Record<string, string>) => {
    try {
      if (editItem) {
        const updated = await dataService.updateUOM(editItem.id, { name: data.name, symbol: data.symbol });
        setUoms(prev => prev.map(u => u.id === editItem.id ? updated : u));
      } else {
        const newUom = await dataService.createUOM({ name: data.name, symbol: data.symbol });
        setUoms(prev => [...prev, newUom]);
      }
      setShowUOMModal(false);
      setEditItem(null);
    } catch (e) {
      console.error("Error saving UOM:", e);
      alert("Error saving UOM.");
    }
  };

  // 3. Warehouses
  const handleAddWarehouse = () => { setEditItem(null); setShowWarehouseModal(true); };
  const handleEditWarehouse = (item: Warehouse) => { setEditItem(item); setShowWarehouseModal(true); };
  const handleWarehouseSubmit = async (data: Record<string, string>) => {
    try {
      if (editItem) {
        const updated = await dataService.updateWarehouse(editItem.id, { name: data.name, location_address: data.location });
        setWarehouses(prev => prev.map(w => w.id === editItem.id ? updated : w));
      } else {
        const newWh = await dataService.createWarehouse({ name: data.name, location_address: data.location } as any);
        setWarehouses(prev => [...prev, newWh]);
      }
      setShowWarehouseModal(false);
      setEditItem(null);
    } catch (e) {
      console.error("Error saving warehouse", e);
      alert("Error saving warehouse.");
    }
  };

  // 4. Departments
  const handleAddDepartment = () => { setEditItem(null); setShowDeptModal(true); };
  const handleEditDepartment = (item: Department) => { setEditItem(item); setShowDeptModal(true); };
  const handleDeptSubmit = async (data: Record<string, string>) => {
    try {
      const payload = {
        name: data.name,
        cost_center_code: data.costCenter,
        budget_cap: parseFloat(data.budgetCap || '0')
      };
      if (editItem) {
        const updated = await dataService.updateDepartment(editItem.id, payload);
        setDepartments(prev => prev.map(d => d.id === editItem.id ? updated : d));
      } else {
        const newDept = await dataService.createDepartment(payload);
        setDepartments(prev => [...prev, newDept]);
      }
      setShowDeptModal(false);
      setEditItem(null);
    } catch (e) {
      console.error("Error saving department", e);
      alert("Error saving department.");
    }
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

  // 6. Vendors
  const handleAddVendor = () => { setEditItem(null); setFormErrors({}); setShowVendorModal(true); };
  const handleEditVendor = (item: Vendor) => { setEditItem(item); setFormErrors({}); setShowVendorModal(true); };
  const handleVendorSubmit = async (data: Record<string, string>) => {
    // 1. Client-side Validation
    const validation = validateVendorForm(data);
    if (!validation.isValid) {
      setFormErrors(validation.errors);
      return;
    }

    setFormErrors({});
    setIsSubmitting(true);

    try {
      const payload = {
        name: data.name,
        vendor_code: data.vendorCode,
        phone: data.phone,
        contact_person: data.contactPerson,
        address: data.address,
        tax_id: data.taxId
      };
      if (editItem) {
        const updated = await dataService.updateVendor(editItem.id, payload);
        setVendors(prev => prev.map(v => v.id === editItem.id ? updated : v));
      } else {
        const newVendor = await dataService.createVendor(payload);
        setVendors(prev => [...prev, newVendor]);
      }
      setShowVendorModal(false);
      setEditItem(null);
    } catch (e: any) {
      // 2. Server-side Error Parsing
      const errorData = parseSupabaseError(e);
      if (errorData.field) {
        setFormErrors({ [errorData.field]: errorData.message });
      } else {
        alert(errorData.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // 7. Clients
  const handleAddClient = () => { setEditItem(null); setShowClientModal(true); };
  const handleEditClient = (item: Client) => { setEditItem(item); setShowClientModal(true); };
  const handleClientSubmit = async (data: Record<string, string>) => {
    try {
      const payload = {
        name: data.name,
        client_code: data.clientCode,
        phone: data.phone,
        contact_person: data.contactPerson,
        gps_location: data.gpsLocation,
        category: data.category,
        collection_period_days: parseInt(data.collectionPeriodDays || '30'),
        credit_limit: parseFloat(data.creditLimit || '0'),
        is_active: data.isActive === 'true'
      };
      if (editItem) {
        const updated = await dataService.updateClient(editItem.id, payload);
        setClients(prev => prev.map(c => c.id === editItem.id ? updated : c));
      } else {
        const newClient = await dataService.createClient(payload);
        setClients(prev => [...prev, newClient]);
      }
      setShowClientModal(false);
      setEditItem(null);
    } catch (e) {
      console.error("Error saving client", e);
      alert("Error saving client.");
    }
  };

  // 8. Beneficiaries
  const handleAddBeneficiary = (initialType?: BeneficiaryType) => {
    setInitialBeneficiaryType(initialType);
    setEditItem(null);
    setShowBeneficiaryModal(true);
  };
  const handleEditBeneficiary = (item: Beneficiary) => {
    setInitialBeneficiaryType(item.type);
    setEditItem(item);
    setShowBeneficiaryModal(true);
  };
  const handleBeneficiarySubmit = async (data: any) => {
    try {
      if (editItem) {
        const updated = await dataService.updateBeneficiary(editItem.id, data);
        setBeneficiaries(prev => prev.map(b => b.id === editItem.id ? updated : b));
      } else {
        const created = await dataService.createBeneficiary(data);
        setBeneficiaries(prev => [created, ...prev]);
        // After adding, we want to auto-select in the issue modal if it's open
      }
      setShowBeneficiaryModal(false);
      setEditItem(null);
    } catch (e: any) {
      console.error("Error saving beneficiary", e);
      throw e; // Modal handles error display
    }
  };

  const handleAddIssueRequest = () => { setEditItem(null); setShowIssueRequestModal(true); };
  const handleIssueRequestSubmit = async (data: any) => {
    try {
      if (editItem) {
        const updated = await dataService.updateIssueRequest(editItem.id, data);
        setIssueRequests(prev => prev.map(r => r.id === editItem.id ? updated : r));
      } else {
        const payload = {
          ...data,
          request_code: data.request_code || `ISS-${Date.now()}`,
          requested_by: user?.name || 'SYSTEM'
        };
        const created = await dataService.createIssueRequest(payload);
        setIssueRequests(prev => [created, ...prev]);
      }
      setShowIssueRequestModal(false);
      setEditItem(null);
    } catch (e) {
      console.error("Error saving issue request", e);
      throw e; // Modal handles error display
    }
  };

  const refreshIssueWorkflowData = async () => {
    const [issueReqData, movData, invData] = await Promise.all([
      dataService.getIssueRequests(),
      dataService.getMovements(),
      dataService.getInventory()
    ]);
    setIssueRequests(issueReqData);
    setMovements(movData);
    setInventory(invData);
  };

  const handleApproveIssueRequest = async (request: StockIssueRequest) => {
    try {
      const updated = await dataService.approveIssueRequest(request.id, user?.name || 'SYSTEM');
      setIssueRequests(prev => prev.map(r => r.id === request.id ? updated : r));
    } catch (e: any) {
      console.error('Error approving issue request', e);
      let msg = 'تعذر اعتماد الطلب.';
      if (e.code === 'INSUFFICIENT_STOCK') {
        msg = `عذراً، المخزون المتاح غير كافٍ. المتاح حالياً: ${e.details?.available || 0}`;
      } else if (e.code === 'STOCK_ROW_NOT_FOUND') {
        msg = 'خطأ: لم يتم العثور على سجل مخزون لهذا الصنف.';
      } else if (e.message) {
        msg = e.message;
      }
      alert(msg);
    }
  };

  const handleRejectIssueRequest = (request: StockIssueRequest) => {
    setIssueToProcess(request);
    setIssueProcessType('REJECT');
  };

  const handleEditIssueRequest = (request: StockIssueRequest) => {
    setEditItem(request);
    setShowIssueRequestModal(true);
  };

  const handleProcessIssue = (request: StockIssueRequest) => {
    setIssueToProcess(request);
    setIssueProcessType('ISSUE');
  };

  const submitIssueProcessModal = async (data: Record<string, string>) => {
    if (!issueToProcess || !issueProcessType) return;
    try {
      if (issueProcessType === 'REJECT') {
        await dataService.rejectIssueRequest(
          issueToProcess.id,
          user?.name || 'SYSTEM',
          data.reason || 'Rejected'
        );
      } else {
        const receiverEmployeeName =
          issueToProcess.purpose === 'CONSUMABLE_CUSTODY'
            ? (data.receiverEmployeeName || '').trim()
            : null;
        if (issueToProcess.purpose === 'CONSUMABLE_CUSTODY' && !receiverEmployeeName) {
          alert('يرجى إدخال اسم الموظف المستلم.');
          return;
        }
        await dataService.processIssueRequest({
          request_id: issueToProcess.id,
          receiver_employee_name: receiverEmployeeName,
          issued_by: user?.name || 'SYSTEM',
          notes: data.issueNotes || null
        });
      }

      await refreshIssueWorkflowData();
      setIssueToProcess(null);
      setIssueProcessType(null);
    } catch (e: any) {
      console.error('Error in issue workflow', e);
      let msg = 'حدث خطأ أثناء تنفيذ العملية.';
      if (e.code === 'INSUFFICIENT_STOCK') {
        msg = `تعذر الصرف: الكمية المطلوبة غير متوفرة حالياً. الرصيد: ${e.details?.on_hand || 0}`;
      } else if (e.message) {
        msg = e.message;
      }
      alert(msg);
    }
  };

  // 9. Purchase Orders
  const handleAddPurchaseOrder = () => {
    setShowPurchaseOrderModal(true);
  };

  const handlePurchaseOrderSubmit = async (data: {
    poNumber: string;
    vendorId: string;
    orderDate: string;
    expectedDate?: string;
    notes?: string;
    items: Array<{ productId: string; warehouseId: string; quantity: number; unitCost: number }>;
  }) => {
    try {
      const created = await dataService.createPurchaseOrder({
        po_number: data.poNumber,
        vendor_id: data.vendorId,
        order_date: data.orderDate,
        expected_date: data.expectedDate || null,
        notes: data.notes || null,
        created_by: user?.name || 'SYSTEM',
        items: data.items.map(item => ({
          product_id: item.productId,
          warehouse_id: item.warehouseId || null,
          quantity_ordered: Number(item.quantity),
          unit_cost: Number(item.unitCost),
          notes: null
        }))
      });
      setPurchaseOrders(prev => [created, ...prev]);
      setShowPurchaseOrderModal(false);
    } catch (e) {
      console.error('Error creating PO', e);
      alert('Failed to create purchase order.');
    }
  };

  const handleApprovePurchaseOrder = async (po: PurchaseOrder) => {
    try {
      const updated = await dataService.approvePurchaseOrder(po.id, user?.name || 'SYSTEM');
      setPurchaseOrders(prev => prev.map(item => item.id === po.id ? updated : item));
    } catch (e) {
      console.error('Error approving PO', e);
      alert('Failed to approve purchase order.');
    }
  };

  const handleReceivePurchaseOrder = async (po: PurchaseOrder, payload: { notes?: string; lines: Array<{ purchaseOrderItemId: string; quantityReceived: number; warehouseId?: string }> }) => {
    try {
      await dataService.receivePurchaseOrder({
        purchase_order_id: po.id,
        receipt_items: payload.lines.map(line => ({
          purchase_order_item_id: line.purchaseOrderItemId,
          quantity_received: Number(line.quantityReceived),
          warehouse_id: line.warehouseId || null
        })),
        user_name: user?.name || 'SYSTEM',
        notes: payload.notes
      });

      const [invData, movData, poData] = await Promise.all([
        dataService.getInventory(),
        dataService.getMovements(),
        dataService.getPurchaseOrders()
      ]);
      setInventory(invData);
      setMovements(movData);
      setPurchaseOrders(poData);
      setPoToReceive(null);
    } catch (e) {
      console.error('Error receiving PO', e);
      alert('Failed to receive purchase order.');
    }
  };

  // 10. Products
  const handleAddProduct = () => { setEditItem(null); setShowProductModal(true); };
  const handleEditProduct = (item: Product) => { setEditItem(item); setShowProductModal(true); };
  const handleProductSubmit = async (productData: any) => {
    try {
      const dbProduct = {
        sku: productData.sku,
        name: productData.name,
        description: productData.description || '',
        type: productData.type || 'RESALE',
        min_reorder_level: productData.minReorderLevel || 0,
        current_wac_cost: productData.currentAvgCost || 0,
        category_id: productData.categoryId || null,
        preferred_vendor_id: productData.vendorId || null,
        default_warehouse_id: productData.warehouseId || null,
        default_department_id: productData.departmentId || null,
        uom_id: productData.unit,
        is_serialized: productData.isSerialized || false,
        is_batch_tracked: productData.isBatchTracked || false
      };

      if (editItem) {
        const updated = await dataService.updateProduct(editItem.id, dbProduct);
        setProducts(prev => prev.map(p => p.id === editItem.id ? updated : p));
      } else {
        const newProd = await dataService.createProduct(dbProduct as any);
        setProducts(prev => [...prev, newProd]);
      }
      setShowProductModal(false);
      setEditItem(null);
    } catch (e: any) {
      console.error("Error saving product:", e);
      alert(`Error saving product: ${e.message}.`);
    }
  };

  // --- DELETE HANDLERS ---
  const handleDeleteProduct = async (item: Product) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الصنف؟')) return;
    const { error } = await dataService.deleteProduct(item.id);
    if (error) return alert('Error deleting product');
    setProducts(prev => prev.filter(p => p.id !== item.id));
  };

  const handleDeleteCategory = async (item: ProductCategory) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الفئة؟')) return;
    const { error } = await dataService.deleteCategory(item.id);
    if (error) return alert('Error deleting category');
    setCategories(prev => prev.filter(c => c.id !== item.id));
  };

  const handleDeleteUOM = async (item: UnitOfMeasure) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الوحدة؟')) return;
    const { error } = await dataService.deleteUOM(item.id);
    if (error) return alert('Error deleting UOM');
    setUoms(prev => prev.filter(u => u.id !== item.id));
  };

  const handleDeleteWarehouse = async (item: Warehouse) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المستودع؟')) return;
    const { error } = await dataService.deleteWarehouse(item.id);
    if (error) return alert('Error deleting warehouse');
    setWarehouses(prev => prev.filter(w => w.id !== item.id));
  };

  const handleDeleteDepartment = async (item: Department) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا القسم؟')) return;
    const { error } = await dataService.deleteDepartment(item.id);
    if (error) return alert('Error deleting department');
    setDepartments(prev => prev.filter(d => d.id !== item.id));
  };

  const handleDeleteVendor = async (item: Vendor) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المورد؟')) return;
    const { error } = await dataService.deleteVendor(item.id);
    if (error) return alert('Error deleting vendor');
    setVendors(prev => prev.filter(v => v.id !== item.id));
  };

  const handleDeleteClient = async (item: Client) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا العميل؟')) return;
    const { error } = await dataService.deleteClient(item.id);
    if (error) return alert('Error deleting client');
    setClients(prev => prev.filter(c => c.id !== item.id));
  };

  const handleDeleteBeneficiary = async (item: Beneficiary) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المستفيد؟')) return;
    const { error } = await dataService.deleteBeneficiary(item.id);
    if (error) return alert('Error deleting beneficiary');
    setBeneficiaries(prev => prev.filter(b => b.id !== item.id));
  };

  const handleDeleteIssueRequest = async (item: StockIssueRequest) => {
    if (!window.confirm('هل أنت متأكد من حذف طلب الصرف؟')) return;
    const { error } = await dataService.deleteIssueRequest(item.id);
    if (error) return alert('Error deleting issue request');
    setIssueRequests(prev => prev.filter(r => r.id !== item.id));
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

  // Updated Product Columns
  const productColumns: Column<Product>[] = [
    { header: 'SKU', accessor: 'sku', className: 'font-mono' },
    { header: 'الاسم', accessor: 'name' },
    { header: 'الوصف', accessor: 'description' },
    { header: 'التكلفة', accessor: 'currentAvgCost' },
    { header: 'حد الطلب', accessor: 'minReorderLevel' },
    { header: 'الوحدة', render: p => uoms.find(u => u.id === p.unit)?.symbol || '-' },
    { header: 'متسلسل', render: p => p.isSerialized ? '✅' : '❌' },
    { header: 'الفئة', render: p => categories.find(c => c.id === p.categoryId)?.name || '-' },
    { header: 'المستودع', render: p => warehouses.find(w => w.id === p.warehouseId)?.name || '-' },
    { header: 'المورد', render: p => vendors.find(v => v.id === p.vendorId)?.name || '-' }
  ];

  // Updated Vendor Columns
  const vendorColumns: Column<Vendor>[] = [
    { header: 'كود المورد', accessor: 'vendorCode' },
    { header: 'الاسم', accessor: 'name' },
    { header: 'الجوال', accessor: 'phone' },
    { header: 'المسؤول', accessor: 'contactPerson' },
    { header: 'الرصيد', accessor: 'currentBalance' }
  ];

  // Updated Client Columns
  const clientColumns: Column<Client>[] = [
    { header: 'كود العميل', accessor: 'clientCode' },
    { header: 'الاسم', accessor: 'name' },
    { header: 'الجوال', accessor: 'phone' },
    { header: 'المسؤول', accessor: 'contactPerson' },
    { header: 'الرصيد', accessor: 'currentBalance' }
  ];

  const ledgerColumns: Column<FinancialTransaction>[] = [
    { header: 'التاريخ', accessor: 'transactionDate' },
    { header: 'النوع', accessor: 'type' },
    { header: 'المبلغ', render: (t) => t.amount.toFixed(2) },
    { header: 'الجهة', accessor: 'entityName' },
    { header: 'الرصيد بعد', render: (t) => t.balanceAfter.toFixed(2) },
    { header: 'ملاحظات', accessor: 'notes' }
  ];

  const beneficiaryColumns: Column<Beneficiary>[] = [
    { header: 'الكود', accessor: 'beneficiaryCode' },
    { header: 'الاسم', accessor: 'name' },
    { header: 'النوع', accessor: 'type' },
    { header: 'الجوال', accessor: 'phone' },
    { header: 'الإدارة', accessor: 'departmentName' }
  ];

  const issueStatusBadge = (status: StockIssueRequest['status']) => {
    const statusClass =
      status === 'ISSUED' ? 'bg-green-100 text-green-700' :
        status === 'APPROVED' ? 'bg-blue-100 text-blue-700' :
          status === 'REJECTED' ? 'bg-red-100 text-red-700' :
            'bg-amber-100 text-amber-700';
    return <span className={`px-2 py-1 rounded text-xs font-semibold ${statusClass}`}>{status}</span>;
  };

  const issueRequestColumns: Column<StockIssueRequest>[] = [
    { header: 'رقم الطلب', accessor: 'requestCode' },
    { header: 'تاريخ الإنشاء', render: r => formatLongDateTime(r.createdAt) },
    { header: 'المستفيد', accessor: 'beneficiaryName' },
    { header: 'الصنف', accessor: 'productName' },
    { header: 'الكمية', accessor: 'quantity' },
    { header: 'الغرض', accessor: 'purpose' },
    { header: 'الحالة', render: r => issueStatusBadge(r.status) }
  ];

  const handleShowHistory = (beneficiaryId: string) => {
    setHistoryBeneficiaryId(beneficiaryId);
    setShowHistoryModal(true);
  };

  const issueApprovalColumns: Column<StockIssueRequest>[] = [
    { header: 'رقم الطلب', accessor: 'requestCode' },
    { header: 'تاريخ الإنشاء', render: r => formatLongDateTime(r.createdAt) },
    { header: 'المستفيد', accessor: 'beneficiaryName' },
    { header: 'الصنف', accessor: 'productName' },
    {
      header: 'الكمية والمخزون',
      render: r => {
        const isShort = (r.availableQuantity || 0) < r.quantity;
        return (
          <div className="flex flex-col gap-1 min-w-[140px]">
            <div className="flex justify-between items-center px-1">
              <span className="text-[10px] text-slate-500 font-bold">المطلوب:</span>
              <span className="font-bold text-sm text-slate-900">{r.quantity}</span>
            </div>
            <div className="grid grid-cols-2 gap-1 px-1">
              <div className="flex flex-col p-1 bg-slate-50 border border-slate-100 rounded">
                <span className="text-[8px] text-slate-400">الرصيد</span>
                <span className="text-[10px] font-bold text-slate-600">{r.quantityOnHand ?? 0}</span>
              </div>
              <div className="flex flex-col p-1 bg-amber-50 border border-amber-100 rounded">
                <span className="text-[8px] text-amber-500">المحجوز</span>
                <span className="text-[10px] font-bold text-amber-600">{r.quantityReserved ?? 0}</span>
              </div>
            </div>
            <div className={`mt-1 p-1 px-2 rounded text-center border shadow-sm transition-colors ${isShort ? 'bg-red-50 text-red-600 border-red-100' : 'bg-purple-50 text-purple-600 border-purple-100'
              }`}>
              <div className="flex justify-between items-center text-[10px] font-bold">
                <span>المتاح للصرف:</span>
                <span>{r.availableQuantity ?? 0}</span>
              </div>
            </div>
          </div>
        );
      }
    },
    { header: 'الغرض', accessor: 'purpose' },
    { header: 'الحالة', render: r => issueStatusBadge(r.status) },
    {
      header: 'سجل الصرف',
      render: r => {
        const hasHistory = issueRequests.some(req =>
          req.beneficiaryId === r.beneficiaryId &&
          (req.status === 'ISSUED' || req.issuedMovementId) &&
          req.id !== r.id
        );

        if (!hasHistory) return <span className="text-slate-300 text-xs">لا يوجد</span>;

        return (
          <button
            onClick={() => handleShowHistory(r.beneficiaryId)}
            className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-xs font-semibold underline"
          >
            <ClipboardList size={14} />
            عرض السجل
          </button>
        );
      }
    },
    {
      header: 'الإجراء',
      render: r => (
        <div className="flex gap-2">
          {r.status === 'PENDING' && (
            <>
              <button
                onClick={() => handleEditIssueRequest(r)}
                className="px-2 py-1 rounded bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1 hover:bg-slate-200 transition-colors"
                title="تعديل الطلب"
              >
                <Edit size={12} />
                تعديل
              </button>
              <button
                onClick={() => handleApproveIssueRequest(r)}
                className="px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs font-semibold flex items-center gap-1"
              >
                <ShieldCheck size={12} />
                اعتماد
              </button>
              <button
                onClick={() => handleRejectIssueRequest(r)}
                className="px-2 py-1 rounded bg-red-50 text-red-700 text-xs font-semibold flex items-center gap-1"
              >
                <XCircle size={12} />
                رفض
              </button>
            </>
          )}
        </div>
      )
    }
  ];

  const issueExecutionColumns: Column<StockIssueRequest>[] = [
    ...issueRequestColumns,
    {
      header: 'صرف عهدة',
      render: r => (
        <div className="flex gap-2">
          {r.status === 'APPROVED' && (
            <button
              onClick={() => handleProcessIssue(r)}
              className="px-2 py-1 rounded bg-green-50 text-green-700 text-xs font-semibold flex items-center gap-1"
            >
              <Handshake size={12} />
              {r.beneficiaryType === 'DELIVERY_DRIVER' ? 'صرف عهدة' : 'صرف استهلاك'}
            </button>
          )}
        </div>
      )
    }
  ];

  const issueHistoryColumns: Column<StockIssueRequest>[] = [
    { header: 'رقم الطلب', accessor: 'requestCode', className: 'font-mono text-xs' },
    {
      header: 'تاريخ الطلب',
      render: r => formatLongDateTime(r.createdAt)
    },
    {
      header: 'الإدارة',
      render: r => departments.find(d => d.id === r.departmentId)?.name || '-'
    },
    { header: 'المستفيد', accessor: 'beneficiaryName' },
    {
      header: 'الحالة',
      render: r => {
        const colors: Record<string, string> = {
          'PENDING': 'bg-yellow-100 text-yellow-800',
          'APPROVED': 'bg-blue-100 text-blue-800',
          'REJECTED': 'bg-red-100 text-red-800',
          'ISSUED': 'bg-green-100 text-green-800',
          'DELIVERED': 'bg-gray-100 text-gray-800'
        };
        const labels: Record<string, string> = {
          'PENDING': 'قيد الانتظار',
          'APPROVED': 'تمت الموافقة',
          'REJECTED': 'مرفوض',
          'ISSUED': 'تم الصرف',
          'DELIVERED': 'تم التسليم'
        };
        return <span className={`px-2 py-1 rounded-full text-xs font-bold ${colors[r.status] || ''}`}>{labels[r.status] || r.status}</span>;
      }
    },
    { header: 'الصنف', accessor: 'productName' },
    { header: 'الكمية', accessor: 'quantity' },
    {
      header: 'آخر تحديث',
      render: r => formatLongDateTime(r.updatedAt || r.createdAt)
    },
    { header: 'المنشئ', accessor: 'requestedBy' },
    {
      header: 'تفاصيل',
      render: r => (
        <button
          onClick={() => { setDetailRequest(r); setDetailTab('info'); }}
          className="px-2 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-semibold flex items-center gap-1 transition-colors"
        >
          <ClipboardList size={12} />
          عرض
        </button>
      )
    }
  ];

  const purchaseOrderColumns: Column<PurchaseOrder>[] = [
    { header: 'PO', accessor: 'poNumber' },
    { header: 'Vendor', render: po => po.vendorName || po.vendorId },
    { header: 'Order Date', accessor: 'orderDate' },
    { header: 'Expected Date', render: po => po.expectedDate || '-' },
    { header: 'Total', render: po => Number(po.totalAmount || 0).toFixed(2) },
    {
      header: 'Status',
      render: po => {
        const statusClass =
          po.status === 'RECEIVED' ? 'bg-green-100 text-green-700' :
            po.status === 'PARTIALLY_RECEIVED' ? 'bg-amber-100 text-amber-700' :
              po.status === 'APPROVED' ? 'bg-blue-100 text-blue-700' :
                po.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                  'bg-slate-100 text-slate-700';
        return <span className={`px-2 py-1 rounded text-xs font-semibold ${statusClass}`}>{po.status}</span>;
      }
    },
    { header: 'Lines', render: po => `${po.items.length}` },
    {
      header: 'PO Actions',
      render: po => {
        const isReceived = po.status === 'RECEIVED' || po.status === 'CANCELLED';
        const canReceive = po.status === 'APPROVED' || po.status === 'PARTIALLY_RECEIVED';
        return (
          <div className="flex gap-2">
            {po.status === 'DRAFT' && (
              <button
                onClick={() => handleApprovePurchaseOrder(po)}
                className="px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs font-semibold"
              >
                Approve
              </button>
            )}
            {!isReceived && canReceive && (
              <button
                onClick={() => setPoToReceive(po)}
                className="px-2 py-1 rounded bg-green-50 text-green-700 text-xs font-semibold"
              >
                Receive
              </button>
            )}
          </div>
        );
      }
    }
  ];

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
  const handleInboundSubmit = async (data: any) => {
    try {
      const prod = products.find(p => p.id === data.selectedProduct);

      const newMovement = {
        type: MovementType.IN,
        product_id: data.selectedProduct,
        product_name: prod?.name || 'Unknown',
        quantity: Number(data.quantity),
        reference_doc_id: data.poNumber,
        warehouse_to_id: data.selectedWarehouse,
        unit_cost: Number(data.unitCost || 0),
        total_amount: Number(data.unitCost || 0) * Number(data.quantity),
        vendor_id: data.selectedVendor || null
      };

      const inventoryItem = {
        warehouse_id: data.selectedWarehouse,
        product_id: data.selectedProduct,
        quantity: Number(data.quantity),
        location_id: null // Set to null for generic warehouse entry
      };

      const movementId = await dataService.createInboundMovement(newMovement, [inventoryItem]);

      // Handle Serialization if provided
      if (data.serialization && movementId) {
        await dataService.generateProductSerials({
          product_id: data.selectedProduct,
          warehouse_id: data.selectedWarehouse,
          movement_id: movementId,
          start_number: data.serialization.startNumber,
          prefix: data.serialization.prefix,
          suffix: data.serialization.suffix,
          quantity: Number(data.quantity)
        });
      }

      // Refresh Data
      const [invData, movData] = await Promise.all([
        dataService.getInventory(),
        dataService.getMovements()
      ]);
      setInventory(invData);
      setMovements(movData);
      setShowInbound(false);
    } catch (e) {
      console.error("Error creating inbound", e);
      alert("Failed to process inbound. See console.");
    }
  };

  const handleOutboundSubmit = async (data: any) => {
    try {
      const invItem = inventory.find(i => i.id === data.selectedInventoryId);
      if (!invItem) return;

      const newMovement = {
        type: MovementType.OUT,
        product_id: invItem.productId,
        product_name: invItem.productName,
        warehouse_from_id: invItem.warehouseId,
        quantity: Number(data.quantity),
        reference_doc_id: data.soNumber,
        unit_cost: 0,
        client_id: data.selectedClient || null
      };

      const inventoryUpdate = {
        warehouse_id: invItem.warehouseId,
        product_id: invItem.productId,
        quantity: Number(data.quantity),
        location_id: invItem.locationId || null
      };

      await dataService.createOutboundMovement(newMovement, [inventoryUpdate]);

      // Refresh Data
      const [invData, movData] = await Promise.all([
        dataService.getInventory(),
        dataService.getMovements()
      ]);
      setInventory(invData);
      setMovements(movData);
      setShowOutbound(false);
    } catch (e) {
      console.error("Error creating outbound", e);
      alert("Failed to process outbound. See console.");
    }
  };

  const handleInternalReqSubmit = async (data: any) => {
    try {
      const invItem = inventory.find(i => i.productId === data.selectedProduct);
      if (!invItem) return;

      const prod = products.find(p => p.id === data.selectedProduct);

      const newMovement = {
        type: MovementType.CONSUMPTION,
        product_id: data.selectedProduct,
        product_name: prod?.name || 'Unknown',
        warehouse_from_id: invItem.warehouseId,
        department_id: data.departmentId,
        quantity: Number(data.quantity),
        reference_doc_id: `REQ-${Date.now()}`,
        unit_cost: prod?.currentAvgCost || 0,
        total_amount: data.totalCost
      };

      const inventoryUpdate = {
        warehouse_id: invItem.warehouseId,
        product_id: data.selectedProduct,
        quantity: Number(data.quantity),
        location_id: invItem.locationId || null
      };

      await dataService.createOutboundMovement(newMovement, [inventoryUpdate]);

      const [invData, movData] = await Promise.all([
        dataService.getInventory(),
        dataService.getMovements()
      ]);
      setInventory(invData);
      setMovements(movData);
      setShowInternalReq(false);
    } catch (e) {
      console.error("Error creating internal requisition", e);
      alert("Failed to process requisition. See console.");
    }
  };

  // Delivery Bags Handlers
  const handleShowBagHistory = (bagId?: string, driverId?: string) => {
    setBagHistoryFilters({ bagId, driverId });
    setShowBagHistoryModal(true);
  };

  // Render Content
  const renderContent = () => {
    if (permsLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-500 font-medium">جاري التحقق من الصلاحيات...</p>
          </div>
        </div>
      );
    }

    const menuToModule: Record<MainMenu, string> = {
      dashboard: 'dashboard',
      master_data: 'products',
      vendors: 'vendors',
      clients: 'clients',
      inbound: 'purchase_orders',
      outbound: 'sales_orders',
      inventory: 'inventory',
      internal_req: 'inventory',
      financial: 'reports',
      reports: 'reports',
      admin: 'users',
      delivery_bags: 'delivery_bags'
    };

    const targetModule = menuToModule[currentMenu];
    if (targetModule && !hasPermission(targetModule, 'view')) {
      return (
        <div className="flex flex-col items-center justify-center h-full py-20 text-center">
          <div className="bg-red-50 text-red-600 p-6 rounded-2xl shadow-sm border border-red-100 flex flex-col items-center gap-4">
            <h3 className="text-xl font-bold">عذرًا، لا تملك الصلاحية الكافية</h3>
            <p className="text-sm text-slate-500 max-w-xs">ليس لديك إذن لعرض هذه الوحدة.</p>
          </div>
        </div>
      );
    }

    const inboundMovements = movements.filter(m => m.type === MovementType.IN);
    const outboundMovements = movements.filter(m => m.type === MovementType.OUT);
    const transferMovements = movements.filter(m => m.type === MovementType.TRANSFER);
    const adjustmentMovements = movements.filter(m => m.type === MovementType.ADJUSTMENT);
    const consumptionMovements = movements.filter(m => m.type === MovementType.CONSUMPTION);

    const movementColumns: Column<StockMovement>[] = [
      { header: 'تاريخ الإنشاء', render: m => formatLongDateTime(m.createdAt) },
      { header: 'تاريخ الحركة', render: m => formatLongDateTime(m.date) },
      { header: 'النوع', accessor: 'type' },
      { header: 'الصنف', accessor: 'productName' },
      { header: 'الكمية', accessor: 'quantity' },
      { header: 'المرجع', accessor: 'referenceDocId' },
      { header: 'المستخدم', accessor: 'user' }
    ];

    type FinancialSummaryRow = {
      id: string;
      metric: string;
      value: number;
      details: string;
    };

    const totalReceivables = clients.reduce((sum, c) => sum + (c.currentBalance || 0), 0);
    const totalPayables = vendors.reduce((sum, v) => sum + (v.currentBalance || 0), 0);
    const financialSummaryRows: FinancialSummaryRow[] = [
      { id: 'f-1', metric: 'إجمالي الذمم المدينة', value: totalReceivables, details: 'مستحقات العملاء' },
      { id: 'f-2', metric: 'إجمالي الذمم الدائنة', value: totalPayables, details: 'مستحقات الموردين' },
      { id: 'f-3', metric: 'صافي المركز', value: totalReceivables - totalPayables, details: 'مدينة - دائنة' }
    ];
    const financialSummaryColumns: Column<FinancialSummaryRow>[] = [
      { header: 'المؤشر', accessor: 'metric' },
      { header: 'القيمة', accessor: 'value' },
      { header: 'التفاصيل', accessor: 'details' }
    ];

    type StatementRow = {
      id: string;
      entityType: string;
      code: string;
      name: string;
      balance: number;
      creditLimit: number;
    };

    const statementRows: StatementRow[] = [
      ...clients.map((c) => ({
        id: `c-${c.id}`,
        entityType: 'عميل',
        code: c.clientCode,
        name: c.name,
        balance: c.currentBalance || 0,
        creditLimit: c.creditLimit || 0
      })),
      ...vendors.map((v) => ({
        id: `v-${v.id}`,
        entityType: 'مورد',
        code: v.vendorCode,
        name: v.name,
        balance: v.currentBalance || 0,
        creditLimit: v.creditLimit || 0
      }))
    ];
    const statementColumns: Column<StatementRow>[] = [
      { header: 'النوع', accessor: 'entityType' },
      { header: 'الكود', accessor: 'code' },
      { header: 'الاسم', accessor: 'name' },
      { header: 'الرصيد', accessor: 'balance' },
      { header: 'حد الائتمان', accessor: 'creditLimit' }
    ];



    switch (currentMenu) {
      case 'dashboard':
        if (currentSubMenu === 'overview') return <Dashboard movements={movements} inventory={inventory} products={products} tasks={tasks} warehouses={warehouses} />;
        if (currentSubMenu === 'alerts') return <GenericList data={alertInventory} columns={inventoryColumns} title="تنبيهات المخزون (منخفض)" searchKeys={['productName', 'sku']} />;
        if (currentSubMenu === 'pending') return <GenericList data={tasks} columns={taskColumns} title="المهام المعلقة" searchKeys={['title']} onAdd={handleAddTask} />;
        break;
      case 'master_data':
        if (currentSubMenu === 'items') return <GenericList data={products} columns={productColumns} title="تعريف الأصناف" searchKeys={['name', 'sku']} onAdd={handleAddProduct} onEdit={handleEditProduct} onDelete={handleDeleteProduct} />;
        if (currentSubMenu === 'categories') return <GenericList data={categories} columns={categoryColumns} title="فئات الأصناف" searchKeys={['name']} onAdd={handleAddCategory} onEdit={handleEditCategory} onDelete={handleDeleteCategory} />;
        if (currentSubMenu === 'uom') return <GenericList data={uoms} columns={uomColumns} title="وحدات القياس" searchKeys={['name', 'symbol']} onAdd={handleAddUOM} onEdit={handleEditUOM} onDelete={handleDeleteUOM} />;
        if (currentSubMenu === 'warehouses') return <GenericList data={warehouses} columns={warehouseColumns} title="المستودعات والتقسيمات" searchKeys={['name', 'location']} onAdd={handleAddWarehouse} onEdit={handleEditWarehouse} onDelete={handleDeleteWarehouse} />;
        if (currentSubMenu === 'departments') return <GenericList data={departments} columns={departmentColumns} title="الأقسام ومراكز التكلفة" searchKeys={['name', 'costCenterCode']} onAdd={handleAddDepartment} onEdit={handleEditDepartment} onDelete={handleDeleteDepartment} />;
        break;
      case 'vendors':
        if (currentSubMenu === 'list') return <GenericList data={vendors} columns={vendorColumns} title="قائمة الموردين" searchKeys={['name', 'vendorCode']} onAdd={handleAddVendor} onEdit={handleEditVendor} onDelete={handleDeleteVendor} />;
        if (currentSubMenu === 'payables') return <GenericList data={financialLedger.filter(t => t.entityType === 'VENDOR')} columns={ledgerColumns} title="حسابات دائنة" searchKeys={['entityName', 'notes']} />;
        if (currentSubMenu === 'payments') return <GenericList data={financialLedger.filter(t => t.entityType === 'VENDOR' && t.type === 'PAYMENT')} columns={ledgerColumns} title="سجل الدفعات" searchKeys={['entityName', 'notes']} />;
        break;
      case 'clients':
        if (currentSubMenu === 'list') return <GenericList data={clients} columns={clientColumns} title="قائمة العملاء" searchKeys={['name', 'clientCode']} onAdd={handleAddClient} onEdit={handleEditClient} onDelete={handleDeleteClient} />;
        if (currentSubMenu === 'receivables') return <GenericList data={financialLedger.filter(t => t.entityType === 'CLIENT')} columns={ledgerColumns} title="حسابات مدينة" searchKeys={['entityName', 'notes']} />;
        if (currentSubMenu === 'collections') return <GenericList data={financialLedger.filter(t => t.entityType === 'CLIENT' && t.type === 'PAYMENT')} columns={ledgerColumns} title="سجل التحصيل" searchKeys={['entityName', 'notes']} />;
        break;
      case 'inbound':
        if (currentSubMenu === 'po') return <GenericList data={purchaseOrders} columns={purchaseOrderColumns} title="طلبات الشراء" searchKeys={['poNumber', 'vendorName', 'status']} onAdd={handleAddPurchaseOrder} />;
        if (currentSubMenu === 'grn') return <GenericList data={inboundMovements} columns={movementColumns} title="إذن استلام مخزني" searchKeys={['productName', 'referenceDocId', 'type']} />;
        if (currentSubMenu === 'grn_approval') {
          const pendingGRNs = purchaseOrders.filter(po => po.status === 'APPROVED' || po.status === 'PARTIALLY_RECEIVED');
          return (
            <div className="space-y-4">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center gap-3 mb-1">
                  <div className="p-2 rounded-lg bg-amber-50"><ShieldCheck size={20} className="text-amber-600" /></div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">موافقة على إذن استلام مخزني</h2>
                    <p className="text-sm text-slate-500">طلبات الشراء المعتمدة بانتظار استلام البضاعة</p>
                  </div>
                </div>
              </div>
              <GenericList
                data={pendingGRNs}
                columns={purchaseOrderColumns}
                title={`إذونات استلام بانتظار الموافقة (${pendingGRNs.length})`}
                searchKeys={['poNumber', 'vendorName', 'status']}
              />
            </div>
          );
        }
        if (currentSubMenu === 'quality') return <GenericList data={products} columns={productColumns} title="فحص الجودة" searchKeys={['name', 'sku']} />;
        if (currentSubMenu === 'returns_vendor') return <GenericList data={outboundMovements} columns={movementColumns} title="مرتجع للمورد" searchKeys={['productName', 'referenceDocId', 'type']} />;
        break;
      case 'outbound':
        if (currentSubMenu === 'so') return <GenericList data={clients} columns={clientColumns} title="أوامر البيع" searchKeys={['name', 'clientCode']} onAdd={handleAddClient} onEdit={handleEditClient} onDelete={handleDeleteClient} />;
        if (currentSubMenu === 'picking') return <GenericList data={inventory} columns={inventoryColumns} title="أوامر التحضير" searchKeys={['productName', 'sku']} />;
        if (currentSubMenu === 'dispatch') return <GenericList data={outboundMovements} columns={movementColumns} title="إذن صرف بضاعة" searchKeys={['productName', 'referenceDocId', 'type']} />;
        if (currentSubMenu === 'delivery_note') {
          const deliveryMovements = outboundMovements.filter(m => m.referenceDocId?.startsWith('DN-') || m.referenceDocId?.startsWith('DEL-'));
          return (
            <div className="space-y-4">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center gap-3 mb-1">
                  <div className="p-2 rounded-lg bg-blue-50"><Upload size={20} className="text-blue-600" /></div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">إذن تسليم بضاعة</h2>
                    <p className="text-sm text-slate-500">حركات تسليم البضاعة للعملاء</p>
                  </div>
                </div>
              </div>
              <GenericList
                data={deliveryMovements.length > 0 ? deliveryMovements : outboundMovements}
                columns={movementColumns}
                title={`إذونات التسليم (${deliveryMovements.length > 0 ? deliveryMovements.length : outboundMovements.length})`}
                searchKeys={['productName', 'referenceDocId', 'type']}
                enableDateFilter={true}
                dateAccessor="createdAt"
              />
            </div>
          );
        }
        if (currentSubMenu === 'custody_issue') {
          const custodyIssues = issueRequests.filter(r => r.purpose === 'CUSTODY' && (r.status === 'APPROVED' || r.status === 'ISSUED'));
          return (
            <div className="space-y-4">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center gap-3 mb-1">
                  <div className="p-2 rounded-lg bg-emerald-50"><Handshake size={20} className="text-emerald-600" /></div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">صرف عهدة خارجية</h2>
                    <p className="text-sm text-slate-500">طلبات عهدة السائقين والموظفين الخارجيين</p>
                  </div>
                </div>
              </div>
              <GenericList
                data={custodyIssues}
                columns={issueExecutionColumns}
                title={`عهد خارجية (${custodyIssues.length})`}
                searchKeys={['requestCode', 'beneficiaryName', 'productName']}
                enableDateFilter={true}
                dateAccessor="createdAt"
              />
            </div>
          );
        }
        if (currentSubMenu === 'returns_customer') return <GenericList data={inboundMovements} columns={movementColumns} title="مرتجع من عميل" searchKeys={['productName', 'referenceDocId', 'type']} />;
        break;
      case 'internal_req':
        if (currentSubMenu === 'new_req') return <GenericList data={issueRequests.filter(r => r.status === 'PENDING' || r.status === 'REJECTED')} columns={issueRequestColumns} title="طلبات صرف مواد" searchKeys={['requestCode', 'beneficiaryName', 'productName']} onAdd={handleAddIssueRequest} onDelete={handleDeleteIssueRequest} />;
        if (currentSubMenu === 'approvals') return <GenericList data={issueRequests.filter(r => r.status === 'PENDING')} columns={issueApprovalColumns} title="الموافقة على الطلبات" searchKeys={['requestCode', 'beneficiaryName', 'productName']} />;
        if (currentSubMenu === 'issue') return <GenericList data={issueRequests.filter(r => r.status === 'APPROVED' || r.status === 'ISSUED')} columns={issueExecutionColumns} title="صرف عهدة / استهلاك" searchKeys={['requestCode', 'beneficiaryName', 'productName']} />;
        if (currentSubMenu === 'history') return <GenericList data={issueRequests} columns={issueHistoryColumns} title="سجل طلبات الأقسام" searchKeys={['requestCode', 'beneficiaryName', 'productName', 'receiverEmployeeName']} enableDateFilter={true} dateAccessor="createdAt" />;
        break;
      case 'inventory':
        if (currentSubMenu === 'transfers') return <GenericList data={transferMovements} columns={movementColumns} title="التحويل بين المخازن" searchKeys={['productName', 'referenceDocId', 'type']} />;
        if (currentSubMenu === 'adjustments') return <GenericList data={adjustmentMovements} columns={movementColumns} title="التسويات المخزنية" searchKeys={['productName', 'referenceDocId', 'type']} />;
        if (currentSubMenu === 'stocktake') return <GenericList data={inventory} columns={inventoryColumns} title="الجرد الدوري" searchKeys={['productName', 'sku']} />;
        if (currentSubMenu === 'barcodes') return <GenericList data={products} columns={productColumns} title="طباعة الباركود" searchKeys={['name', 'sku']} />;
        break;
      case 'delivery_bags':
        if (currentSubMenu === 'report') return <BagsList currentUser={user!} onShowHistory={handleShowBagHistory} />;
        if (currentSubMenu === 'ledger') return <BagEventsList />;
        if (currentSubMenu === 'custody') return <DriverCustodyList />;
        break;
      case 'financial':
        if (currentSubMenu === 'dashboard') return <GenericList data={financialSummaryRows} columns={financialSummaryColumns} title="لوحة المالية" searchKeys={['metric', 'details']} />;
        if (currentSubMenu === 'aging') return <GenericList data={clients.filter(c => (c.currentBalance || 0) > 0)} columns={clientColumns} title="تحليل أعمار الديون" searchKeys={['name', 'clientCode']} />;
        if (currentSubMenu === 'soa') return <GenericList data={statementRows} columns={statementColumns} title="كشف حساب" searchKeys={['entityType', 'code', 'name']} />;
        break;
      case 'reports':
        if (currentSubMenu === 'stock_balance') {
          // Aggregate by product + warehouse
          const aggregated = inventory.reduce((acc: Record<string, any>, item) => {
            const key = `${item.productId}-${item.warehouseId}`;
            if (!acc[key]) {
              acc[key] = { ...item };
            } else {
              acc[key].quantityOnHand += item.quantityOnHand;
              acc[key].quantityReserved += item.quantityReserved;
            }
            return acc;
          }, {} as Record<string, any>);
          return <GenericList data={Object.values(aggregated) as any[]} columns={inventoryColumns} title="تقرير أرصدة المخزون" searchKeys={['productName', 'sku']} />;
        }

        if (currentSubMenu === 'item_ledger') return <GenericList data={movements} columns={movementColumns} title="كارت الصنف" searchKeys={['productName', 'referenceDocId', 'type']} />;
        if (currentSubMenu === 'expiry') return <GenericList data={products} columns={productColumns} title="تقرير صلاحية الأصناف" searchKeys={['name', 'sku']} />;
        if (currentSubMenu === 'consumption') {
          if (consumptionMovements.length > 0) {
            return <GenericList data={consumptionMovements} columns={movementColumns} title="تقرير استهلاك الأقسام" searchKeys={['productName', 'referenceDocId', 'type']} />;
          }
          return <GenericList data={issueRequests} columns={issueRequestColumns} title="تقرير استهلاك الأقسام" searchKeys={['requestCode', 'beneficiaryName', 'productName']} />;
        }
        break;
      case 'admin':
        if (currentSubMenu === 'branches') return <BranchesList />;
        return <AdminPermissions />;
      default:
        return <GenericList data={[]} columns={[]} title="قيد الإنشاء" searchKeys={[]} />;
    }
    return <GenericList data={[]} columns={[]} title="لا توجد بيانات لهذا القسم حالياً" searchKeys={[]} />;
  };


  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans dir-rtl">
      <Sidebar
        currentMenu={currentMenu}
        currentSubMenu={currentSubMenu}
        onNavigate={handleNavigation}
        hasPermission={hasPermission}
      />
      <main className="flex-1 mr-64 p-8 overflow-y-auto h-screen custom-scrollbar">
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 capitalize">نظام إدارة المخزون شركة توصيل ون</h2>
            <div className="flex items-center gap-2 text-slate-500 mt-1">
              <span>{currentMenu} / {currentSubMenu}</span>
              <span className="w-1 h-1 bg-slate-300 rounded-full" />
              <span className="text-blue-600 font-medium">مرحباً، {user.name}</span>
            </div>
          </div>
          <div className="flex gap-4">
            {hasPermission('purchase_orders', 'create') && (
              <button onClick={() => setShowInbound(true)} className="px-4 py-2 bg-white text-slate-700 border rounded-lg hover:bg-slate-50 flex items-center gap-2">
                <Download size={16} /> استلام
              </button>
            )}
            {hasPermission('sales_orders', 'create') && (
              <button onClick={() => setShowOutbound(true)} className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 flex items-center gap-2">
                <Upload size={16} /> صرف
              </button>
            )}
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2 font-bold"
              title="تسجيل الخروج"
            >
              <LogOut size={16} /> خروج
            </button>
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
          warehouses={warehouses}
          vendors={vendors}
        />
      )}
      {showOutbound && (
        <OutboundModal
          onClose={() => setShowOutbound(false)}
          onSubmit={handleOutboundSubmit}
          inventory={inventory}
          clients={clients}
        />
      )}
      {showBagHistoryModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl h-[80vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <History size={20} className="text-slate-500" />
                سجل انتقال العهدة
              </h3>
              <button onClick={() => setShowBagHistoryModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-100">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 custom-scrollbar bg-slate-50">
              <BagEventsList bagId={bagHistoryFilters.bagId} driverId={bagHistoryFilters.driverId} title=" " />
            </div>
          </div>
        </div>
      )}
      {showInternalReq && <InternalRequisitionModal onClose={() => setShowInternalReq(false)} onSubmit={handleInternalReqSubmit} inventory={inventory} products={products} departments={departments} />}
      {showPurchaseOrderModal && (
        <PurchaseOrderModal
          onClose={() => setShowPurchaseOrderModal(false)}
          onSubmit={handlePurchaseOrderSubmit}
          vendors={vendors}
          products={products}
          warehouses={warehouses}
        />
      )}
      {poToReceive && (
        <PurchaseOrderReceiveModal
          purchaseOrder={poToReceive}
          warehouses={warehouses}
          onClose={() => setPoToReceive(null)}
          onSubmit={(payload) => handleReceivePurchaseOrder(poToReceive, payload)}
        />
      )}

      {/* Entity Modals */}
      {showProductModal && (
        <ProductModal
          onClose={() => { setShowProductModal(false); setEditItem(null); }}
          onSubmit={handleProductSubmit}
          existingProducts={products}
          warehouses={warehouses}
          vendors={vendors}
          departments={departments}
          categories={categories}
          uoms={uoms}
          initialData={editItem}
          onAddCategory={() => setShowCategoryModal(true)}
          onAddWarehouse={() => setShowWarehouseModal(true)}
          onAddVendor={() => setShowVendorModal(true)}
          onAddDepartment={() => setShowDeptModal(true)}
          onAddUOM={() => setShowUOMModal(true)}
        />
      )}

      {showCategoryModal && (
        <GenericFormModal
          title={editItem ? "تعديل فئة" : "إضافة فئة جديدة"}
          fields={[{ name: 'name', label: 'اسم الفئة', required: true }]}
          onClose={() => { setShowCategoryModal(false); setEditItem(null); }}
          onSubmit={handleCategorySubmit}
          initialData={editItem ? { name: editItem.name } : {}}
        />
      )}

      {showUOMModal && (
        <GenericFormModal
          title={editItem ? "تعديل وحدة" : "إضافة وحدة قياس"}
          fields={[
            { name: 'name', label: 'اسم الوحدة', required: true },
            { name: 'symbol', label: 'رمز الوحدة (مثال: كجم)', required: true }
          ]}
          onClose={() => { setShowUOMModal(false); setEditItem(null); }}
          onSubmit={handleUOMSubmit}
          initialData={editItem ? { name: editItem.name, symbol: editItem.symbol } : {}}
        />
      )}

      {showWarehouseModal && (
        <GenericFormModal
          title={editItem ? "تعديل مستودع" : "إضافة مستودع"}
          fields={[
            { name: 'name', label: 'اسم المستودع', required: true },
            { name: 'location', label: 'الموقع الجغرافي', required: true }
          ]}
          onClose={() => { setShowWarehouseModal(false); setEditItem(null); }}
          onSubmit={handleWarehouseSubmit}
          initialData={editItem ? { name: editItem.name, location: editItem.location } : {}}
        />
      )}

      {showDeptModal && (
        <GenericFormModal
          title={editItem ? "تعديل قسم" : "إضافة قسم"}
          fields={[
            { name: 'name', label: 'اسم القسم', required: true },
            { name: 'costCenter', label: 'رمز مركز التكلفة', required: true },
            { name: 'budgetCap', label: 'سقف الميزانية', type: 'number' }
          ]}
          onClose={() => { setShowDeptModal(false); setEditItem(null); }}
          onSubmit={handleDeptSubmit}
          initialData={editItem ? { name: editItem.name, costCenter: editItem.costCenterCode, budgetCap: String(editItem.budgetCap) } : {}}
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

      {showVendorModal && (
        <GenericFormModal
          title={editItem ? "تعديل مورد" : "إضافة مورد جديد"}
          fields={[
            { name: 'name', label: 'اسم المورد', required: true },
            { name: 'vendorCode', label: 'كود المورد', required: true },
            { name: 'phone', label: 'رقم الجوال' },
            { name: 'contactPerson', label: 'الشخص المسؤول' },
            { name: 'address', label: 'العنوان' },
            { name: 'taxId', label: 'الرقم الضريبي' }
          ]}
          onClose={() => { setShowVendorModal(false); setEditItem(null); }}
          onSubmit={handleVendorSubmit}
          initialData={editItem ? {
            name: editItem.name,
            vendorCode: editItem.vendorCode,
            phone: editItem.phone,
            contactPerson: editItem.contactPerson,
            address: editItem.address,
            taxId: editItem.taxId
          } : {}}
          errors={formErrors}
          isSubmitting={isSubmitting}
        />
      )}

      {showClientModal && (
        <GenericFormModal
          title={editItem ? "تعديل عميل" : "إضافة عميل جديد"}
          fields={[
            { name: 'name', label: 'اسم العميل', required: true },
            { name: 'clientCode', label: 'كود العميل', required: true },
            { name: 'phone', label: 'رقم الجوال' },
            { name: 'contactPerson', label: 'الشخص المسؤول' },
            { name: 'gpsLocation', label: 'الموقع الجغرافي / العنوان' },
            {
              name: 'category',
              label: 'فئة العميل',
              type: 'select',
              options: [
                { value: 'Retail', label: 'تجزئة (Retail)' },
                { value: 'Wholesale', label: 'جملة (Wholesale)' },
                { value: 'Distributor', label: 'موزع' },
                { value: 'Key Account', label: 'عميل رئيسي' }
              ]
            },
            { name: 'collectionPeriodDays', label: 'فترة التحصيل (أيام)', type: 'number', required: true },
            { name: 'creditLimit', label: 'حد الائتمان (ر.س)', type: 'number', required: true },
            { name: 'isActive', label: 'نشط', type: 'select', options: [{ value: 'true', label: 'نعم' }, { value: 'false', label: 'لا' }] }
          ]}
          onClose={() => { setShowClientModal(false); setEditItem(null); }}
          onSubmit={handleClientSubmit}
          initialData={editItem ? {
            name: editItem.name,
            clientCode: editItem.clientCode,
            phone: editItem.phone,
            contactPerson: editItem.contactPerson,
            gpsLocation: editItem.gpsLocation,
            category: editItem.category,
            collectionPeriodDays: String(editItem.collectionPeriodDays),
            creditLimit: String(editItem.creditLimit),
            isActive: String(editItem.isActive)
          } : {
            collectionPeriodDays: '30',
            creditLimit: '10000',
            isActive: 'true',
            category: 'Retail'
          }}
        />
      )}
      {showBeneficiaryModal && (
        <GenericFormModal
          title={editItem ? "تعديل مستفيد" : "إضافة مستفيد"}
          fields={[
            { name: 'beneficiaryCode', label: 'كود المستفيد', required: true },
            {
              name: 'type',
              label: 'نوع المستفيد',
              type: 'select',
              required: true,
              options: [
                { value: 'EXTERNAL_CLIENT', label: 'عميل خارجي' },
                { value: 'DELIVERY_DRIVER', label: 'موصل' },
                { value: 'COMPANY_EMPLOYEE', label: 'موظف شركة' }
              ]
            },
            { name: 'name', label: 'الاسم', required: true },
            { name: 'phone', label: 'الجوال' },
            {
              name: 'departmentId',
              label: 'الإدارة',
              type: 'select',
              options: departments.map(d => ({ value: d.id, label: d.name }))
            }
          ]}
          onClose={() => { setShowBeneficiaryModal(false); setEditItem(null); }}
          onSubmit={handleBeneficiarySubmit}
          initialData={editItem ? {
            beneficiaryCode: editItem.beneficiaryCode,
            type: editItem.type,
            name: editItem.name,
            phone: editItem.phone,
            departmentId: editItem.departmentId
          } : {}}
        />
      )}

      {showIssueRequestModal && (
        <IssueRequestModal
          onClose={() => { setShowIssueRequestModal(false); setEditItem(null); }}
          onSubmit={handleIssueRequestSubmit}
          onAddBeneficiary={handleAddBeneficiary}
          beneficiaries={beneficiaries}
          products={products}
          departments={departments}
          allIssueRequests={issueRequests}
          editItem={editItem}
        />
      )}

      {showBeneficiaryModal && (
        <BeneficiaryModal
          onClose={() => { setShowBeneficiaryModal(false); setEditItem(null); }}
          onSubmit={handleBeneficiarySubmit}
          departments={departments}
          initialType={initialBeneficiaryType}
        />
      )}

      {issueToProcess && issueProcessType === 'REJECT' && (
        <GenericFormModal
          title={`رفض الطلب ${issueToProcess.requestCode}`}
          fields={[
            { name: 'reason', label: 'سبب الرفض', required: true }
          ]}
          onClose={() => { setIssueToProcess(null); setIssueProcessType(null); }}
          onSubmit={submitIssueProcessModal}
        />
      )}

      {issueToProcess && issueProcessType === 'ISSUE' && (
        <GenericFormModal
          title={`صرف الطلب ${issueToProcess.requestCode}`}
          fields={[
            ...(issueToProcess.purpose === 'CONSUMABLE_CUSTODY'
              ? [{ name: 'receiverEmployeeName', label: 'اسم الموظف المستلم', required: true } as const]
              : []),
            { name: 'issueNotes', label: 'ملاحظات الصرف' }
          ]}
          onClose={() => { setIssueToProcess(null); setIssueProcessType(null); }}
          onSubmit={submitIssueProcessModal}
        />
      )}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800">سجل الصرف السابق للمستفيد</h3>
              <button onClick={() => setShowHistoryModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 max-h-[70vh] overflow-y-auto">
              <table className="w-full text-sm text-right">
                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2">تاريخ الصرف</th>
                    <th className="px-4 py-2">الصنف</th>
                    <th className="px-4 py-2">الكمية</th>
                    <th className="px-4 py-2">الغرض</th>
                    <th className="px-4 py-2">المسلم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {issueRequests
                    .filter(req => req.beneficiaryId === historyBeneficiaryId && (req.status === 'ISSUED' || req.issuedMovementId))
                    .sort((a, b) => new Date(b.issuedAt || b.createdAt).getTime() - new Date(a.issuedAt || a.createdAt).getTime())
                    .map(req => (
                      <tr key={req.id}>
                        <td className="px-4 py-2">{formatLongDateTime(req.issuedAt)}</td>
                        <td className="px-4 py-2">{req.productName}</td>
                        <td className="px-4 py-2 font-bold">{req.quantity}</td>
                        <td className="px-4 py-2">{req.purpose}</td>
                        <td className="px-4 py-2">{req.receiverEmployeeName || '-'}</td>
                      </tr>
                    ))}
                  {issueRequests.filter(req => req.beneficiaryId === historyBeneficiaryId && (req.status === 'ISSUED' || req.issuedMovementId)).length === 0 && (
                    <tr><td colSpan={5} className="text-center py-4 text-slate-500">لا يوجد سجل صرف سابق</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {/* Request Detail Modal */}
      {detailRequest && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={() => setDetailRequest(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-gradient-to-l from-blue-50 to-white">
              <h3 className="text-lg font-bold text-slate-800">تفاصيل الطلب {detailRequest.requestCode || ''}</h3>
              <button onClick={() => setDetailRequest(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50">
              <button
                onClick={() => setDetailTab('info')}
                className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${detailTab === 'info' ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-slate-500 hover:text-slate-700'}`}
              >
                بيانات الطلب
              </button>
              <button
                onClick={() => setDetailTab('history')}
                disabled={!detailRequest.issuedMovementId && detailRequest.status !== 'ISSUED'}
                className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${detailTab === 'history' ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-slate-500 hover:text-slate-700'} ${!detailRequest.issuedMovementId && detailRequest.status !== 'ISSUED' ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                تفاصيل الصرف
              </button>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {detailTab === 'info' ? (
                <div className="space-y-3">
                  {[
                    { label: 'رقم الطلب', value: detailRequest.requestCode },
                    { label: 'تاريخ الإنشاء', value: formatLongDateTime(detailRequest.createdAt) },
                    { label: 'آخر تحديث', value: formatLongDateTime(detailRequest.updatedAt) },
                    { label: 'المستفيد', value: detailRequest.beneficiaryName },
                    { label: 'نوع المستفيد', value: detailRequest.beneficiaryType === 'DELIVERY_DRIVER' ? 'سائق توصيل' : detailRequest.beneficiaryType === 'OFFICE_EMPLOYEE' ? 'موظف مكتب' : detailRequest.beneficiaryType },
                    { label: 'القسم', value: departments.find(d => d.id === detailRequest.departmentId)?.name },
                    { label: 'الصنف', value: detailRequest.productName },
                    { label: 'الكمية', value: detailRequest.quantity },
                    { label: 'الغرض', value: detailRequest.purpose === 'UNIFORM' ? 'زي رسمي' : detailRequest.purpose === 'CONSUMABLE' ? 'مواد استهلاكية' : detailRequest.purpose === 'CUSTODY' ? 'عهدة' : detailRequest.purpose },
                    { label: 'الحالة', value: ({ 'PENDING': 'قيد الانتظار', 'APPROVED': 'تمت الموافقة', 'REJECTED': 'مرفوض', 'ISSUED': 'تم الصرف', 'DELIVERED': 'تم التسليم' } as Record<string, string>)[detailRequest.status] || detailRequest.status },
                    { label: 'ملاحظات', value: detailRequest.notes },
                    { label: 'أنشئ بواسطة', value: detailRequest.requestedBy },
                    { label: 'اعتمد بواسطة', value: detailRequest.approvedBy },
                    { label: 'تاريخ الاعتماد', value: formatLongDateTime(detailRequest.approvedAt) },
                  ].map((row, i) => (
                    <div key={i} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                      <span className="text-sm text-slate-500 font-medium">{row.label}</span>
                      <span className="text-sm text-slate-800 font-semibold text-left max-w-[60%]">{row.value ?? '-'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {[
                    { label: 'تاريخ الصرف', value: formatLongDateTime(detailRequest.issuedAt) },
                    { label: 'رقم حركة الصرف', value: detailRequest.issuedMovementId },
                    { label: 'اسم المستلم', value: detailRequest.receiverEmployeeName },
                    { label: 'الصنف المصروف', value: detailRequest.productName },
                    { label: 'الكمية', value: detailRequest.quantity },
                  ].map((row, i) => (
                    <div key={i} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                      <span className="text-sm text-slate-500 font-medium">{row.label}</span>
                      <span className="text-sm text-slate-800 font-semibold font-mono text-left max-w-[60%]">{row.value ?? '-'}</span>
                    </div>
                  ))}
                  {!detailRequest.issuedMovementId && detailRequest.status !== 'ISSUED' && (
                    <div className="text-center py-6 text-slate-400 text-sm">لا توجد بيانات صرف لهذا الطلب</div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setDetailRequest(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-sm font-semibold transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;




