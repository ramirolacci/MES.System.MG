export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      programming: {
        Row: {
          id: string
          date: string
          sector: string
          product: string
          planned_kg: number
          created_at: string
        }
        Insert: {
          id?: string
          date: string
          sector: string
          product: string
          planned_kg: number
          created_at?: string
        }
        Update: {
          id?: string
          date?: string
          sector?: string
          product?: string
          planned_kg?: number
          created_at?: string
        }
      }
      production: {
        Row: {
          id: string
          date: string
          sector: string
          product: string
          planned: number
          produced: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          date: string
          sector: string
          product: string
          planned: number
          produced?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          date?: string
          sector?: string
          product?: string
          planned?: number
          produced?: number
          created_at?: string
          updated_at?: string
        }
      }
      history: {
        Row: {
          id: string
          date: string
          sector: string
          product: string
          planned: number
          produced: number
          difference: number
          status: string
          shift_type: string
          created_at: string
        }
        Insert: {
          id?: string
          date: string
          sector: string
          product: string
          planned: number
          produced: number
          difference: number
          status: string
          shift_type?: string
          created_at?: string
        }
        Update: {
          id?: string
          date?: string
          sector?: string
          product?: string
          planned?: number
          produced?: number
          difference?: number
          status?: string
          shift_type?: string
          created_at?: string
        }
      }
      shifts: {
        Row: {
          id: string
          date: string
          shift_type: string
          sector: string
          product: string
          planned: number
          produced: number
          difference: number
          status: string
          timestamp: string
        }
        Insert: {
          id?: string
          date: string
          shift_type: string
          sector: string
          product: string
          planned: number
          produced: number
          difference: number
          status: string
          timestamp?: string
        }
        Update: {
          id?: string
          date?: string
          shift_type?: string
          sector?: string
          product?: string
          planned?: number
          produced?: number
          difference?: number
          status?: string
          timestamp?: string
        }
      }
    }
  }
}
