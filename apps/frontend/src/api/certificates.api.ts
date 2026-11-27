import { ApiError, NetworkError, apiRequest } from './httpClient'

export type CertificateType = 'ALUMNO_REGULAR' | 'ANALITICO_PARCIAL' | 'ANALITICO_COMPLETO'

export interface CertificateTypeOption {
  type: CertificateType
  label: string
  description: string
  available: boolean
  /** Motivo por el que no se puede generar (RF-11 11.5). */
  reason: string | null
}

export interface CertificatePeriodOption {
  id: string
  label: string
  isCurrent: boolean
}

export interface IssuedCertificate {
  code: string
  type: CertificateType
  label: string
  period: string | null
  issuedAt: string
}

export interface CertificateOptions {
  types: CertificateTypeOption[]
  periods: CertificatePeriodOption[]
  defaultPeriodId: string
  history: IssuedCertificate[]
}

export interface IssueResult {
  code: string
  type: CertificateType
  label: string
  issuedAt: string
  verificationUrl: string
}

export interface CertificateVerification {
  valid: true
  code: string
  type: CertificateType
  label: string
  issuedAt: string
  student: { fullName: string; dni: string; legajo: string }
  career: { name: string; studyPlan: string }
  period: string | null
  summary: { approved: number; totalSubjects: number; average: number | null; progressPercent: number } | null
  courses: number | null
}

/** RF-11: certificados del alumno y verificación pública. */
export const certificatesApi = {
  getOptions(): Promise<CertificateOptions> {
    return apiRequest<CertificateOptions>('/certificates')
  },

  async issue(type: CertificateType, periodId?: string): Promise<IssueResult> {
    const res = await apiRequest<{ certificate: IssueResult }>('/certificates', {
      method: 'POST',
      body: { type, ...(periodId ? { periodId } : {}) },
    })
    return res.certificate
  },

  /** Descarga el PDF (binario): no pasa por apiRequest, que espera JSON. */
  async downloadPdf(code: string): Promise<{ blob: Blob; fileName: string }> {
    let response: Response
    try {
      response = await fetch(`/api/certificates/${encodeURIComponent(code)}/pdf`, { credentials: 'same-origin' })
    } catch {
      throw new NetworkError()
    }
    if (!response.ok) {
      let data: Record<string, unknown>
      try {
        data = await response.json()
      } catch {
        // Sin JSON: el proxy de Vite responde 5xx en texto plano cuando el backend está caído.
        throw new NetworkError()
      }
      throw new ApiError(
        response.status,
        typeof data.code === 'string' ? data.code : 'UNKNOWN_ERROR',
        typeof data.message === 'string' ? data.message : 'No se pudo descargar el certificado',
        data,
      )
    }
    const disposition = response.headers.get('content-disposition') ?? ''
    const fileName = /filename="([^"]+)"/.exec(disposition)?.[1] ?? `certificado-${code}.pdf`
    return { blob: await response.blob(), fileName }
  },

  verify(code: string): Promise<CertificateVerification> {
    return apiRequest<CertificateVerification>(`/certificates/verify/${encodeURIComponent(code)}`)
  },
}

/** Dispara la descarga del archivo en el navegador. */
export function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
