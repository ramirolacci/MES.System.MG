import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Production, SECTORS, Sector, SHIFT_TYPES, ShiftType, SECTOR_PRODUCTS, calculateDifference, calculateStatus } from '../types';
import { Calendar, PlayCircle, Save, StopCircle, AlertTriangle, Target, Activity, TrendingUp, Package } from 'lucide-react';

const SECTOR_UNITS: Record<string, string> = {
  'Mesa de Carnes': 'KG',
  'Cocina': 'Cocciones',
  'Picadillo': 'Bateas',
  'Armado': 'Bandejas',
  'Salsas': 'Unidades',
};

export function ProductionPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSector, setSelectedSector] = useState<Sector>(SECTORS[0]);
  const [selectedShift, setSelectedShift] = useState<ShiftType>(SHIFT_TYPES[0]);
  const [production, setProduction] = useState<Production[]>([]);
  const [programmingPlan, setProgrammingPlan] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [dayStatus, setDayStatus] = useState<'pending' | 'started' | 'closed'>('pending');
  const [confirmModal, setConfirmModal] = useState<{ show: boolean; title: string; message: string; action: () => void } | null>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProduction();
    loadProgrammingPlan();
  }, [selectedDate, selectedSector, selectedShift]);

  const loadProduction = async () => {
    setLoading(true);
    try {
      // Verificar si hay historial para este turno específico
      const { data: histExists } = await supabase
        .from('history')
        .select('id')
        .eq('date', selectedDate)
        .eq('shift_type', selectedShift)
        .limit(1);

      // Verificar si ya se inició la producción para este turno
      const { data: prodExists } = await supabase
        .from('production')
        .select('id')
        .eq('date', selectedDate)
        .eq('shift_type', selectedShift)
        .limit(1);

      if (histExists && histExists.length > 0) {
        setDayStatus('closed');
      } else if (prodExists && prodExists.length > 0) {
        setDayStatus('started');
      } else {
        setDayStatus('pending');
      }

      // Cargar los datos de producción del turno actual
      const { data, error } = await (supabase
        .from('production') as any)
        .select('*')
        .eq('date', selectedDate)
        .eq('shift_type', selectedShift);

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
        .eq('sector', selectedSector)
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
      // Guardar cambios en la tabla production
      for (const p of production) {
        await (supabase
          .from('production') as any)
          .update({ produced: p.produced })
          .eq('id', p.id);
      }
      
      showMessage('success', 'Avance de producción guardado');
      await loadProduction();
    } catch (error) {
      console.error('Error saving production:', error);
      showMessage('error', 'Error al guardar la producción');
    } finally {
      setSaving(false);
    }
  };

  const handleStartDayClick = () => {
    setConfirmModal({
      show: true,
      title: 'INICIAR TURNO',
      message: `¿Deseas iniciar la producción del Turno ${selectedShift} para el día ${selectedDate.split('-').reverse().join('/')}?`,
      action: startDay
    });
  };

  const handleCloseDayClick = () => {
    setConfirmModal({
      show: true,
      title: 'CERRAR TURNO',
      message: `¿Estás seguro de cerrar el Turno ${selectedShift}? Los datos se enviarán al historial y no podrán modificarse.`,
      action: closeDay
    });
  };

  const startDay = async () => {
    setConfirmModal(null);
    setSaving(true);
    try {
      // Obtener programación solo de este turno
      const { data: allProgramming, error: programmingError } = await (supabase
        .from('programming') as any)
        .select('*')
        .eq('date', selectedDate)
        .eq('shift_type', selectedShift) as { data: any[] | null; error: any };

      if (programmingError) throw programmingError;

      if (!allProgramming || (allProgramming as any[]).length === 0) {
        showMessage('error', `No hay programación para el Turno ${selectedShift}`);
        setSaving(false);
        return;
      }

      // Crear inserción para producción dividida por turno
      const productionData = (allProgramming as any[]).map((row) => ({
        date: selectedDate,
        sector: row.sector,
        product: row.product,
        shift_type: selectedShift,
        planned: row.planned_kg,
        produced: 0,
      }));

      const { error } = await (supabase
        .from('production') as any)
        .insert(productionData);

      if (error) throw error;

      showMessage('success', `Turno ${selectedShift} iniciado`);
      await loadProduction();
    } catch (error) {
      console.error('Error starting day:', error);
      showMessage('error', 'Error al iniciar el turno');
    } finally {
      setSaving(false);
    }
  };

  const closeDay = async () => {
    setConfirmModal(null);
    setSaving(true);
    try {
      // Guardar el estado actual del turno en el historial
      const historyData = production.map((p) => {
        const diff = p.produced - p.planned;
        return {
          date: p.date,
          sector: p.sector,
          product: p.product,
          planned: p.planned,
          produced: p.produced,
          difference: diff,
          status: calculateStatus(diff),
          shift_type: selectedShift,
        };
      });

      if (historyData.length === 0) {
        showMessage('error', 'No hay datos para cerrar en este turno');
        setSaving(false);
        return;
      }

      const { error: insertError } = await (supabase
        .from('history') as any)
        .insert(historyData);

      if (insertError) throw insertError;

      showMessage('success', `Turno ${selectedShift} cerrado exitosamente`);
      await loadProduction();
    } catch (error) {
      console.error('Error closing day:', error);
      showMessage('error', 'Error al cerrar el turno');
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
      {/* CONFIRMATION MODAL */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1a1c23] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl max-w-sm w-full p-6 transform animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center gap-3 mb-4 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-black tracking-widest">{confirmModal.title}</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-6 font-medium">
              {confirmModal.message}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 transition font-bold uppercase tracking-wider text-xs"
              >
                No, Cancelar
              </button>
              <button
                onClick={confirmModal.action}
                className={`px-4 py-2 text-white rounded-lg transition font-bold uppercase tracking-wider text-xs ${
                  confirmModal.title.includes('INICIAR') ? 'bg-teal-600 hover:bg-teal-700 shadow-lg shadow-teal-600/20' : 'bg-orange-600 hover:bg-orange-700 shadow-lg shadow-orange-600/20'
                }`}
              >
                Sí, Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white transition-colors duration-300 tracking-tight">Producción Operativa</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 transition-colors duration-300">Control de planta segmentado por turnos</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div 
            className="relative min-w-[130px] px-4 py-2 bg-white dark:bg-[#1a1c23] border border-gray-300 dark:border-white/10 rounded-lg text-gray-900 dark:text-white flex items-center justify-between gap-2 text-sm sm:text-base transition-all cursor-pointer hover:border-blue-500 dark:hover:border-blue-500/50 group shadow-sm font-bold"
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
        <div className={`p-4 rounded-lg shadow-sm border ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* FILTERS SECTION */}
      <div className="flex flex-col items-center gap-6">
        <div className="flex flex-wrap gap-2 justify-center">
          {SHIFT_TYPES.map((shift) => (
            <button
              key={shift}
              onClick={() => setSelectedShift(shift)}
              className={`px-6 py-2 rounded-xl font-bold uppercase tracking-widest text-xs transition-all ${
                selectedShift === shift
                  ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                  : 'bg-white dark:bg-[#1a1c23] text-gray-500 border border-gray-300 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'
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
              className={`px-4 py-2 rounded-lg font-bold uppercase tracking-widest text-[10px] transition-all ${
                selectedSector === sector
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'bg-white dark:bg-[#1a1c23] text-gray-500 border border-gray-300 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'
              }`}
            >
              {sector}
            </button>
          ))}
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Plan Turno', value: `${totalPlanned.toFixed(0)} ${SECTOR_UNITS[selectedSector]}`, color: 'text-gray-900 dark:text-white' },
          { label: 'Producido', value: `${totalProduced.toFixed(0)} ${SECTOR_UNITS[selectedSector].toLowerCase()}`, color: 'text-teal-600 dark:text-teal-400 font-black' },
          { label: 'Diferencia', value: `${totalDifference >= 0 ? '+' : ''}${totalDifference.toFixed(0)} ${SECTOR_UNITS[selectedSector].toLowerCase()}`, color: totalDifference > 0 ? 'text-green-600 dark:text-green-400' : totalDifference < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white' },
          { label: 'Eficiencia', value: overallStatus, color: overallStatus === 'Adelanto' ? 'text-amber-500' : overallStatus === 'Atraso' ? 'text-red-600' : 'text-teal-500' }
        ].map((kpi, i) => (
          <div key={i} className="bg-white dark:bg-[#1a1c23] rounded-2xl shadow-sm border border-gray-200 dark:border-white/5 p-4 transition-all duration-300 flex flex-col justify-center min-h-[100px]">
            <p className="text-[10px] font-black text-gray-400 mb-1 uppercase tracking-widest">{kpi.label}</p>
            <p className={`text-2xl font-black ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* ACTION BUTTONS + SYSTEM STATUS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 items-center gap-4 px-2">
        <div className="flex items-center gap-3 transition-all duration-500">
          <div className={`w-3 h-3 rounded-full flex-shrink-0 transition-all duration-500 ${
            dayStatus === 'started' ? 'bg-teal-400 shadow-[0_0_15px\_rgba(45,212,191,0.8)] animate-pulse' :
            dayStatus === 'closed' ? 'bg-blue-500 shadow-[0_0_10px\_rgba(59,130,246,0.4)]' :
            'bg-gray-600 shadow-[0_0_8px\_rgba(75,85,99,0.2)]'
          }`} />
          <span className={`text-[11px] font-black tracking-[0.2em] transition-colors duration-500 ${
            dayStatus === 'started' ? 'text-teal-400' : 
            dayStatus === 'closed' ? 'text-blue-500' : 
            'text-gray-500'
          }`}>
            {dayStatus === 'started' ? `TURNO ${selectedShift.toUpperCase()} ACTIVO` : 
             dayStatus === 'closed' ? `TURNO ${selectedShift.toUpperCase()} FINALIZADO` : 
             `ESPERANDO TURNO ${selectedShift.toUpperCase()}`}
          </span>
        </div>

        <div className="lg:col-span-1 flex items-center justify-center gap-3">
          <button
            onClick={handleStartDayClick}
            disabled={saving || dayStatus === 'closed' || dayStatus === 'started'}
            className="flex items-center space-x-2 px-6 py-2.5 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition font-bold disabled:opacity-50 whitespace-nowrap shadow-lg shadow-teal-600/20 text-xs uppercase tracking-widest"
          >
            <PlayCircle className="w-5 h-5 flex-shrink-0" />
            <span>Iniciar {selectedShift}</span>
          </button>
          <button
            onClick={saveProduction}
            disabled={saving || production.length === 0 || dayStatus === 'closed'}
            className="flex items-center space-x-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-bold disabled:opacity-50 whitespace-nowrap shadow-lg shadow-blue-600/20 text-xs uppercase tracking-widest"
          >
            <Save className="w-5 h-5 flex-shrink-0" />
            <span>Guardar Avance</span>
          </button>
          <button
            onClick={handleCloseDayClick}
            disabled={saving || dayStatus !== 'started'}
            className="flex items-center space-x-2 px-6 py-2.5 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition font-bold disabled:opacity-50 whitespace-nowrap shadow-lg shadow-orange-600/20 text-xs uppercase tracking-widest"
          >
            <StopCircle className="w-5 h-5 flex-shrink-0" />
            <span>Cerrar Turno</span>
          </button>
        </div>

        <div className="hidden lg:block"></div>
      </div>

      {/* DATA TABLE */}
      <div className="bg-white dark:bg-[#1a1c23] rounded-2xl shadow-xl border border-gray-200 dark:border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-black/20 border-b border-gray-200 dark:border-white/10">
              <tr>
                <th className="px-8 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">Producto</th>
                <th className="px-8 py-5 text-right text-[11px] font-black text-gray-400 uppercase tracking-widest">Plan ({selectedShift})</th>
                <th className="px-8 py-5 text-right text-[11px] font-black text-gray-400 uppercase tracking-widest">Producido ({SECTOR_UNITS[selectedSector]})</th>
                <th className="px-8 py-5 text-right text-[11px] font-black text-gray-400 uppercase tracking-widest">Diferencia</th>
                <th className="px-8 py-5 text-center text-[11px] font-black text-gray-400 uppercase tracking-widest">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {production
                .filter(p => {
                  const sectorProducts = SECTOR_PRODUCTS[selectedSector] as readonly string[];
                  return p.sector === selectedSector && sectorProducts.includes(p.product);
                })
                .map((row) => {
                const plannedForView = programmingPlan[row.product] || 0;
                const difference = calculateDifference(row.produced, plannedForView);
                const status = calculateStatus(difference);

                return (
                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors border-b border-gray-100 dark:border-white/5 last:border-0 group">
                    <td className="px-8 py-5">
                      <p className="font-bold text-gray-900 dark:text-white group-hover:text-blue-500 transition-colors uppercase tracking-tight">{row.product}</p>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <p className="text-sm font-bold text-gray-400 dark:text-gray-500 tracking-tighter">{plannedForView.toFixed(1)} {SECTOR_UNITS[selectedSector].toUpperCase()}</p>
                    </td>
                    <td className="px-8 py-5">
                      <input
                        type="number"
                        value={row.produced}
                        onChange={(e) => updateProduced(row.id, parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.1"
                        disabled={dayStatus === 'closed'}
                        className="w-full px-4 py-2 text-lg font-black text-right bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 shadow-inner"
                      />
                    </td>
                    <td className="px-8 py-5 text-right">
                      <p className={`text-base font-black ${
                        difference > 0 ? 'text-green-600' : difference < 0 ? 'text-red-600' : 'text-gray-400'
                      }`}>
                        {difference >= 0 ? '+' : ''}{difference.toFixed(1)}
                      </p>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <span className={`inline-flex px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest ${
                        status === 'Adelanto' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                        status === 'Atraso' ? 'bg-red-100 text-red-700 border border-red-200' :
                        'bg-teal-100 text-teal-700 border border-teal-200'
                      }`}>
                        {status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {production.filter(p => {
                  const sectorProducts = SECTOR_PRODUCTS[selectedSector] as readonly string[];
                  return p.sector === selectedSector && sectorProducts.includes(p.product);
                }).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-16 text-center text-gray-400 font-bold italic tracking-wide uppercase text-sm">
                    No hay datos de producción para el Turno {selectedShift} en {selectedSector}.
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
