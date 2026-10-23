import { Canvas } from '@react-three/fiber'
import { StarField } from './StarField'
import { CosmicEnvironment } from './CosmicEnvironment'
import { ParticleHuman } from './ParticleHuman'
import { SolidHuman } from './SolidHuman'
import { GroundFloor } from './GroundFloor'
import { YogaProps } from './YogaProps'
import { CameraRig } from './CameraRig'
import type { PoseName } from '../geometry/poses'

interface SceneProps {
  currentPose: PoseName
  previousPose: PoseName
  isTransitioning: boolean
  transitionProgress: number
  reducedMotion: boolean
  pixelRatio: number
  onGeometriesReady?: () => void
}

export function Scene({
  currentPose,
  previousPose,
  isTransitioning,
  transitionProgress,
  reducedMotion,
  pixelRatio,
  onGeometriesReady,
}: SceneProps) {
  return (
    <Canvas
      style={{ position: 'fixed', inset: 0 }}
      camera={{ fov: 50, near: 0.1, far: 350, position: [0, 0.75, 2.7] }}
      gl={{
        antialias: false,
        alpha: false,
        powerPreference: 'high-performance',
      }}
      dpr={pixelRatio}
    >
      <color attach="background" args={['#010206']} />

      <ambientLight intensity={0.4} color="#0c1836" />
      <directionalLight position={[68, 30, -95]} intensity={2.2} color="#fffcf5" />
      <pointLight position={[68, 30, -95]} intensity={2.6} color="#ffe4a0" distance={260} />
      <directionalLight position={[-16, 7, -42]} intensity={0.4} color="#55aaff" />
      <directionalLight position={[0, -2, -2]} intensity={0.25} color="#6030cc" />
      <pointLight position={[0, 0.15, 0.1]} intensity={1.3} color="#e040fb" distance={3.5} />

      <StarField />
      <CosmicEnvironment />

      <GroundFloor
        isTransitioning={isTransitioning}
        transitionProgress={transitionProgress}
      />

      <SolidHuman
        currentPose={currentPose}
        previousPose={previousPose}
        isTransitioning={isTransitioning}
        transitionProgress={transitionProgress}
        onGeometriesReady={onGeometriesReady}
      />

      <YogaProps
        currentPose={currentPose}
        previousPose={previousPose}
        isTransitioning={isTransitioning}
        transitionProgress={transitionProgress}
      />

      <ParticleHuman
        currentPose={currentPose}
        previousPose={previousPose}
        isTransitioning={isTransitioning}
        transitionProgress={transitionProgress}
      />

      <CameraRig reducedMotion={reducedMotion} />
    </Canvas>
  )
}
