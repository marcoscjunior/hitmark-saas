"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ComposedChart, Line, Legend 
} from 'recharts';
import { 
  LayoutDashboard, Users, Printer, Settings, LogOut, Plus, Trash2, ChevronDown, Shield, Key, Building, AlertCircle, CheckCircle2, Lock, Target, CalendarDays, TrendingUp
} from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDocs, getDoc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

// --- FIREBASE INITIALIZATION ---
const firebaseConfig = {
  apiKey: "AIzaSyDtq-F-_kq00WeO1RX3zCfRk57KAkdAcl0",
  authDomain: "hitmark-1b1bd.firebaseapp.com",
  projectId: "hitmark-1b1bd",
  storageBucket: "hitmark-1b1bd.firebasestorage.app",
  messagingSenderId: "278429839526",
  appId: "1:278429839526:web:595bc2ad12ddcd5fbec467"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "hitmark-saas-prod";

// --- UTILS ---
const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const getWeeksInMonth = (year: number, month: number) => {
  let count = 0;
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d);
    if (date.getDay() === 1) count++; 
  }
  return count > 0 ? count : 4;
};

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MONTHS_FULL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

// --- UI COMPONENTS ---
const Card = ({ children, className = '' }: any) => (
  <div className={`bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden transition-colors ${className}`}>{children}</div>
);

const Button = ({ children, variant = 'primary', size = 'default', className = '', ...props }: any) => {
  const base = "inline-flex items-center justify-center rounded-lg font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]";
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-900/20",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200 border border-slate-200",
    outline: "border border-slate-200 bg-transparent hover:bg-slate-50 text-slate-700",
    ghost: "bg-transparent hover:bg-slate-100 text-slate-600",
    danger: "bg-red-500/10 text-red-600 hover:bg-red-500/20"
  };
  const sizes = {
    sm: "h-8 px-3 text-xs",
    default: "h-10 px-4 py-2 text-sm",
    lg: "h-12 px-6 py-3 text-base",
    icon: "h-10 w-10"
  };
  return <button className={`${base} ${variants[variant as keyof typeof variants]} ${sizes[size as keyof typeof sizes]} ${className}`} {...props}>{children}</button>;
};

const Input = React.forwardRef<HTMLInputElement, any>(({ className = '', ...props }, ref) => (
  <input ref={ref} className={`flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-colors ${className}`} {...props} />
));

const Select = ({ value, onChange, options, className = '', disabled = false }: any) => (
  <div className="relative">
    <select value={value} onChange={onChange} disabled={disabled} className={`appearance-none flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent pr-8 disabled:opacity-50 transition-colors ${className}`}>
      {options.map((opt: any) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
    <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
  </div>
);

const Badge = ({ children, variant = 'default', className = '' }: any) => {
  const variants = {
    default: "bg-slate-100 text-slate-700",
    success: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-600 border border-amber-500/20",
    indigo: "bg-indigo-500/10 text-indigo-600 border border-indigo-500/20"
  };
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] md:text-xs font-medium transition-colors ${variants[variant as keyof typeof variants]} ${className}`}>{children}</span>;
}

// --- TOAST SYSTEM ---
let toastTimeout: any;
const useToast = () => {
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | null }>({ message: '', type: null });
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => setToast({ message: '', type: null }), 3000);
  };
  return { toast, showToast };
};

// --- MAIN APPLICATION COMPONENT ---
export default function App() {
  const { toast, showToast } = useToast();
  const [isInitializing, setIsInitializing] = useState(true);
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [view, setView] = useState<'login' | 'register' | 'app'>('login');
  const [companySettings, setCompanySettings] = useState({ name: 'HitMark Company' });

  useEffect(() => {
    const initApp = async () => {
      try {
        await signInAnonymously(auth);
        const settingsRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'company');
        const settingsSnap = await getDoc(settingsRef);
        if (settingsSnap.exists()) {
          setCompanySettings(settingsSnap.data() as any);
        } else {
          await setDoc(settingsRef, { name: 'HitMark Company' });
        }
      } catch (err) {
        console.error("Initialization error:", err);
      } finally {
        setIsInitializing(false);
      }
    };
    initApp();
  }, []);

  const handleLogin = async (code: string) => {
    if (!code) return showToast("Digite seu código de acesso", 'error');
    setIsInitializing(true);
    try {
      const snap = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'app_users'));
      const foundUserDoc = snap.docs.find(doc => doc.data().code === code);
      
      if (foundUserDoc) {
        const userData: any = { id: foundUserDoc.id, ...(foundUserDoc.data() as any) };
        setCurrentUser(userData);
        setView('app');
        showToast(`Bem-vindo(a), ${userData.name.split(' ')[0]}!`);
      } else {
        showToast("Código inválido", 'error');
      }
    } catch (err) {
      showToast("Erro ao tentar fazer login", 'error');
    } finally {
      setIsInitializing(false);
    }
  };

  const handleRegister = async (name: string, code: string) => {
    if (!name || !code) return showToast("Preencha todos os campos", 'error');
    if (code.length < 4) return showToast("O código deve ter pelo menos 4 caracteres", 'error');
    setIsInitializing(true);
    
    try {
      const usersSnap = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'app_users'));
      const codeExists = usersSnap.docs.some(doc => doc.data().code === code);
      if (codeExists) {
        setIsInitializing(false);
        return showToast("Este código já está em uso", 'error');
      }

      const isFirstUser = usersSnap.empty;
      const newUser = {
        name,
        code,
        role: isFirstUser ? 'MASTER' : 'USER',
        permissions: isFirstUser ? { dashboard: 'edit', vendors: 'edit', reports: 'edit', settings: 'edit' } 
                                 : { dashboard: 'view', vendors: 'none', reports: 'none', settings: 'none' },
        createdAt: Date.now()
      };

      const userRef = doc(collection(db, 'artifacts', appId, 'public', 'data', 'app_users'));
      await setDoc(userRef, newUser);
      
      setCurrentUser({ id: userRef.id, ...newUser });
      setView('app');
      showToast(isFirstUser ? "Conta MASTER criada com sucesso!" : "Conta criada com sucesso!");
    } catch (err) {
      showToast("Erro ao criar conta", 'error');
    } finally {
      setIsInitializing(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setView('login');
  };

  if (isInitializing) {
    return (
      <div className="w-full min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center">
          <Target className="w-12 h-12 text-indigo-500 animate-pulse mb-4" />
          <p className="text-slate-500 font-medium text-sm md:text-base">Inicializando HitMark...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-500/30">
      {toast.type && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 w-[90%] max-w-sm md:w-auto md:left-auto md:translate-x-0 md:right-4 z-50 px-4 py-3 rounded-lg shadow-2xl border flex items-center animate-in slide-in-from-top-2 ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 mr-2 shrink-0" /> : <AlertCircle className="w-5 h-5 mr-2 shrink-0" />}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {view === 'login' && <LoginScreen onLogin={handleLogin} onGoRegister={() => setView('register')} />}
      {view === 'register' && <RegisterScreen onRegister={handleRegister} onGoLogin={() => setView('login')} />}
      
      {view === 'app' && currentUser && (
        <MainApp 
          currentUser={currentUser} 
          onLogout={handleLogout} 
          companySettings={companySettings}
          setCompanySettings={setCompanySettings}
          showToast={showToast}
        />
      )}
    </div>
  );
}

// --- MAIN APP COMPONENT ---
function MainApp({ currentUser, onLogout, companySettings, setCompanySettings, showToast }: any) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [vendors, setVendors] = useState<any[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const canAccess = (tab: string) => {
    if (currentUser.role === 'MASTER') return true;
    return currentUser.permissions[tab] && currentUser.permissions[tab] !== 'none';
  };
  
  const canEdit = (tab: string) => {
    if (currentUser.role === 'MASTER') return true;
    return currentUser.permissions[tab] === 'edit';
  };

  useEffect(() => {
    if (!canAccess(activeTab)) {
      if (canAccess('dashboard')) setActiveTab('dashboard');
      else if (canAccess('vendors')) setActiveTab('vendors');
      else setActiveTab('');
    }
  }, [currentUser.permissions, activeTab]);

  useEffect(() => {
    // CAMINHO COMPARTILHADO: mudamos de users/ID/vendors para public/data/vendors
    const vendorsRef = collection(db, 'artifacts', appId, 'public', 'data', 'vendors');
    const unsubscribe = onSnapshot(vendorsRef, (snapshot) => {
      const vData = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      setVendors(vData.sort((a, b) => a.name.localeCompare(b.name)));
      if (vData.length > 0 && !selectedVendorId) {
        setSelectedVendorId(vData[0].id);
      }
    });
    return () => unsubscribe();
  }, []);

  const selectedVendor = useMemo(() => vendors.find(v => v.id === selectedVendorId), [vendors, selectedVendorId]);

  const chartData = useMemo(() => {
    if (!selectedVendor) return [];
    const data = [];
    for (let i = 1; i <= 12; i++) {
      const monthKey = `${selectedYear}-${String(i).padStart(2, '0')}`;
      const metaMensal = selectedVendor.goals?.[monthKey] || 0;
      const actualsArr = selectedVendor.actuals?.[monthKey] || [];
      const totalRealizado = actualsArr.reduce((a:number, b:number) => a + b, 0);
      const weeks = getWeeksInMonth(selectedYear, i);
      const metaSemanal = metaMensal > 0 ? metaMensal / weeks : 0;
      
      data.push({
        name: MONTHS[i-1],
        metaMensal: metaMensal,
        metaSemanal: parseFloat(metaSemanal.toFixed(2)),
        realizado: totalRealizado,
        weeks: weeks
      });
    }
    return data;
  }, [selectedVendor, selectedYear]);

  const currentMonthNum = new Date().getMonth() + 1;
  const currentMonthData = chartData[currentMonthNum - 1] || { metaMensal: 0, metaSemanal: 0, realizado: 0, weeks: 4 };

  const NAVIGATION = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Visão Geral' },
    { id: 'vendors', icon: Users, label: 'Vendedores' },
    { id: 'reports', icon: Printer, label: 'Relatórios' },
    { id: 'settings', icon: Settings, label: 'Ajustes', isMasterOnly: true },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 flex-col md:flex-row">
      <style>{`
        @media print {
          .print-hide { display: none !important; }
          .print-only { display: block !important; }
          body { background: white !important; color: black !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-container { width: 100%; max-width: 100%; padding: 0; margin: 0; background: white !important; }
          .bg-slate-900, .bg-white { background: white !important; border: 1px solid #e2e8f0 !important; color: black !important; }
          .text-slate-200, .text-slate-400, .text-slate-500, .text-white { color: #334155 !important; }
        }
        .print-only { display: none; }
      `}</style>

      {/* --- SIDEBAR DESKTOP --- */}
      <aside className="hidden md:flex w-64 bg-white border-r border-slate-200 flex-col print-hide z-20">
        <div className="h-16 flex items-center px-6 border-b border-slate-200 shrink-0">
          <Target className="w-6 h-6 text-indigo-600 mr-2" />
          <span className="font-bold text-lg tracking-tight text-slate-900">Hit<span className="text-indigo-600">Mark</span></span>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {NAVIGATION.map((item) => {
            if (item.isMasterOnly && currentUser.role !== 'MASTER') return null;
            if (!item.isMasterOnly && !canAccess(item.id)) return null;
            
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive 
                    ? 'bg-indigo-50 text-indigo-700' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <item.icon className={`w-5 h-5 mr-3 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 shrink-0">
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 mb-3">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs uppercase shadow-inner">
                {currentUser.name ? currentUser.name.substring(0, 2).toUpperCase() : 'US'}
              </div>
              <div className="ml-3 overflow-hidden">
                <p className="text-sm font-semibold text-slate-900 truncate">{currentUser.name}</p>
                <div className="flex items-center mt-0.5">
                  {currentUser.role === 'MASTER' ? (
                    <Badge variant="indigo"><Shield className="w-3 h-3 mr-1"/> Master</Badge>
                  ) : (
                    <span className="text-xs text-slate-500 truncate">Usuário</span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <Button variant="ghost" className="w-full justify-start text-slate-600 hover:text-slate-900" onClick={onLogout}>
            <LogOut className="w-4 h-4 mr-2" /> Sair
          </Button>
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 flex flex-col min-w-0 relative print-container overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-64 bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none print-hide"></div>
        
        <header className="py-3 md:h-16 md:py-0 bg-white/80 backdrop-blur-md border-b border-slate-200 flex flex-col md:flex-row items-center justify-between px-4 md:px-8 print-hide shrink-0 z-10 sticky top-0 gap-3 md:gap-0">
          <div className="flex w-full md:w-auto items-center justify-between">
            <h1 className="text-lg md:text-xl font-semibold text-slate-900 tracking-tight">
              {activeTab === 'dashboard' && 'Dashboard'}
              {activeTab === 'vendors' && 'Equipe'}
              {activeTab === 'reports' && 'Relatórios'}
              {activeTab === 'settings' && 'Ajustes Globais'}
            </h1>
            <button onClick={onLogout} className="md:hidden p-2 bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-lg transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
          
          <div className="w-full md:w-auto flex items-center">
            {(activeTab === 'dashboard' || activeTab === 'reports') && vendors.length > 0 && (
              <Select 
                value={selectedVendorId} 
                onChange={(e: any) => setSelectedVendorId(e.target.value)}
                options={vendors.map(v => ({ value: v.id, label: v.name }))}
                className="w-full md:w-64 shadow-sm"
              />
            )}
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 pb-24 md:p-8 md:pb-8 relative z-0 print:p-0 print:overflow-visible">
          <div className="max-w-6xl mx-auto space-y-6 md:space-y-8">
            {!canAccess(activeTab) ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                <Lock className="w-12 h-12 mb-4 opacity-50" />
                <h2 className="text-xl font-medium text-slate-800">Acesso Restrito</h2>
                <p className="text-center px-4">Você não tem permissão para visualizar esta área.</p>
              </div>
            ) : (
              <>
                {activeTab === 'dashboard' && (
                  <DashboardView 
                    vendors={vendors} 
                    chartData={chartData} 
                    currentMonthData={currentMonthData} 
                    selectedYear={selectedYear} 
                    setSelectedYear={setSelectedYear}
                    hasEditPerm={canEdit('dashboard')}
                  />
                )}
                {activeTab === 'vendors' && (
                  <VendorsManager 
                    vendors={vendors} 
                    currentYear={selectedYear} 
                    showToast={showToast}
                    hasEditPerm={canEdit('vendors')}
                  />
                )}
                {activeTab === 'reports' && (
                  <ReportsView 
                    vendor={selectedVendor} 
                    year={selectedYear} 
                    companySettings={companySettings}
                  />
                )}
                {activeTab === 'settings' && currentUser.role === 'MASTER' && (
                  <SettingsManager 
                    companySettings={companySettings} 
                    setCompanySettings={setCompanySettings} 
                    showToast={showToast} 
                    currentUser={currentUser}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </main>

      <nav className="md:hidden fixed bottom-0 w-full bg-white border-t border-slate-200 flex justify-around items-center h-16 px-2 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] pb-safe">
        {NAVIGATION.map((item) => {
          if (item.isMasterOnly && currentUser.role !== 'MASTER') return null;
          if (!item.isMasterOnly && !canAccess(item.id)) return null;
          
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className="flex flex-col items-center justify-center w-full h-full space-y-1 active:scale-95 transition-transform"
            >
              <div className={`p-1.5 rounded-full ${isActive ? 'bg-indigo-50' : 'bg-transparent'}`}>
                <item.icon className={`w-5 h-5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
              </div>
              <span className={`text-[10px] font-medium ${isActive ? 'text-indigo-600' : 'text-slate-500'}`}>
                {item.label.split(' ')[0]}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

// --- SUB-VIEWS ---

function DashboardView({ vendors, chartData, currentMonthData, selectedYear, setSelectedYear, hasEditPerm }: any) {
  const annualTotal = chartData.reduce((acc: number, curr: any) => acc + curr.metaMensal, 0);

  if (vendors.length === 0) {
    return (
      <Card className="p-8 md:p-16 text-center flex flex-col items-center justify-center border-dashed border-slate-300 bg-slate-50">
        <Users className="w-12 h-12 text-slate-400 mb-4" />
        <h3 className="text-xl font-medium text-slate-900 mb-2">Nenhum vendedor</h3>
        <p className="text-slate-600 mb-6 max-w-md text-sm md:text-base">Cadastre a sua equipe comercial na aba Vendedores para começar.</p>
        {hasEditPerm && <Badge variant="indigo">Cadastrar Vendedor</Badge>}
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
        <Card className="p-5 md:p-6 bg-white">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[13px] md:text-sm font-medium text-slate-500 mb-1">Meta ({MONTHS[new Date().getMonth()]})</p>
              <h3 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">{formatCurrency(currentMonthData.metaMensal)}</h3>
            </div>
            <div className="p-2 md:p-3 bg-indigo-50 rounded-xl border border-indigo-100"><Target className="w-5 h-5 text-indigo-600" /></div>
          </div>
        </Card>
        
        <Card className="p-5 md:p-6 bg-white">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[13px] md:text-sm font-medium text-slate-500 mb-1">Feito ({MONTHS[new Date().getMonth()]})</p>
              <h3 className="text-2xl md:text-3xl font-bold tracking-tight text-emerald-600">{formatCurrency(currentMonthData.realizado)}</h3>
            </div>
            <div className="p-2 md:p-3 bg-emerald-50 rounded-xl border border-emerald-100"><CalendarDays className="w-5 h-5 text-emerald-600" /></div>
          </div>
        </Card>

        <Card className="p-5 md:p-6 bg-slate-50 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-16 bg-indigo-500/5 blur-3xl rounded-full"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-[13px] md:text-sm font-medium text-slate-500 mb-1">Acumulado ({selectedYear})</p>
              <h3 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">{formatCurrency(annualTotal)}</h3>
            </div>
            <div className="p-2 md:p-3 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-900/20"><TrendingUp className="w-5 h-5 text-white" /></div>
          </div>
        </Card>
      </div>

      <Card className="p-4 md:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 md:mb-8 gap-4">
          <div>
            <h3 className="text-base md:text-lg font-semibold text-slate-900">Projeção e Desempenho</h3>
          </div>
          <Select 
            value={selectedYear} 
            onChange={(e: any) => setSelectedYear(Number(e.target.value))}
            options={[2024, 2025, 2026, 2027].map(y => ({ value: y, label: y.toString() }))}
            className="w-full sm:w-32"
          />
        </div>
        
        <div className="h-[250px] md:h-[300px] w-full -ml-4 md:ml-0">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} dy={10} />
              <YAxis 
                yAxisId="left" 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: '#64748b', fontSize: 11}} 
                tickFormatter={(value) => `R$ ${value / 1000}k`}
                dx={-5}
              />
              <RechartsTooltip 
                cursor={{fill: '#f1f5f9'}}
                contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                formatter={(value: number) => [formatCurrency(value), '']}
                labelStyle={{ color: '#0f172a', fontWeight: 'bold', marginBottom: '8px' }}
                itemStyle={{ color: '#475569' }}
              />
              <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
              <Bar yAxisId="left" dataKey="metaMensal" name="Meta" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={30} />
              <Line yAxisId="left" type="monotone" dataKey="realizado" name="Feito" stroke="#10b981" strokeWidth={3} dot={{r: 3, fill: '#ffffff', strokeWidth: 2, stroke: '#10b981'}} activeDot={{r: 5}} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

function VendorsManager({ vendors, currentYear, showToast, hasEditPerm }: any) {
  const [isAdding, setIsAdding] = useState(false);
  const [newVendorName, setNewVendorName] = useState('');
  const [editingVendor, setEditingVendor] = useState<any>(null);
  const [editorTab, setEditorTab] = useState<'goals'|'actuals'>('goals');
  const [actualsMonth, setActualsMonth] = useState(new Date().getMonth() + 1);

  const handleAddVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasEditPerm) return showToast("Sem permissão", "error");
    if (!newVendorName.trim()) return;
    
    const vendorId = crypto.randomUUID();
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'vendors', vendorId);
    await setDoc(docRef, { name: newVendorName.trim(), goals: {}, actuals: {}, createdAt: Date.now() });
    
    setNewVendorName('');
    setIsAdding(false);
    showToast("Vendedor cadastrado!");
  };

  const handleDelete = async (id: string) => {
    if (!hasEditPerm) return showToast("Sem permissão", "error");
    if(!confirm('Tem certeza que deseja excluir?')) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'vendors', id));
    showToast("Vendedor removido.");
  };

  const handleUpdateGoal = async (vendorId: string, monthKey: string, value: string) => {
    if (!hasEditPerm) return showToast("Sem permissão", "error");
    const numericValue = parseFloat(value.replace(/[^0-9.-]+/g,""));
    if (isNaN(numericValue) && value !== '') return;

    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'vendors', vendorId);
    await updateDoc(docRef, { [`goals.${monthKey}`]: isNaN(numericValue) ? 0 : numericValue });
  };

  const handleUpdateActual = async (vendorId: string, monthKey: string, weekIndex: number, value: string) => {
    if (!hasEditPerm) return showToast("Sem permissão", "error");
    const numericValue = parseFloat(value.replace(/[^0-9.-]+/g,""));
    const finalVal = isNaN(numericValue) ? 0 : numericValue;

    const vendor = vendors.find((v: any) => v.id === vendorId);
    const currentActuals = vendor.actuals?.[monthKey] || [];
    const newActuals = [...currentActuals];
    const weeks = getWeeksInMonth(currentYear, parseInt(monthKey.split('-')[1]));
    for(let i=0; i<weeks; i++) if(newActuals[i] === undefined) newActuals[i] = 0;
    newActuals[weekIndex] = finalVal;

    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'vendors', vendorId);
    await updateDoc(docRef, { [`actuals.${monthKey}`]: newActuals });
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm gap-4">
        <div>
          <h2 className="text-base md:text-lg font-semibold text-slate-900">Equipe Comercial</h2>
          <p className="text-xs md:text-sm text-slate-500">Gerencie vendedores e lance resultados.</p>
        </div>
        {hasEditPerm && (
          <Button onClick={() => setIsAdding(!isAdding)} className="w-full sm:w-auto">
            {isAdding ? 'Cancelar' : <><Plus className="w-4 h-4 mr-2" /> Novo Vendedor</>}
          </Button>
        )}
      </div>

      {isAdding && hasEditPerm && (
        <Card className="p-4 md:p-6 bg-slate-50 border-indigo-500/30 border-2 border-dashed">
          <form onSubmit={handleAddVendor} className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium text-slate-700 mb-2">Nome Completo</label>
              <Input autoFocus value={newVendorName} onChange={(e:any) => setNewVendorName(e.target.value)} placeholder="Ex: Carlos Eduardo" required />
            </div>
            <Button type="submit" className="w-full sm:w-auto">Salvar</Button>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4">
        {vendors.map((vendor: any) => (
          <Card key={vendor.id} className="overflow-visible transition-all hover:border-slate-300">
            <div 
              className="p-4 md:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center cursor-pointer hover:bg-slate-50 transition-colors gap-4 sm:gap-0"
              onClick={() => { setEditingVendor(editingVendor === vendor.id ? null : vendor.id); setEditorTab('goals'); }}
            >
              <div className="flex items-center w-full sm:w-auto">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-slate-100 text-indigo-600 flex items-center justify-center font-bold text-base md:text-lg border border-slate-200 mr-3 md:mr-4 shadow-inner shrink-0">
                  {vendor.name.charAt(0)}
                </div>
                <div className="truncate">
                  <h3 className="font-semibold text-slate-900 text-sm md:text-lg truncate">{vendor.name}</h3>
                  <p className="text-[11px] md:text-sm text-slate-500">Cadastrado em {new Date(vendor.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-2 border-t sm:border-0 border-slate-100 pt-3 sm:pt-0">
                <Badge variant={vendor.goals && Object.keys(vendor.goals).length > 0 ? 'success' : 'default'}>
                  {vendor.goals && Object.keys(vendor.goals).length > 0 ? 'Metas Ativas' : 'Sem Metas'}
                </Badge>
                <div className="flex items-center gap-2">
                  {hasEditPerm && (
                    <Button variant="ghost" size="sm" className="text-slate-400 hover:text-red-500 px-2" onClick={(e:any) => { e.stopPropagation(); handleDelete(vendor.id); }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                  <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${editingVendor === vendor.id ? 'rotate-180' : ''}`} />
                </div>
              </div>
            </div>

            {editingVendor === vendor.id && (
              <div className="border-t border-slate-200 p-4 md:p-6 bg-slate-50">
                <div className="flex gap-4 md:gap-6 mb-6 border-b border-slate-200 overflow-x-auto whitespace-nowrap hide-scrollbar">
                  <button 
                    className={`pb-3 text-sm font-medium transition-colors border-b-2 ${editorTab === 'goals' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    onClick={() => setEditorTab('goals')}
                  >
                    Metas Anuais (R$)
                  </button>
                  <button 
                    className={`pb-3 text-sm font-medium transition-colors border-b-2 ${editorTab === 'actuals' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    onClick={() => setEditorTab('actuals')}
                  >
                    Resultados Semanais
                  </button>
                </div>

                <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h4 className="text-sm md:text-base font-medium text-slate-900">
                      {editorTab === 'goals' ? `Grade de Metas (${currentYear})` : `Lançamento de Resultados (${currentYear})`}
                    </h4>
                    <p className="text-[11px] md:text-xs text-slate-500 mt-0.5">Salvo automaticamente.</p>
                  </div>
                  {editorTab === 'actuals' && (
                    <Select value={actualsMonth} onChange={(e:any) => setActualsMonth(Number(e.target.value))} options={MONTHS_FULL.map((m,i)=>({label: m, value: i+1}))} className="w-full sm:w-40 h-9 text-xs" />
                  )}
                </div>

                {editorTab === 'goals' && (
                  <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3 md:gap-4">
                    {MONTHS.map((month, idx) => {
                      const monthKey = `${currentYear}-${String(idx + 1).padStart(2, '0')}`;
                      const currentVal = vendor.goals?.[monthKey] || '';
                      return (
                        <div key={month} className="space-y-1">
                          <label className="text-[10px] md:text-xs font-semibold text-slate-600 ml-1 uppercase tracking-wider">{month}</label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-2.5 text-slate-400 text-xs md:text-sm font-medium">R$</span>
                            <Input type="text" inputMode="decimal" className="pl-8 text-xs md:text-sm font-mono h-9 md:h-10" placeholder="0.00" defaultValue={currentVal} disabled={!hasEditPerm}
                              onBlur={(e:any) => { if(e.target.value !== String(currentVal)) handleUpdateGoal(vendor.id, monthKey, e.target.value); }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {editorTab === 'actuals' && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4">
                    {Array.from({length: getWeeksInMonth(currentYear, actualsMonth)}).map((_, i) => {
                       const monthKey = `${currentYear}-${String(actualsMonth).padStart(2, '0')}`;
                       const currentVal = vendor.actuals?.[monthKey]?.[i] || '';
                       return (
                          <div key={i} className="space-y-1">
                            <label className="text-[10px] md:text-xs font-semibold text-emerald-600 ml-1 uppercase tracking-wider">Semana {i+1}</label>
                            <div className="relative">
                              <span className="absolute left-2.5 top-2.5 text-slate-400 text-xs md:text-sm font-medium">R$</span>
                              <Input type="text" inputMode="decimal" className="pl-8 text-xs md:text-sm font-mono h-9 md:h-10 border-emerald-200 focus:ring-emerald-500" placeholder="0.00" defaultValue={currentVal} disabled={!hasEditPerm}
                                onBlur={(e:any) => { if(e.target.value !== String(currentVal)) handleUpdateActual(vendor.id, monthKey, i, e.target.value); }}
                              />
                            </div>
                          </div>
                       )
                    })}
                  </div>
                )}
              </div>
            )}
          </Card>
        ))}
        {vendors.length === 0 && !isAdding && (
          <div className="text-center py-10 md:py-16 text-slate-500 text-sm border border-dashed border-slate-300 rounded-xl">Nenhum vendedor cadastrado.</div>
        )}
      </div>
    </div>
  );
}

function ReportsView({ vendor, year, companySettings }: any) {
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const handlePrint = () => window.print();

  if (!vendor) {
    return (
      <Card className="p-8 md:p-16 text-center border-dashed border-slate-300 bg-slate-50">
        <Printer className="w-12 h-12 text-slate-400 mb-4 mx-auto" />
        <h3 className="text-lg md:text-xl font-medium text-slate-900 mb-2">Selecione um vendedor</h3>
        <p className="text-sm md:text-base text-slate-600">Utilize o seletor no cabeçalho para visualizar o relatório.</p>
      </Card>
    );
  }

  const monthKey = `${year}-${String(reportMonth).padStart(2, '0')}`;
  const monthlyGoal = vendor.goals?.[monthKey] || 0;
  const actualsArray = vendor.actuals?.[monthKey] || [];
  const weeksInMonth = getWeeksInMonth(year, reportMonth);
  const weeklyGoal = monthlyGoal > 0 ? monthlyGoal / weeksInMonth : 0;

  let totalRealizado = 0;
  const tableRows = Array.from({ length: weeksInMonth }).map((_, i) => {
    const actual = actualsArray[i] || 0;
    totalRealizado += actual;
    const percentage = weeklyGoal > 0 ? (actual / weeklyGoal) * 100 : 0;
    return { week: i + 1, actual, percentage };
  });

  const percentTotal = monthlyGoal > 0 ? (totalRealizado / monthlyGoal) * 100 : 0;
  const falta = Math.max(0, monthlyGoal - totalRealizado);

  return (
    <div className="space-y-4 md:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative min-h-[500px]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl border border-slate-200 print-hide gap-4">
        <div>
          <h2 className="text-base md:text-lg font-semibold text-slate-900">Relatório Mensal</h2>
          <p className="text-xs md:text-sm text-slate-500">Detalhamento semanal do vendedor.</p>
        </div>
        <div className="flex w-full sm:w-auto gap-3">
          <Select value={reportMonth} onChange={(e:any)=>setReportMonth(Number(e.target.value))} options={MONTHS_FULL.map((m,i)=>({label: m, value: i+1}))} className="w-full sm:w-40" />
          <Button onClick={handlePrint} className="shrink-0"><Printer className="w-4 h-4 md:mr-2"/> <span className="hidden md:inline">Imprimir / PDF</span></Button>
        </div>
      </div>

      <Card className="p-4 md:p-10 bg-white text-slate-900 print:border-none print:shadow-none print:p-0 print:bg-transparent pb-6 print:pb-0">
        <div className="border-b border-slate-200 pb-6 mb-6 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Building className="w-6 h-6 md:w-8 md:h-8 text-indigo-600" />
              <span className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight">{companySettings.name}</span>
            </div>
            <h1 className="text-base md:text-xl font-bold text-slate-500 tracking-tight uppercase">Relatório de Metas</h1>
            <p className="text-sm text-slate-500 mt-1 font-medium">Mês Base: {MONTHS_FULL[reportMonth - 1]} {year}</p>
          </div>
          <div className="text-left md:text-right bg-slate-50 p-3 md:p-4 rounded-xl border border-slate-100">
            <p className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Vendedor Associado</p>
            <h2 className="text-lg md:text-xl font-bold text-indigo-600">{vendor.name}</h2>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
              <p className="text-[10px] md:text-xs text-slate-500 font-bold uppercase mb-1">Meta Mês</p>
              <p className="text-sm md:text-lg font-mono font-bold text-slate-900">{formatCurrency(monthlyGoal)}</p>
            </div>
            <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200 text-center">
              <p className="text-[10px] md:text-xs text-emerald-600 font-bold uppercase mb-1">Realizado</p>
              <p className="text-sm md:text-lg font-mono font-bold text-emerald-700">{formatCurrency(totalRealizado)}</p>
            </div>
            <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-center">
              <p className="text-[10px] md:text-xs text-amber-600 font-bold uppercase mb-1">Falta</p>
              <p className="text-sm md:text-lg font-mono font-bold text-amber-700">{formatCurrency(falta)}</p>
            </div>
            <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-200 text-center">
              <p className="text-[10px] md:text-xs text-indigo-600 font-bold uppercase mb-1">% do Mês</p>
              <p className="text-base md:text-xl font-black text-indigo-700">{percentTotal.toFixed(1)}%</p>
            </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-xs md:text-sm text-left">
            <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Período</th>
                <th className="px-4 py-3 text-right">Meta</th>
                <th className="px-4 py-3 text-right">Feito</th>
                <th className="px-4 py-3 text-right">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tableRows.map((row: any) => (
                <tr key={row.week} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">Semana {row.week}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-500 whitespace-nowrap">{formatCurrency(weeklyGoal)}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">{formatCurrency(row.actual)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`inline-flex px-2 py-1 rounded-md text-[10px] md:text-xs font-bold ${row.percentage >= 100 ? 'bg-emerald-100 text-emerald-700' : row.percentage >= 80 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                      {row.percentage.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      
      <div className="hidden print:block fixed bottom-4 left-0 w-full text-[10px] text-center text-slate-400 uppercase tracking-widest font-semibold">
        DEVELOPED BY NEXIO
      </div>
    </div>
  );
}

function SettingsManager({ companySettings, setCompanySettings, showToast, currentUser }: any) {
  const [users, setUsers] = useState<any[]>([]);
  const [companyNameInput, setCompanyNameInput] = useState(companySettings.name || '');

  useEffect(() => {
    const fetchUsers = async () => {
      const usersSnap = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'app_users'));
      setUsers(usersSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
    };
    fetchUsers();
  }, []);

  const handleUpdateCompany = async () => {
    if (!companyNameInput.trim()) return;
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'company'), { name: companyNameInput });
    setCompanySettings({ name: companyNameInput });
    showToast("Nome da empresa atualizado.");
  };

  const handleUpdateUser = async (userId: string, field: string, value: any) => {
    if (userId === currentUser.id && field === 'role' && value !== 'MASTER') {
      return showToast("Você não pode remover seu próprio acesso MASTER.", "error");
    }
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'app_users', userId), { [field]: value });
    setUsers(users.map(u => u.id === userId ? { ...u, [field]: value } : u));
    showToast("Usuário atualizado.");
  };

  const handleUpdatePermission = async (userId: string, tab: string, level: string) => {
    const userToUpdate = users.find(u => u.id === userId);
    const newPerms = { ...userToUpdate.permissions, [tab]: level };
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'app_users', userId), { permissions: newPerms });
    setUsers(users.map(u => u.id === userId ? { ...u, permissions: newPerms } : u));
    showToast("Permissões salvas.");
  };

  return (
    <div className="space-y-10 md:space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex flex-col md:flex-row gap-4 md:gap-8">
        <div className="w-full md:w-1/3">
          <h3 className="text-lg font-bold text-slate-900">Perfil da Empresa</h3>
          <p className="text-sm text-slate-500 mt-1">Configure o nome fantasia que será impresso nos cabeçalhos.</p>
        </div>
        <Card className="p-5 md:p-6 flex-1 bg-white">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="block text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-wider">Nome da Empresa</label>
              <div className="relative">
                <Building className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                <Input value={companyNameInput} onChange={(e:any) => setCompanyNameInput(e.target.value)} className="pl-10 h-11" placeholder="Ex: HitMark Corp" />
              </div>
            </div>
            <Button onClick={handleUpdateCompany} className="w-full sm:w-auto h-11 px-6 shrink-0 shadow-sm">Atualizar Dados</Button>
          </div>
        </Card>
      </div>

      <div className="h-px bg-slate-200 w-full"></div>

      <div className="flex flex-col md:flex-row gap-4 md:gap-8">
        <div className="w-full md:w-1/3">
          <h3 className="text-lg font-bold text-slate-900">Controle de Acesso</h3>
          <p className="text-sm text-slate-500 mt-1">Gerencie logins, senhas e permissões da equipe.</p>
          <div className="mt-5 inline-flex items-center px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold border border-indigo-100">
            <Users className="w-4 h-4 mr-2" /> {users.length} Usuário(s)
          </div>
        </div>
        
        <div className="flex-1 space-y-4">
          {users.map(u => (
            <Card key={u.id} className={`overflow-visible transition-all border-l-4 ${u.role === 'MASTER' ? 'border-l-indigo-500 shadow-md' : 'border-l-slate-300'}`}>
              <div className="p-5 md:p-6">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-inner shrink-0 ${u.role === 'MASTER' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                      {u.name ? u.name.substring(0, 2).toUpperCase() : 'US'}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 truncate max-w-[150px] sm:max-w-full">{u.name}</h4>
                      <p className="text-[10px] md:text-xs text-slate-400 font-mono mt-0.5">ID: {u.id.substring(0, 8)}</p>
                    </div>
                  </div>
                  {u.role === 'MASTER' ? (
                    <Badge variant="indigo" className="text-[9px] md:text-[10px] uppercase tracking-wider px-2 py-1"><Shield className="w-3 h-3 mr-1"/> Admin</Badge>
                  ) : (
                    <Badge variant="default" className="text-[9px] md:text-[10px] uppercase tracking-wider px-2 py-1">Padrão</Badge>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Nome de Exibição</label>
                    <Input defaultValue={u.name} onBlur={(e:any) => { if(e.target.value !== u.name) handleUpdateUser(u.id, 'name', e.target.value) }} className="h-9 text-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Nova Senha</label>
                    <Input type="password" inputMode="numeric" placeholder="••••" onBlur={(e:any) => { if(e.target.value.trim() !== '') { handleUpdateUser(u.id, 'code', e.target.value); e.target.value = ''; } }} className="h-9 text-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Nível Global</label>
                    <Select 
                      value={u.role} 
                      onChange={(e:any) => handleUpdateUser(u.id, 'role', e.target.value)}
                      options={[{value: 'USER', label: 'Usuário Restrito'}, {value: 'MASTER', label: 'Admin (Total)'}]}
                      className="h-9 text-sm font-medium"
                    />
                  </div>
                </div>

                {u.role !== 'MASTER' && (
                  <div className="mt-6 pt-5 border-t border-slate-100 bg-slate-50/50 -mx-5 md:-mx-6 -mb-5 md:-mb-6 p-5 md:p-6 rounded-b-xl">
                    <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Permissões de Módulos</h5>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {['dashboard', 'vendors', 'reports'].map(tab => (
                        <div key={tab} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm transition-colors hover:border-indigo-200">
                          <label className="block text-[11px] font-semibold text-slate-700 mb-2 capitalize flex items-center gap-1.5">
                            {tab === 'dashboard' && <LayoutDashboard className="w-3.5 h-3.5 text-indigo-500"/>}
                            {tab === 'vendors' && <Users className="w-3.5 h-3.5 text-emerald-500"/>}
                            {tab === 'reports' && <Printer className="w-3.5 h-3.5 text-amber-500"/>}
                            {tab === 'vendors' ? 'Equipe' : tab === 'reports' ? 'Relatórios' : tab}
                          </label>
                          <Select 
                            className="h-8 text-[11px] w-full bg-slate-50 border-slate-100"
                            value={u.permissions?.[tab] || 'none'}
                            onChange={(e:any) => handleUpdatePermission(u.id, tab, e.target.value)}
                            options={[{value: 'none', label: '🔒 Bloqueado'}, {value: 'view', label: '👁️ Apenas Leitura'}, {value: 'edit', label: '✏️ Edição Total'}]}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
