import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

function createSunCoreTexture(): THREE.CanvasTexture {
  const canvasElement = document.createElement('canvas')
  canvasElement.width = 512
  canvasElement.height = 512
  const context = canvasElement.getContext('2d')!

  const radialGradient = context.createRadialGradient(256, 256, 0, 256, 256, 256)
  radialGradient.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)')
  radialGradient.addColorStop(0.08, 'rgba(255, 255, 245, 1.0)')
  radialGradient.addColorStop(0.25, 'rgba(255, 235, 170, 0.95)')
  radialGradient.addColorStop(0.5, 'rgba(255, 180, 70, 0.45)')
  radialGradient.addColorStop(0.8, 'rgba(255, 120, 20, 0.12)')
  radialGradient.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)')

  context.fillStyle = radialGradient
  context.fillRect(0, 0, 512, 512)

  return new THREE.CanvasTexture(canvasElement)
}

function createSunCoronaTexture(): THREE.CanvasTexture {
  const canvasElement = document.createElement('canvas')
  canvasElement.width = 512
  canvasElement.height = 512
  const context = canvasElement.getContext('2d')!

  const radialGradient = context.createRadialGradient(256, 256, 10, 256, 256, 256)
  radialGradient.addColorStop(0.0, 'rgba(255, 245, 210, 0.9)')
  radialGradient.addColorStop(0.2, 'rgba(255, 200, 100, 0.5)')
  radialGradient.addColorStop(0.55, 'rgba(255, 140, 40, 0.18)')
  radialGradient.addColorStop(0.85, 'rgba(255, 80, 10, 0.05)')
  radialGradient.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)')

  context.fillStyle = radialGradient
  context.fillRect(0, 0, 512, 512)

  return new THREE.CanvasTexture(canvasElement)
}

export function CosmicEnvironment() {
  const earthAxialTiltGroupRef = useRef<THREE.Group>(null)
  const earthSurfaceMeshRef = useRef<THREE.Mesh>(null)
  const earthCloudsMeshRef = useRef<THREE.Mesh>(null)
  const moonOrbitGroupRef = useRef<THREE.Group>(null)
  const moonMeshRef = useRef<THREE.Mesh>(null)
  const sunRaysSpriteRef = useRef<THREE.Sprite>(null)
  const sunCoreSpriteRef = useRef<THREE.Sprite>(null)

  const earthDayTexture = useMemo(
    () => new THREE.TextureLoader().load('/textures/planets/earth_day_4096.jpg'),
    []
  )
  const earthNightTexture = useMemo(
    () => new THREE.TextureLoader().load('/textures/planets/earth_night_4096.jpg'),
    []
  )
  const earthSpecularTexture = useMemo(
    () => new THREE.TextureLoader().load('/textures/planets/earth_specular_2048.jpg'),
    []
  )
  const earthCloudsTexture = useMemo(
    () => new THREE.TextureLoader().load('/textures/planets/earth_clouds_1024.png'),
    []
  )
  const moonTexture = useMemo(
    () => new THREE.TextureLoader().load('/textures/planets/moon_1024.jpg'),
    []
  )
  const sunRaysTexture = useMemo(
    () => new THREE.TextureLoader().load('/textures/planets/lensflare0.png'),
    []
  )

  const sunCoreTexture = useMemo(() => createSunCoreTexture(), [])
  const sunCoronaTexture = useMemo(() => createSunCoronaTexture(), [])

  useFrame((state) => {
    const clockTime = state.clock.getElapsedTime()

    if (earthSurfaceMeshRef.current) {
      earthSurfaceMeshRef.current.rotation.y = clockTime * 0.012
    }

    if (earthCloudsMeshRef.current) {
      earthCloudsMeshRef.current.rotation.y = clockTime * 0.016
    }

    if (moonOrbitGroupRef.current) {
      moonOrbitGroupRef.current.rotation.y = clockTime * 0.024
    }

    if (moonMeshRef.current) {
      moonMeshRef.current.rotation.y = clockTime * 0.024
    }

    if (sunRaysSpriteRef.current) {
      sunRaysSpriteRef.current.material.rotation = clockTime * 0.003
    }
  })

  return (
    <group>
      <group position={[68, 30, -95]}>
        <sprite ref={sunCoreSpriteRef} scale={[38, 38, 1]}>
          <spriteMaterial
            map={sunCoreTexture}
            transparent
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </sprite>

        <sprite ref={sunRaysSpriteRef} scale={[95, 95, 1]}>
          <spriteMaterial
            map={sunRaysTexture}
            transparent
            opacity={0.92}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            color="#fff8ea"
          />
        </sprite>

        <sprite scale={[140, 140, 1]}>
          <spriteMaterial
            map={sunCoronaTexture}
            transparent
            opacity={0.65}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </sprite>
      </group>

      <group position={[-16, 7, -42]}>
        <group
          ref={earthAxialTiltGroupRef}
          rotation={[0.1, 0, THREE.MathUtils.degToRad(23.44)]}
        >
          <mesh ref={earthSurfaceMeshRef}>
            <sphereGeometry args={[7.2, 64, 64]} />
            <meshStandardMaterial
              map={earthDayTexture}
              roughnessMap={earthSpecularTexture}
              roughness={0.65}
              metalness={0.06}
              emissiveMap={earthNightTexture}
              emissive={new THREE.Color('#ffda9e')}
              emissiveIntensity={0.4}
            />
          </mesh>

          <mesh ref={earthCloudsMeshRef}>
            <sphereGeometry args={[7.225, 64, 64]} />
            <meshStandardMaterial
              map={earthCloudsTexture}
              transparent
              opacity={0.68}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              roughness={0.9}
            />
          </mesh>
        </group>

        <group
          ref={moonOrbitGroupRef}
          rotation={[THREE.MathUtils.degToRad(5.14), 0, 0.12]}
        >
          <mesh
            ref={moonMeshRef}
            position={[18.5, 1.2, 0]}
          >
            <sphereGeometry args={[2.0, 36, 36]} />
            <meshStandardMaterial
              map={moonTexture}
              roughness={0.88}
              metalness={0.05}
            />
          </mesh>
        </group>
      </group>
    </group>
  )
}
