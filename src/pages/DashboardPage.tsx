import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Production } from '../types';
import { TrendingUp, TrendingDown, Target, Package, Calendar } from 'lucide-react';

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

  const totalPlanned = production.reduce((sum, p) => sum + p.planned, 0);
  const totalProduced = production.reduce((sum, p) => sum + p.produced, 0);
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
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 bg-white dark:bg-[#1a1c23] border border-gray-300 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-[#1a1c23] rounded-2xl shadow-sm border border-gray-200 dark:border-white/5 p-6 transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Plan Total</p>
            <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{totalPlanned.toFixed(0)}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">kg</p>
        </div>

        <div className="bg-white dark:bg-[#1a1c23] rounded-2xl shadow-sm border border-gray-200 dark:border-white/5 p-6 transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Producción Total</p>
            <Package className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{totalProduced.toFixed(0)}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">kg</p>
        </div>

        <div className="bg-white dark:bg-[#1a1c23] rounded-2xl shadow-sm border border-gray-200 dark:border-white/5 p-6 transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Cumplimiento</p>
            {compliance >= 100 ? (
              <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
            )}
          </div>
          <p className={`text-3xl font-bold ${compliance >= 100 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {compliance.toFixed(1)}%
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">del plan</p>
        </div>

        <div className="bg-white dark:bg-[#1a1c23] rounded-2xl shadow-sm border border-gray-200 dark:border-white/5 p-6 transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Diferencia</p>
            {difference >= 0 ? (
              <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
            )}
          </div>
          <p className={`text-3xl font-bold ${difference >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {difference >= 0 ? '+' : ''}{difference.toFixed(0)}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">kg</p>
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
                      {sectorCompliance.toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400 mb-2">
                    <span>Plan: {data.planned.toFixed(0)} kg</span>
                    <span>Producido: {data.produced.toFixed(0)} kg</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-white/10 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        sectorCompliance >= 100 ? 'bg-green-500 dark:bg-green-600' : 'bg-red-500 dark:bg-red-600'
                      }`}
                      style={{ width: `${Math.min(sectorCompliance, 100)}%` }}
                    ></div>
                  </div>
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
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{item.produced.toFixed(0)} kg</p>
                  <p className={`text-sm font-semibold ${
                    item.compliance >= 100 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {item.compliance.toFixed(0)}% del plan
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
