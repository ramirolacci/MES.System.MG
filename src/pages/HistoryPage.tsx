import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { History, SECTORS, Sector, SHIFT_TYPES, ShiftType } from '../types';
import { Calendar, Filter } from 'lucide-react';

export function HistoryPage() {
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSector, setSelectedSector] = useState<Sector>(SECTORS[0]);
  const [selectedShift, setSelectedShift] = useState<ShiftType | 'Todos'>('Todos');
  const [history, setHistory] = useState<History[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [startDate, endDate, selectedShift]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('history')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false })
        .order('sector', { ascending: true });



      if (selectedShift !== 'Todos') {
        query = query.eq('shift_type', selectedShift);
      }

      const { data, error } = await query;

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = history.filter(item => item.sector === selectedSector);
  const groupedByDate = filteredHistory.reduce((acc, item) => {
    if (!acc[item.date]) {
      acc[item.date] = [];
    }
    acc[item.date].push(item);
    return acc;
  }, {} as Record<string, History[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white transition-colors duration-300">Historial de Producción</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1 transition-colors duration-300">Consulta el histórico de producción</p>
      </div>

      <div className="flex flex-col items-center gap-4">
        <div className="flex justify-center">
          <button
            onClick={() => setSelectedShift('Todos')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              selectedShift === 'Todos'
                ? 'bg-blue-600 dark:bg-blue-600 text-white shadow-md'
                : 'bg-white dark:bg-[#1a1c23] text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'
            }`}
          >
            Todos los turnos
          </button>
        </div>
        <div className="flex flex-wrap gap-2 justify-center">
          {SHIFT_TYPES.map((shift) => (
            <button
              key={shift}
              onClick={() => setSelectedShift(shift as ShiftType)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                selectedShift === shift
                  ? 'bg-amber-600 dark:bg-amber-600 text-white shadow-md'
                  : 'bg-white dark:bg-[#1a1c23] text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'
              }`}
            >
              Turno {shift}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-[#1a1c23] rounded-2xl shadow-sm border border-gray-200 dark:border-white/5 p-6 transition-all duration-300">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Filtros</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Fecha Inicio
            </label>
            <div className="relative">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full"
              />
              <div className="w-full px-4 py-2 bg-white dark:bg-[#1a1c23] border border-gray-300 dark:border-white/10 rounded-lg text-gray-900 dark:text-white flex items-center justify-between gap-3 transition-all cursor-pointer">
                <span className="font-medium">{startDate.split('-').reverse().join('/')}</span>
                <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Fecha Fin
            </label>
            <div className="relative">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full"
              />
              <div className="w-full px-4 py-2 bg-white dark:bg-[#1a1c23] border border-gray-300 dark:border-white/10 rounded-lg text-gray-900 dark:text-white flex items-center justify-between gap-3 transition-all cursor-pointer">
                <span className="font-medium">{endDate.split('-').reverse().join('/')}</span>
                <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {Object.entries(groupedByDate).length === 0 ? (
          <div className="bg-white dark:bg-[#1a1c23] rounded-2xl shadow-sm border border-gray-200 dark:border-white/5 p-12 text-center transition-all duration-300">
            <p className="text-gray-500 dark:text-gray-400 text-lg">No hay registros en el rango seleccionado</p>
          </div>
        ) : (
          Object.entries(groupedByDate).map(([date, items]) => {
            const totalPlanned = items.reduce((sum, item) => sum + item.planned, 0);
            const totalProduced = items.reduce((sum, item) => sum + item.produced, 0);
            const totalDifference = items.reduce((sum, item) => sum + item.difference, 0);
            const overallStatus = totalDifference > 0 ? 'Adelanto' : totalDifference === 0 ? 'OK' : 'Atraso';

            return (
              <div key={date} className="bg-white dark:bg-[#1a1c23] rounded-2xl shadow-sm border border-gray-200 dark:border-white/5 overflow-hidden transition-all duration-300">
                <div className="bg-gradient-to-r from-blue-700/90 to-blue-900/90 dark:from-blue-900/40 dark:to-blue-800/40 px-6 py-4 border-b dark:border-white/5">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <h3 className="text-xl font-bold text-white dark:text-gray-100">
                        {new Date(date + 'T00:00:00').toLocaleDateString('es-ES', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </h3>
                      <p className="text-blue-100 dark:text-gray-400 text-sm mt-1 font-medium">
                        {items.length} producto{items.length !== 1 ? 's' : ''} registrado{items.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="hidden lg:flex flex-wrap gap-1 bg-black/20 p-1 rounded-xl">
                      {SECTORS.map((s) => (
                        <button
                          key={s}
                          onClick={() => setSelectedSector(s)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all uppercase ${
                            selectedSector === s
                              ? 'bg-blue-500 text-white shadow-sm'
                              : 'text-white hover:bg-white/10'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-4 text-white">
                      <div>
                        <p className="text-blue-100 dark:text-gray-400 text-xs font-medium uppercase tracking-wider">Plan Total</p>
                        <p className="text-xl font-bold text-white">{totalPlanned.toFixed(0)} kg</p>
                      </div>
                      <div>
                        <p className="text-blue-100 dark:text-gray-400 text-xs font-medium uppercase tracking-wider">Producido</p>
                        <p className="text-xl font-bold text-white">{totalProduced.toFixed(0)} kg</p>
                      </div>
                      <div>
                        <p className="text-blue-100 dark:text-gray-400 text-xs font-medium uppercase tracking-wider">Estado</p>
                        <p className={`text-xl font-bold ${
                          overallStatus === 'Adelanto' ? 'text-amber-300 dark:text-amber-400' :
                          overallStatus === 'Atraso' ? 'text-red-300 dark:text-red-400' :
                          'text-green-300 dark:text-green-400'
                        }`}>
                          {overallStatus}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-black/20 border-b border-gray-200 dark:border-white/5">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Sector</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Producto</th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Plan (kg)</th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Producido (kg)</th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Diferencia</th>
                        <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Estado</th>
                        <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Turno</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                      {items.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors border-b border-gray-200 dark:border-white/5 last:border-0">
                            <td className="px-6 py-4">
                              <span className="font-medium text-gray-900 dark:text-gray-100">{item.sector}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-gray-900 dark:text-gray-100">{item.product}</span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className="font-medium text-gray-900 dark:text-white">{item.planned.toFixed(1)}</span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className="font-medium text-gray-900 dark:text-white">{item.produced.toFixed(1)}</span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className={`font-bold ${
                                item.difference > 0 ? 'text-green-600 dark:text-green-400' :
                                item.difference < 0 ? 'text-red-600 dark:text-red-400' :
                                'text-gray-900 dark:text-gray-100'
                              }`}>
                                {item.difference >= 0 ? '+' : ''}{item.difference.toFixed(1)}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${
                                item.status === 'Adelanto' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30' :
                                item.status === 'Atraso' ? 'bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-400 border border-red-200 dark:border-red-500/30' :
                                'bg-green-100 dark:bg-green-500/20 text-green-800 dark:text-green-400 border border-green-200 dark:border-green-500/30'
                              }`}>
                                {item.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="text-sm text-gray-600 dark:text-gray-400">{item.shift_type}</span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
