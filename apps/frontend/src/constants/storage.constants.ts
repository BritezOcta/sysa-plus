/**
 * Claves de localStorage reservadas exclusivamente para preferencias de interfaz de usuario.
 * Los datos de dominio (carreras, materias, correlatividades y auditoría) viven en memoria
 * para garantizar un entorno reproducible en cada sesión hasta conectar la base de datos.
 */
export const UI_STORAGE_KEYS = {
  CORRELATIVITY_GUIDE_VISITED: 'sysaplus_correlativity_guide_visited_v1',
} as const

export const STORAGE_VALUES = {
  FLAG_TRUE: '1',
} as const
