export type Language = 'ru' | 'uk' | 'en'

export interface CategoryTranslations {
  all: string
  standing: string
  backbends: string
  balances: string
  seated: string
  inverted: string
}

export interface UiTranslations {
  appTitle: string
  headerBrand: string
  headerTagline: string
  practiceTimelineTooltip: string
  previousPoseAria: string
  nextPoseAria: string
  catalogButtonAria: string
  catalogTitle: string
  posesCountLabel: (count: number) => string
  closeCatalogAria: string
  searchPlaceholder: string
  noResultsFound: (query: string) => string
  playAria: string
  pauseAria: string
  categories: CategoryTranslations
  annotationBadge: string
  physicalBenefitHeader: string
  mentalBenefitHeader: string
  poseNumberPrefix: string
  expandDetails: string
  collapseDetails: string
}
