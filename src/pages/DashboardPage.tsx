import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Production, SECTORS, Sector, calculateDifference, calculateStatus } from '../types';
import { Calendar, TrendingUp, TrendingDown, Minus, Info, BarChart3, PieChart, Activity, Target } from 'lucide-react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  Area, AreaChart, ComposedChart, Line,
  Scatter, ScatterChart, ZAxis
} from 'recharts';

function CountUpNumber({ end, duration = 1500, decimals = 0, suffix = '', prefix = '' }: { end: number, duration?: number, decimals?: number, suffix?: string, prefix?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    const startValue = 0;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      // Easing function: easeOutExpo
      const easing = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCount(easing * (end - startValue) + startValue);
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [end, duration]);

  return (
    <span>
      {prefix}
      {count.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}

function CircularProgress({ percentage, color = 'blue', size = 52, strokeWidth = 4 }: { percentage: number, color?: string, size?: number, strokeWidth?: number }) {
  const [progress, setProgress] = useState(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  useEffect(() => {
    let startTime: number | null = null;
    const duration = 1500;
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progressTime = Math.min((timestamp - startTime) / duration, 1);
      const easing = progressTime === 1 ? 1 : 1 - Math.pow(2, -10 * progressTime);
      setProgress(easing * percentage);
      if (progressTime < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [percentage]);

  const offset = circumference - (Math.max(0, Math.min(progress, 100)) / 100) * circumference;

  const colorClasses = {
    blue: 'text-blue-600 dark:text-blue-400',
    green: 'text-green-600 dark:text-green-400',
    red: 'text-red-600 dark:text-red-400',
    amber: 'text-amber-600 dark:text-amber-400',
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90 drop-shadow-[0_0_8px_rgba(37,99,235,0.1)]">
        <circle
          className="text-gray-100 dark:text-white/5"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className={`${colorClasses[color as keyof typeof colorClasses] || colorClasses.blue} transition-all duration-100`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <span className="absolute text-[10px] font-bold text-gray-900 dark:text-white">
        {Math.round(progress)}%
      </span>
    </div>
  );
}

function ProgressBar({ percentage, color = 'blue' }: { percentage: number, color?: 'green' | 'red' | 'blue' | 'amber' }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    const duration = 1500;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progressTime = Math.min((timestamp - startTime) / duration, 1);
      const easing = progressTime === 1 ? 1 : 1 - Math.pow(2, -10 * progressTime);
      setProgress(easing * percentage);
      if (progressTime < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [percentage]);

  const colorClasses = {
    green: 'bg-green-500 dark:bg-green-600',
    red: 'bg-red-500 dark:bg-red-600',
    blue: 'bg-blue-500 dark:bg-blue-600',
    amber: 'bg-amber-500 dark:bg-amber-600',
  };

  return (
    <div className="w-full bg-gray-200 dark:bg-white/10 rounded-full h-3 overflow-hidden shadow-inner">
      <div
        className={`h-3 rounded-full ${colorClasses[color] || colorClasses.blue}`}
        style={{ width: `${Math.min(progress, 100)}%` }}
      ></div>
    </div>
  );
}

export function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [production, setProduction] = useState<Production[]>([]);
  const [historicalData, setHistoricalData] = useState<Production[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [selectedDate]);

  const loadDashboardData = async () => {
    setLoading(true);
    const startDate = new Date(selectedDate);
    startDate.setDate(startDate.getDate() - 6);
    const startDateStr = startDate.toISOString().split('T')[0];

    try {
      const { data, error } = await supabase
        .from('production')
        .select('*')
        .gte('date', startDateStr)
        .lte('date', selectedDate);

      if (error) throw error;
      const allData = (data as Production[]) || [];
      setProduction(allData.filter(p => p.date === selectedDate));
      setHistoricalData(allData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const armadoProduction = production.filter(p => p.sector === 'Armado');
  const totalPlanned = armadoProduction.reduce((sum, p) => sum + p.planned, 0);
  const totalProduced = armadoProduction.reduce((sum, p) => sum + p.produced, 0);
  const compliance = totalPlanned > 0 ? (totalProduced / totalPlanned) * 100 : 0;
  const difference = totalProduced - totalPlanned;

  const salsasProduction = production.filter(p => p.sector === 'Salsas');
  const salsasUnits = salsasProduction.reduce((sum, p) => sum + p.produced, 0);

  const productionBySector = useMemo(() => {
    return production.reduce((acc, p) => {
      if (!acc[p.sector]) {
        acc[p.sector] = { planned: 0, produced: 0 };
      }
      acc[p.sector].planned += p.planned;
      acc[p.sector].produced += p.produced;
      return acc;
    }, {} as Record<string, { planned: number; produced: number }>);
  }, [production]);

  // Data for Radar Chart (Sectors)
  const radarData = useMemo(() => {
    return SECTORS.map(sector => {
      const data = productionBySector[sector] || { planned: 0, produced: 0 };
      const comp = data.planned > 0 ? (data.produced / data.planned) * 100 : 0;
      return {
        sector,
        value: Math.min(comp, 150), // Cap at 150% for visibility
        full: 100
      };
    });
  }, [productionBySector]);

  // Data for Pareto Chart (Atrasos)
  const paretoData = useMemo(() => {
    const products = production
      .filter(p => p.produced < p.planned)
      .map(p => ({
        name: p.product,
        atraso: p.planned - p.produced
      }))
      .sort((a, b) => b.atraso - a.atraso)
      .slice(0, 8);

    const totalAtraso = products.reduce((sum, p) => sum + p.atraso, 0);
    let cumulative = 0;
    
    return products.map(p => {
      cumulative += p.atraso;
      return {
        ...p,
        cumulative: totalAtraso > 0 ? (cumulative / totalAtraso) * 100 : 0
      };
    });
  }, [production]);

  // Data for Gauss (Armado Consistency)
  const gaussData = useMemo(() => {
    return production
      .filter(p => p.sector === 'Armado' && p.planned > 0)
      .map(p => {
        const comp = (p.produced / p.planned) * 100;
        return {
          x: Math.min(comp, 150),
          y: Math.exp(-Math.pow(comp - 100, 2) / (2 * Math.pow(20, 2))), // Gaussian distribution
          z: p.produced
        };
      });
  }, [production]);

  // Data for Weekly Trend
  const trendData = useMemo(() => {
    const dates = [...new Set(historicalData.map(p => p.date))].sort();
    return dates.map(date => {
      const dayProd = historicalData.filter(p => p.date === date);
      return {
        date: date.split('-').reverse().slice(0, 2).join('/'),
        total: dayProd.reduce((sum, p) => sum + p.produced, 0)
      };
    });
  }, [historicalData]);

  const topProducts = production
    .map(p => ({
      product: p.product,
      sector: p.sector,
      produced: p.produced,
      planned: p.planned,
      compliance: p.planned > 0 ? (p.produced / p.planned) * 100 : 0,
    }))
    .sort((a, b) => b.produced - a.produced)
    .slice(0, 5);

  const dateInputRef = useRef<HTMLInputElement>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white transition-colors duration-300">Dashboard Gerencial</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 transition-colors duration-300">Vista general de producción</p>
        </div>
        <div 
          className="relative min-w-[140px] px-4 py-2 bg-white dark:bg-[#1a1c23] border border-gray-300 dark:border-white/10 rounded-lg text-gray-900 dark:text-white flex items-center justify-between gap-3 transition-all cursor-pointer hover:border-blue-500 dark:hover:border-blue-500/50 group"
          onClick={() => dateInputRef.current?.showPicker()}
        >
          <input
            ref={dateInputRef}
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="absolute inset-0 opacity-0 w-0 h-0 pointer-events-none"
          />
          <span className="font-medium">{selectedDate.split('-').reverse().join('/')}</span>
          <Calendar className="w-4 h-4 text-gray-400 group-hover:text-blue-500 shrink-0 transition-colors" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-[#1a1c23] rounded-2xl shadow-sm border border-gray-200 dark:border-white/5 p-6 transition-all duration-300 relative overflow-hidden">
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Plan Total</p>
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
              <CountUpNumber end={totalPlanned} />
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">bandejas</p>
          </div>
          <div className="absolute bottom-6 right-6">
            <CircularProgress percentage={totalPlanned > 0 ? 100 : 0} color="blue" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#1a1c23] rounded-2xl shadow-sm border border-gray-200 dark:border-white/5 p-6 transition-all duration-300 relative overflow-hidden">
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center justify-between w-full">
              Producción Total
              <span className="text-[10px] bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider transition-all duration-300">Bandejas</span>
            </p>
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
              <CountUpNumber end={totalProduced} />
            </h3>
          </div>
          <div className="absolute bottom-6 right-6">
            <CircularProgress percentage={compliance} color="green" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#1a1c23] rounded-2xl shadow-sm border border-gray-200 dark:border-white/5 p-6 transition-all duration-300 relative overflow-hidden">
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Producción Salsas</p>
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
              <CountUpNumber end={salsasUnits} />
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">unidades</p>
          </div>
          <div className="absolute bottom-6 right-6">
            <CircularProgress percentage={salsasUnits > 0 ? 100 : 0} color="amber" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#1a1c23] rounded-2xl shadow-sm border border-gray-200 dark:border-white/5 p-6 transition-all duration-300 relative overflow-hidden">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Cumplimiento</p>
              <h3 className={`text-2xl font-black mt-1 ${compliance >= 100 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                <CountUpNumber end={compliance} decimals={1} suffix="%" />
              </h3>
            </div>
            <div className="pt-2 border-t border-gray-100 dark:border-white/5">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Diferencia</p>
              <h3 className={`text-xl font-bold mt-1 ${difference >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                <CountUpNumber end={difference} prefix={difference >= 0 ? '+' : ''} />
                <span className="text-xs ml-1 font-medium">bandejas</span>
              </h3>
            </div>
          </div>
          <div className="absolute bottom-6 right-6">
            <CircularProgress percentage={compliance} color={compliance >= 100 ? 'green' : 'red'} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-[#1a1c23] rounded-2xl shadow-sm border border-gray-200 dark:border-white/5 p-6 transition-all duration-300">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Producción por Sector</h2>
          <div className="space-y-4">
            {Object.entries(productionBySector).map(([sector, data]) => {
              const sectorCompliance = data.planned > 0 ? (data.produced / data.planned) * 100 : 0;
              return (
                <div key={sector}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-gray-900 dark:text-white">{sector}</span>
                    <span className={`text-sm font-semibold ${
                      sectorCompliance >= 100 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      <CountUpNumber end={sectorCompliance} suffix="%" />
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400 mb-2">
                    <span>Plan: <CountUpNumber end={data.planned} /> kg</span>
                    <span>Producido: <CountUpNumber end={data.produced} /> kg</span>
                  </div>
                  <ProgressBar 
                    percentage={sectorCompliance} 
                    color={sectorCompliance >= 100 ? 'green' : 'red'} 
                  />
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white dark:bg-[#1a1c23] rounded-2xl shadow-sm border border-gray-200 dark:border-white/5 p-6 transition-all duration-300">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Top Productos</h2>
          <div className="space-y-4">
            {topProducts.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-lg border border-transparent dark:border-white/5">
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 dark:text-white">{item.product}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{item.sector}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    <CountUpNumber end={item.produced} suffix=" kg" />
                  </p>
                  <p className={`text-sm font-semibold ${
                    item.compliance >= 100 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    <CountUpNumber end={item.compliance} suffix="% del plan" />
                  </p>
                </div>
              </div>
            ))}
            {topProducts.length === 0 && (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">No hay datos de producción</p>
            )}
          </div>
        </div>
      </div>

      {/* Analítica Avanzada */}
      <h2 className="text-2xl font-black text-gray-900 dark:text-white mt-12 mb-6 flex items-center gap-3">
        <Activity className="w-8 h-8 text-blue-600" />
        Análisis Avanzado de Planta
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Radar Chart - Comparativa de Sectores */}
        <div className="bg-white dark:bg-[#1a1c23] rounded-2xl shadow-sm border border-gray-200 dark:border-white/5 p-6 transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <PieChart className="w-5 h-5 text-purple-500" />
              Equilibrio Operativo (Radar)
            </h3>
            <div className="group relative">
              <Info className="w-4 h-4 text-gray-400 cursor-help" />
              <div className="absolute right-0 bottom-6 w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                Compara el cumplimiento porcentual de todos los sectores. Un gráfico expandido hacia afuera indica una planta equilibrada.
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 italic">Balance de cumplimiento por sector</p>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke="#374151" />
                <PolarAngleAxis dataKey="sector" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#9ca3af' }} />
                <Radar
                  name="Cumplimiento"
                  dataKey="value"
                  stroke="#8b5cf6"
                  fill="#8b5cf6"
                  fillOpacity={0.6}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Pareto - Críticos con más Atraso */}
        <div className="bg-white dark:bg-[#1a1c23] rounded-2xl shadow-sm border border-gray-200 dark:border-white/5 p-6 transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-orange-500" />
              Atrasos Críticos (Pareto)
            </h3>
            <div className="group relative">
              <Info className="w-4 h-4 text-gray-400 cursor-help" />
              <div className="absolute right-0 bottom-6 w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                Identifica qué productos representan el mayor volumen de atraso. El 20% de los productos suele causar el 80% de las demoras.
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 italic">Top productos con mayor desviación negativa</p>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={paretoData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                <YAxis yAxisId="left" tick={{ fill: '#9ca3af' }} label={{ value: 'kg/unid', angle: -90, position: 'insideLeft', fill: '#9ca3af' }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: '#9ca3af' }} unit="%" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                />
                <Bar yAxisId="left" dataKey="atraso" fill="#f97316" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="cumulative" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. Gauss - Consistencia de Armado */}
        <div className="bg-white dark:bg-[#1a1c23] rounded-2xl shadow-sm border border-gray-200 dark:border-white/5 p-6 transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              Consistencia Armado (Gauss)
            </h3>
            <div className="group relative">
              <Info className="w-4 h-4 text-gray-400 cursor-help" />
              <div className="absolute right-0 bottom-6 w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                Muestra la dispersión del cumplimiento de productos en Armado. Una curva alta y centrada en 100% indica procesos estables.
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 italic">Distribución de eficiencia por producto en Armado</p>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                <XAxis type="number" dataKey="x" name="Cumplimiento" unit="%" domain={[0, 150]} tick={{ fill: '#9ca3af' }} />
                <YAxis type="number" dataKey="y" name="Frecuencia" hide />
                <ZAxis type="number" dataKey="z" range={[50, 400]} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Scatter name="Productos" data={gaussData} fill="#10b981" />
              </ScatterChart>
            </ResponsiveContainer>
            </div>
            <div className="mt-4 flex justify-center gap-6">
              <div className="flex items-center gap-1 text-[10px] text-gray-400">
                <div className="w-2 h-2 rounded-full bg-red-500"></div> Atraso
              </div>
              <div className="flex items-center gap-1 text-[10px] text-gray-400">
                <div className="w-2 h-2 rounded-full bg-green-500"></div> Objetivo
              </div>
              <div className="flex items-center gap-1 text-[10px] text-gray-400">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div> Adelanto
              </div>
            </div>
        </div>

        {/* 4. Area Chart - Tendencia Semanal */}
        <div className="bg-white dark:bg-[#1a1c23] rounded-2xl shadow-sm border border-gray-200 dark:border-white/5 p-6 transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-500" />
              Tendencia Semanal (Crecimiento)
            </h3>
            <div className="group relative">
              <Info className="w-4 h-4 text-gray-400 cursor-help" />
              <div className="absolute right-0 bottom-6 w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                Evolución de la producción total de los últimos 7 días. Muestra el crecimiento acumulado de toda la planta.
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 italic">Volumen histórico por fecha</p>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                <YAxis tick={{ fill: '#9ca3af' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                />
                <Area type="monotone" dataKey="total" stroke="#3b82f6" fillOpacity={1} fill="url(#colorTotal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
