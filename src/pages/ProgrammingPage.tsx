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
            shift_type: shiftType as ShiftType,
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
        .filter(p => p.planned_kg > 0)
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
      <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white transition-colors duration-300 tracking-tight">Programación Diaria</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 transition-colors duration-300">Gestiona el plan de producción global</p>
          
          {/* ACCIONES DE CABECERA - VERTICALES */}
          <div className="flex flex-col gap-3 mt-6 w-full sm:w-64">
             <button
                onClick={copyFromPreviousDay}
                disabled={loading}
                className="flex items-center justify-center space-x-2 px-6 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all font-bold text-xs uppercase tracking-widest shadow-lg shadow-purple-600/20 w-full"
              >
                <Copy className="w-4 h-4" />
                <span>Copiar Día Anterior</span>
              </button>
              
              <button
                onClick={saveProgramming}
                disabled={saving || programming.length === 0}
                className="flex items-center justify-center space-x-2 px-8 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all font-bold shadow-lg shadow-green-600/30 text-xs uppercase tracking-widest w-full"
              >
                <Save className="w-5 h-5 flex-shrink-0" />
                <span>Guardar Programación</span>
              </button>
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full lg:w-auto mt-1">
          <div className="flex items-center gap-2 flex-1 lg:flex-initial">
             <button
                onClick={() => loadProgramming()}
                title="Refrescar datos"
                className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-all text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/5 shadow-sm"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>

            <div 
              className="relative flex-1 lg:flex-initial min-w-[130px] px-4 py-2 bg-white dark:bg-[#1a1c23] border border-gray-300 dark:border-white/10 rounded-lg text-gray-900 dark:text-white flex items-center justify-between gap-2 text-sm sm:text-base transition-all cursor-pointer hover:border-blue-500 dark:hover:border-blue-500/50 group shadow-sm font-bold"
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
      </div>

      {message && (
        <div className={`p-4 rounded-xl shadow-sm border animate-in slide-in-from-top-2 duration-300 ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20' : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20'
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

      <div className="space-y-8 pb-12">
        {(selectedSector === 'Picadillo' ? ['BATEAS', 'MATERIA PRIMA PROCESADA'] : [
          selectedSector === 'Mesa de Carnes' ? 'COCCIONES' : 
          selectedSector === 'Salsas' ? 'UNIDADES' : 
          selectedSector === 'Armado' ? 'BANDEJAS' : 
          'COCCIONES'
        ]).map((sectionTitle) => {
          const isPicadilloMP = sectionTitle === 'MATERIA PRIMA PROCESADA';
          const picadilloMPList = ['HUEVO', 'MUZZARELLA PICADA ARMADO', 'PANCETA FETEADA', 'CHEDDAR PICADO', 'BOLLOS PA', 'JAMON FETEADO', 'JAMON CUBETEADO', 'PROVOLETA PICADA', 'SARDO PICADO', 'CHEDDAR AC', 'CHEDDAR EB', 'CHEDDAR TONADITA', 'PESADO CH', 'CHERRY', 'CIRUELA', 'PESADO 4Q', 'PESADO RJ', 'BOLLOS JQ'];
          
          let filteredRows = visibleProgramming;
          if (selectedSector === 'Picadillo') {
            filteredRows = isPicadilloMP 
              ? visibleProgramming.filter(p => picadilloMPList.includes(p.product))
              : visibleProgramming.filter(p => !picadilloMPList.includes(p.product));
          }

          if (filteredRows.length === 0) return null;

          return (
            <div key={sectionTitle} className="bg-white dark:bg-[#1a1c23] rounded-2xl shadow-xl border border-gray-200 dark:border-white/5 overflow-hidden transition-all duration-300">
              <h3 className="px-8 py-5 text-xs font-black bg-gray-50 dark:bg-black/20 text-gray-400 border-b dark:border-white/10 text-center uppercase tracking-[0.3em]">
                {sectionTitle}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-black/10 border-b border-gray-200 dark:border-white/10">
                    <tr>
                      <th className="px-8 py-4 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">Producto</th>
                      <th className="px-8 py-4 text-center text-[11px] font-black text-gray-400 uppercase tracking-widest w-40">Turno</th>
                      <th className="px-8 py-4 text-right text-[11px] font-black text-gray-400 uppercase tracking-widest w-48">Planificado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                    {filteredRows.map((row) => (
                      <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                        <td className="px-8 py-4">
                          <span className="font-bold text-gray-900 dark:text-white group-hover:text-blue-500 transition-colors uppercase tracking-tight">{row.product}</span>
                        </td>
                        <td className="px-8 py-4 text-center">
                          <span className="inline-flex px-3 py-1 rounded-full text-[10px] font-black bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/10 uppercase tracking-widest">
                            {row.shift_type ?? 'Mañana'}
                          </span>
                        </td>
                        <td className="px-8 py-4">
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
                            className="w-full px-4 py-2 text-lg font-black text-right bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-inner"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
        {visibleProgramming.length === 0 && (
          <div className="bg-white dark:bg-[#1a1c23] rounded-2xl shadow-xl border border-gray-200 dark:border-white/5 p-16 text-center">
            <p className="text-gray-500 dark:text-gray-400 font-bold italic tracking-wide uppercase text-sm">
              No hay programación disponible para este criterio.
            </p>
          </div>
        )}
      </div>

      {/* FOOTER BRAND */}
      <footer className="pt-8 pb-4 text-center border-t border-gray-100 dark:border-white/5 animate-in fade-in slide-in-from-bottom-2 duration-700">
        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.3em]">
          © Desarrollado por el <span className="text-blue-500">Departamento de Sistemas</span> de Mi Gusto | Todos los derechos reservados.
        </p>
      </footer>
    </div>
  );
}
