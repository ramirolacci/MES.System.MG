import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Production, SECTORS, Sector, SHIFT_TYPES, ShiftType, calculateDifference, calculateStatus } from '../types';
import { Calendar, PlayCircle, Save, StopCircle } from 'lucide-react';

export function ProductionPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSector, setSelectedSector] = useState<Sector>(SECTORS[0]);
  const [selectedShift, setSelectedShift] = useState<ShiftType>(SHIFT_TYPES[0]);
  const [production, setProduction] = useState<Production[]>([]);
  const [programmingPlan, setProgrammingPlan] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProduction();
    loadProgrammingPlan();
  }, [selectedDate, selectedSector, selectedShift]);

  const loadProduction = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase
        .from('production') as any)
        .select('*')
        .eq('date', selectedDate);

      if (error) throw error;
      setProduction(data || []);
    } catch (error) {
      console.error('Error loading production:', error);
      showMessage('error', 'Error al cargar la producción');
    } finally {
      setLoading(false);
    }
  };

  const loadProgrammingPlan = async () => {
    try {
      let query = supabase
        .from('programming')
        .select('*')
        .eq('date', selectedDate)
        .eq('shift_type', selectedShift);

      const { data, error } = await (query as any);
      if (error) throw error;

      const plan: Record<string, number> = {};
      (data as any[]).forEach(row => {
        plan[row.product] = (plan[row.product] || 0) + row.planned_kg;
      });
      setProgrammingPlan(plan);
    } catch (error) {
      console.error('Error loading programming plan:', error);
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
        const { error: productionError } = await (supabase
          .from('production') as any)
          .update({ produced: update.produced })
          .eq('id', update.id);

        if (productionError) throw productionError;
      }

      // Always save snapshot to history based on current selectedShift
      await saveShiftToHistory(selectedShift);

      showMessage('success', 'Producción guardada exitosamente');
      await loadProduction();
    } catch (error) {
      console.error('Error saving production:', error);
      showMessage('error', 'Error al guardar la producción');
    } finally {
      setSaving(false);
    }
  };



  const startDay = async () => {
    setSaving(true);
    try {
      const { data: existingProduction } = await (supabase
        .from('production') as any)
        .select('id')
        .eq('date', selectedDate)
        .limit(1)
        .maybeSingle();

      if (existingProduction) {
        showMessage('error', 'El día ya fue iniciado');
        setSaving(false);
        return;
      }

      const { data: allProgramming, error: programmingError } = await (supabase
        .from('programming') as any)
        .select('*')
        .eq('date', selectedDate) as { data: any[] | null; error: any };

      if (programmingError) throw programmingError;

      if (!allProgramming || (allProgramming as any[]).length === 0) {
        showMessage('error', 'No hay programación para iniciar el día');
        setSaving(false);
        return;
      }

      const grouped = new Map<string, { sector: string; product: string; planned: number }>();
      for (const row of (allProgramming as any[])) {
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

      const { error } = await (supabase
        .from('production') as any)
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
      const { data: existingHistory } = await (supabase
        .from('history') as any)
        .select('id')
        .eq('date', selectedDate)
        .limit(1)
        .maybeSingle();

      if (existingHistory) {
        showMessage('error', 'El día ya fue cerrado');
        setSaving(false);
        return;
      }

      const { data: productionData, error: fetchError } = await (supabase
        .from('production') as any)
        .select('*')
        .eq('date', selectedDate) as { data: any[] | null; error: any };

      if (fetchError) throw fetchError;

      if (!productionData || (productionData as any[]).length === 0) {
        showMessage('error', 'No hay producción para cerrar');
        setSaving(false);
        return;
      }

      const historyData = (productionData as any[]).map((p) => ({
        date: p.date,
        sector: p.sector,
        product: p.product,
        planned: p.planned,
        produced: p.produced,
        difference: p.produced - p.planned,
        status: p.produced - p.planned > 0 ? 'Adelanto' : p.produced - p.planned === 0 ? 'OK' : 'Atraso',
        shift_type: 'Completo',
      }));

      const { error: insertError } = await (supabase
        .from('history') as any)
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
  const saveShiftToHistory = async (shiftLabel: ShiftType) => {
    setSaving(true);
    try {
      // Get current programming for ONLY this shift to have the correct plan
      const { data: shiftProgramming, error: progError } = await (supabase
        .from('programming') as any)
        .select('*')
        .eq('date', selectedDate)
        .eq('sector', selectedSector)
        .eq('shift_type', shiftLabel);

      if (progError) throw progError;

      const shiftPlan: Record<string, number> = {};
      (shiftProgramming as any[]).forEach(row => {
        shiftPlan[row.product] = (shiftPlan[row.product] || 0) + row.planned_kg;
      });

      const historyData = production
        .filter(p => shiftPlan[p.product] > 0)
        .map((p) => {
          const planned = shiftPlan[p.product] || 0;
          const produced = p.produced;
          const difference = produced - planned;
          const status = calculateStatus(difference);
          
          return {
            date: selectedDate,
            sector: p.sector,
            product: p.product,
            planned,
            produced,
            difference,
            status,
            shift_type: shiftLabel,
          };
        });

      if (historyData.length === 0) {
        showMessage('error', `No hay programación para el ${shiftLabel}`);
        return;
      }

      const { error: insertError } = await (supabase
        .from('history') as any)
        .insert(historyData);

      if (insertError) throw insertError;
      showMessage('success', `${shiftLabel} guardado satisfactoriamente en el historial`);
    } catch (error) {
      console.error('Error saving shift to history:', error);
      showMessage('error', 'Error al guardar el turno');
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white transition-colors duration-300">Producción Operativa</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 transition-colors duration-300">Registra la producción en tiempo real</p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div 
              className="relative w-full sm:w-auto min-w-[130px] px-4 py-2 bg-white dark:bg-[#1a1c23] border border-gray-300 dark:border-white/10 rounded-lg text-gray-900 dark:text-white flex items-center justify-between gap-2 text-sm sm:text-base transition-all cursor-pointer hover:border-blue-500 dark:hover:border-blue-500/50 group"
              onClick={() => dateInputRef.current?.showPicker()}
            >
              <input
                ref={dateInputRef}
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="absolute inset-0 opacity-0 w-0 h-0 pointer-events-none"
              />
              <span>{selectedDate.split('-').reverse().join('/')}</span>
              <Calendar className="w-4 h-4 text-gray-400 group-hover:text-blue-500 shrink-0 transition-colors" />
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

      <div className="flex flex-col items-center gap-6">
        <div className="flex flex-wrap gap-2 justify-center">
          {SHIFT_TYPES.map((shift) => (
            <button
              key={shift}
              onClick={() => setSelectedShift(shift)}
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

        <div className="flex flex-wrap gap-2 justify-center">
          {SECTORS.map((sector) => (
            <button
              key={sector}
              onClick={() => setSelectedSector(sector)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                selectedSector === sector
                  ? 'bg-blue-600 dark:bg-blue-600 text-white shadow-md'
                  : 'bg-white dark:bg-[#1a1c23] text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'
              }`}
            >
              {sector}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#1a1c23] rounded-xl shadow-sm border border-gray-200 dark:border-white/5 p-4 transition-all duration-300">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Plan del Sector</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalPlanned.toFixed(0)} kg</p>
        </div>
        <div className="bg-white dark:bg-[#1a1c23] rounded-xl shadow-sm border border-gray-200 dark:border-white/5 p-4 transition-all duration-300">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Producido</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalProduced.toFixed(0)} kg</p>
        </div>
        <div className="bg-white dark:bg-[#1a1c23] rounded-xl shadow-sm border border-gray-200 dark:border-white/5 p-4 transition-all duration-300">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Diferencia</p>
          <p className={`text-2xl font-bold ${
            totalDifference > 0 ? 'text-green-600 dark:text-green-400' : totalDifference < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'
          }`}>
            {totalDifference >= 0 ? '+' : ''}{totalDifference.toFixed(0)} kg
          </p>
        </div>
        <div className="bg-white dark:bg-[#1a1c23] rounded-xl shadow-sm border border-gray-200 dark:border-white/5 p-4 transition-all duration-300">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Estado</p>
          <p className={`text-2xl font-bold ${
            overallStatus === 'Adelanto' ? 'text-amber-600 dark:text-amber-400' : overallStatus === 'Atraso' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
          }`}>
            {overallStatus}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 justify-center">
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
      </div>

      <div className="bg-white dark:bg-[#1a1c23] rounded-2xl shadow-sm border border-gray-200 dark:border-white/5 overflow-hidden transition-all duration-300">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-black/20 border-b border-gray-200 dark:border-white/5">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Producto</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Planificado (kg)</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Producido (kg)</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Diferencia</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-white/5">
              {production
                .filter(p => p.sector === selectedSector)
                .map((row) => {
                const plannedForView = programmingPlan[row.product] || 0;
                const difference = calculateDifference(row.produced, plannedForView);
                const status = calculateStatus(difference);

                return (
                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors border-b border-gray-200 dark:border-white/5 last:border-0">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900 dark:text-white">{row.product}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-lg font-medium text-gray-900 dark:text-white">{plannedForView.toFixed(1)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="number"
                        value={row.produced}
                        onChange={(e) => updateProduced(row.id, parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.1"
                        className="w-full px-4 py-2 text-base font-bold text-right bg-white dark:bg-black/20 border border-gray-300 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className={`text-base font-black ${
                        difference > 0 ? 'text-green-600 dark:text-green-400' : difference < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'
                      }`}>
                        {difference >= 0 ? '+' : ''}{difference.toFixed(1)}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${
                        status === 'Adelanto' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30' :
                        status === 'Atraso' ? 'bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-400 border border-red-200 dark:border-red-500/30' :
                        'bg-green-100 dark:bg-green-500/20 text-green-800 dark:text-green-400 border border-green-200 dark:border-green-500/30'
                      }`}>
                        {status}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {production.filter(p => p.sector === selectedSector).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400 font-medium italic">
                    No hay datos de producción para el sector {selectedSector} en este turno.
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
