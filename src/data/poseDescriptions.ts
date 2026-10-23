import { LOCALIZED_POSE_DESCRIPTIONS } from './localizedPoseDescriptions'
import type { PoseAnnotationInfo, SupportedLanguage } from './localizedPoseDescriptions'

export type { PoseAnnotationInfo, SupportedLanguage }
export {
  LOCALIZED_POSE_DESCRIPTIONS,
  LOCALIZED_POSE_LABELS,
  getLocalizedPoseDescription,
  getLocalizedPoseLabel,
} from './localizedPoseDescriptions'

export const POSE_DESCRIPTIONS = LOCALIZED_POSE_DESCRIPTIONS.ru
