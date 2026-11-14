import campusImage from '../../assets/images/frgp-campus.webp'
import { INSTITUTION_BRAND } from '../../constants'
import styles from '../../pages/LoginPage.module.css'

export default function LoginBrandPanel() {
  return (
    <section className={styles.imagePanel}>
      <img
        src={campusImage}
        alt={INSTITUTION_BRAND.CAMPUS_IMAGE_ALT}
        className={styles.campusImage}
      />

      <div className={styles.imageOverlay} />

      <div className={styles.brand}>
        <span>{INSTITUTION_BRAND.ACRONYM}</span>
        <h2>{INSTITUTION_BRAND.CAMPUS_NAME}</h2>
        <p>{INSTITUTION_BRAND.SYSTEM_SUBTITLE}</p>
      </div>
    </section>
  )
}
