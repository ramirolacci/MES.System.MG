import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { History, SECTORS, Sector, getStatusColor } from '../types';
import { Calendar, Filter } from 'lucide-react';

export function HistoryPage() {
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSector, setSelectedSector] = useState<Sector | 'Todos'>('Todos');
  const [history, setHistory] = useState<History[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [startDate, endDate, selectedSector]);

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

      if (selectedSector !== 'Todos') {
        query = query.eq('sector', selectedSector);
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

  const groupedByDate = history.reduce((acc, item) => {
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
        <h1 className="text-3xl font-bold text-gray-900">Historial de Producción</h1>
        <p className="text-gray-600 mt-1">Consulta el histórico de producción</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="w-5 h-5 text-gray-700" />
          <h2 className="text-lg font-semibold text-gray-900">Filtros</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Fecha Inicio
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Fecha Fin
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sector
            </label>
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value as Sector | 'Todos')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="Todos">Todos los sectores</option>
              {SECTORS.map(sector => (
                <option key={sector} value={sector}>{sector}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {Object.entries(groupedByDate).length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
            <p className="text-gray-500 text-lg">No hay registros en el rango seleccionado</p>
          </div>
        ) : (
          Object.entries(groupedByDate).map(([date, items]) => {
            const totalPlanned = items.reduce((sum, item) => sum + item.planned, 0);
            const totalProduced = items.reduce((sum, item) => sum + item.produced, 0);
            const totalDifference = items.reduce((sum, item) => sum + item.difference, 0);
            const overallStatus = totalDifference > 0 ? 'Adelanto' : totalDifference === 0 ? 'OK' : 'Atraso';

            return (
              <div key={date} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <h3 className="text-xl font-bold text-white">
                        {new Date(date + 'T00:00:00').toLocaleDateString('es-ES', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </h3>
                      <p className="text-blue-100 text-sm mt-1">
                        {items.length} producto{items.length !== 1 ? 's' : ''} registrado{items.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-4 text-white">
                      <div>
                        <p className="text-blue-100 text-xs">Plan Total</p>
                        <p className="text-xl font-bold">{totalPlanned.toFixed(0)} kg</p>
                      </div>
                      <div>
                        <p className="text-blue-100 text-xs">Producido</p>
                        <p className="text-xl font-bold">{totalProduced.toFixed(0)} kg</p>
                      </div>
                      <div>
                        <p className="text-blue-100 text-xs">Estado</p>
                        <p className={`text-xl font-bold ${
                          overallStatus === 'Adelanto' ? 'text-amber-300' :
                          overallStatus === 'Atraso' ? 'text-red-300' :
                          'text-green-300'
                        }`}>
                          {overallStatus}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Sector</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Producto</th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Plan (kg)</th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Producido (kg)</th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Diferencia</th>
                        <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">Estado</th>
                        <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">Turno</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {items.map((item) => {
                        const statusColor = getStatusColor(item.status);
                        return (
                          <tr key={item.id} className={`hover:bg-gray-50 ${statusColor}`}>
                            <td className="px-6 py-4">
                              <span className="font-medium text-gray-900">{item.sector}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-gray-900">{item.product}</span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className="font-medium text-gray-900">{item.planned.toFixed(1)}</span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className="font-medium text-gray-900">{item.produced.toFixed(1)}</span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className={`font-bold ${
                                item.difference > 0 ? 'text-green-600' :
                                item.difference < 0 ? 'text-red-600' :
                                'text-gray-900'
                              }`}>
                                {item.difference >= 0 ? '+' : ''}{item.difference.toFixed(1)}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${
                                item.status === 'Adelanto' ? 'bg-amber-500 text-white' :
                                item.status === 'Atraso' ? 'bg-red-500 text-white' :
                                'bg-green-500 text-white'
                              }`}>
                                {item.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="text-sm text-gray-600">{item.shift_type}</span>
                            </td>
                          </tr>
                        );
                      })}
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
