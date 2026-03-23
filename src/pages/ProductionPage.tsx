import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Production, SECTORS, Sector, calculateDifference, calculateStatus, getStatusColor } from '../types';
import { Calendar, PlayCircle, Save, StopCircle, Sun, Sunset } from 'lucide-react';

export function ProductionPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSector, setSelectedSector] = useState<Sector>(SECTORS[0]);
  const [production, setProduction] = useState<Production[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadProduction();
  }, [selectedDate, selectedSector]);

  const loadProduction = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('production')
        .select('*')
        .eq('date', selectedDate)
        .eq('sector', selectedSector)
        .order('product', { ascending: true });

      if (error) throw error;
      setProduction(data || []);
    } catch (error) {
      console.error('Error loading production:', error);
      showMessage('error', 'Error al cargar la producción');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const updateProduced = (id: string, value: number) => {
    setProduction(production.map(p => p.id === id ? { ...p, produced: value } : p));
  };

  const saveProduction = async () => {
    setSaving(true);
    try {
      const updates = production.map(p => ({
        id: p.id,
        produced: p.produced,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('production')
          .update({ produced: update.produced })
          .eq('id', update.id);

        if (error) throw error;
      }

      showMessage('success', 'Producción guardada exitosamente');
      await loadProduction();
    } catch (error) {
      console.error('Error saving production:', error);
      showMessage('error', 'Error al guardar la producción');
    } finally {
      setSaving(false);
    }
  };

  const saveShift = async (shiftType: 'Mañana' | 'Tarde') => {
    setSaving(true);
    try {
      const shiftData = production.map(p => {
        const difference = calculateDifference(p.produced, p.planned);
        const status = calculateStatus(difference);
        return {
          date: selectedDate,
          shift_type: shiftType,
          sector: p.sector,
          product: p.product,
          planned: p.planned,
          produced: p.produced,
          difference,
          status,
        };
      });

      const { error } = await supabase
        .from('shifts')
        .insert(shiftData);

      if (error) throw error;

      showMessage('success', `Turno ${shiftType} guardado exitosamente`);
    } catch (error) {
      console.error('Error saving shift:', error);
      showMessage('error', 'Error al guardar el turno');
    } finally {
      setSaving(false);
    }
  };

  const startDay = async () => {
    setSaving(true);
    try {
      const { data: existingProduction } = await supabase
        .from('production')
        .select('id')
        .eq('date', selectedDate)
        .limit(1)
        .maybeSingle();

      if (existingProduction) {
        showMessage('error', 'El día ya fue iniciado');
        setSaving(false);
        return;
      }

      const { data: allProgramming, error: programmingError } = await supabase
        .from('programming')
        .select('*')
        .eq('date', selectedDate);

      if (programmingError) throw programmingError;

      if (!allProgramming || allProgramming.length === 0) {
        showMessage('error', 'No hay programación para iniciar el día');
        setSaving(false);
        return;
      }

      const grouped = new Map<string, { sector: string; product: string; planned: number }>();
      for (const row of allProgramming) {
        const key = `${row.sector}||${row.product}`;
        const previous = grouped.get(key);
        if (previous) {
          previous.planned += row.planned_kg;
        } else {
          grouped.set(key, {
            sector: row.sector,
            product: row.product,
            planned: row.planned_kg,
          });
        }
      }

      const productionData = Array.from(grouped.values()).map((row) => ({
        date: selectedDate,
        sector: row.sector,
        product: row.product,
        planned: row.planned,
        produced: 0,
      }));

      const { error } = await supabase
        .from('production')
        .insert(productionData);

      if (error) throw error;

      showMessage('success', 'Día iniciado exitosamente');
      await loadProduction();
    } catch (error) {
      console.error('Error starting day:', error);
      showMessage('error', 'Error al iniciar el día');
    } finally {
      setSaving(false);
    }
  };

  const closeDay = async () => {
    setSaving(true);
    try {
      const { data: existingHistory } = await supabase
        .from('history')
        .select('id')
        .eq('date', selectedDate)
        .limit(1)
        .maybeSingle();

      if (existingHistory) {
        showMessage('error', 'El día ya fue cerrado');
        setSaving(false);
        return;
      }

      const { data: productionData, error: fetchError } = await supabase
        .from('production')
        .select('*')
        .eq('date', selectedDate);

      if (fetchError) throw fetchError;

      if (!productionData || productionData.length === 0) {
        showMessage('error', 'No hay producción para cerrar');
        setSaving(false);
        return;
      }

      const historyData = productionData.map((p) => ({
        date: p.date,
        sector: p.sector,
        product: p.product,
        planned: p.planned,
        produced: p.produced,
        difference: p.produced - p.planned,
        status: p.produced - p.planned > 0 ? 'Adelanto' : p.produced - p.planned === 0 ? 'OK' : 'Atraso',
        shift_type: 'Completo',
      }));

      const { error: insertError } = await supabase
        .from('history')
        .insert(historyData);

      if (insertError) throw insertError;

      showMessage('success', 'Día cerrado exitosamente');
    } catch (error) {
      console.error('Error closing day:', error);
      showMessage('error', 'Error al cerrar el día');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const totalPlanned = production.reduce((sum, p) => sum + p.planned, 0);
  const totalProduced = production.reduce((sum, p) => sum + p.produced, 0);
  const totalDifference = totalProduced - totalPlanned;
  const overallStatus = calculateStatus(totalDifference);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Producción Operativa</h1>
          <p className="text-gray-600 mt-1">Registra la producción en tiempo real</p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-gray-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {SECTORS.map(sector => (
          <button
            key={sector}
            onClick={() => setSelectedSector(sector)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              selectedSector === sector
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {sector}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-600 mb-1">Plan del Sector</p>
          <p className="text-2xl font-bold text-gray-900">{totalPlanned.toFixed(0)} kg</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-600 mb-1">Producido</p>
          <p className="text-2xl font-bold text-gray-900">{totalProduced.toFixed(0)} kg</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-600 mb-1">Diferencia</p>
          <p className={`text-2xl font-bold ${
            totalDifference > 0 ? 'text-green-600' : totalDifference < 0 ? 'text-red-600' : 'text-gray-900'
          }`}>
            {totalDifference >= 0 ? '+' : ''}{totalDifference.toFixed(0)} kg
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-600 mb-1">Estado</p>
          <p className={`text-2xl font-bold ${
            overallStatus === 'Adelanto' ? 'text-amber-600' : overallStatus === 'Atraso' ? 'text-red-600' : 'text-green-600'
          }`}>
            {overallStatus}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={startDay}
          disabled={saving}
          className="flex items-center space-x-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition font-medium disabled:opacity-50"
        >
          <PlayCircle className="w-5 h-5" />
          <span>Iniciar Día</span>
        </button>
        <button
          onClick={closeDay}
          disabled={saving}
          className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition font-medium disabled:opacity-50"
        >
          <StopCircle className="w-5 h-5" />
          <span>Cerrar Día</span>
        </button>
        <button
          onClick={saveProduction}
          disabled={saving || production.length === 0}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          <span>Guardar Producción</span>
        </button>
        <button
          onClick={() => saveShift('Mañana')}
          disabled={saving || production.length === 0}
          className="flex items-center space-x-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition font-medium disabled:opacity-50"
        >
          <Sun className="w-5 h-5" />
          <span>Guardar Turno Mañana</span>
        </button>
        <button
          onClick={() => saveShift('Tarde')}
          disabled={saving || production.length === 0}
          className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition font-medium disabled:opacity-50"
        >
          <Sunset className="w-5 h-5" />
          <span>Guardar Turno Tarde</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Producto</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Planificado (kg)</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Producido (kg)</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Diferencia</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {production.map((row) => {
                const difference = calculateDifference(row.produced, row.planned);
                const status = calculateStatus(difference);
                const statusColor = getStatusColor(status);

                return (
                  <tr key={row.id} className={`hover:bg-gray-50 ${statusColor}`}>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900 text-lg">{row.product}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-lg font-medium text-gray-900">{row.planned.toFixed(1)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="number"
                        value={row.produced}
                        onChange={(e) => updateProduced(row.id, parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.1"
                        className="w-full px-4 py-3 text-lg font-medium text-right border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className={`text-lg font-bold ${
                        difference > 0 ? 'text-green-600' : difference < 0 ? 'text-red-600' : 'text-gray-900'
                      }`}>
                        {difference >= 0 ? '+' : ''}{difference.toFixed(1)}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex px-4 py-2 rounded-full text-sm font-bold ${
                        status === 'Adelanto' ? 'bg-amber-500 text-white' :
                        status === 'Atraso' ? 'bg-red-500 text-white' :
                        'bg-green-500 text-white'
                      }`}>
                        {status}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {production.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No hay datos de producción para este sector. Inicia el día desde Producción.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
