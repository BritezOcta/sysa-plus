import { ENTITY_STATUS } from '../../constants'
import { AcademicFormatHelper } from '../../helpers'
import type { EntityStatus } from '../../types'

interface StatusPillProps {
  status: EntityStatus
  activeClassName: string
  inactiveClassName: string
}

export default function StatusPill({
  status,
  activeClassName,
  inactiveClassName,
}: StatusPillProps) {
  const className =
    status === ENTITY_STATUS.ACTIVE ? activeClassName : inactiveClassName

  return (
    <span className={className}>
      {AcademicFormatHelper.formatEntityStatus(status)}
    </span>
  )
}
