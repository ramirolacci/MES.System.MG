import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Programming, SECTOR_PRODUCTS, SECTORS, SHIFT_TYPES, Sector, ShiftType } from '../types';
import { Calendar, Copy, Save } from 'lucide-react';

export function ProgrammingPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSector, setSelectedSector] = useState<Sector>(SECTORS[0]);
  const [selectedShift, setSelectedShift] = useState<ShiftType>(SHIFT_TYPES[0]);
  const [programming, setProgramming] = useState<Programming[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadProgramming();
  }, [selectedDate, selectedSector]);

  const buildDefaultRows = (date: string, sector: Sector) => {
    const products = SECTOR_PRODUCTS[sector];
    const rows: Programming[] = [];

    products.forEach((product) => {
      SHIFT_TYPES.forEach((shiftType) => {
        rows.push({
          id: `temp-${date}-${sector}-${product}-${shiftType}`,
          date,
          sector,
          product,
          shift_type: shiftType,
          planned_kg: 0,
          created_at: new Date().toISOString(),
        });
      });
    });

    return rows;
  };

  const programmingKey = (product: string, shiftType: ShiftType) => `${product}||${shiftType}`;

  const loadProgramming = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('programming')
        .select('*')
        .eq('date', selectedDate)
        .eq('sector', selectedSector)
        .order('product', { ascending: true });

      if (error) throw error;
      if (!data || data.length === 0) {
        setProgramming(buildDefaultRows(selectedDate, selectedSector));
        return;
      }

      const dataByKey = new Map(
        data.map((row) => [programmingKey(row.product, (row.shift_type ?? 'Mañana') as ShiftType), row])
      );

      const rows = buildDefaultRows(selectedDate, selectedSector).map((defaultRow) => {
        const key = programmingKey(defaultRow.product, (defaultRow.shift_type ?? 'Mañana') as ShiftType);
        const existing = dataByKey.get(key);
        return existing ?? defaultRow;
      });

      setProgramming(rows);
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
      const { error: deleteError } = await supabase
        .from('programming')
        .delete()
        .eq('date', selectedDate)
        .eq('sector', selectedSector);

      if (deleteError) throw deleteError;

      const dataToInsert = programming.map(p => ({
        date: selectedDate,
        sector: selectedSector,
        product: p.product,
        shift_type: p.shift_type ?? 'Mañana',
        planned_kg: Number.isFinite(p.planned_kg) ? p.planned_kg : 0,
      }));

      const { error: insertError } = await supabase
        .from('programming')
        .insert(dataToInsert);

      if (insertError) throw insertError;

      showMessage('success', `Programación guardada para ${selectedSector}`);
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
        .eq('date', prevDateStr)
        .eq('sector', selectedSector);

      if (error) throw error;

      if (!data || data.length === 0) {
        showMessage('error', `No hay programación del día anterior en ${selectedSector}`);
        setProgramming(buildDefaultRows(selectedDate, selectedSector));
        setLoading(false);
        return;
      }

      const dataByKey = new Map(
        data.map((row) => [programmingKey(row.product, (row.shift_type ?? 'Mañana') as ShiftType), row])
      );

      const copiedData = buildDefaultRows(selectedDate, selectedSector).map((row) => {
        const key = programmingKey(row.product, (row.shift_type ?? 'Mañana') as ShiftType);
        const existing = dataByKey.get(key);
        if (!existing) return row;

        return {
          ...row,
          planned_kg: existing.planned_kg,
        };
      });

      setProgramming(copiedData);
      showMessage('success', `Copiada programación de ${selectedSector} del día anterior`);
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
    (row) => (row.shift_type ?? 'Mañana') === selectedShift
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Programación Diaria</h1>
          <p className="text-gray-600 mt-1">Gestiona el plan de producción</p>
        </div>
      <div className="flex flex-wrap items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-500" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={saveProgramming}
            disabled={saving || programming.length === 0}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            <span>Guardar Todo</span>
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {SECTORS.map((sector) => (
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

      <div className="flex flex-wrap gap-2">
        {SHIFT_TYPES.map((shift) => (
          <button
            key={shift}
            onClick={() => setSelectedShift(shift)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              selectedShift === shift
                ? 'bg-amber-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Turno {shift}
          </button>
        ))}
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          onClick={copyFromPreviousDay}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium disabled:opacity-50"
        >
          <Copy className="w-5 h-5" />
          <span>Copiar Día Anterior</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Producto</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Turno</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Planificado (kg)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {visibleProgramming.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <span className="font-medium text-gray-900">{row.product}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </td>
                </tr>
              ))}
              {visibleProgramming.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-gray-500">
                    No hay programación cargada para el turno seleccionado
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
