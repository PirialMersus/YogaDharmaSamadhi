import { useMemo, useState, useEffect } from 'react'
import { getLocalizedPoseDescription, type PoseAnnotationInfo } from '../data/localizedPoseDescriptions'
import { POSE_CYCLE, type PoseName } from '../geometry/poses'
import { useLanguage } from '../i18n/LanguageContext'

interface PoseAnnotationPanelProps {
  currentPose: PoseName
  isTransitioning: boolean
  isSceneReady?: boolean
}

interface AnimatedChar {
  id: string
  char: string
  delayMs: number
}

interface AnimatedWord {
  id: string
  chars: AnimatedChar[]
  hasTrailingSpace: boolean
}

function buildWordList(
  text: string,
  startDelayMs: number,
  delayPerCharMs: number
): {
  words: AnimatedWord[]
  endDelayMs: number
} {
  const words: AnimatedWord[] = []
  let currentDelay = startDelayMs
  let globalCharIndex = 0

  const tokens = text.match(/\S+|\s+/g) || []
  let pendingPrefixWord: AnimatedWord | null = null

  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index]
    if (/^\s+$/.test(token)) {
      continue
    }

    const nextToken = tokens[index + 1]
    const hasSpaceAfter = nextToken ? /^\s+$/.test(nextToken) : false

    const chars: AnimatedChar[] = []
    for (const char of token) {
      chars.push({
        id: `char-${globalCharIndex++}-${char}`,
        char,
        delayMs: currentDelay,
      })
      currentDelay += delayPerCharMs
    }

    const isShortPreposition =
      token.length <= 2 && /^[а-яёєіїґА-ЯЁЄІЇҐa-zA-Z]+$/.test(token)

    if (isShortPreposition && hasSpaceAfter) {
      chars.push({
        id: `char-${globalCharIndex++}-nbsp`,
        char: '\u00A0',
        delayMs: currentDelay,
      })
      currentDelay += delayPerCharMs * 0.35
      pendingPrefixWord = {
        id: `word-${words.length}-${token}`,
        chars,
        hasTrailingSpace: false,
      }
      continue
    }

    if (pendingPrefixWord) {
      words.push({
        id: `${pendingPrefixWord.id}-${token}`,
        chars: [...pendingPrefixWord.chars, ...chars],
        hasTrailingSpace: hasSpaceAfter,
      })
      pendingPrefixWord = null
    } else {
      words.push({
        id: `word-${words.length}-${token}`,
        chars,
        hasTrailingSpace: hasSpaceAfter,
      })
    }

    if (hasSpaceAfter) {
      currentDelay += delayPerCharMs * 0.35
    }
  }

  if (pendingPrefixWord) {
    words.push(pendingPrefixWord)
  }

  return { words, endDelayMs: currentDelay }
}

export function PoseAnnotationPanel({
  currentPose,
  isTransitioning,
  isSceneReady = true,
}: PoseAnnotationPanelProps) {
  const { language, translations } = useLanguage()
  const [activePose, setActivePose] = useState<PoseName>(currentPose)
  const [isVisible, setIsVisible] = useState(false)
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768)
  const [isExpandedMobile, setIsExpandedMobile] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (isTransitioning || !isSceneReady) {
      setIsVisible(false)
      setIsExpandedMobile(false)
    } else {
      setActivePose(currentPose)
      setIsVisible(true)
    }
  }, [isTransitioning, currentPose, isSceneReady])

  const activeDescription: PoseAnnotationInfo = useMemo(
    () => getLocalizedPoseDescription(activePose, language),
    [activePose, language]
  )

  const poseIndexNumber = useMemo(
    () => POSE_CYCLE.indexOf(activePose) + 1,
    [activePose]
  )

  const titleText = `${translations.poseNumberPrefix}${poseIndexNumber} • ${activeDescription.title.toUpperCase()}`

  const animatedContent = useMemo(() => {
    if (isMobile) {
      return null
    }

    const parallelStartDelayMs = 260

    const titleResult = buildWordList(titleText, parallelStartDelayMs, 22)
    const subtitleResult = buildWordList(
      activeDescription.subtitle,
      parallelStartDelayMs + 90,
      16
    )

    const physicalHeaderResult = buildWordList(
      translations.physicalBenefitHeader,
      parallelStartDelayMs,
      18
    )
    const physicalBodyResult = buildWordList(
      activeDescription.physicalBenefit,
      parallelStartDelayMs + 90,
      13
    )

    const mentalHeaderResult = buildWordList(
      translations.mentalBenefitHeader,
      parallelStartDelayMs,
      18
    )
    const mentalBodyResult = buildWordList(
      activeDescription.mentalBenefit,
      parallelStartDelayMs + 90,
      13
    )

    return {
      titleWords: titleResult.words,
      subtitleWords: subtitleResult.words,
      physicalHeaderWords: physicalHeaderResult.words,
      physicalBodyWords: physicalBodyResult.words,
      mentalHeaderWords: mentalHeaderResult.words,
      mentalBodyWords: mentalBodyResult.words,
    }
  }, [activeDescription, isMobile, titleText, translations])

  const toggleMobileExpanded = () => {
    setIsExpandedMobile((previousState) => !previousState)
  }

  if (isMobile) {
    return (
      <aside
        key={`mobile-${activePose}-${language}`}
        style={{
          position: 'fixed',
          left: '12px',
          right: '12px',
          bottom: '76px',
          maxWidth: '460px',
          margin: '0 auto',
          maxHeight: isExpandedMobile ? 'calc(100vh - 165px)' : '92px',
          overflowY: isExpandedMobile ? 'auto' : 'hidden',
          background: isExpandedMobile ? 'rgba(3, 8, 22, 0.90)' : 'rgba(3, 8, 22, 0.72)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRadius: '16px',
          border: '1px solid rgba(56, 189, 248, 0.30)',
          boxShadow: '0 12px 35px rgba(0, 0, 0, 0.7), 0 0 20px rgba(56, 189, 248, 0.1)',
          padding: isExpandedMobile ? '14px 16px' : '10px 14px',
          color: '#f8fafc',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          zIndex: 35,
          pointerEvents: 'auto',
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'translateY(0)' : 'translateY(14px)',
          transition: 'max-height 0.32s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.28s ease, transform 0.28s ease, background 0.3s ease',
          boxSizing: 'border-box',
        }}
      >
        <style>{`
          @keyframes mobileFastFade {
            0% {
              opacity: 0;
              transform: translateY(6px);
            }
            100% {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .mobile-anim-1 {
            animation: mobileFastFade 240ms cubic-bezier(0.16, 1, 0.3, 1) both;
          }
          .mobile-anim-2 {
            animation: mobileFastFade 240ms cubic-bezier(0.16, 1, 0.3, 1) 50ms both;
          }
          .mobile-anim-3 {
            animation: mobileFastFade 240ms cubic-bezier(0.16, 1, 0.3, 1) 100ms both;
          }
        `}</style>

        <div
          onClick={toggleMobileExpanded}
          style={{
            cursor: 'pointer',
            userSelect: 'none',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2
              className="mobile-anim-1"
              style={{
                margin: '0 0 3px 0',
                fontSize: '0.98rem',
                fontWeight: 700,
                letterSpacing: '0.03em',
                color: '#38bdf8',
                lineHeight: 1.25,
                whiteSpace: isExpandedMobile ? 'normal' : 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {titleText}
            </h2>
            <p
              className="mobile-anim-2"
              style={{
                margin: 0,
                fontSize: '0.78rem',
                color: '#93c5fd',
                fontWeight: 500,
                lineHeight: 1.3,
                whiteSpace: isExpandedMobile ? 'normal' : 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {activeDescription.subtitle}
            </p>
          </div>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              toggleMobileExpanded()
            }}
            style={{
              flexShrink: 0,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              background: isExpandedMobile ? 'rgba(56, 189, 248, 0.22)' : 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              borderRadius: '999px',
              padding: '4px 9px',
              color: '#7dd3fc',
              fontSize: '0.70rem',
              fontWeight: 600,
              cursor: 'pointer',
              outline: 'none',
              transition: 'background 0.2s',
            }}
          >
            <span>{isExpandedMobile ? translations.collapseDetails : translations.expandDetails}</span>
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                transform: isExpandedMobile ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.25s ease',
              }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>

        {isExpandedMobile && (
          <div
            className="mobile-anim-3"
            style={{
              marginTop: '12px',
              paddingTop: '10px',
              borderTop: '1px solid rgba(56, 189, 248, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <section>
              <h3
                style={{
                  margin: '0 0 4px 0',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  color: '#2dd4bf',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    width: '5px',
                    height: '5px',
                    borderRadius: '50%',
                    background: '#2dd4bf',
                  }}
                />
                <span>{translations.physicalBenefitHeader}</span>
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: '0.82rem',
                  lineHeight: 1.45,
                  color: 'rgba(241, 245, 249, 0.95)',
                }}
              >
                {activeDescription.physicalBenefit}
              </p>
            </section>

            <section>
              <h3
                style={{
                  margin: '0 0 4px 0',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  color: '#c084fc',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    width: '5px',
                    height: '5px',
                    borderRadius: '50%',
                    background: '#c084fc',
                  }}
                />
                <span>{translations.mentalBenefitHeader}</span>
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: '0.82rem',
                  lineHeight: 1.45,
                  color: 'rgba(248, 250, 252, 0.95)',
                }}
              >
                {activeDescription.mentalBenefit}
              </p>
            </section>
          </div>
        )}
      </aside>
    )
  }

  return (
    <aside
      key={`desktop-${activePose}-${language}`}
      style={{
        position: 'fixed',
        right: '28px',
        top: '50%',
        transform: `translateY(-50%) scale(${isVisible ? 1 : 0.95})`,
        width: '430px',
        maxWidth: 'calc(100vw - 48px)',
        maxHeight: 'calc(100vh - 170px)',
        overflowY: 'auto',
        background: 'rgba(3, 8, 22, 0.78)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: '20px',
        border: '1px solid rgba(56, 189, 248, 0.32)',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.65), 0 0 30px rgba(56, 189, 248, 0.12)',
        padding: '24px 26px',
        color: '#f8fafc',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        zIndex: 40,
        pointerEvents: 'auto',
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.35s ease, transform 0.35s ease',
        perspective: '1000px',
        scrollbarWidth: 'thin',
      }}
    >
      <style>{`
        @keyframes charAppear3D {
          0% {
            opacity: 0;
            transform: perspective(600px) translate3d(0, -10px, 90px) rotateY(-85deg) rotateX(25deg) scale(0.35);
            filter: blur(2px);
            text-shadow: 0 0 16px rgba(56, 189, 248, 0.95);
          }
          65% {
            opacity: 1;
            transform: perspective(600px) translate3d(0, 1px, -12px) rotateY(15deg) rotateX(-5deg) scale(1.04);
            filter: blur(0px);
            text-shadow: 0 0 8px rgba(56, 189, 248, 0.6);
          }
          100% {
            opacity: 1;
            transform: perspective(600px) translate3d(0, 0, 0) rotateY(0deg) rotateX(0deg) scale(1);
            filter: blur(0px);
            text-shadow: none;
          }
        }
        @keyframes blockFloatIn {
          0% {
            opacity: 0;
            transform: perspective(700px) translate3d(14px, 0, 32px) rotateY(-7deg);
          }
          100% {
            opacity: 1;
            transform: perspective(700px) translate3d(0, 0, 0) rotateY(0deg);
          }
        }
        .char-3d-unit {
          display: inline-block;
          transform-origin: 50% 50% -12px;
          animation: charAppear3D 380ms cubic-bezier(0.16, 1, 0.3, 1) both;
          will-change: transform, opacity;
        }
        .block-float-unit {
          animation: blockFloatIn 420ms cubic-bezier(0.16, 1, 0.3, 1) 200ms both;
          will-change: transform, opacity;
        }
      `}</style>

      <header
        className="block-float-unit"
        style={{
          marginBottom: '16px',
          borderBottom: '1px solid rgba(56, 189, 248, 0.22)',
          paddingBottom: '14px',
        }}
      >
        <h2
          style={{
            margin: '0 0 6px 0',
            fontSize: '1.28rem',
            fontWeight: 700,
            letterSpacing: '0.04em',
            color: '#38bdf8',
            lineHeight: 1.3,
            textShadow: '0 0 12px rgba(56, 189, 248, 0.35)',
          }}
        >
          {animatedContent?.titleWords.map((word) => (
            <span
              key={word.id}
              style={{
                display: 'inline-block',
                whiteSpace: 'nowrap',
                marginRight: word.hasTrailingSpace ? '0.28em' : '0',
              }}
            >
              {word.chars.map((item) => (
                <span
                  key={item.id}
                  className="char-3d-unit"
                  style={{
                    animationDelay: `${item.delayMs}ms`,
                  }}
                >
                  {item.char}
                </span>
              ))}
            </span>
          ))}
        </h2>

        <p
          style={{
            margin: 0,
            fontSize: '0.94rem',
            color: '#93c5fd',
            fontWeight: 500,
            letterSpacing: '0.02em',
          }}
        >
          {animatedContent?.subtitleWords.map((word) => (
            <span
              key={word.id}
              style={{
                display: 'inline-block',
                whiteSpace: 'nowrap',
                marginRight: word.hasTrailingSpace ? '0.28em' : '0',
              }}
            >
              {word.chars.map((item) => (
                <span
                  key={item.id}
                  className="char-3d-unit"
                  style={{
                    animationDelay: `${item.delayMs}ms`,
                  }}
                >
                  {item.char}
                </span>
              ))}
            </span>
          ))}
        </p>
      </header>

      <section
        className="block-float-unit"
        style={{
          marginBottom: '18px',
        }}
      >
        <h3
          style={{
            margin: '0 0 8px 0',
            fontSize: '0.78rem',
            fontWeight: 700,
            letterSpacing: '0.12em',
            color: '#2dd4bf',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#2dd4bf',
              boxShadow: '0 0 8px #2dd4bf',
            }}
          />
          <span>
            {animatedContent?.physicalHeaderWords.map((word) => (
              <span
                key={word.id}
                style={{
                  display: 'inline-block',
                  whiteSpace: 'nowrap',
                  marginRight: word.hasTrailingSpace ? '0.28em' : '0',
                }}
              >
                {word.chars.map((item) => (
                  <span
                    key={item.id}
                    className="char-3d-unit"
                    style={{
                      animationDelay: `${item.delayMs}ms`,
                    }}
                  >
                    {item.char}
                  </span>
                ))}
              </span>
            ))}
          </span>
        </h3>

        <div
          style={{
            fontSize: '0.9rem',
            lineHeight: 1.62,
            color: 'rgba(241, 245, 249, 0.96)',
            letterSpacing: '0.01em',
          }}
        >
          {animatedContent?.physicalBodyWords.map((word) => (
            <span
              key={word.id}
              style={{
                display: 'inline-block',
                whiteSpace: 'nowrap',
                marginRight: word.hasTrailingSpace ? '0.28em' : '0',
              }}
            >
              {word.chars.map((item) => (
                <span
                  key={item.id}
                  className="char-3d-unit"
                  style={{
                    animationDelay: `${item.delayMs}ms`,
                  }}
                >
                  {item.char}
                </span>
              ))}
            </span>
          ))}
        </div>
      </section>

      <section className="block-float-unit">
        <h3
          style={{
            margin: '0 0 8px 0',
            fontSize: '0.78rem',
            fontWeight: 700,
            letterSpacing: '0.12em',
            color: '#c084fc',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#c084fc',
              boxShadow: '0 0 8px #c084fc',
            }}
          />
          <span>
            {animatedContent?.mentalHeaderWords.map((word) => (
              <span
                key={word.id}
                style={{
                  display: 'inline-block',
                  whiteSpace: 'nowrap',
                  marginRight: word.hasTrailingSpace ? '0.28em' : '0',
                }}
              >
                {word.chars.map((item) => (
                  <span
                    key={item.id}
                    className="char-3d-unit"
                    style={{
                      animationDelay: `${item.delayMs}ms`,
                    }}
                  >
                    {item.char}
                  </span>
                ))}
              </span>
            ))}
          </span>
        </h3>

        <div
          style={{
            fontSize: '0.9rem',
            lineHeight: 1.62,
            color: 'rgba(248, 250, 252, 0.96)',
            letterSpacing: '0.01em',
          }}
        >
          {animatedContent?.mentalBodyWords.map((word) => (
            <span
              key={word.id}
              style={{
                display: 'inline-block',
                whiteSpace: 'nowrap',
                marginRight: word.hasTrailingSpace ? '0.28em' : '0',
              }}
            >
              {word.chars.map((item) => (
                <span
                  key={item.id}
                  className="char-3d-unit"
                  style={{
                    animationDelay: `${item.delayMs}ms`,
                  }}
                >
                  {item.char}
                </span>
              ))}
            </span>
          ))}
        </div>
      </section>
    </aside>
  )
}
