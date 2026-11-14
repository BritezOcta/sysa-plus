import { STORAGE_VALUES } from '../constants'

/**
 * Helper para persistir únicamente preferencias de interfaz de usuario en localStorage
 * (por ejemplo, recordar si el usuario ocultó la guía de uso).
 * Los datos de negocio se mantienen en memoria para garantizar reproducibilidad.
 */
export class StorageHelper {
  static getBooleanFlag(key: string, defaultValue = false): boolean {
    try {
      const value = localStorage.getItem(key)
      if (value === null) return defaultValue
      return value === STORAGE_VALUES.FLAG_TRUE
    } catch {
      return defaultValue
    }
  }

  static hasVisitedFlag(key: string): boolean {
    try {
      return localStorage.getItem(key) === STORAGE_VALUES.FLAG_TRUE
    } catch {
      return true
    }
  }

  static markVisitedFlag(key: string): void {
    try {
      localStorage.setItem(key, STORAGE_VALUES.FLAG_TRUE)
    } catch {
      // Ignora restricciones de almacenamiento en navegación privada
    }
  }
}
