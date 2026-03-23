export const SECTORS = [
  'Mesa de Carnes',
  'Cocina',
  'Picadillo',
  'Armado',
  'Salsas',
] as const;

export type Sector = typeof SECTORS[number];

export const PRODUCTS = [
  'AGUJA',
  'TAPA DE ASADO',
  'BOLA LOMO',
  'ROAST BEEF',
  'VACIO',
  'MATAMBRE',
  'PALETA DE CERDO',
  'BONDIOLA DE CERDO',
  'NALGA',
  'PECHO DE CERDO',
  'POLLO',
  'CUADRADA',
] as const;

export const SECTOR_PRODUCTS = {
  'Mesa de Carnes': [
    'AGUJA',
    'TAPA DE ASADO',
    'BOLA LOMO',
    'ROAST BEEF',
    'VACIO',
    'MATAMBRE',
    'PALETA DE CERDO',
    'BONDIOLA DE CERDO',
    'NALGA',
    'PECHO DE CERDO',
    'POLLO',
    'CUADRADA',
  ],
  'Cocina': [
    'CP',
    'EB',
    'AC',
    'BB',
    'MPP',
    'CY',
    'CC',
    'CA',
    'CS',
    'PO',
    'PA',
    'PC',
    'JQ',
    'VP',
    'MT',
    'QC',
    'CH',
    'V',
    'JH',
    '4Q',
    'CZ',
    'CZ COCIDA',
    'QC S/P',
    'MPP S/P',
    'CEBOLLA CC',
    'FONDEO',
    'SOFRITO',
  ],
  'Picadillo': [
    'CP',
    'EB',
    'AC',
    'BB',
    'MPP',
    'CY',
    'CC',
    'CA',
    'CS',
    'PO',
    'PA',
    'PC',
    'JQ',
    'VP',
    'MT',
    'QC',
    'CH',
    'V',
    'JH',
    '4Q',
    'CZ',
    'MUZZA 330GR',
    'MUZZA 2.5KG',
    'HEBRAS',
    'HUEVO',
    'MUZZARELLA PICADA ARMADO',
    'PANCETA FETEADA',
    'CHEDDAR PICADO',
    'BOLLOS PA',
    'JAMON FETEADO',
    'JAMON CUBETEADO',
    'PROVOLETA PICADA',
    'SARDO PICADO',
    'CHEDDAR AC',
    'CHEDDAR EB',
    'CHEDDAR TONADITA',
    'PESADO CH',
    'CHERRY',
    'CIRUELA',
    'PESADO 4Q',
    'PESADO RJ',
    'BOLLOS JQ',
  ],
  Armado: [
    'CP',
    'EB',
    'AC',
    'BB',
    'MPP',
    'CYR',
    'CC',
    'CA',
    'CS',
    'PO',
    'PA',
    'PC',
    'JQ',
    'VP',
    'MT',
    'QC',
    'RJ',
    'CH',
    'V',
    'JH',
    '4Q',
    'CZ',
  ],
  Salsas: [
    'SALSA AJO',
    'SALSA CHEDDAR',
    'SALSA BARBACOA',
    'CHIMICHURRI ENV',
    'CHIMICHURRI PIC',
    'CREMA ACIDA',
    'SALSA KETCHUP',
    'SALSA BIG BURGER',
    'SALSA BURGER',
    'SALSA CRIOLLA',
    'SALSA MATAMBRE',
    'SALSA PIZZA',
    'VP',
    'MT',
    'QC',
    'CH',
    'V',
    'JH',
    '4Q',
    'CZ',
    'CZ COCIDA',
    'QC S/P',
    'MPP S/P',
    'CEBOLLA CC',
    'FONDEO',
    'SOFRITO',
  ],
} as const satisfies Record<Sector, readonly string[]>;

export const SHIFT_TYPES = ['Mañana', 'Tarde'] as const;
export type ShiftType = typeof SHIFT_TYPES[number];

export const STATUS_TYPES = ['Adelanto', 'OK', 'Atraso'] as const;
export type Status = typeof STATUS_TYPES[number];

export interface Programming {
  id: string;
  date: string;
  sector: Sector;
  product: string;
  shift_type?: ShiftType;
  planned_kg: number;
  created_at: string;
}

export interface Production {
  id: string;
  date: string;
  sector: Sector;
  product: string;
  planned: number;
  produced: number;
  created_at: string;
  updated_at: string;
}

export interface History {
  id: string;
  date: string;
  sector: Sector;
  product: string;
  planned: number;
  produced: number;
  difference: number;
  status: Status;
  shift_type: string;
  created_at: string;
}

export interface Shift {
  id: string;
  date: string;
  shift_type: ShiftType;
  sector: Sector;
  product: string;
  planned: number;
  produced: number;
  difference: number;
  status: Status;
  timestamp: string;
}

export function calculateDifference(produced: number, planned: number): number {
  return produced - planned;
}

export function calculateStatus(difference: number): Status {
  if (difference > 0) return 'Adelanto';
  if (difference === 0) return 'OK';
  return 'Atraso';
}

export function getStatusColor(status: Status): string {
  switch (status) {
    case 'Adelanto':
      return 'bg-amber-100 text-amber-800 border-amber-300';
    case 'OK':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'Atraso':
      return 'bg-red-100 text-red-800 border-red-300';
  }
}

export function getStatusBadgeColor(status: Status): string {
  switch (status) {
    case 'Adelanto':
      return 'bg-amber-500';
    case 'OK':
      return 'bg-green-500';
    case 'Atraso':
      return 'bg-red-500';
  }
}
