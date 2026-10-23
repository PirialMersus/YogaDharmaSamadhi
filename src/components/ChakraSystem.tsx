import { useEffect, useRef, useState, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { easeInOutCubic } from '../geometry/humanShapes'
import type { PoseName } from '../geometry/poses'
import { getAssetUrl } from '../utils/assetPath'

interface ChakraSystemProps {
  currentPose: PoseName
  previousPose: PoseName
  isTransitioning: boolean
  transitionProgress: number
}

type ChakraMap = Record<PoseName, [number, number, number][]>

interface ChakraVisualDefinition {
  color: string
  haloColor: string
  name: string
  radius: number
  haloRadius: number
}

const CHAKRA_DEFINITIONS: ChakraVisualDefinition[] = [
  {
    name: 'Муладхара',
    color: '#ff2052',
    haloColor: '#ff0033',
    radius: 0.034,
    haloRadius: 0.082,
  },
  {
    name: 'Свадхистхана',
    color: '#ff7700',
    haloColor: '#ff5500',
    radius: 0.034,
    haloRadius: 0.082,
  },
  {
    name: 'Манипура',
    color: '#ffea00',
    haloColor: '#ffbb00',
    radius: 0.035,
    haloRadius: 0.084,
  },
  {
    name: 'Анахата',
    color: '#00e676',
    haloColor: '#00c853',
    radius: 0.038,
    haloRadius: 0.092,
  },
  {
    name: 'Вишудха',
    color: '#00b0ff',
    haloColor: '#0091ea',
    radius: 0.034,
    haloRadius: 0.082,
  },
  {
    name: 'Аджна',
    color: '#3d5afe',
    haloColor: '#651fff',
    radius: 0.032,
    haloRadius: 0.078,
  },
  {
    name: 'Сахасрара',
    color: '#ffffff',
    haloColor: '#e040fb',
    radius: 0.036,
    haloRadius: 0.090,
  },
]

export function ChakraSystem({
  currentPose,
  previousPose,
  isTransitioning,
  transitionProgress,
}: ChakraSystemProps) {
  const [chakrasData, setChakrasData] = useState<ChakraMap | null>(null)

  const groupReference = useRef<THREE.Group>(null)
  const lineGeometryReference = useRef<THREE.BufferGeometry>(null)
  const linePositionsBuffer = useMemo(() => new Float32Array(7 * 3), [])

  const coreMeshesRef = useRef<(THREE.Mesh | null)[]>([])
  const haloMeshesRef = useRef<(THREE.Mesh | null)[]>([])

  useEffect(() => {
    let isMounted = true
    fetch(getAssetUrl('/models/chakras.json?v=2'))
      .then((response) => response.json())
      .then((data: ChakraMap) => {
        if (!isMounted) return
        setChakrasData(data)
      })
      .catch((error) => {
        console.error('Failed to load chakras data:', error)
      })

    return () => {
      isMounted = false
    }
  }, [])

  useFrame((state) => {
    if (!chakrasData) return

    const sourceChakras = chakrasData[previousPose] ?? chakrasData['tadasana']
    const targetChakras = chakrasData[currentPose] ?? chakrasData['tadasana']
    if (!sourceChakras || !targetChakras) return

    const elapsedTime = state.clock.getElapsedTime()
    const easedFraction = easeInOutCubic(Math.min(Math.max(transitionProgress, 0), 1))

    for (let index = 0; index < 7; index++) {
      const sourcePoint = sourceChakras[index] ?? [0, 1, 0]
      const targetPoint = targetChakras[index] ?? [0, 1, 0]

      let currentX = targetPoint[0]
      let currentY = targetPoint[1]
      let currentZ = targetPoint[2]

      if (isTransitioning) {
        currentX = sourcePoint[0] + (targetPoint[0] - sourcePoint[0]) * easedFraction
        currentY = sourcePoint[1] + (targetPoint[1] - sourcePoint[1]) * easedFraction
        currentZ = sourcePoint[2] + (targetPoint[2] - sourcePoint[2]) * easedFraction
      }

      linePositionsBuffer[index * 3] = currentX
      linePositionsBuffer[index * 3 + 1] = currentY
      linePositionsBuffer[index * 3 + 2] = currentZ

      const coreMesh = coreMeshesRef.current[index]
      const haloMesh = haloMeshesRef.current[index]

      const breathingPulse = 1.0 + Math.sin(elapsedTime * 2.4 + index * 0.85) * 0.16
      const haloPulse = 1.0 + Math.sin(elapsedTime * 2.4 + index * 0.85 + 0.35) * 0.22

      if (coreMesh) {
        coreMesh.position.set(currentX, currentY, currentZ)
        coreMesh.scale.setScalar(breathingPulse)
      }

      if (haloMesh) {
        haloMesh.position.set(currentX, currentY, currentZ)
        haloMesh.scale.setScalar(haloPulse)
      }
    }

    if (lineGeometryReference.current) {
      const lineAttr = lineGeometryReference.current.getAttribute('position') as THREE.BufferAttribute
      lineAttr.needsUpdate = true
    }
  })

  if (!chakrasData) return null

  return (
    <group ref={groupReference} renderOrder={999}>
      <line>
        <bufferGeometry ref={lineGeometryReference}>
          <bufferAttribute
            attach="attributes-position"
            array={linePositionsBuffer}
            count={7}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial
          color="#90caf9"
          transparent
          opacity={0.8}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          depthTest={false}
        />
      </line>

      {CHAKRA_DEFINITIONS.map((chakraDef, index) => (
        <group key={chakraDef.name}>
          <mesh
            ref={(element) => {
              coreMeshesRef.current[index] = element
            }}
            renderOrder={1000}
          >
            <sphereGeometry args={[chakraDef.radius, 16, 16]} />
            <meshBasicMaterial
              color={chakraDef.color}
              transparent
              opacity={0.98}
              depthWrite={false}
              depthTest={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>

          <mesh
            ref={(element) => {
              haloMeshesRef.current[index] = element
            }}
            renderOrder={999}
          >
            <sphereGeometry args={[chakraDef.haloRadius, 16, 16]} />
            <meshBasicMaterial
              color={chakraDef.haloColor}
              transparent
              opacity={0.48}
              depthWrite={false}
              depthTest={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </group>
      ))}
    </group>
  )
}
