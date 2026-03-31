import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Programming, SECTOR_PRODUCTS, SECTORS, SHIFT_TYPES, Sector, ShiftType } from '../types';
import { Calendar, Copy, Save, RefreshCw } from 'lucide-react';

export function ProgrammingPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSector, setSelectedSector] = useState<Sector>(SECTORS[0]);
  const [selectedShift, setSelectedShift] = useState<ShiftType>(SHIFT_TYPES[0]);
  const [programming, setProgramming] = useState<Programming[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProgramming();
  }, [selectedDate]);

  const buildAllDefaultRows = (date: string) => {
    const rows: Programming[] = [];
    SECTORS.forEach((sector) => {
      const products = SECTOR_PRODUCTS[sector as Sector];
      products.forEach((product) => {
        SHIFT_TYPES.forEach((shiftType) => {
          rows.push({
            id: `temp-${date}-${sector}-${product}-${shiftType}`,
            date,
            sector: sector as Sector,
            product,
            shift_type: shiftType,
            planned_kg: 0,
            created_at: new Date().toISOString(),
          });
        });
      });
    });
    return rows;
  };

  const programmingKey = (sector: string, product: string, shiftType: ShiftType) => `${sector}||${product}||${shiftType}`;

  const loadProgramming = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase
        .from('programming') as any)
        .select('*')
        .eq('date', selectedDate)
        .order('product', { ascending: true }) as { data: any[] | null; error: any };

      if (error) throw error;
      
      const defaultRows = buildAllDefaultRows(selectedDate);
      
      if (!data || data.length === 0) {
        setProgramming(defaultRows);
        return;
      }

      const dataByKey = new Map(
        (data as any[]).map((row) => [programmingKey(row.sector, row.product, (row.shift_type ?? 'Mañana') as ShiftType), row])
      );

      const rows = defaultRows.map((defaultRow) => {
        const key = programmingKey(defaultRow.sector, defaultRow.product, (defaultRow.shift_type ?? 'Mañana') as ShiftType);
        const existing = dataByKey.get(key);
        return existing ?? defaultRow;
      });

      setProgramming(rows as Programming[]);
    } catch (error) {
      console.error('Error loading programming:', error);
      showMessage('error', 'Error al cargar la programación');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const updateRow = (id: string, field: keyof Programming, value: string | number) => {
    setProgramming(programming.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const saveProgramming = async () => {
    setSaving(true);
    try {
      const { error: deleteError } = await (supabase
        .from('programming') as any)
        .delete()
        .eq('date', selectedDate);

      if (deleteError) throw deleteError;

      const dataToInsert = programming
        .filter(p => p.planned_kg > 0) // Only save rows with actual values to save space, but optional
        .map(p => ({
          date: selectedDate,
          sector: p.sector,
          product: p.product,
          shift_type: p.shift_type ?? 'Mañana',
          planned_kg: Number.isFinite(p.planned_kg) ? p.planned_kg : 0,
        }));

      if (dataToInsert.length > 0) {
        const { error: insertError } = await (supabase
          .from('programming') as any)
          .insert(dataToInsert);

        if (insertError) throw insertError;
      }

      showMessage('success', `Programación guardada correctamente`);
      await loadProgramming();
    } catch (error) {
      console.error('Error saving programming:', error);
      showMessage('error', 'Error al guardar la programación');
    } finally {
      setSaving(false);
    }
  };

  const copyFromPreviousDay = async () => {
    const previousDate = new Date(selectedDate);
    previousDate.setDate(previousDate.getDate() - 1);
    const prevDateStr = previousDate.toISOString().split('T')[0];

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('programming')
        .select('*')
        .eq('date', prevDateStr);

      if (error) throw error;

      if (!data || data.length === 0) {
        showMessage('error', `No hay programación del día anterior`);
        setProgramming(buildAllDefaultRows(selectedDate));
        setLoading(false);
        return;
      }

      const dataByKey = new Map(
        (data as any[]).map((row) => [programmingKey(row.sector, row.product, (row.shift_type ?? 'Mañana') as ShiftType), row])
      );

      const copiedData = buildAllDefaultRows(selectedDate).map((row) => {
        const key = programmingKey(row.sector, row.product, (row.shift_type ?? 'Mañana') as ShiftType);
        const existing = dataByKey.get(key);
        if (!existing) return row;

        return {
          ...row,
          planned_kg: (existing as any).planned_kg,
        };
      });

      setProgramming(copiedData);
      showMessage('success', `Copiada programación del día anterior`);
    } catch (error) {
      console.error('Error copying from previous day:', error);
      showMessage('error', 'Error al copiar del día anterior');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const visibleProgramming = programming.filter(
    (row) => 
      row.sector === selectedSector && 
      (row.shift_type ?? 'Mañana') === selectedShift
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white transition-colors duration-300">Programación Diaria</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 transition-colors duration-300">Gestiona el plan de producción</p>
          <button
            onClick={copyFromPreviousDay}
            disabled={loading}
            className="mt-3 flex items-center space-x-2 px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium disabled:opacity-50 text-sm"
          >
            <Copy className="w-4 h-4" />
            <span>Copiar Día Anterior</span>
          </button>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-2 flex-1 sm:flex-initial min-w-0">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => loadProgramming()}
                title="Refrescar datos"
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors text-gray-500 dark:text-gray-400"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
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
          <button
            onClick={saveProgramming}
            disabled={saving || programming.length === 0}
            className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50 shrink-0 text-sm sm:text-base"
          >
            <Save className="w-5 h-5" />
            <span>Guardar Todo</span>
          </button>
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

      {selectedSector === 'Picadillo' ? (
        <>
          <div className="bg-white dark:bg-[#1a1c23] rounded-2xl shadow-sm border border-gray-200 dark:border-white/5 overflow-hidden transition-all duration-300 mb-8">
            <h3 className="px-6 py-4 text-base font-bold bg-gray-50 dark:bg-black/20 text-gray-900 dark:text-gray-100 border-b dark:border-white/5 text-center">
              BATEAS
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-black/20 border-b border-gray-200 dark:border-white/5">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Producto</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Turno</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Planificado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                  {visibleProgramming
                    .filter(p => !['HUEVO', 'MUZZARELLA PICADA ARMADO', 'PANCETA FETEADA', 'CHEDDAR PICADO', 'BOLLOS PA', 'JAMON FETEADO', 'JAMON CUBETEADO', 'PROVOLETA PICADA', 'SARDO PICADO', 'CHEDDAR AC', 'CHEDDAR EB', 'CHEDDAR TONADITA', 'PESADO CH', 'CHERRY', 'CIRUELA', 'PESADO 4Q', 'PESADO RJ', 'BOLLOS JQ'].includes(p.product))
                    .map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-medium text-gray-900 dark:text-white">{row.product}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10">
                          {row.shift_type ?? 'Mañana'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="number"
                          value={Number.isFinite(row.planned_kg) ? row.planned_kg : ''}
                          onChange={(e) => updateRow(
                            row.id,
                            'planned_kg',
                            e.target.value === '' ? Number.NaN : parseFloat(e.target.value)
                          )}
                          min="0"
                          step="0.1"
                          className="w-full px-3 py-2 bg-white dark:bg-black/20 border border-gray-300 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white dark:bg-[#1a1c23] rounded-2xl shadow-sm border border-gray-200 dark:border-white/5 overflow-hidden transition-all duration-300">
            <h3 className="px-6 py-4 text-base font-bold bg-gray-50 dark:bg-black/20 text-gray-900 dark:text-gray-100 border-b dark:border-white/5 text-center">
              MATERIA PRIMA PROCESADA
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-black/20 border-b border-gray-200 dark:border-white/5">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Producto</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Turno</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Planificado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                  {visibleProgramming
                    .filter(p => ['HUEVO', 'MUZZARELLA PICADA ARMADO', 'PANCETA FETEADA', 'CHEDDAR PICADO', 'BOLLOS PA', 'JAMON FETEADA', 'JAMON CUBETEADO', 'PROVOLETA PICADA', 'SARDO PICADO', 'CHEDDAR AC', 'CHEDDAR EB', 'CHEDDAR TONADITA', 'PESADO CH', 'CHERRY', 'CIRUELA', 'PESADO 4Q', 'PESADO RJ', 'BOLLOS JQ'].includes(p.product))
                    .map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-medium text-gray-900 dark:text-white">{row.product}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10">
                          {row.shift_type ?? 'Mañana'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="number"
                          value={Number.isFinite(row.planned_kg) ? row.planned_kg : ''}
                          onChange={(e) => updateRow(
                            row.id,
                            'planned_kg',
                            e.target.value === '' ? Number.NaN : parseFloat(e.target.value)
                          )}
                          min="0"
                          step="0.1"
                          className="w-full px-3 py-2 bg-white dark:bg-black/20 border border-gray-300 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white dark:bg-[#1a1c23] rounded-2xl shadow-sm border border-gray-200 dark:border-white/5 overflow-hidden transition-all duration-300">
          {['Mesa de Carnes', 'Cocina', 'Armado', 'Salsas'].includes(selectedSector) && (
            <h3 className="px-6 py-4 text-base font-bold bg-gray-50 dark:bg-black/20 text-gray-900 dark:text-gray-100 border-b dark:border-white/5 text-center">
              {selectedSector === 'Mesa de Carnes' ? 'COCCIONES' : 
               selectedSector === 'Salsas' ? 'UNIDADES' : 
               selectedSector === 'Armado' ? 'BANDEJAS' : 
               'COCCIONES'}
            </h3>
          )}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-black/20 border-b border-gray-200 dark:border-white/5">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Producto</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Turno</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
                    {selectedSector === 'Mesa de Carnes' ? 'Planificado (KG)' : ['Cocina', 'Armado', 'Salsas'].includes(selectedSector) ? 'Planificado' : 'Planificado (kg)'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                {visibleProgramming.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-medium text-gray-900 dark:text-white">{row.product}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10">
                        {row.shift_type ?? 'Mañana'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="number"
                        value={Number.isFinite(row.planned_kg) ? row.planned_kg : ''}
                        onChange={(e) => updateRow(
                          row.id,
                          'planned_kg',
                          e.target.value === '' ? Number.NaN : parseFloat(e.target.value)
                        )}
                        min="0"
                        step="0.1"
                        className="w-full px-3 py-2 bg-white dark:bg-black/20 border border-gray-300 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                    </td>
                  </tr>
                ))}
                {visibleProgramming.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400 font-medium italic">
                      No hay programación cargada para el turno seleccionado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
