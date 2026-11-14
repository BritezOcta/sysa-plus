import { ID_COUNTER_CONFIG, LOCALE_CONFIG } from '../constants'

export class IdAndDateHelper {
  private static counter = ID_COUNTER_CONFIG.INITIAL_SEED

  static createId(prefix: string): string {
    IdAndDateHelper.counter += 1
    return `${prefix}-${IdAndDateHelper.counter}`
  }

  static currentIsoTimestamp(): string {
    return new Date().toISOString()
  }

  static formatAuditTimestamp(isoString: string): string {
    const dateObj = new Date(isoString)
    if (Number.isNaN(dateObj.getTime())) {
      return isoString
    }
    return dateObj.toLocaleString(LOCALE_CONFIG.AR, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }
}
