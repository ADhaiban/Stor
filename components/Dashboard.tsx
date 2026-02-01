import React, { useMemo } from 'react';
import {
  TrendingUp,
  Package,
  AlertTriangle,
  ClipboardList,
  DollarSign
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { StockMovement, InventoryStock, Product, Task, Warehouse } from '../types';

interface DashboardProps {
  movements: StockMovement[];
  inventory: InventoryStock[];
  products: Product[];
  tasks: Task[];
  warehouses: Warehouse[];
}

const Dashboard: React.FC<DashboardProps> = ({ movements, inventory, products, tasks, warehouses }) => {

  // 1. Calculate Total Stock Value
  const totalStockValue = useMemo(() => {
    return inventory.reduce((total, item) => {
      const product = products.find(p => p.id === item.productId);
      const cost = product?.currentAvgCost || 0;
      return total + (item.quantityOnHand * cost);
    }, 0);
  }, [inventory, products]);

  // 2. Count Active Items (Products with stock > 0)
  const productCount = products.length;
  const activeWarehouses = warehouses.length;

  // 3. Low Stock Alerts
  const lowStockCount = useMemo(() => {
    return inventory.filter(item => {
      const product = products.find(p => p.id === item.productId);
      const minLevel = product?.minReorderLevel || 10;
      return (item.quantityOnHand - item.quantityReserved) < minLevel;
    }).length;
  }, [inventory, products]);

  // 4. Pending Tasks
  const pendingTasksCount = tasks.filter(t => t.status === 'pending').length;

  // 5. Data for Inventory Distribution Chart
  const stockByProduct = useMemo(() => {
    // Top 10 products by quantity to avoid clutter
    const data = inventory.map(i => ({
      name: i.productName || i.sku,
      qty: i.quantityOnHand
    }));
    return data.sort((a, b) => b.qty - a.qty).slice(0, 10);
  }, [inventory]);

  // 6. Data for Weekly Movement Activity
  const movementActivity = useMemo(() => {
    const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const today = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (6 - i));
      return d;
    });

    return last7Days.map(date => {
      const dateStr = date.toISOString().split('T')[0];
      const dayMovements = movements.filter(m => m.date.startsWith(dateStr));

      return {
        name: days[date.getDay()],
        in: dayMovements.filter(m => m.type === 'IN').reduce((sum, m) => sum + m.quantity, 0),
        out: dayMovements.filter(m => m.type === 'OUT').reduce((sum, m) => sum + m.quantity, 0)
      };
    });
  }, [movements]);

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('ar-SA', { style: 'currency', currency: 'SAR' });
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Value */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">إجمالي قيمة المخزون</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-2">{formatCurrency(totalStockValue)}</h3>
            </div>
            <div className="p-2 bg-green-50 rounded-lg text-green-600">
              <DollarSign size={20} />
            </div>
          </div>
          <p className="text-xs text-green-600 mt-2 flex items-center">
            <TrendingUp size={12} className="ml-1" /> محدث تلقائياً
          </p>
        </div>

        {/* Product Count */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">عدد الأصناف المعرفة</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-2">{productCount}</h3>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <Package size={20} />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">موزعة على {activeWarehouses} مستودعات</p>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">تنبيهات نقص المخزون</p>
              <h3 className={`text-2xl font-bold mt-2 ${lowStockCount > 0 ? 'text-amber-600' : 'text-slate-700'}`}>{lowStockCount}</h3>
            </div>
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <AlertTriangle size={20} />
            </div>
          </div>
          <p className="text-xs text-amber-600 mt-2">{lowStockCount > 0 ? 'يتطلب إجراء فوري' : 'المخزون جيد'}</p>
        </div>

        {/* Pending Tasks */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">المهام المعلقة</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-2">{pendingTasksCount}</h3>
            </div>
            <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
              <ClipboardList size={20} />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">مهام قيد الانتظار</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h4 className="text-lg font-semibold text-slate-800 mb-4">أعلى الأصناف كمية (توب 10)</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stockByProduct}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', textAlign: 'right' }} />
                <Bar dataKey="qty" fill="#3b82f6" radius={[4, 4, 0, 0]} name="الكمية" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h4 className="text-lg font-semibold text-slate-800 mb-4">حركة المخزون (آخر 7 أيام)</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={movementActivity}>
                <defs>
                  <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', textAlign: 'right' }} />
                <Area type="monotone" dataKey="in" name="وارد" stroke="#22c55e" strokeWidth={2} fillOpacity={1} fill="url(#colorIn)" />
                <Area type="monotone" dataKey="out" name="صادر" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorOut)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Movements Table Preview */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <h4 className="text-lg font-semibold text-slate-800">أحدث حركات المخزون (دفتر الأستاذ)</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-slate-50 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-3">النوع</th>
                <th className="px-6 py-3">المرجع</th>
                <th className="px-6 py-3">الصنف</th>
                <th className="px-6 py-3">الكمية</th>
                <th className="px-6 py-3">التاريخ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {movements.slice(0, 5).map((mov) => (
                <tr key={mov.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${mov.type === 'IN' ? 'bg-green-100 text-green-800' :
                        mov.type === 'OUT' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'}`}>
                      {mov.type === 'IN' ? 'وارد' : mov.type === 'OUT' ? 'صادر' : mov.type === 'CONSUMPTION' ? 'استهلاك' : mov.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-slate-600">{mov.referenceDocId}</td>
                  <td className="px-6 py-4 font-medium text-slate-900">{mov.productName}</td>
                  <td className="px-6 py-4">{mov.quantity}</td>
                  <td className="px-6 py-4 text-slate-500">{new Date(mov.date).toLocaleDateString('ar-SA')}</td>
                </tr>
              ))}
              {movements.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    لا توجد حركات مخزنية مسجلة بعد
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;