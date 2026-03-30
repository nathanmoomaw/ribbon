import { useEffect, useRef } from 'react'
import * as THREE from 'three'

// Vertex shader — ripple displacement on a flat plane
const vertexShader = `
uniform float uTime;
uniform vec3 uRipples[24];
uniform float uRippleIntensities[24];
uniform float uRippleTimes[24];
uniform int uRippleCount;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
varying float vDisplacement;

void main() {
  vUv = uv;
  vec3 pos = position;
  float totalDisp = 0.0;

  for (int i = 0; i < 24; i++) {
    if (i >= uRippleCount) break;
    float age = uTime - uRippleTimes[i];
    if (age < 0.0 || age > 4.0) continue;

    float dist = distance(uv, uRipples[i].xy);
    float rippleRadius = age * 0.3;
    float ringWidth = 0.08;
    float ring = 1.0 - smoothstep(0.0, ringWidth, abs(dist - rippleRadius));
    float decay = exp(-age * 1.5) * uRippleIntensities[i];
    float disp = ring * decay * 0.15;
    totalDisp += disp;
  }

  // Ambient undulation — slow organic surface movement
  totalDisp += sin(uv.x * 6.0 + uTime * 0.8) * cos(uv.y * 5.0 + uTime * 0.6) * 0.018;
  totalDisp += sin(uv.x * 3.0 + uv.y * 4.0 + uTime * 0.3) * 0.008;
  totalDisp += cos(uv.x * 5.0 - uv.y * 2.0 + uTime * 0.2) * 0.006;

  pos.z += totalDisp;
  vDisplacement = totalDisp;
  vPosition = pos;
  vNormal = normalize(normal + vec3(0.0, 0.0, totalDisp * 5.0));

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`

// Fragment shader — iridescent oil film effect (thin-film interference)
const fragmentShader = `
uniform float uTime;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
varying float vDisplacement;

// Thin-film interference — maps angle to rainbow hue
vec3 iridescence(float angle, float thickness) {
  float phase = angle * thickness * 6.2832;
  return vec3(
    0.5 + 0.5 * cos(phase),
    0.5 + 0.5 * cos(phase + 2.094),
    0.5 + 0.5 * cos(phase + 4.189)
  );
}

void main() {
  // View angle approximation
  vec3 viewDir = normalize(vec3(0.0, 0.0, 1.0) - vPosition);
  float fresnel = 1.0 - abs(dot(vNormal, viewDir));
  fresnel = pow(fresnel, 1.5);

  // Multi-layer oil film thickness — realistic swirl patterns
  float thickness = 1.0
    + sin(vUv.x * 8.0 + uTime * 0.3) * 0.3
    + cos(vUv.y * 7.0 - uTime * 0.4) * 0.25
    // Slow-moving large swirls (characteristic oil spill bands)
    + sin(vUv.x * 3.0 + vUv.y * 4.0 + uTime * 0.15) * 0.4
    + cos(vUv.x * 5.0 - vUv.y * 3.0 + uTime * 0.2) * 0.35
    // Fine detail streaks
    + sin((vUv.x + vUv.y) * 12.0 + uTime * 0.1) * 0.15
    + cos((vUv.x - vUv.y) * 10.0 - uTime * 0.12) * 0.12
    + vDisplacement * 8.0;

  vec3 iriColor = iridescence(fresnel, thickness);

  // Dark oil base — more visible in calm areas
  vec3 baseColor = vec3(0.02, 0.02, 0.04);

  // Stronger base iridescence — visible rainbow even when calm
  float iriStrength = 0.55 + fresnel * 0.35 + abs(vDisplacement) * 4.0;

  // Position-dependent color patches — some areas more colorful (like real oil films)
  float colorPatch = 0.5 + 0.5 * sin(vUv.x * 4.0 + vUv.y * 3.0 + uTime * 0.08);
  iriStrength *= 0.7 + colorPatch * 0.4;

  vec3 color = mix(baseColor, iriColor, clamp(iriStrength, 0.0, 1.0));

  // Specular highlight
  float spec = pow(fresnel, 4.0) * 0.3;
  color += vec3(spec);

  // Edge glow
  float edge = smoothstep(0.45, 0.5, max(abs(vUv.x - 0.5), abs(vUv.y - 0.5)));
  color = mix(color, baseColor * 0.5, edge);

  gl_FragColor = vec4(color, 0.95 - edge * 0.3);
}
`

export function usePuddleRenderer(containerRef, ripples, getEngine) {
  const sceneRef = useRef(null)
  const rendererRef = useRef(null)
  const cameraRef = useRef(null)
  const materialRef = useRef(null)
  const frameRef = useRef(0)
  const startTime = useRef(performance.now())

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Scene setup
    const scene = new THREE.Scene()
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
    camera.position.set(0, 0, 1.8)
    camera.lookAt(0, 0, 0)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    })
    renderer.setClearColor(0x000000, 0)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    rendererRef.current = renderer
    container.appendChild(renderer.domElement)

    // Puddle mesh — subdivided plane
    const geometry = new THREE.PlaneGeometry(2, 2, 96, 96)

    // Warp vertices into an organic oil-puddle blob — irregular, not circular
    const posAttr = geometry.attributes.position
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i)
      const y = posAttr.getY(i)
      const dist = Math.sqrt(x * x + y * y)
      const angle = Math.atan2(y, x)
      // Irregular blob boundary — multiple harmonics for organic feel
      const blobRadius = 0.78
        + 0.12 * Math.sin(angle * 2 + 0.5)
        + 0.08 * Math.cos(angle * 3 - 0.8)
        + 0.06 * Math.sin(angle * 5 + 2.1)
        + 0.04 * Math.cos(angle * 7 + 0.3)
        + 0.03 * Math.sin(angle * 11 - 1.5) // high-freq wobble
        // Small lobe protrusions at specific angles (like the sketch)
        + 0.10 * Math.max(0, Math.cos(angle - 0.8)) // upper-right lobe
        + 0.08 * Math.max(0, Math.cos(angle + 2.5)) // lower-left bump
        + 0.06 * Math.max(0, Math.cos(angle + 0.5)) // upper-left bump
      if (dist > blobRadius) {
        const scale = blobRadius / dist
        posAttr.setXY(i, x * scale, y * scale)
      }
    }
    posAttr.needsUpdate = true
    geometry.computeVertexNormals()

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uRipples: { value: new Array(24).fill(new THREE.Vector3(0, 0, 0)) },
        uRippleIntensities: { value: new Float32Array(24) },
        uRippleTimes: { value: new Float32Array(24) },
        uRippleCount: { value: 0 },
      },
      transparent: true,
      side: THREE.DoubleSide,
    })
    materialRef.current = material

    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)

    // Resize handler
    function resize() {
      const w = container.clientWidth
      const h = container.clientHeight
      if (w === 0 || h === 0) return
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    resize()

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(container)

    // Animation loop
    function animate() {
      frameRef.current = requestAnimationFrame(animate)

      const now = performance.now()
      const elapsed = (now - startTime.current) / 1000
      material.uniforms.uTime.value = elapsed

      // Update ripple uniforms from the shared ripple buffer
      const rips = ripples.current
      const count = Math.min(rips.length, 24)
      material.uniforms.uRippleCount.value = count

      for (let i = 0; i < count; i++) {
        const r = rips[rips.length - count + i]
        material.uniforms.uRipples.value[i] = new THREE.Vector3(r.x, r.y, 0)
        material.uniforms.uRippleIntensities.value[i] = r.intensity
        material.uniforms.uRippleTimes.value[i] = (r.t - startTime.current) / 1000
      }

      // Gentle camera bob
      camera.position.x = Math.sin(elapsed * 0.2) * 0.02
      camera.position.y = Math.cos(elapsed * 0.15) * 0.02

      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(frameRef.current)
      resizeObserver.disconnect()
      renderer.dispose()
      geometry.dispose()
      material.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [containerRef, ripples, getEngine])

  return { materialRef }
}
