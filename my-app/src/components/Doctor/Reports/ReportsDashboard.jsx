import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import {
  TrendingUp, Users, IndianRupee, Activity, Calendar,
  ArrowUpRight, ArrowDownRight, Download, Loader2, CheckCircle2
} from 'lucide-react';
const API_BAS = import.meta.env.VITE_API_URL;

const COLORS      = ['#1a7c5a', '#378add', '#ef9f27', '#e24b4a', '#7f77dd'];
const QUICK_RANGES = ['7 days', '30 days', 'Year'];

/* ── helpers ── */
const StatCard = ({ title, value, accent, icon, trend }) => {
  const up = trend.startsWith('+');
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 hover:-translate-y-0.5 transition-transform shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: accent + '18' }}>
          <span style={{ color: accent }}>{icon}</span>
        </div>
        <span className={`text-xs font-medium flex items-center gap-0.5 ${up ? 'text-emerald-600' : 'text-red-500'}`}>
          {up ? <ArrowUpRight size={13}/> : <ArrowDownRight size={13}/>}{trend}
        </span>
      </div>
      <p className="text-xs text-gray-400 mb-1">{title}</p>
      <p className="text-2xl font-semibold text-gray-900 tracking-tight">{value}</p>
    </div>
  );
};

/* ── format growth X-axis label ── */
const growthLabel = (entry, isYearly) => {
  if (!entry || !entry._id) return '';
  if (isYearly) {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return months[(entry._id.month ?? 1) - 1];
  }
  return `${entry._id.day}/${entry._id.month}`;
};

/* ── main dashboard ── */
const ReportsDashboard = () => {
  const { slug } = useParams();
  const [loading, setLoading]   = useState(true);
  const [data, setData]         = useState(null);
  const [quickRange, setQuickRange] = useState('30 days');

  // fetch on mount + whenever quickRange changes
  useEffect(() => { fetchReports(); }, [quickRange]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ quickRange });
      const res = await axios.get(
        `${API_BAS}/api/reports/${slug}/all-stats?${params}`
      );
      if (res.data.success) {
        const reports = res.data.reports;
        const isYr = quickRange === 'Year';
        const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

        // Flatten _id object → flat label string so Recharts XAxis works
        reports.growth = (reports.growth || []).map(entry => ({
          label: isYr
            ? MONTHS[(entry._id?.month ?? 1) - 1]
            : `${entry._id?.day}/${entry._id?.month}`,
          revenue: entry.revenue ?? 0,
        }));

        setData(reports);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="animate-spin text-[#1a7c5a]" size={36}/>
    </div>
  );

  if (!data) return (
    <div className="h-screen flex items-center justify-center bg-gray-50">
      <p className="text-sm text-gray-400">No data available.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-10">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Clinic analytics</h1>
          <p className="text-sm text-gray-400 mt-0.5">Real-time performance overview</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">

          {/* ── Time-range pills ── */}
          <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1 gap-1 shadow-sm">
            {QUICK_RANGES.map(r => (
              <button
                key={r}
                onClick={() => setQuickRange(r)}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  quickRange === r
                    ? 'bg-[#1a7c5a] text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <button
            onClick={() => window.open(`${API_BAS}/api/reports/${slug}/download-excel`, '_blank')}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-white border border-gray-200 rounded-xl text-gray-600 hover:border-gray-300 shadow-sm transition-all"
          >
            <Download size={13}/> Export Excel
          </button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <StatCard
          title="Total revenue"
          value={`₹${(data.revenue.totalRevenue ?? 0).toLocaleString('en-IN')}`}
          accent="#1a7c5a"
          icon={<IndianRupee size={16}/>}
          trend="+12.5%"
        />
        <StatCard
          title="Total collected"
          value={`₹${(data.revenue.totalCollected ?? 0).toLocaleString('en-IN')}`}
          accent="#185fa5"
          icon={<TrendingUp size={16}/>}
          trend="+8.2%"
        />
        <StatCard
          title="Pending dues"
          value={`₹${(data.revenue.totalOutstanding ?? 0).toLocaleString('en-IN')}`}
          accent="#a32d2d"
          icon={<Activity size={16}/>}
          trend="-2.1%"
        />
        <StatCard
          title="New patients"
          value={data.patients.find(p => p._id === 'NEW')?.count ?? 0}
          accent="#854f0b"
          icon={<Users size={16}/>}
          trend="+15%"
        />
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">

        {/* Area chart */}
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-5">
            <span className="text-sm font-medium text-gray-700">Revenue trend</span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-[#e8f5f0] text-[#1a7c5a] font-medium">
              Last {quickRange}
            </span>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.growth}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#1a7c5a" stopOpacity={0.12}/>
                    <stop offset="95%" stopColor="#1a7c5a" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6"/>
                <XAxis
                  dataKey="label"
                  axisLine={false} tickLine={false}
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                />
                <YAxis
                  axisLine={false} tickLine={false}
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                  formatter={v => [`₹${Number(v).toLocaleString('en-IN')}`, 'Revenue']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#1a7c5a" strokeWidth={2.5} fill="url(#grad)"/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie chart */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-700 mb-4">Top medicines</p>
          {data.medicines.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No medicine data for this period.</p>
          ) : (
            <>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.medicines} innerRadius={44} outerRadius={62} paddingAngle={3} dataKey="salesCount">
                      {data.medicines.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px' }}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2">
                {data.medicines.map((item, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <span className="flex items-center gap-2 text-xs text-gray-600">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }}/>
                      {item._id}
                    </span>
                    <span className="text-xs text-gray-400">{item.salesCount} sold</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Tables ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={15} className="text-[#1a7c5a]"/>
            <span className="text-sm font-medium text-gray-700">Upcoming follow-ups</span>
          </div>
          <div className="space-y-0.5">
            {data.followUps.length === 0
              ? <p className="text-xs text-gray-400 italic py-2">No follow-ups scheduled.</p>
              : data.followUps.map((f, i) => (
                <div key={i} className="flex justify-between items-center px-3 py-3 rounded-xl hover:bg-gray-50 transition-all">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{f.patientName}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{f.mobile}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-[#1a7c5a] font-semibold uppercase tracking-wide">Scheduled</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Date(f.followUpDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </div>
              ))
            }
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={15} className="text-red-400"/>
            <span className="text-sm font-medium text-gray-700">Common diagnoses</span>
          </div>
          <div className="space-y-3">
            {data.diseases.length === 0
              ? <p className="text-xs text-gray-400 italic">No diagnosis data for this period.</p>
              : data.diseases.map((d, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-500 shrink-0">{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700 mb-1.5">{d._id || 'Not mentioned'}</p>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#1a7c5a] rounded-full transition-all duration-500"
                        style={{ width: `${(d.count / (data.revenue.totalBills || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">{d.count} cases</span>
                </div>
              ))
            }
          </div>
        </div>

      </div>
    </div>
  );
};

export default ReportsDashboard;