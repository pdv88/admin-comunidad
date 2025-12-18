import React, { useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, PerspectiveCamera, Environment, OrbitControls } from '@react-three/drei'

// A styled building block
function Building({ position, scale, color, delay = 0 }) {
  const mesh = useRef()
  const [hovered, setHover] = useState(false)
  
  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    mesh.current.position.y = position[1] + Math.sin(t + delay) * 0.1
  })

  return (
    <mesh
      ref={mesh}
      position={position}
      scale={hovered ? scale.map(s => s * 1.05) : scale}
      onPointerOver={() => setHover(true)}
      onPointerOut={() => setHover(false)}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial 
        color={color} 
        roughness={0.2}
        metalness={0.8}
        emissive={color}
        emissiveIntensity={0.2}
        transparent
        opacity={0.9}
      />
    </mesh>
  )
}

// Floating data orb
function DataOrb({ position, color, speed = 1 }) {
    const mesh = useRef()
    
    useFrame((state) => {
      const t = state.clock.getElapsedTime() * speed
      // Orbit logic
      mesh.current.position.x = Math.sin(t) * 3
      mesh.current.position.z = Math.cos(t) * 3
      mesh.current.rotation.y += 0.02
    })
  
    return (
      <mesh ref={mesh} position={position}>
        <sphereGeometry args={[0.25, 32, 32]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} toneMapped={false} />
      </mesh>
    )
}

function Scene() {
    return (
        <group rotation={[0, -Math.PI / 6, 0]}>
            <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={1} enablePan={false} />
            
            {/* Central Cluster representing Community */}
            <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
                <Building position={[0, 0, 0]} scale={[1.2, 3, 1.2]} color="#6366f1" delay={0} />
                <Building position={[-1.5, -0.5, 0.8]} scale={[1, 1.8, 1]} color="#8b5cf6" delay={1} />
                <Building position={[1.5, -0.2, -0.8]} scale={[1, 2.2, 1]} color="#3b82f6" delay={2} />
                <Building position={[0.6, -1, 1.5]} scale={[0.8, 1.2, 0.8]} color="#0ea5e9" delay={3} />
            </Float>

            {/* Orbiting Elements representing features */}
            <DataOrb position={[2.5, 0, 0]} color="#ec4899" speed={0.8} />
            <DataOrb position={[-2.5, 1.5, 0]} color="#10b981" speed={0.6} />

            {/* Environment lighting */}
            {/* Environment lighting - Removed to prevent fetch errors
            <Environment preset="city" /> 
            */}

            <ambientLight intensity={1} />
            <directionalLight position={[5, 10, 7]} intensity={2} />
        </group>
    )
}

export default function Community3DScene() {
  return (
    <div className="w-full h-[500px] cursor-pointer">
      <Canvas>
        <PerspectiveCamera makeDefault position={[6, 3, 6]} fov={45} />
        <Scene />
      </Canvas>
    </div>
  )
}
