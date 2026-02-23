import { createClient } from '@supabase/supabase-js'

// Remplace les textes entre guillemets par tes vraies infos
const supabaseUrl = 'https://mkufkdtreeqcycnjtcxe.supabase.co'
const supabaseAnonKey = 'sb_publishable_JOLl20jTfgDDSOjhyP53pA_qXXYz-N7'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
