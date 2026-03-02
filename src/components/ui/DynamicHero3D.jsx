import React, { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Float, MeshDistortMaterial, Sphere, MeshWobbleMaterial } from '@react-three/drei'
import * as THREE from 'three'

function AnimatedShape() {
    const meshRef = useRef()

    useFrame((state) => {
        const time = state.clock.getElapsedTime()
        if (meshRef.current) {
            meshRef.current.rotation.x = Math.cos(time / 4) * 0.2
            meshRef.current.rotation.y = Math.sin(time / 2) * 0.2
        }
    })

    return (
        <Float speed={2} rotationIntensity={1} floatIntensity={2}>
            <Sphere args={[1, 100, 100]} scale={2.4} ref={meshRef}>
                <MeshDistortMaterial
                    color="#4FACFE"
                    attach="material"
                    distort={0.4} // Strength of distortion
                    speed={3} // Speed of animation
                    roughness={0.1}
                    metalness={0.8}
                    emissive="#38F9D7"
                    emissiveIntensity={0.2}
                    transparent
                    opacity={0.8}
                />
            </Sphere>
            {/* Outer Glow Inner */}
            <Sphere args={[1.05, 50, 50]} scale={2.5}>
                <MeshWobbleMaterial
                    color="#38F9D7"
                    factor={0.4}
                    speed={2}
                    transparent
                    opacity={0.15}
                    wireframe
                />
            </Sphere>
        </Float>
    )
}

export default function DynamicHero3D() {
    return (
        <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
            <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1} color="#4FACFE" />
                <spotLight position={[-10, 10, 10]} angle={0.15} penumbra={1} intensity={0.8} color="#38F9D7" />
                <AnimatedShape />
                {/* We keep controls disabled for hero but could enable them for interaction */}
                {/* <OrbitControls enableZoom={false} autoRotate speed={0.5} /> */}
            </Canvas>
        </div>
    )
}
