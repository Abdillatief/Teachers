import React, { useState, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

export interface PaymentRecord {
  id?: string;
  amount?: number | string;
  month?: string;
  method?: string;
  createdAt?: { seconds: number } | string | Date;
  studentName?: string;
  teacherName?: string;
  status?: string;
}

export interface PackageRecord {
  id?: string;
  packageName?: string;
  totalLessons?: number;
  price?: number;
  totalAmount?: number;
  totalPaid?: number;
  startDate?: string;
  createdAt?: { seconds: number } | string | Date;
  status?: string;
}

interface FinancialChartsProps {
  payments?: PaymentRecord[];
  packages?: PackageRecord[];
}

const MONTH_NAMES_AR: { [key: string]: string } = {
  '01': 'يناير',
  '02': 'فبراير',
  '03': 'مارس',
  '04': 'أبريل',
  '05': 'مايو',
  '06': 'يونيو',
  '07': 'يوليو',
  '08': 'أغسطس',
  '09': 'سبتمبر',
  '10': 'أكتوبر',
  '11': 'نوفمبر',
  '12': 'ديسمبر'
};

const METHOD_COLORS: { [key: string]: string } = {
  'Vodafone Cash': '#e11d48',
  'فودافون كاش': '#e11d48',
  'WE Pay': '#9333ea',
  'وي باي': '#9333ea',
  'InstaPay': '#2563eb',
  'إنستا باي': '#2563eb',
  'تحويل بنكي': '#059669',
  'نقدي': '#d97706',
  'أخرى': '#64748b'
};

export const FinancialCharts: React.FC<FinancialChartsProps> = ({
  payments = [],
  packages = []
}) => {
  const [activeTab, setActiveTab] = useState<'revenue' | 'subscriptions' | 'methods'>('revenue');
  const [timeRange, setTimeRange] = useState<'6m' | '12m' | 'all'>('6m');

  // استخراج وتحليل بيانات الإيرادات الشهرية
  const monthlyRevenueData = useMemo(() => {
    const monthlyMap = new Map<string, { revenue: number; count: number; packagesCount: number }>();

    // إنشاء الشهور الستة أو الاثني عشر الأخيرة تلقائياً لضمان تسلسل زمني أنيق
    const now = new Date();
    const monthsCount = timeRange === '6m' ? 6 : timeRange === '12m' ? 12 : 12;
    for (let i = monthsCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const monthNum = String(d.getMonth() + 1).padStart(2, '0');
      const key = `${year}-${monthNum}`;
      monthlyMap.set(key, { revenue: 0, count: 0, packagesCount: 0 });
    }

    // تجميع المدفوعات حسب الشهر
    payments.forEach(p => {
      let key = p.month;
      if (!key && p.createdAt) {
        let d: Date;
        if (typeof p.createdAt === 'object' && 'seconds' in p.createdAt) {
          d = new Date(p.createdAt.seconds * 1000);
        } else {
          d = new Date(p.createdAt);
        }
        if (!isNaN(d.getTime())) {
          key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        }
      }

      if (key) {
        const val = parseFloat(String(p.amount || 0)) || 0;
        if (!monthlyMap.has(key) && timeRange === 'all') {
          monthlyMap.set(key, { revenue: 0, count: 0, packagesCount: 0 });
        }
        if (monthlyMap.has(key)) {
          const item = monthlyMap.get(key)!;
          item.revenue += val;
          item.count += 1;
        }
      }
    });

    // تجميع الباقات والاشتراكات
    packages.forEach(pkg => {
      let key = '';
      if (pkg.startDate) {
        key = pkg.startDate.substring(0, 7);
      } else if (pkg.createdAt) {
        let d: Date;
        if (typeof pkg.createdAt === 'object' && 'seconds' in pkg.createdAt) {
          d = new Date(pkg.createdAt.seconds * 1000);
        } else {
          d = new Date(pkg.createdAt);
        }
        if (!isNaN(d.getTime())) {
          key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        }
      }

      if (key && monthlyMap.has(key)) {
        const item = monthlyMap.get(key)!;
        item.packagesCount += 1;
      }
    });

    // تحويل الماب لمصفوفة مرتبة
    const sortedKeys = Array.from(monthlyMap.keys()).sort();
    return sortedKeys.map(key => {
      const parts = key.split('-');
      const monthPart = parts[1] || '';
      const yearPart = parts[0] || '';
      const monthName = MONTH_NAMES_AR[monthPart] || monthPart;
      const label = `${monthName} ${yearPart}`;
      const data = monthlyMap.get(key)!;

      return {
        monthKey: key,
        label,
        revenue: Math.round(data.revenue),
        count: data.count,
        packagesCount: data.packagesCount,
        avgTicket: data.count > 0 ? Math.round(data.revenue / data.count) : 0
      };
    });
  }, [payments, packages, timeRange]);

  // استخراج توزيع طرق الدفع
  const paymentMethodsData = useMemo(() => {
    const counts: { [key: string]: { name: string; value: number; amount: number } } = {};

    payments.forEach(p => {
      let m = p.method ? String(p.method).trim() : 'نقدي';
      if (!m) m = 'نقدي';
      if (!counts[m]) {
        counts[m] = { name: m, value: 0, amount: 0 };
      }
      counts[m].value += 1;
      counts[m].amount += parseFloat(String(p.amount || 0)) || 0;
    });

    return Object.values(counts).sort((a, b) => b.amount - a.amount);
  }, [payments]);

  // إحصائيات سريعة
  const totalPeriodRevenue = useMemo(() => {
    return monthlyRevenueData.reduce((sum, item) => sum + item.revenue, 0);
  }, [monthlyRevenueData]);

  const totalPeriodSubscriptions = useMemo(() => {
    return monthlyRevenueData.reduce((sum, item) => sum + item.packagesCount, 0);
  }, [monthlyRevenueData]);

  const avgMonthlyRevenue = useMemo(() => {
    const activeMonths = monthlyRevenueData.filter(m => m.revenue > 0);
    if (activeMonths.length === 0) return 0;
    return Math.round(totalPeriodRevenue / activeMonths.length);
  }, [monthlyRevenueData, totalPeriodRevenue]);

  return (
    <div
      style={{
        background: 'var(--bg-secondary, #ffffff)',
        borderRadius: '12px',
        border: '1px solid var(--border-color, #e2e8f0)',
        padding: '1.25rem',
        marginBottom: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        fontFamily: 'inherit'
      }}
      id="rechartsFinancialAnalyticsCard"
    >
      {/* Header with Title and Tab Controls */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          borderBottom: '1px solid var(--border-color, #e2e8f0)',
          paddingBottom: '0.85rem',
          marginBottom: '1rem'
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: '1.1rem',
              fontWeight: 800,
              color: 'var(--text-primary, #0f172a)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <span style={{ color: 'var(--primary-color, #0d9488)' }}>📊</span>
            التحليلات البيانية للإيرادات والاشتراكات
          </h3>
          <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: 'var(--text-secondary, #64748b)' }}>
            مخططات تفاعلية مدعومة بمكتبة Recharts توضح التدفقات النقدية ونمو المشتركين
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Chart Type Tabs */}
          <div
            style={{
              display: 'inline-flex',
              background: 'var(--bg-primary, #f1f5f9)',
              borderRadius: '8px',
              padding: '3px',
              border: '1px solid var(--border-color, #e2e8f0)'
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab('revenue')}
              style={{
                border: 'none',
                background: activeTab === 'revenue' ? 'var(--primary-color, #0d9488)' : 'transparent',
                color: activeTab === 'revenue' ? '#ffffff' : 'var(--text-secondary, #64748b)',
                fontWeight: activeTab === 'revenue' ? 700 : 500,
                fontSize: '0.78rem',
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              💰 الإيرادات الشهرية
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('subscriptions')}
              style={{
                border: 'none',
                background: activeTab === 'subscriptions' ? 'var(--primary-color, #0d9488)' : 'transparent',
                color: activeTab === 'subscriptions' ? '#ffffff' : 'var(--text-secondary, #64748b)',
                fontWeight: activeTab === 'subscriptions' ? 700 : 500,
                fontSize: '0.78rem',
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              📈 تطور الاشتراكات
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('methods')}
              style={{
                border: 'none',
                background: activeTab === 'methods' ? 'var(--primary-color, #0d9488)' : 'transparent',
                color: activeTab === 'methods' ? '#ffffff' : 'var(--text-secondary, #64748b)',
                fontWeight: activeTab === 'methods' ? 700 : 500,
                fontSize: '0.78rem',
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              💳 طرق الدفع
            </button>
          </div>

          {/* Time Range Filter */}
          <select
            value={timeRange}
            onChange={e => setTimeRange(e.target.value as '6m' | '12m' | 'all')}
            style={{
              fontSize: '0.78rem',
              padding: '0.35rem 0.6rem',
              borderRadius: '6px',
              border: '1px solid var(--border-color, #cbd5e1)',
              background: 'var(--bg-primary, #ffffff)',
              color: 'var(--text-primary, #0f172a)',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="6m">آخر 6 أشهر</option>
            <option value="12m">آخر 12 شهراً</option>
            <option value="all">كل الفترات</option>
          </select>
        </div>
      </div>

      {/* Mini Highlights */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '0.75rem',
          marginBottom: '1.25rem'
        }}
      >
        <div
          style={{
            background: 'var(--bg-primary, #f8fafc)',
            border: '1px solid var(--border-color, #e2e8f0)',
            borderRadius: '8px',
            padding: '0.65rem 0.85rem'
          }}
        >
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary, #64748b)', display: 'block' }}>
            إجمالي إيراد الفترة
          </span>
          <strong style={{ fontSize: '1.1rem', color: '#059669', fontWeight: 800 }}>
            {totalPeriodRevenue.toLocaleString('ar-EG')} ج.م
          </strong>
        </div>

        <div
          style={{
            background: 'var(--bg-primary, #f8fafc)',
            border: '1px solid var(--border-color, #e2e8f0)',
            borderRadius: '8px',
            padding: '0.65rem 0.85rem'
          }}
        >
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary, #64748b)', display: 'block' }}>
            متوسط الإيراد الشهري
          </span>
          <strong style={{ fontSize: '1.1rem', color: '#0d9488', fontWeight: 800 }}>
            {avgMonthlyRevenue.toLocaleString('ar-EG')} ج.م
          </strong>
        </div>

        <div
          style={{
            background: 'var(--bg-primary, #f8fafc)',
            border: '1px solid var(--border-color, #e2e8f0)',
            borderRadius: '8px',
            padding: '0.65rem 0.85rem'
          }}
        >
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary, #64748b)', display: 'block' }}>
            إجمالي حركات التحصيل
          </span>
          <strong style={{ fontSize: '1.1rem', color: '#2563eb', fontWeight: 800 }}>
            {payments.length} إيصال
          </strong>
        </div>

        <div
          style={{
            background: 'var(--bg-primary, #f8fafc)',
            border: '1px solid var(--border-color, #e2e8f0)',
            borderRadius: '8px',
            padding: '0.65rem 0.85rem'
          }}
        >
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary, #64748b)', display: 'block' }}>
            الباقات والاشتراكات
          </span>
          <strong style={{ fontSize: '1.1rem', color: '#7c3aed', fontWeight: 800 }}>
            {packages.length || totalPeriodSubscriptions} باقة
          </strong>
        </div>
      </div>

      {/* Main Chart Area */}
      <div style={{ width: '100%', height: 280, position: 'relative' }}>
        {activeTab === 'revenue' && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyRevenueData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color, #e2e8f0)" />
              <XAxis
                dataKey="label"
                stroke="var(--text-secondary, #64748b)"
                fontSize={12}
                tickLine={false}
              />
              <YAxis
                stroke="var(--text-secondary, #64748b)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val: number) => `${val.toLocaleString('en-US')} ج.م`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-card, #1e293b)',
                  color: '#ffffff',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '0.82rem',
                  direction: 'rtl',
                  textAlign: 'right',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}
                formatter={(val: any) => [`${(parseFloat(val) || 0).toLocaleString('ar-EG')} ج.م`, 'إجمالي الإيرادات']}
                labelFormatter={(label: any) => `الشهر: ${label}`}
              />
              <Legend
                wrapperStyle={{ fontSize: '0.8rem', paddingTop: '8px' }}
                formatter={() => 'الإيرادات المحصلة (ج.م)'}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                name="الإيرادات"
                stroke="#0d9488"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#revenueGrad)"
                activeDot={{ r: 6, fill: '#0f766e', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {activeTab === 'subscriptions' && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyRevenueData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color, #e2e8f0)" />
              <XAxis
                dataKey="label"
                stroke="var(--text-secondary, #64748b)"
                fontSize={12}
                tickLine={false}
              />
              <YAxis
                stroke="var(--text-secondary, #64748b)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-card, #1e293b)',
                  color: '#ffffff',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '0.82rem',
                  direction: 'rtl',
                  textAlign: 'right',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}
                labelFormatter={(label: any) => `الشهر: ${label}`}
              />
              <Legend
                wrapperStyle={{ fontSize: '0.8rem', paddingTop: '8px' }}
              />
              <Bar
                dataKey="count"
                name="عدد عمليات السداد"
                fill="#3b82f6"
                radius={[6, 6, 0, 0]}
              />
              <Bar
                dataKey="packagesCount"
                name="الباقات والاشتراكات الجديدة"
                fill="#8b5cf6"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}

        {activeTab === 'methods' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: '100%', alignItems: 'center' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentMethodsData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="amount"
                  nameKey="name"
                >
                  {paymentMethodsData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={METHOD_COLORS[entry.name] || ['#0d9488', '#2563eb', '#7c3aed', '#f59e0b', '#ec4899'][index % 5]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-card, #1e293b)',
                    color: '#ffffff',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '0.82rem',
                    direction: 'rtl',
                    textAlign: 'right',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }}
                  formatter={(val: any, name: any) => [`${(parseFloat(val) || 0).toLocaleString('ar-EG')} ج.م`, `${name}`]}
                />
              </PieChart>
            </ResponsiveContainer>

            <div style={{ paddingRight: '1rem', fontSize: '0.82rem' }}>
              <div style={{ fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary, #0f172a)' }}>
                توزيع التحصيل حسب وسيلة الدفع:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {paymentMethodsData.map((m, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          backgroundColor: METHOD_COLORS[m.name] || '#64748b'
                        }}
                      />
                      <span style={{ color: 'var(--text-primary, #0f172a)' }}>{m.name}</span>
                    </span>
                    <span style={{ fontWeight: 700, color: 'var(--text-secondary, #64748b)' }}>
                      {m.amount.toLocaleString('ar-EG')} ج.م ({m.value} عملية)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * وظيفة عامة لتهيئة ورندرة المخطط البياني في أي صفحة HTML
 */
export function initFinancialCharts(
  containerId: string,
  payments: PaymentRecord[] = [],
  packages: PackageRecord[] = []
) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // فحص ما إذا كان الـ root مهيأ بالفعل
  const existingRoot = (container as any)._reactRoot;
  if (existingRoot) {
    existingRoot.render(<FinancialCharts payments={payments} packages={packages} />);
  } else {
    const root = createRoot(container);
    (container as any)._reactRoot = root;
    root.render(<FinancialCharts payments={payments} packages={packages} />);
  }
}

// جعل الدالة متاحة في window لاستدعائها من الـ scripts العادية
if (typeof window !== 'undefined') {
  (window as any).initFinancialCharts = initFinancialCharts;
}
