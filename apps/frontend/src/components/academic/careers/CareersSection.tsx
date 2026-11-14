import styles from '../../../pages/AcademicManagementPage.module.css'
import type { Career, Correlativity, Subject } from '../../../types'
import CareerCard from './CareerCard'

interface CareersSectionProps {
  careers: Career[]
  activeCareerId: string | undefined
  subjects: Subject[]
  correlativities: Correlativity[]
  onSelectCareer: (careerId: string) => void
  onCreateCareer: () => void
  onEditCareer: (career: Career) => void
  onToggleCareerStatus: (career: Career) => void
  onDeleteCareer: (career: Career) => void
}

export default function CareersSection({
  careers,
  activeCareerId,
  subjects,
  correlativities,
  onSelectCareer,
  onCreateCareer,
  onEditCareer,
  onToggleCareerStatus,
  onDeleteCareer,
}: CareersSectionProps) {
  return (
    <section
      className={styles.careersSection}
      aria-labelledby="careers-section-heading"
    >
      <div className={styles.sectionHeader}>
        <div>
          <h1 id="careers-section-heading">Carreras y planes de estudio</h1>
          <p className={styles.sectionSubtitle}>
            Oferta académica de la UTN Facultad Regional General Pacheco
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.newCareerBtn}
            onClick={onCreateCareer}
          >
            + Alta de carrera
          </button>
        </div>
      </div>

      <div className={styles.careerCardsDock}>
        {careers.map((career) => {
          const subjectsCount = subjects.filter(
            (s) => s.careerId === career.id,
          ).length
          const correlativitiesCount = correlativities.filter(
            (c) => c.careerId === career.id,
          ).length

          return (
            <CareerCard
              key={career.id}
              career={career}
              isSelected={career.id === activeCareerId}
              subjectsCount={subjectsCount}
              correlativitiesCount={correlativitiesCount}
              onSelect={onSelectCareer}
              onEdit={onEditCareer}
              onToggleStatus={onToggleCareerStatus}
              onDelete={onDeleteCareer}
            />
          )
        })}
      </div>
    </section>
  )
}
