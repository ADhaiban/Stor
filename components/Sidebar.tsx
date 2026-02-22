import React, { useState } from 'react';
import {
  LayoutDashboard,
  Database,
  Download,
  Upload,
  ClipboardList,
  Box,
  BarChart2,
  Settings,
  ChevronDown,
  ChevronLeft,
  Warehouse,
  Users,
  Store,
  DollarSign,
  Briefcase
} from 'lucide-react';
import { MainMenu } from '../types';

interface SidebarProps {
  currentMenu: MainMenu;
  currentSubMenu: string | null;
  onNavigate: (menu: MainMenu, subMenu: string | null) => void;
  hasPermission: (moduleName: string, actionName: string) => boolean;
}

interface MenuItem {
  id: MainMenu;
  label: string;
  icon: React.ElementType;
  subMenus: { id: string; label: string }[];
  moduleName?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ currentMenu, currentSubMenu, onNavigate, hasPermission }) => {
  const [expanded, setExpanded] = useState<MainMenu | null>('dashboard');

  const menuStructure: MenuItem[] = [
    {
      id: 'dashboard',
      label: 'لوحة المعلومات',
      icon: LayoutDashboard,
      moduleName: 'dashboard',
      subMenus: [
        { id: 'overview', label: 'نظرة عامة' },
        { id: 'alerts', label: 'تنبيهات نقص المخزون' },
        { id: 'pending', label: 'مهام معلقة' }
      ]
    },
    {
      id: 'master_data',
      label: 'البيانات الأساسية',
      icon: Database,
      moduleName: 'products',
      subMenus: [
        { id: 'items', label: 'تعريف الأصناف' },
        { id: 'categories', label: 'فئات الأصناف' },
        { id: 'uom', label: 'وحدات القياس' },
        { id: 'warehouses', label: 'المستودعات والتقسيمات' },
        { id: 'departments', label: 'الأقسام ومراكز التكلفة' }
      ]
    },
    {
      id: 'vendors',
      label: 'إدارة الموردين',
      icon: Users,
      moduleName: 'vendors',
      subMenus: [
        { id: 'list', label: 'قائمة الموردين' },
        { id: 'payables', label: 'حسابات دائنة' },
        { id: 'payments', label: 'تسديد دفعات' }
      ]
    },
    {
      id: 'clients',
      label: 'إدارة العملاء',
      icon: Store,
      moduleName: 'clients',
      subMenus: [
        { id: 'list', label: 'قائمة العملاء' },
        { id: 'receivables', label: 'حسابات مدينة' },
        { id: 'collections', label: 'تحصيل مستحقات' }
      ]
    },
    {
      id: 'inbound',
      label: 'المشتريات والاستلام',
      icon: Download,
      moduleName: 'purchase_orders',
      subMenus: [
        { id: 'po', label: 'طلبات الشراء' },
        { id: 'grn', label: 'إذن استلام مخزني' },
        { id: 'grn_approval', label: 'موافقة على إذن استلام' },
        { id: 'quality', label: 'فحص الجودة' },
        { id: 'returns_vendor', label: 'مرتجع لمورد' }
      ]
    },
    {
      id: 'outbound',
      label: 'المبيعات والصرف',
      icon: Upload,
      moduleName: 'sales_orders',
      subMenus: [
        { id: 'so', label: 'أوامر البيع' },
        { id: 'picking', label: 'أوامر التحضير' },
        { id: 'dispatch', label: 'إذن صرف بضاعة' },
        { id: 'delivery_note', label: 'إذن تسليم بضاعة' },
        { id: 'custody_issue', label: 'صرف عهدة خارجية' },
        { id: 'returns_customer', label: 'مرتجع من عميل' }
      ]
    },
    {
      id: 'internal_req',
      label: 'الطلبات الداخلية',
      icon: ClipboardList,
      moduleName: 'inventory',
      subMenus: [
        { id: 'new_req', label: 'طلب صرف مواد' },
        { id: 'approvals', label: 'الموافقة على الطلبات' },
        { id: 'issue', label: 'صرف عهدة / استهلاك' },
        { id: 'history', label: 'سجل طلبات الأقسام' }
      ]
    },
    {
      id: 'inventory',
      label: 'إدارة المخزون',
      icon: Box,
      moduleName: 'inventory',
      subMenus: [
        { id: 'transfers', label: 'التحويل بين المخازن' },
        { id: 'adjustments', label: 'التسويات المخزنية' },
        { id: 'stocktake', label: 'الجرد الدوري' },
        { id: 'barcodes', label: 'طباعة الباركود' }
      ]
    },
    {
      id: 'delivery_bags',
      label: 'صرف للموصل / عهدة',
      icon: Briefcase,
      moduleName: 'delivery_bags',
      subMenus: [
        { id: 'report', label: 'تقرير عهد الشنط' },
        { id: 'ledger', label: 'سجل انتقال العهدة' },
        { id: 'custody', label: 'تقرير عهدة الموصلين' }
      ]
    },
    {
      id: 'financial',
      label: 'التقارير المالية',
      icon: DollarSign,
      moduleName: 'reports',
      subMenus: [
        { id: 'dashboard', label: 'لوحة المالية' },
        { id: 'aging', label: 'تحليل أعمار الديون' },
        { id: 'soa', label: 'كشف حساب' }
      ]
    },
    {
      id: 'reports',
      label: 'التقارير والتحليلات',
      icon: BarChart2,
      moduleName: 'reports',
      subMenus: [
        { id: 'stock_balance', label: 'تقرير أرصدة المخزون' },
        { id: 'item_ledger', label: 'كارت الصنف' },
        { id: 'expiry', label: 'تقرير صلاحية الأصناف' },
        { id: 'consumption', label: 'تقرير استهلاك الأقسام' }
      ]
    },
    {
      id: 'admin',
      label: 'الإعدادات والصلاحيات',
      icon: Settings,
      moduleName: 'users',
      subMenus: [
        { id: 'users', label: 'إدارة المستخدمين' },
        { id: 'branches', label: 'إدارة الفروع' },
        { id: 'audit', label: 'سجل الرقابة' },
        { id: 'config', label: 'إعدادات النظام' }
      ]
    }
  ];

  const filteredMenu = menuStructure.filter(item => {
    if (!item.moduleName) return true;
    return hasPermission(item.moduleName, 'view');
  });

  const toggleExpand = (id: MainMenu) => {
    setExpanded(expanded === id ? null : id);
  };

  return (
    <div className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen fixed right-0 top-0 border-l border-slate-800 shadow-2xl z-20">
      <div className="p-5 flex items-center gap-3 border-b border-slate-800/50 bg-slate-900 z-10">
        <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-2 rounded-lg shadow-lg shadow-blue-900/50">
          <Warehouse size={22} className="text-white" />
        </div>
        <div>
          <h1 className="font-bold text-base text-white tracking-tight">توصيل ون</h1>
          <p className="text-[10px] text-blue-400 font-medium uppercase tracking-wider">نظام إدارة المخزون</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 custom-scrollbar">
        <ul className="space-y-1 px-3">
          {filteredMenu.map((item) => {
            const Icon = item.icon;
            const isExpanded = expanded === item.id;
            const isActive = currentMenu === item.id;

            return (
              <li key={item.id}>
                <button
                  onClick={() => toggleExpand(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group
                    ${isActive ? 'bg-slate-800 text-white' : 'hover:bg-slate-800/50 hover:text-white'}`}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={18} className={`${isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                    <span>{item.label}</span>
                  </div>
                  {isExpanded ? (
                    <ChevronDown size={14} className="text-slate-500" />
                  ) : (
                    <ChevronLeft size={14} className="text-slate-500" />
                  )}
                </button>

                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-96 opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
                  <ul className="pr-9 pl-2 space-y-0.5 border-r border-slate-700/50 mr-5 my-1">
                    {item.subMenus.map((sub) => (
                      <li key={sub.id}>
                        <button
                          onClick={() => onNavigate(item.id, sub.id)}
                          className={`w-full text-right px-3 py-2 text-xs rounded-md transition-colors block
                            ${currentSubMenu === sub.id ? 'text-blue-400 bg-blue-500/10 font-medium' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
                        >
                          {sub.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-slate-800 bg-slate-900/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold text-xs">
            أ.م
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-white">أحمد محمد</p>
            <p className="text-[10px] text-slate-500">مدير المستودع</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;


