/** Error devuelto por la API con un código de negocio estable. */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly data: Record<string, unknown>

  constructor(status: number, code: string, message: string, data: Record<string, unknown>) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.data = data
  }
}

/** El servidor no respondió (caído, sin red, proxy sin backend). */
export class NetworkError extends Error {
  constructor() {
    super('No se pudo conectar con el servidor')
    this.name = 'NetworkError'
  }
}

const API_BASE = '/api'

export async function apiRequest<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: options.method ?? 'GET',
      credentials: 'same-origin',
      headers: options.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    })
  } catch {
    throw new NetworkError()
  }

  let data: Record<string, unknown> = {}
  try {
    data = await response.json()
  } catch {
    // Sin JSON: el proxy de Vite responde 5xx en texto plano cuando el backend está caído.
    if (!response.ok) throw new NetworkError()
  }

  if (!response.ok) {
    if (response.status >= 500 && typeof data.code !== 'string') throw new NetworkError()
    throw new ApiError(
      response.status,
      typeof data.code === 'string' ? data.code : 'UNKNOWN_ERROR',
      typeof data.message === 'string' ? data.message : 'Ocurrió un error inesperado',
      data,
    )
  }

  return data as T
}
