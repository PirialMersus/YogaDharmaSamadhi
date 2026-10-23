import { useState, useMemo, useEffect, useRef } from 'react'
import { POSE_CYCLE, type PoseName } from '../geometry/poses'
import { getLocalizedPoseLabel, getLocalizedPoseDescription } from '../data/localizedPoseDescriptions'
import { useLanguage } from '../i18n/LanguageContext'

interface ControlsProps {
  currentPose: PoseName
  isAutoPlaying: boolean
  onPoseSelect: (pose: PoseName) => void
  onPreviousPose: () => void
  onNextPose: () => void
  onToggleAutoPlay: () => void
}

type PoseCategoryKey = 'all' | 'standing' | 'backbends' | 'balances' | 'seated' | 'inverted'

interface CategoryItem {
  key: PoseCategoryKey
  poses: PoseName[]
}

const CATEGORY_LIST: CategoryItem[] = [
  {
    key: 'all',
    poses: POSE_CYCLE,
  },
  {
    key: 'standing',
    poses: [
      'tadasana',
      'vriksasana',
      'garudasana',
      'utkatasana',
      'trikonasana',
      'parivrtta_trikonasana',
      'parsvakonasana',
      'virabhadrasana_i',
      'virabhadrasana_ii',
      'virabhadrasana_iii',
      'ardha_chandrasana',
      'natarajasana',
      'prasarita_padottanasana',
      'parsvottanasana',
      'padangusthasana',
      'uttanasana',
    ],
  },
  {
    key: 'backbends',
    poses: [
      'malasana',
      'pasasana',
      'adho_mukha_svanasana',
      'vasisthasana',
      'purvottanasana',
      'marjaryasana',
      'bitilasana',
      'bujangasana',
      'salabhasana',
      'bhekasana',
      'dhanurasana',
      'urdhva_dhanurasana',
      'kapotasana',
      'setu_bandhasana',
      'virasana',
      'supta_virasana',
      'parighasana',
    ],
  },
  {
    key: 'balances',
    poses: [
      'navasana',
      'bakasana',
      'bhujapidasana',
      'kukkutasana',
      'lolasana',
      'mayurasana',
      'astavakrasana',
      'tittibhasana',
      'pincha_mayurasana',
      'adho_mukha_vrksasana',
    ],
  },
  {
    key: 'seated',
    poses: [
      'dandasana',
      'gomukhasana',
      'sukhasana',
      'vajrasana',
      'bharadvajasana',
      'marichyasana',
      'janu_sirsasana',
      'krounchasana',
      'paschimottanasana',
      'upavistha_konasana',
      'baddha_konasana',
      'kurmasana',
      'lotus',
      'garbha_pindasana',
      'matsyasana',
    ],
  },
  {
    key: 'inverted',
    poses: [
      'supta_padangusthasana',
      'anantasana',
      'supta_baddha_konasana',
      'viparita_karani',
      'sirsasana',
      'sarvangasana',
      'halasana',
      'karnapidasana',
      'savasana',
    ],
  },
]

export function Controls({
  currentPose,
  isAutoPlaying,
  onPoseSelect,
  onPreviousPose,
  onNextPose,
  onToggleAutoPlay,
}: ControlsProps) {
  const { language, translations } = useLanguage()
  const [isCatalogOpen, setIsCatalogOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState<PoseCategoryKey>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement | null>(null)

  const currentIndex = useMemo(() => POSE_CYCLE.indexOf(currentPose) + 1, [currentPose])
  const totalPoses = POSE_CYCLE.length

  const categories = useMemo(() => {
    return CATEGORY_LIST.map((category) => {
      const title = translations.categories[category.key]
      return {
        key: category.key,
        title: `${title} (${category.poses.length})`,
        poses: category.poses,
      }
    })
  }, [translations])

  const filteredPoses = useMemo(() => {
    const foundCategory = CATEGORY_LIST.find((cat) => cat.key === activeCategory)
    const baseList = foundCategory ? foundCategory.poses : POSE_CYCLE

    if (!searchQuery.trim()) {
      return baseList
    }

    const normalizedQuery = searchQuery.trim().toLowerCase()
    return baseList.filter((poseName) => {
      const localizedLabel = getLocalizedPoseLabel(poseName, language).toLowerCase()
      const description = getLocalizedPoseDescription(poseName, language)
      const localizedSubtitle = description.subtitle.toLowerCase()
      return (
        localizedLabel.includes(normalizedQuery) ||
        localizedSubtitle.includes(normalizedQuery) ||
        poseName.toLowerCase().includes(normalizedQuery)
      )
    })
  }, [activeCategory, searchQuery, language])

  useEffect(() => {
    if (isCatalogOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isCatalogOpen])

  const handleSelectAndClose = (poseName: PoseName) => {
    onPoseSelect(poseName)
    setIsCatalogOpen(false)
  }

  const handleTimelineClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const boundingBox = event.currentTarget.getBoundingClientRect()
    const clickRatio = Math.max(0, Math.min(1, (event.clientX - boundingBox.left) / boundingBox.width))
    const targetIndex = Math.min(totalPoses - 1, Math.floor(clickRatio * totalPoses))
    onPoseSelect(POSE_CYCLE[targetIndex])
  }

  const currentPoseLocalizedLabel = useMemo(
    () => getLocalizedPoseLabel(currentPose, language),
    [currentPose, language]
  )

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: '1.4rem',
          pointerEvents: 'none',
          zIndex: 10,
        }}
      >
        <svg
          viewBox="0 0 48 48"
          width="26"
          height="26"
          style={{
            marginBottom: '0.45rem',
            filter: 'drop-shadow(0 0 8px rgba(64, 196, 255, 0.65))',
          }}
        >
          <defs>
            <linearGradient id="headerLotusGradient" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#40c4ff" />
              <stop offset="50%" stopColor="#7c4dff" />
              <stop offset="100%" stopColor="#e040fb" />
            </linearGradient>
          </defs>
          <g fill="none" stroke="url(#headerLotusGradient)" strokeWidth="1.8" strokeLinecap="round">
            <path d="M24 10 C21 18 21 28 24 34 C27 28 27 18 24 10 Z" fill="rgba(64, 196, 255, 0.25)" />
            <path d="M24 34 C17 31 11 23 14 15 C18 19 21 27 24 34 Z" fill="rgba(124, 77, 255, 0.2)" />
            <path d="M24 34 C31 31 37 23 34 15 C30 19 27 27 24 34 Z" fill="rgba(224, 64, 251, 0.2)" />
            <path d="M24 34 C15 35 8 30 7 24 C12 25 18 30 24 34 Z" fill="rgba(64, 196, 255, 0.1)" />
            <path d="M24 34 C33 35 40 30 41 24 C36 25 30 30 24 34 Z" fill="rgba(224, 64, 251, 0.1)" />
          </g>
        </svg>
        <h1
          style={{
            color: 'rgba(215, 235, 255, 0.95)',
            fontSize: 'clamp(1.05rem, 2.7vw, 1.65rem)',
            fontWeight: 400,
            letterSpacing: '0.22em',
            fontFamily: 'Georgia, serif',
            textShadow: '0 0 35px rgba(80, 140, 255, 0.6), 0 0 70px rgba(50, 100, 255, 0.3)',
            margin: 0,
            textAlign: 'center',
          }}
        >
          {translations.headerBrand}
        </h1>
        <p
          style={{
            color: 'rgba(140, 175, 230, 0.55)',
            fontSize: 'clamp(0.55rem, 1.6vw, 0.7rem)',
            letterSpacing: '0.22em',
            marginTop: '0.25rem',
            fontFamily: 'Georgia, serif',
            fontStyle: 'italic',
          }}
        >
          {translations.headerTagline}
        </p>
      </div>

      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingBottom: '1.2rem',
          zIndex: 15,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            pointerEvents: 'auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.55rem',
            background: 'rgba(5, 12, 30, 0.85)',
            backdropFilter: 'blur(24px)',
            borderRadius: '1.4rem',
            padding: '0.65rem 0.85rem',
            border: '1px solid rgba(80, 140, 255, 0.32)',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.65)',
            width: '420px',
            maxWidth: '94vw',
            boxSizing: 'border-box',
          }}
        >
          <div
            onClick={handleTimelineClick}
            style={{
              width: '100%',
              height: '5px',
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '3px',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
            }}
            title={translations.practiceTimelineTooltip}
          >
            <div
              style={{
                height: '100%',
                width: `${(currentIndex / totalPoses) * 100}%`,
                background: 'linear-gradient(90deg, #40c4ff, #e040fb)',
                borderRadius: '3px',
                transition: 'width 0.25s ease',
              }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.4rem',
              width: '100%',
            }}
          >
            <button
              onClick={onPreviousPose}
              style={{
                width: '40px',
                minWidth: '40px',
                height: '40px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(100, 160, 255, 0.35)',
                cursor: 'pointer',
                borderRadius: '50%',
                color: 'rgba(200, 230, 255, 0.95)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                transition: 'all 0.2s',
                flexShrink: 0,
              }}
              aria-label={translations.previousPoseAria}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>

            <button
              onClick={() => setIsCatalogOpen(true)}
              style={{
                flex: 1,
                minWidth: 0,
                height: '40px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(100, 180, 255, 0.4)',
                cursor: 'pointer',
                borderRadius: '1.2rem',
                color: 'rgba(235, 245, 255, 1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 0.85rem',
                gap: '0.4rem',
                fontFamily: 'Georgia, serif',
                transition: 'all 0.2s',
                overflow: 'hidden',
              }}
              aria-label={translations.catalogButtonAria}
            >
              <span
                style={{
                  color: 'rgba(120, 180, 255, 0.85)',
                  fontSize: '0.74rem',
                  letterSpacing: '0.04em',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {currentIndex}/{totalPoses}
              </span>
              <span
                style={{
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  letterSpacing: '0.03em',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  textShadow: '0 0 12px rgba(90, 180, 255, 0.5)',
                  textAlign: 'center',
                  flex: 1,
                  padding: '0 0.3rem',
                }}
              >
                {currentPoseLocalizedLabel}
              </span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(120, 180, 255, 0.85)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', flexShrink: 0 }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            <button
              onClick={onNextPose}
              style={{
                width: '40px',
                minWidth: '40px',
                height: '40px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(100, 160, 255, 0.35)',
                cursor: 'pointer',
                borderRadius: '50%',
                color: 'rgba(200, 230, 255, 0.95)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                transition: 'all 0.2s',
                flexShrink: 0,
              }}
              aria-label={translations.nextPoseAria}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>

            <button
              onClick={onToggleAutoPlay}
              style={{
                width: '40px',
                minWidth: '40px',
                height: '40px',
                background: isAutoPlaying
                  ? 'rgba(60, 120, 255, 0.38)'
                  : 'rgba(255, 255, 255, 0.08)',
                border: isAutoPlaying
                  ? '1px solid rgba(110, 190, 255, 0.65)'
                  : '1px solid rgba(100, 160, 255, 0.35)',
                cursor: 'pointer',
                borderRadius: '50%',
                color: isAutoPlaying
                  ? 'rgba(225, 245, 255, 1)'
                  : 'rgba(180, 210, 250, 0.85)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                transition: 'all 0.25s',
                flexShrink: 0,
              }}
              aria-label={isAutoPlaying ? translations.pauseAria : translations.playAria}
              title={isAutoPlaying ? translations.pauseAria : translations.playAria}
            >
              {isAutoPlaying ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style={{ display: 'block' }}>
                  <rect x="6" y="4" width="4" height="16" rx="1.2" />
                  <rect x="14" y="4" width="4" height="16" rx="1.2" />
                </svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style={{ display: 'block', transform: 'translateX(1px)' }}>
                  <polygon points="7,4 20,12 7,20" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {isCatalogOpen && (
        <div
          onClick={() => setIsCatalogOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(1, 3, 10, 0.72)',
            backdropFilter: 'blur(16px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.2rem',
            boxSizing: 'border-box',
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '680px',
              maxHeight: '82vh',
              background: 'rgba(6, 14, 34, 0.95)',
              border: '1px solid rgba(90, 160, 255, 0.4)',
              borderRadius: '1.6rem',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1.0rem 1.25rem 0.6rem',
                borderBottom: '1px solid rgba(80, 130, 240, 0.2)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem' }}>
                <span
                  style={{
                    color: 'rgba(230, 245, 255, 1)',
                    fontSize: '1.1rem',
                    fontWeight: 500,
                    fontFamily: 'Georgia, serif',
                    letterSpacing: '0.04em',
                  }}
                >
                  {translations.catalogTitle}
                </span>
                <span
                  style={{
                    color: 'rgba(120, 170, 240, 0.7)',
                    fontSize: '0.78rem',
                    fontFamily: 'Georgia, serif',
                  }}
                >
                  {translations.posesCountLabel(totalPoses)}
                </span>
              </div>

              <button
                onClick={() => setIsCatalogOpen(false)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(100, 160, 255, 0.3)',
                  color: 'rgba(200, 225, 255, 0.9)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.9rem',
                }}
                aria-label={translations.closeCatalogAria}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                padding: '0.75rem 1.25rem 0.4rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.6rem',
              }}
            >
              <input
                ref={searchInputRef}
                type="text"
                placeholder={translations.searchPlaceholder}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.85rem',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(90, 160, 255, 0.35)',
                  borderRadius: '0.9rem',
                  color: 'rgba(235, 245, 255, 1)',
                  fontSize: '0.82rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'Georgia, serif',
                }}
              />

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'nowrap',
                  overflowX: 'auto',
                  scrollbarWidth: 'none',
                  gap: '0.35rem',
                  paddingBottom: '0.2rem',
                }}
              >
                {categories.map((category) => {
                  const isActive = activeCategory === category.key
                  return (
                    <button
                      key={category.key}
                      onClick={() => setActiveCategory(category.key)}
                      style={{
                        background: isActive
                          ? 'rgba(60, 120, 255, 0.42)'
                          : 'rgba(255, 255, 255, 0.05)',
                        border: isActive
                          ? '1px solid rgba(120, 195, 255, 0.65)'
                          : '1px solid transparent',
                        cursor: 'pointer',
                        padding: '0.3rem 0.7rem',
                        borderRadius: '0.85rem',
                        color: isActive
                          ? 'rgba(235, 245, 255, 1)'
                          : 'rgba(140, 175, 230, 0.75)',
                        fontSize: '0.72rem',
                        fontFamily: 'Georgia, serif',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.2s',
                        flexShrink: 0,
                      }}
                    >
                      {category.title}
                    </button>
                  )
                })}
              </div>
            </div>

            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '0.6rem 1.25rem 1.25rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
                gap: '0.45rem',
                scrollbarWidth: 'thin',
              }}
            >
              {filteredPoses.map((poseName) => {
                const isSelected = currentPose === poseName
                const poseNumber = POSE_CYCLE.indexOf(poseName) + 1
                return (
                  <button
                    key={poseName}
                    onClick={() => handleSelectAndClose(poseName)}
                    style={{
                      background: isSelected
                        ? 'rgba(60, 120, 255, 0.38)'
                        : 'rgba(255, 255, 255, 0.04)',
                      border: isSelected
                        ? '1px solid rgba(120, 195, 255, 0.75)'
                        : '1px solid rgba(80, 130, 220, 0.18)',
                      cursor: 'pointer',
                      borderRadius: '0.85rem',
                      padding: '0.55rem 0.75rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: '0.15rem',
                      textAlign: 'left',
                      transition: 'all 0.15s',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.65rem',
                        color: isSelected
                          ? 'rgba(140, 210, 255, 1)'
                          : 'rgba(120, 160, 220, 0.65)',
                        fontFamily: 'Georgia, serif',
                      }}
                    >
                      {translations.poseNumberPrefix}{poseNumber}
                    </span>
                    <span
                      style={{
                        fontSize: '0.78rem',
                        fontWeight: isSelected ? 600 : 400,
                        color: isSelected
                          ? 'rgba(240, 250, 255, 1)'
                          : 'rgba(200, 225, 255, 0.85)',
                        fontFamily: 'Georgia, serif',
                        letterSpacing: '0.02em',
                      }}
                    >
                      {getLocalizedPoseLabel(poseName, language)}
                    </span>
                  </button>
                )
              })}

              {filteredPoses.length === 0 && (
                <div
                  style={{
                    gridColumn: '1 / -1',
                    textAlign: 'center',
                    padding: '2rem 1rem',
                    color: 'rgba(140, 175, 220, 0.6)',
                    fontFamily: 'Georgia, serif',
                    fontSize: '0.85rem',
                  }}
                >
                  {translations.noResultsFound(searchQuery)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
