import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en tu archivo .env',
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const TABLES = {
  productos: import.meta.env.VITE_SUPABASE_TABLE_PRODUCTOS || 'productos',
  compras: import.meta.env.VITE_SUPABASE_TABLE_COMPRAS || 'compras',
  detallesCompra:
    import.meta.env.VITE_SUPABASE_TABLE_DETALLES || 'detalles_compra',
}
