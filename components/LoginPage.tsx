
import React, { useState } from 'react';
import { Shield, Lock, Mail, ArrowRight, Warehouse, AlertCircle } from 'lucide-react';
import { permissionService } from '../services/permissions';

interface LoginPageProps {
    onLogin: (userId: string, userName: string) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // In a real app, you would call your AuthService/Supabase Auth here
            // For now, let's simulate a login for the admin account
            setTimeout(async () => {
                let userId = '';
                let userName = '';

                if (email === 'admin@tawseel.com' && password === '123') {
                    userId = '40000001-0000-0000-0000-000000000001';
                    userName = 'مدير النظام';
                } else if (email === 'manager@tawseel.com' && password === 'manager123') {
                    userId = '40000001-0000-0000-0000-000000000002';
                    userName = 'مدير المخزن';
                }

                if (userId) {
                    await permissionService.updateUserLastLogin(userId);
                    onLogin(userId, userName);
                } else {
                    setError('بيانات الدخول غير صحيحة. يرجى محاولة البريد: admin@tawseel.com وكلمة المرور: 123');
                }
                setLoading(false);
            }, 1000);
        } catch (err) {
            setError('حدث خطأ أثناء تسجيل الدخول');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 dir-rtl">
            <div className="max-w-md w-full">
                {/* Logo Section */}
                <div className="text-center mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
                    <div className="inline-flex items-center justify-center p-3 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl shadow-xl shadow-blue-200 mb-4">
                        <Warehouse size={40} className="text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">توصيل ون</h1>
                    <p className="text-slate-500 mt-2">نظام إدارة المخزون المتقدم</p>
                </div>

                {/* Login Card */}
                <div className="bg-white rounded-3xl shadow-2xl shadow-slate-200 border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-500">
                    <div className="p-8">
                        <div className="mb-8">
                            <h2 className="text-xl font-bold text-slate-800">تسجيل الدخول</h2>
                            <p className="text-sm text-slate-400 mt-1">يرجى إدخال بياناتك للوصول إلى لوحة التحكم</p>
                        </div>

                        {error && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-600 animate-in shake duration-500">
                                <AlertCircle className="shrink-0 mt-0.5" size={18} />
                                <span className="text-xs font-medium leading-relaxed">{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2 mr-1">
                                    البريد الإلكتروني
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                                        <Mail size={18} />
                                    </div>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="your@email.com"
                                        className="w-full pr-11 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-50 transition-all outline-none text-sm"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2 mr-1">
                                    كلمة المرور
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                                        <Lock size={18} />
                                    </div>
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full pr-11 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-50 transition-all outline-none text-sm"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 active:scale-[0.98] transition-all shadow-lg shadow-slate-200 disabled:opacity-70 mt-4"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <span>دخول للنظام</span>
                                        <ArrowRight size={18} className="rotate-180" />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-center">
                        <p className="text-[10px] text-slate-400 flex items-center gap-1.5 uppercase tracking-widest font-bold">
                            <Shield size={12} className="text-slate-300" />
                            نظام محمي بشفرة أمان عالية
                        </p>
                    </div>
                </div>

                <div className="text-center mt-8 text-slate-400 text-xs">
                    &copy; {new Date().getFullYear()} توصيل ون - جميع الحقوق محفوظة
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
