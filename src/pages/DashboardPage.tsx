import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Production } from '../types';
import { Calendar } from 'lucide-react';

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [selectedDate]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('production')
        .select('*')
        .eq('date', selectedDate);

      if (error) throw error;
      setProduction(data || []);
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

  const productionBySector = production.reduce((acc, p) => {
    if (!acc[p.sector]) {
      acc[p.sector] = { planned: 0, produced: 0 };
    }
    acc[p.sector].planned += p.planned;
    acc[p.sector].produced += p.produced;
    return acc;
  }, {} as Record<string, { planned: number; produced: number }>);

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
        <div className="flex items-center space-x-2">
          <Calendar className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          <div className="relative">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full"
            />
            <div className="min-w-[140px] px-4 py-2 bg-white dark:bg-[#1a1c23] border border-gray-300 dark:border-white/10 rounded-lg text-gray-900 dark:text-white flex items-center justify-between gap-3 transition-all cursor-pointer">
              <span className="font-medium">{selectedDate.split('-').reverse().join('/')}</span>
              <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-[#1a1c23] rounded-2xl shadow-sm border border-gray-200 dark:border-white/5 p-6 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Plan Total</p>
              <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                <CountUpNumber end={totalPlanned} />
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">kg</p>
            </div>
            <CircularProgress percentage={100} color="blue" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#1a1c23] rounded-2xl shadow-sm border border-gray-200 dark:border-white/5 p-6 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                Producción Total
                <span className="text-[10px] bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider transition-all duration-300">Armado</span>
              </p>
              <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                <CountUpNumber end={totalProduced} />
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">kg</p>
            </div>
            <CircularProgress percentage={compliance} color="green" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#1a1c23] rounded-2xl shadow-sm border border-gray-200 dark:border-white/5 p-6 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Cumplimiento</p>
              <h3 className={`text-3xl font-bold mt-1 ${compliance >= 100 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                <CountUpNumber end={compliance} decimals={1} suffix="%" />
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">del plan</p>
            </div>
            <CircularProgress percentage={compliance} color={compliance >= 100 ? 'green' : 'red'} />
          </div>
        </div>

        <div className="bg-white dark:bg-[#1a1c23] rounded-2xl shadow-sm border border-gray-200 dark:border-white/5 p-6 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Diferencia</p>
              <h3 className={`text-3xl font-bold mt-1 ${difference >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                <CountUpNumber end={difference} prefix={difference >= 0 ? '+' : ''} />
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">kg</p>
            </div>
            <CircularProgress percentage={Math.abs(compliance - 100)} color={difference >= 0 ? 'green' : 'amber'} />
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
    </div>
  );
}
