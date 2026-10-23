import { useRef, useEffect, useState, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { FontLoader, type Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'
import { POSE_DESCRIPTIONS, type PoseAnnotationInfo } from '../data/poseDescriptions'
import { POSE_CYCLE, type PoseName } from '../geometry/poses'
import { getAssetUrl } from '../utils/assetPath'

interface Pose3DAnnotationProps {
  currentPose: PoseName
  isTransitioning: boolean
  transitionProgress: number
}

interface LetterLayoutData {
  char: string
  geometry: TextGeometry
  material: THREE.MeshStandardMaterial
  targetX: number
  targetY: number
  startTimeMs: number
}

interface GlyphData {
  geo: TextGeometry
  width: number
}

type GlyphCache = Record<string, GlyphData>

function createGlyphCache(
  font: Font,
  size: number,
  depth: number,
  bevelThickness: number,
  bevelSize: number
): GlyphCache {
  const cyrillicCharacters =
    'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюя0123456789.,:!?-—•()№/\' '
  const cache: GlyphCache = {}

  for (const character of cyrillicCharacters) {
    if (character === ' ') {
      cache[' '] = {
        geo: new THREE.BufferGeometry() as unknown as TextGeometry,
        width: size * 0.45,
      }
      continue
    }

    try {
      const geo = new TextGeometry(character, {
        font,
        size,
        depth,
        curveSegments: 4,
        bevelEnabled: true,
        bevelThickness,
        bevelSize,
      })
      geo.computeBoundingBox()
      const box = geo.boundingBox
      const width = box ? box.max.x - box.min.x : size * 0.5
      cache[character] = { geo, width }
    } catch {
      cache[character] = {
        geo: new THREE.BufferGeometry() as unknown as TextGeometry,
        width: size * 0.5,
      }
    }
  }

  return cache
}

function wrapWords(text: string, maxLineWidth: number, glyphs: GlyphCache): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''
  let currentWidth = 0

  for (const word of words) {
    let wordWidth = 0
    for (const char of word) {
      wordWidth += (glyphs[char]?.width ?? 0.015) + 0.003
    }

    const spaceWidth = (glyphs[' ']?.width ?? 0.012) + 0.003

    if (currentLine && currentWidth + spaceWidth + wordWidth > maxLineWidth) {
      lines.push(currentLine)
      currentLine = word
      currentWidth = wordWidth
    } else {
      if (currentLine) {
        currentLine += ` ${word}`
        currentWidth += spaceWidth + wordWidth
      } else {
        currentLine = word
        currentWidth = wordWidth
      }
    }
  }

  if (currentLine) {
    lines.push(currentLine)
  }

  return lines
}

export function Pose3DAnnotation({
  currentPose,
  isTransitioning,
}: Pose3DAnnotationProps) {
  const { camera } = useThree()
  const groupRef = useRef<THREE.Group>(null)
  const lettersContainerRef = useRef<THREE.Group>(null)

  const [loadedFont, setLoadedFont] = useState<Font | null>(null)
  const [activePoseKey, setActivePoseKey] = useState<PoseName>(currentPose)
  const [panelAlpha, setPanelAlpha] = useState(1)
  const [animationStartStamp, setAnimationStartStamp] = useState(0)

  useEffect(() => {
    let isMounted = true
    const loader = new FontLoader()
    loader.load(getAssetUrl('/fonts/Roboto_Regular.json'), (font) => {
      if (!isMounted) return
      setLoadedFont(font)
    })
    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!isTransitioning) {
      setActivePoseKey(currentPose)
      setAnimationStartStamp(performance.now())
    }
  }, [isTransitioning, currentPose])

  const activeDescription: PoseAnnotationInfo = useMemo(
    () => POSE_DESCRIPTIONS[activePoseKey] ?? POSE_DESCRIPTIONS['tadasana'],
    [activePoseKey]
  )

  const poseIndexNumber = useMemo(
    () => POSE_CYCLE.indexOf(activePoseKey) + 1,
    [activePoseKey]
  )

  const titleGlyphs = useMemo(() => {
    if (!loadedFont) return null
    return createGlyphCache(loadedFont, 0.055, 0.022, 0.003, 0.002)
  }, [loadedFont])

  const bodyGlyphs = useMemo(() => {
    if (!loadedFont) return null
    return createGlyphCache(loadedFont, 0.024, 0.008, 0.0015, 0.001)
  }, [loadedFont])

  const backdropMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color('#030714'),
        transparent: true,
        opacity: 0.76,
        depthWrite: false,
      }),
    []
  )

  const borderMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color('#38bdf8'),
        transparent: true,
        opacity: 0.45,
        wireframe: true,
        depthWrite: false,
      }),
    []
  )

  const titleMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#67e8f9'),
        emissive: new THREE.Color('#0284c7'),
        emissiveIntensity: 0.85,
        metalness: 0.65,
        roughness: 0.22,
        transparent: true,
        opacity: 1,
      }),
    []
  )

  const subtitleMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#bae6fd'),
        emissive: new THREE.Color('#0369a1'),
        emissiveIntensity: 0.7,
        metalness: 0.55,
        roughness: 0.28,
        transparent: true,
        opacity: 1,
      }),
    []
  )

  const sectionHeaderPhysicalMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#5eead4'),
        emissive: new THREE.Color('#0f766e'),
        emissiveIntensity: 0.85,
        metalness: 0.6,
        roughness: 0.25,
        transparent: true,
        opacity: 1,
      }),
    []
  )

  const sectionHeaderMentalMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#d8b4fe'),
        emissive: new THREE.Color('#7e22ce'),
        emissiveIntensity: 0.85,
        metalness: 0.6,
        roughness: 0.25,
        transparent: true,
        opacity: 1,
      }),
    []
  )

  const bodyPhysicalMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#ffffff'),
        emissive: new THREE.Color('#0369a1'),
        emissiveIntensity: 0.6,
        metalness: 0.45,
        roughness: 0.3,
        transparent: true,
        opacity: 1,
      }),
    []
  )

  const bodyMentalMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#ffffff'),
        emissive: new THREE.Color('#6b21a8'),
        emissiveIntensity: 0.6,
        metalness: 0.45,
        roughness: 0.3,
        transparent: true,
        opacity: 1,
      }),
    []
  )

  const layoutLetters = useMemo(() => {
    if (!titleGlyphs || !bodyGlyphs) return []

    const letters: LetterLayoutData[] = []
    let runningDelayMs = 0
    const delayStepMs = 26
    const maxTextWidth = 0.82

    let currentY = 0.38

    const numberPrefix = `№ ${poseIndexNumber} • `
    const titleText = `${numberPrefix}${activeDescription.title.toUpperCase()}`
    let currentX = 0
    for (const char of titleText) {
      const glyph = titleGlyphs[char] ?? titleGlyphs[' ']
      if (char !== ' ' && glyph.geo) {
        letters.push({
          char,
          geometry: glyph.geo,
          material: titleMaterial,
          targetX: currentX,
          targetY: currentY,
          startTimeMs: runningDelayMs,
        })
      }
      currentX += glyph.width + 0.005
      runningDelayMs += delayStepMs
    }

    currentY -= 0.065
    currentX = 0
    for (const char of activeDescription.subtitle) {
      const glyph = bodyGlyphs[char] ?? bodyGlyphs[' ']
      if (char !== ' ' && glyph.geo) {
        letters.push({
          char,
          geometry: glyph.geo,
          material: subtitleMaterial,
          targetX: currentX,
          targetY: currentY,
          startTimeMs: runningDelayMs,
        })
      }
      currentX += glyph.width + 0.003
      runningDelayMs += delayStepMs * 0.7
    }

    currentY -= 0.065
    currentX = 0
    for (const char of 'ТЕЛО И ОСАНКА') {
      const glyph = bodyGlyphs[char] ?? bodyGlyphs[' ']
      if (char !== ' ' && glyph.geo) {
        letters.push({
          char,
          geometry: glyph.geo,
          material: sectionHeaderPhysicalMaterial,
          targetX: currentX,
          targetY: currentY,
          startTimeMs: runningDelayMs,
        })
      }
      currentX += glyph.width + 0.003
      runningDelayMs += delayStepMs * 0.7
    }

    currentY -= 0.048
    const physicalLines = wrapWords(activeDescription.physicalBenefit, maxTextWidth, bodyGlyphs)
    for (const line of physicalLines) {
      currentX = 0
      for (const char of line) {
        const glyph = bodyGlyphs[char] ?? bodyGlyphs[' ']
        if (char !== ' ' && glyph.geo) {
          letters.push({
            char,
            geometry: glyph.geo,
            material: bodyPhysicalMaterial,
            targetX: currentX,
            targetY: currentY,
            startTimeMs: runningDelayMs,
          })
        }
        currentX += glyph.width + 0.0025
        runningDelayMs += delayStepMs * 0.6
      }
      currentY -= 0.042
    }

    currentY -= 0.028
    currentX = 0
    for (const char of 'НЕРВНАЯ СИСТЕМА И ФОКУС') {
      const glyph = bodyGlyphs[char] ?? bodyGlyphs[' ']
      if (char !== ' ' && glyph.geo) {
        letters.push({
          char,
          geometry: glyph.geo,
          material: sectionHeaderMentalMaterial,
          targetX: currentX,
          targetY: currentY,
          startTimeMs: runningDelayMs,
        })
      }
      currentX += glyph.width + 0.003
      runningDelayMs += delayStepMs * 0.7
    }

    currentY -= 0.048
    const mentalLines = wrapWords(activeDescription.mentalBenefit, maxTextWidth, bodyGlyphs)
    for (const line of mentalLines) {
      currentX = 0
      for (const char of line) {
        const glyph = bodyGlyphs[char] ?? bodyGlyphs[' ']
        if (char !== ' ' && glyph.geo) {
          letters.push({
            char,
            geometry: glyph.geo,
            material: bodyMentalMaterial,
            targetX: currentX,
            targetY: currentY,
            startTimeMs: runningDelayMs,
          })
        }
        currentX += glyph.width + 0.0025
        runningDelayMs += delayStepMs * 0.6
      }
      currentY -= 0.042
    }

    return letters
  }, [
    titleGlyphs,
    bodyGlyphs,
    activeDescription,
    poseIndexNumber,
    titleMaterial,
    subtitleMaterial,
    sectionHeaderPhysicalMaterial,
    sectionHeaderMentalMaterial,
    bodyPhysicalMaterial,
    bodyMentalMaterial,
  ])

  useFrame((state) => {
    if (!groupRef.current) return

    const elapsedTime = state.clock.getElapsedTime()
    const targetAlpha = isTransitioning ? 0.0 : 1.0

    setPanelAlpha((prevAlpha) => {
      const deltaAlpha = (targetAlpha - prevAlpha) * 0.25
      const nextAlpha = prevAlpha + deltaAlpha
      return Math.max(0.0, Math.min(1.0, nextAlpha))
    })

    const allMaterials = [
      titleMaterial,
      subtitleMaterial,
      sectionHeaderPhysicalMaterial,
      sectionHeaderMentalMaterial,
      bodyPhysicalMaterial,
      bodyMentalMaterial,
    ]

    for (const mat of allMaterials) {
      mat.opacity = panelAlpha
      mat.visible = panelAlpha > 0.005
    }

    backdropMaterial.opacity = panelAlpha * 0.78
    backdropMaterial.visible = panelAlpha > 0.005
    borderMaterial.opacity = panelAlpha * 0.35
    borderMaterial.visible = panelAlpha > 0.005

    const cameraDirection = new THREE.Vector3()
    camera.getWorldDirection(cameraDirection)

    const cameraRight = new THREE.Vector3()
    cameraRight.crossVectors(cameraDirection, camera.up).normalize()

    const cameraUp = camera.up.clone().normalize()

    const floatingElevation = Math.sin(elapsedTime * 1.2) * 0.02
    const centerPoint = new THREE.Vector3(0, 0.74 + floatingElevation, 0)
    const targetPosition = centerPoint
      .clone()
      .add(cameraRight.multiplyScalar(0.78))
      .add(cameraUp.multiplyScalar(0.02))

    groupRef.current.position.lerp(targetPosition, 0.14)
    groupRef.current.quaternion.copy(camera.quaternion)

    if (lettersContainerRef.current && !isTransitioning) {
      const nowMs = performance.now() - animationStartStamp
      const children = lettersContainerRef.current.children

      for (let i = 0; i < children.length; i++) {
        const mesh = children[i] as THREE.Mesh
        const data = layoutLetters[i]
        if (!data) continue

        const elapsed = nowMs - data.startTimeMs
        if (elapsed < 0) {
          mesh.visible = false
        } else {
          mesh.visible = panelAlpha > 0.005
          const duration = 360
          const progress = Math.min(1.0, elapsed / duration)
          const easeOut = 1.0 - Math.pow(1.0 - progress, 3)
          const inv = 1.0 - easeOut

          mesh.position.x = data.targetX
          mesh.position.y = data.targetY + inv * 0.05
          mesh.position.z = inv * 0.22

          mesh.rotation.y = inv * Math.PI * 1.5
          mesh.rotation.x = inv * 0.6
          mesh.scale.setScalar(0.25 + easeOut * 0.75)
        }
      }
    }
  })

  return (
    <group ref={groupRef} position={[0.78, 0.74, 0]}>
      <pointLight position={[0.42, 0.1, 0.9]} intensity={3.2} distance={6} decay={2} color="#ffffff" />
      <pointLight position={[0.1, -0.2, 0.7]} intensity={1.6} distance={4} decay={2} color="#7dd3fc" />
      <mesh position={[0.41, 0.07, -0.015]} material={backdropMaterial}>
        <planeGeometry args={[0.96, 0.76]} />
      </mesh>
      <mesh position={[0.41, 0.07, -0.014]} material={borderMaterial}>
        <planeGeometry args={[0.96, 0.76]} />
      </mesh>
      <group ref={lettersContainerRef}>
        {layoutLetters.map((data, index) => (
          <mesh
            key={`3d-${index}-${data.char}`}
            geometry={data.geometry}
            material={data.material}
            position={[data.targetX, data.targetY, 0]}
            visible={false}
          />
        ))}
      </group>
    </group>
  )
}
