import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Production, SECTORS, calculateDifference, calculateStatus } from '../types';
import { TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react';

export function PlantScreenPage() {
  const [selectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [production, setProduction] = useState<Production[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    loadProduction();
    const dataInterval = setInterval(loadProduction, 30000);
    const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000);

    return () => {
      clearInterval(dataInterval);
      clearInterval(timeInterval);
    };
  }, [selectedDate]);

  const loadProduction = async () => {
    try {
      const { data, error } = await supabase
        .from('production')
        .select('*')
        .eq('date', selectedDate);

      if (error) throw error;
      setProduction(data || []);
    } catch (error) {
      console.error('Error loading production:', error);
    }
  };

  const totalPlanned = production.reduce((sum, p) => sum + p.planned, 0);
  const totalProduced = production.reduce((sum, p) => sum + p.produced, 0);
  const totalDifference = totalProduced - totalPlanned;
  const overallStatus = calculateStatus(totalDifference);
  const compliance = totalPlanned > 0 ? (totalProduced / totalPlanned) * 100 : 0;

  const productionBySector = SECTORS.map(sector => {
    const sectorData = production.filter(p => p.sector === sector);
    const planned = sectorData.reduce((sum, p) => sum + p.planned, 0);
    const produced = sectorData.reduce((sum, p) => sum + p.produced, 0);
    const difference = produced - planned;
    const status = calculateStatus(difference);
    return { sector, planned, produced, difference, status };
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Adelanto':
        return <TrendingUp className="w-12 h-12" />;
      case 'OK':
        return <Minus className="w-12 h-12" />;
      case 'Atraso':
        return <TrendingDown className="w-12 h-12" />;
      default:
        return <AlertCircle className="w-12 h-12" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Adelanto':
        return 'bg-amber-500 text-white';
      case 'OK':
        return 'bg-green-500 text-white';
      case 'Atraso':
        return 'bg-red-500 text-white';
      default:
        return 'bg-green-500 text-white';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-8">
      <div className="max-w-[1920px] mx-auto space-y-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-6xl font-bold mb-2">SISTEMA MES - PRODUCCIÓN EN VIVO</h1>
            <p className="text-3xl text-slate-300">Gestión de Producción Industrial</p>
          </div>
          <div className="text-right">
            <p className="text-5xl font-bold">{currentTime.toLocaleTimeString('es-ES')}</p>
            <p className="text-2xl text-slate-300 mt-2">
              {currentTime.toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>

        <div className={`rounded-3xl p-8 ${getStatusColor(overallStatus)}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              {getStatusIcon(overallStatus)}
              <div>
                <p className="text-3xl font-medium opacity-90">ESTADO GENERAL DE PLANTA</p>
                <p className="text-7xl font-bold mt-2">{overallStatus.toUpperCase()}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-medium opacity-90">Cumplimiento</p>
              <p className="text-7xl font-bold mt-2">{compliance.toFixed(0)}%</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="bg-white/10 backdrop-blur rounded-3xl p-8 border border-white/20">
            <p className="text-3xl font-medium text-slate-300 mb-3">PLAN TOTAL</p>
            <p className="text-7xl font-bold">{totalPlanned.toFixed(0)}</p>
            <p className="text-3xl text-slate-300 mt-2">kg</p>
          </div>

          <div className="bg-white/10 backdrop-blur rounded-3xl p-8 border border-white/20">
            <p className="text-3xl font-medium text-slate-300 mb-3">PRODUCIDO</p>
            <p className="text-7xl font-bold">{totalProduced.toFixed(0)}</p>
            <p className="text-3xl text-slate-300 mt-2">kg</p>
          </div>

          <div className="bg-white/10 backdrop-blur rounded-3xl p-8 border border-white/20">
            <p className="text-3xl font-medium text-slate-300 mb-3">DIFERENCIA</p>
            <p className={`text-7xl font-bold ${
              totalDifference > 0 ? 'text-green-400' :
              totalDifference < 0 ? 'text-red-400' :
              'text-white'
            }`}>
              {totalDifference >= 0 ? '+' : ''}{totalDifference.toFixed(0)}
            </p>
            <p className="text-3xl text-slate-300 mt-2">kg</p>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur rounded-3xl p-8 border border-white/20">
          <h2 className="text-4xl font-bold mb-6">PRODUCCIÓN POR SECTOR</h2>
          <div className="grid grid-cols-1 gap-4">
            {productionBySector.map(({ sector, planned, produced, difference, status }) => {
              const sectorCompliance = planned > 0 ? (produced / planned) * 100 : 0;
              return (
                <div key={sector} className="bg-white/5 rounded-2xl p-6 border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <span className={`w-6 h-6 rounded-full ${
                        status === 'Adelanto' ? 'bg-amber-500' :
                        status === 'Atraso' ? 'bg-red-500' :
                        'bg-green-500'
                      }`}></span>
                      <h3 className="text-3xl font-bold">{sector}</h3>
                    </div>
                    <div className="flex items-center space-x-8 text-right">
                      <div>
                        <p className="text-xl text-slate-300">Plan</p>
                        <p className="text-3xl font-bold">{planned.toFixed(0)} kg</p>
                      </div>
                      <div>
                        <p className="text-xl text-slate-300">Producido</p>
                        <p className="text-3xl font-bold">{produced.toFixed(0)} kg</p>
                      </div>
                      <div>
                        <p className="text-xl text-slate-300">Diferencia</p>
                        <p className={`text-3xl font-bold ${
                          difference > 0 ? 'text-green-400' :
                          difference < 0 ? 'text-red-400' :
                          'text-white'
                        }`}>
                          {difference >= 0 ? '+' : ''}{difference.toFixed(0)} kg
                        </p>
                      </div>
                      <div>
                        <p className="text-xl text-slate-300">Estado</p>
                        <p className={`text-3xl font-bold ${
                          status === 'Adelanto' ? 'text-amber-400' :
                          status === 'Atraso' ? 'text-red-400' :
                          'text-green-400'
                        }`}>
                          {status}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-4">
                    <div
                      className={`h-4 rounded-full transition-all ${
                        status === 'Adelanto' ? 'bg-amber-500' :
                        status === 'Atraso' ? 'bg-red-500' :
                        'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(sectorCompliance, 100)}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="text-center text-slate-400 text-xl">
          <p>Actualización automática cada 30 segundos</p>
        </div>
      </div>
    </div>
  );
}

export default PlantScreenPage;
