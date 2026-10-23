import { useEffect, useState, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { PoseName } from '../geometry/poses'

interface YogaPropsComponentProps {
  currentPose: PoseName
  previousPose: PoseName
  isTransitioning: boolean
  transitionProgress: number
}

interface SinglePropPayload {
  name: string
  type: 'wood' | 'blanket' | 'bolster' | 'belt' | 'metal'
  positions: number[]
  normals: number[]
  uvs?: number[]
  indices?: number[]
}

type PropsCollectionPayload = Record<string, SinglePropPayload[]>

const POSE_SCALE_FACTORS: Partial<Record<PoseName, number>> = {
  tadasana: 0.92,
  sirsasana: 0.90,
  sarvangasana: 0.90,
  adho_mukha_vrksasana: 0.80,
  pincha_mayurasana: 0.84,
  virabhadrasana_i: 0.90,
}

function createWoodProceduralTexture(): THREE.CanvasTexture {
  const canvasElement = document.createElement('canvas')
  canvasElement.width = 512
  canvasElement.height = 512
  const context = canvasElement.getContext('2d')!

  context.fillStyle = '#b87d4b'
  context.fillRect(0, 0, 512, 512)

  for (let stripeIndex = 0; stripeIndex < 120; stripeIndex++) {
    const x = Math.random() * 512
    const width = 1 + Math.random() * 4
    const opacity = 0.04 + Math.random() * 0.12
    context.fillStyle = Math.random() > 0.5
      ? `rgba(90, 48, 20, ${opacity})`
      : `rgba(225, 175, 120, ${opacity})`
    context.fillRect(x, 0, width, 512)
  }

  const generatedTexture = new THREE.CanvasTexture(canvasElement)
  generatedTexture.wrapS = THREE.RepeatWrapping
  generatedTexture.wrapT = THREE.RepeatWrapping
  generatedTexture.repeat.set(2, 2)
  return generatedTexture
}

function createFabricProceduralTexture(): THREE.CanvasTexture {
  const canvasElement = document.createElement('canvas')
  canvasElement.width = 256
  canvasElement.height = 256
  const context = canvasElement.getContext('2d')!

  context.fillStyle = '#d5cebe'
  context.fillRect(0, 0, 256, 256)

  for (let x = 0; x < 256; x += 4) {
    for (let y = 0; y < 256; y += 4) {
      const isAlt = (x / 4 + y / 4) % 2 === 0
      context.fillStyle = isAlt ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)'
      context.fillRect(x, y, 4, 4)
    }
  }

  const generatedTexture = new THREE.CanvasTexture(canvasElement)
  generatedTexture.wrapS = THREE.RepeatWrapping
  generatedTexture.wrapT = THREE.RepeatWrapping
  generatedTexture.repeat.set(8, 8)
  return generatedTexture
}

function createStrapProceduralTexture(): THREE.CanvasTexture {
  const canvasElement = document.createElement('canvas')
  canvasElement.width = 128
  canvasElement.height = 128
  const context = canvasElement.getContext('2d')!

  context.fillStyle = '#b38241'
  context.fillRect(0, 0, 128, 128)

  for (let y = 0; y < 128; y += 3) {
    const opacity = (y % 6 === 0) ? 0.15 : 0.05
    context.fillStyle = `rgba(60, 35, 10, ${opacity})`
    context.fillRect(0, y, 128, 2)
  }

  const generatedTexture = new THREE.CanvasTexture(canvasElement)
  generatedTexture.wrapS = THREE.RepeatWrapping
  generatedTexture.wrapT = THREE.RepeatWrapping
  generatedTexture.repeat.set(1, 16)
  return generatedTexture
}

function createMaterialSuite(
  woodTex: THREE.Texture,
  fabricTex: THREE.Texture,
  strapTex: THREE.Texture
) {
  return {
    wood: new THREE.MeshStandardMaterial({
      map: woodTex,
      roughness: 0.45,
      metalness: 0.04,
      transparent: true,
      opacity: 1.0,
    }),
    blanket: new THREE.MeshStandardMaterial({
      map: fabricTex,
      color: new THREE.Color('#e4ded2'),
      roughness: 0.88,
      metalness: 0.01,
      transparent: true,
      opacity: 1.0,
    }),
    bolster: new THREE.MeshStandardMaterial({
      map: fabricTex,
      color: new THREE.Color('#aba090'),
      roughness: 0.75,
      metalness: 0.02,
      transparent: true,
      opacity: 1.0,
    }),
    belt: new THREE.MeshStandardMaterial({
      map: strapTex,
      color: new THREE.Color('#caa658'),
      roughness: 0.65,
      metalness: 0.05,
      transparent: true,
      opacity: 1.0,
    }),
    metal: new THREE.MeshStandardMaterial({
      color: new THREE.Color('#c0c5cc'),
      roughness: 0.25,
      metalness: 0.88,
      transparent: true,
      opacity: 1.0,
    }),
  }
}

export function YogaProps({
  currentPose,
  previousPose,
  isTransitioning,
  transitionProgress,
}: YogaPropsComponentProps) {
  const [propsData, setPropsData] = useState<PropsCollectionPayload | null>(null)

  const woodTexture = useMemo(() => createWoodProceduralTexture(), [])
  const fabricTexture = useMemo(() => createFabricProceduralTexture(), [])
  const strapTexture = useMemo(() => createStrapProceduralTexture(), [])

  const currentMaterialsMap = useMemo(
    () => createMaterialSuite(woodTexture, fabricTexture, strapTexture),
    [woodTexture, fabricTexture, strapTexture]
  )

  const previousMaterialsMap = useMemo(
    () => createMaterialSuite(woodTexture, fabricTexture, strapTexture),
    [woodTexture, fabricTexture, strapTexture]
  )

  const currentPropsGeometries = useMemo(() => {
    if (!propsData || currentPose === 'tadasana' || !propsData[currentPose]) return []
    const customScale = POSE_SCALE_FACTORS[currentPose] ?? 1.0
    return propsData[currentPose].map((prop) => {
      const geometry = new THREE.BufferGeometry()
      const rawPositions = new Float32Array(prop.positions)
      if (customScale !== 1.0) {
        for (let i = 0; i < rawPositions.length; i++) {
          rawPositions[i] *= customScale
        }
      }
      geometry.setAttribute('position', new THREE.BufferAttribute(rawPositions, 3))
      geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(prop.normals), 3))
      if (prop.uvs && prop.uvs.length > 0) {
        geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(prop.uvs), 2))
      }
      if (prop.indices && prop.indices.length > 0) {
        geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(prop.indices), 1))
      }
      return { geometry, type: prop.type }
    })
  }, [propsData, currentPose])

  const previousPropsGeometries = useMemo(() => {
    if (!propsData || previousPose === 'tadasana' || !propsData[previousPose] || previousPose === currentPose) return []
    const customScale = POSE_SCALE_FACTORS[previousPose] ?? 1.0
    return propsData[previousPose].map((prop) => {
      const geometry = new THREE.BufferGeometry()
      const rawPositions = new Float32Array(prop.positions)
      if (customScale !== 1.0) {
        for (let i = 0; i < rawPositions.length; i++) {
          rawPositions[i] *= customScale
        }
      }
      geometry.setAttribute('position', new THREE.BufferAttribute(rawPositions, 3))
      geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(prop.normals), 3))
      if (prop.uvs && prop.uvs.length > 0) {
        geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(prop.uvs), 2))
      }
      if (prop.indices && prop.indices.length > 0) {
        geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(prop.indices), 1))
      }
      return { geometry, type: prop.type }
    })
  }, [propsData, previousPose, currentPose])

  useEffect(() => {
    let isMounted = true
    fetch('/models/props_collection.json?t=' + Date.now(), { cache: 'no-store' })
      .then((res) => res.json())
      .then((data: PropsCollectionPayload) => {
        if (!isMounted) return
        setPropsData(data)
      })
      .catch((error) => {
        console.error('Failed to load props collection:', error)
      })

    return () => {
      isMounted = false
    }
  }, [])

  useFrame(() => {
    let currentAlpha = 1.0
    let previousAlpha = 0.0

    if (isTransitioning) {
      const progress = Math.min(Math.max(transitionProgress, 0), 1)
      const dissolveLimit = 0.3
      const materializeLimit = 0.7

      if (progress <= dissolveLimit) {
        previousAlpha = Math.max(0.0, 1.0 - progress / dissolveLimit)
        currentAlpha = 0.0
      } else if (progress >= materializeLimit) {
        previousAlpha = 0.0
        currentAlpha = Math.min(1.0, (progress - materializeLimit) / (1.0 - materializeLimit))
      } else {
        previousAlpha = 0.0
        currentAlpha = 0.0
      }
    }

    Object.values(currentMaterialsMap).forEach((material) => {
      material.opacity = currentAlpha
      material.depthWrite = currentAlpha > 0.95
      material.visible = currentAlpha > 0.001
    })

    Object.values(previousMaterialsMap).forEach((material) => {
      material.opacity = previousAlpha
      material.depthWrite = previousAlpha > 0.95
      material.visible = previousAlpha > 0.001
    })
  })

  if (!propsData) return null

  return (
    <group>
      {currentPropsGeometries.map(({ geometry, type }, index) => (
        <mesh
          key={`current-${currentPose}-${index}`}
          geometry={geometry}
          material={currentMaterialsMap[type]}
          frustumCulled={false}
        />
      ))}

      {isTransitioning &&
        previousPropsGeometries.map(({ geometry, type }, index) => (
          <mesh
            key={`prev-${previousPose}-${index}`}
            geometry={geometry}
            material={previousMaterialsMap[type]}
            frustumCulled={false}
          />
        ))}
    </group>
  )
}
