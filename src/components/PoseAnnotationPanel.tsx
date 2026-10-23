import { useMemo, useState, useEffect } from 'react'
import { getLocalizedPoseDescription, type PoseAnnotationInfo } from '../data/localizedPoseDescriptions'
import { POSE_CYCLE, type PoseName } from '../geometry/poses'
import { useLanguage } from '../i18n/LanguageContext'

interface PoseAnnotationPanelProps {
  currentPose: PoseName
  isTransitioning: boolean
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
}: PoseAnnotationPanelProps) {
  const { language, translations } = useLanguage()
  const [activePose, setActivePose] = useState<PoseName>(currentPose)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    if (isTransitioning) {
      setIsVisible(false)
    } else {
      setActivePose(currentPose)
      setIsVisible(true)
    }
  }, [isTransitioning, currentPose])

  const activeDescription: PoseAnnotationInfo = useMemo(
    () => getLocalizedPoseDescription(activePose, language),
    [activePose, language]
  )

  const poseIndexNumber = useMemo(
    () => POSE_CYCLE.indexOf(activePose) + 1,
    [activePose]
  )

  const animatedContent = useMemo(() => {
    const parallelStartDelayMs = 260

    const titleText = `${translations.poseNumberPrefix}${poseIndexNumber} • ${activeDescription.title.toUpperCase()}`
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
  }, [activeDescription, poseIndexNumber, translations])

  return (
    <aside
      key={`${activePose}-${language}`}
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
        @keyframes badgePopIn {
          0% {
            opacity: 0;
            transform: scale(0.7) translate3d(0, -6px, 20px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translate3d(0, 0, 0);
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
        .badge-pop-unit {
          animation: badgePopIn 320ms cubic-bezier(0.16, 1, 0.3, 1) 60ms both;
          will-change: transform, opacity;
        }
      `}</style>

      <div
        className="badge-pop-unit"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '7px',
          padding: '4px 10px',
          borderRadius: '999px',
          background: 'rgba(56, 189, 248, 0.12)',
          border: '1px solid rgba(56, 189, 248, 0.35)',
          marginBottom: '12px',
        }}
      >
        <span
          style={{
            display: 'inline-block',
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            background: '#38bdf8',
            boxShadow: '0 0 10px #38bdf8',
          }}
        />
        <span
          style={{
            fontSize: '0.68rem',
            fontWeight: 700,
            letterSpacing: '0.12em',
            color: '#7dd3fc',
            textTransform: 'uppercase',
          }}
        >
          {translations.annotationBadge}
        </span>
      </div>

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
          {animatedContent.titleWords.map((word) => (
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
          {animatedContent.subtitleWords.map((word) => (
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
            {animatedContent.physicalHeaderWords.map((word) => (
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
          {animatedContent.physicalBodyWords.map((word) => (
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
            {animatedContent.mentalHeaderWords.map((word) => (
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
          {animatedContent.mentalBodyWords.map((word) => (
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
