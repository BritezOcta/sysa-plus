import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { ApiError } from '../api/httpClient'
import { certificatesApi, type CertificateVerification } from '../api/certificates.api'
import utnLogo from '../assets/images/utn-logotipo.svg'
import { INSTITUTION_BRAND } from '../constants'
import styles from './VerifyCertificatePage.module.css'

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'valid'; data: CertificateVerification }
  | { status: 'invalid'; message: string }
  | { status: 'error' }

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', { dateStyle: 'long', timeStyle: 'short', hourCycle: 'h23' })
}

/** RF-11 11.4: verificación pública (sin sesión) de un certificado por su código o QR. */
export default function VerifyCertificatePage() {
  const { code: routeCode } = useParams()
  const navigate = useNavigate()
  const [input, setInput] = useState(routeCode ?? '')
  const [state, setState] = useState<State>(routeCode ? { status: 'loading' } : { status: 'idle' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!routeCode) return
    let cancelled = false
    certificatesApi.verify(routeCode).then(
      (data) => !cancelled && setState({ status: 'valid', data }),
      (err: unknown) => {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 404) setState({ status: 'invalid', message: err.message })
        else setState({ status: 'error' })
      },
    )
    return () => {
      cancelled = true
    }
  }, [routeCode, attempt])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const code = input.trim().toUpperCase()
    if (!code) return
    setState({ status: 'loading' })
    if (code === routeCode) setAttempt((a) => a + 1)
    else navigate(`/verificar/${encodeURIComponent(code)}`)
  }

  return (
    <div className={styles.page}>
      <main className={styles.card}>
        <header className={styles.header}>
          <img src={utnLogo} alt={INSTITUTION_BRAND.LOGO_ALT} className={styles.logo} />
          <div>
            <strong>{INSTITUTION_BRAND.SYSTEM_NAME} · Verificación de certificados</strong>
            <span>Universidad Tecnológica Nacional · Facultad Regional General Pacheco</span>
          </div>
        </header>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label htmlFor="code">Código de validación</label>
          <div className={styles.inputRow}>
            <input
              id="code"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="SYSA-XXXX-XXXX"
              autoComplete="off"
              spellCheck={false}
            />
            <button type="submit">Verificar</button>
          </div>
        </form>

        {state.status === 'loading' && <p className={styles.muted} role="status">Verificando…</p>}

        {state.status === 'invalid' && (
          <div className={`${styles.result} ${styles.invalid}`} role="alert">
            <strong>Certificado no válido</strong>
            <p>{state.message} Revisá que el código esté bien escrito.</p>
          </div>
        )}

        {state.status === 'error' && (
          <div className={`${styles.result} ${styles.invalid}`} role="alert">
            <strong>No se pudo conectar con el servidor</strong>
            <button type="button" className={styles.retry} onClick={() => { setState({ status: 'loading' }); setAttempt((a) => a + 1) }}>
              Reintentar
            </button>
          </div>
        )}

        {state.status === 'valid' && (
          <div className={`${styles.result} ${styles.valid}`} role="status">
            <strong>Certificado auténtico</strong>
            <p>Fue emitido por SysA+ y los datos coinciden con el registro académico al momento de su emisión.</p>
            <dl className={styles.details}>
              <dt>Tipo</dt>
              <dd>{state.data.label}</dd>
              <dt>Código</dt>
              <dd>{state.data.code}</dd>
              <dt>Emitido</dt>
              <dd>{formatDateTime(state.data.issuedAt)} hs</dd>
              <dt>Alumno/a</dt>
              <dd>{state.data.student.fullName} · DNI {state.data.student.dni} · Legajo {state.data.student.legajo}</dd>
              <dt>Carrera</dt>
              <dd>{state.data.career.name} · {state.data.career.studyPlan}</dd>
              {state.data.period && (
                <>
                  <dt>Período</dt>
                  <dd>{state.data.period}{state.data.courses !== null ? ` · ${state.data.courses} asignatura(s) en curso` : ''}</dd>
                </>
              )}
              {state.data.summary && (
                <>
                  <dt>Aprobadas</dt>
                  <dd>
                    {state.data.summary.approved} de {state.data.summary.totalSubjects} ({state.data.summary.progressPercent}% del plan)
                    {state.data.summary.average !== null && ` · Promedio ${state.data.summary.average.toFixed(2)}`}
                  </dd>
                </>
              )}
            </dl>
          </div>
        )}
      </main>
    </div>
  )
}
