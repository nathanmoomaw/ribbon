import { useEffect, useRef } from 'react'
import * as THREE from 'three'

// Vertex shader — ripple displacement on a flat plane
const vertexShader = `
uniform float uTime;
uniform vec3 uRipples[24];
uniform float uRippleIntensities[24];
uniform float uRippleTimes[24];
uniform int uRippleCount;
uniform vec3 uDepressions[9];
uniform int uDepressionCount;

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

  // Marble depressions — static bowl-shaped downward displacement
  for (int i = 0; i < 9; i++) {
    if (i >= uDepressionCount) break;
    float dDist = distance(uv, uDepressions[i].xy);
    float dRadius = uDepressions[i].z;
    totalDisp -= smoothstep(dRadius, 0.0, dDist) * 0.07;
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

// Thin-film interference — thickness drives the rainbow, angle shifts it
vec3 thinFilmColor(float thickness, float cosAngle) {
  // Optical path difference: 2 * n * d * cos(theta)
  // n ~= 1.5 (oil film), d = thickness, theta from view angle
  // Phase in terms of visible spectrum wavelengths
  float opd = 2.0 * 1.5 * thickness * (0.6 + 0.4 * cosAngle);

  // Interference for R, G, B wavelengths (in relative units)
  // Red ~= 650nm, Green ~= 530nm, Blue ~= 460nm (normalized so mid-thickness = 1.0)
  float r = 0.5 + 0.5 * cos(6.2832 * opd / 1.0);
  float g = 0.5 + 0.5 * cos(6.2832 * opd / 0.815);
  float b = 0.5 + 0.5 * cos(6.2832 * opd / 0.708);

  return vec3(r, g, b);
}

void main() {
  // View angle approximation
  vec3 viewDir = normalize(vec3(0.0, 0.0, 1.0) - vPosition);
  float cosAngle = abs(dot(vNormal, viewDir));
  float fresnel = 1.0 - cosAngle;
  fresnel = pow(fresnel, 1.5);

  // Multi-layer oil film thickness — realistic swirl patterns
  // Thickness varies spatially to produce different interference colors
  float thickness = 1.0
    + sin(vUv.x * 8.0 + uTime * 0.3) * 0.3
    + cos(vUv.y * 7.0 - uTime * 0.4) * 0.25
    // Slow-moving large swirls (characteristic oil spill bands)
    + sin(vUv.x * 3.0 + vUv.y * 4.0 + uTime * 0.15) * 0.4
    + cos(vUv.x * 5.0 - vUv.y * 3.0 + uTime * 0.2) * 0.35
    // Fine detail streaks
    + sin((vUv.x + vUv.y) * 12.0 + uTime * 0.1) * 0.15
    + cos((vUv.x - vUv.y) * 10.0 - uTime * 0.12) * 0.12
    // Second set of swirls at different scale for richer variation
    + sin(vUv.x * 6.0 - vUv.y * 8.0 + uTime * 0.25) * 0.2
    + cos(vUv.x * 2.0 + vUv.y * 2.5 + uTime * 0.1) * 0.3
    + vDisplacement * 8.0;

  // Primary iridescent color from thin-film physics
  vec3 iriColor = thinFilmColor(thickness, cosAngle);

  // Second thickness layer for depth (real oil has multiple thin layers)
  float thickness2 = thickness * 0.7 + 0.5
    + sin(vUv.x * 4.5 - vUv.y * 6.0 + uTime * 0.18) * 0.25;
  vec3 iriColor2 = thinFilmColor(thickness2, cosAngle);

  // Blend the two interference layers
  vec3 blendedIri = mix(iriColor, iriColor2, 0.35);

  // Dark oil base — more visible in calm areas
  vec3 baseColor = vec3(0.02, 0.02, 0.04);

  // Iridescence strength — always visible, enhanced by fresnel and displacement
  float iriStrength = 0.6 + fresnel * 0.3 + abs(vDisplacement) * 4.0;

  // Position-dependent color patches — some areas more colorful (like real oil films)
  float colorPatch = 0.5 + 0.5 * sin(vUv.x * 4.0 + vUv.y * 3.0 + uTime * 0.08);
  iriStrength *= 0.75 + colorPatch * 0.35;

  vec3 color = mix(baseColor, blendedIri, clamp(iriStrength, 0.0, 1.0));

  // Boost saturation slightly to counter the whitish wash from interference
  float lum = dot(color, vec3(0.299, 0.587, 0.114));
  color = mix(vec3(lum), color, 1.3);

  // Specular highlight
  float spec = pow(fresnel, 4.0) * 0.3;
  color += vec3(spec);

  // Edge glow
  float edge = smoothstep(0.45, 0.5, max(abs(vUv.x - 0.5), abs(vUv.y - 0.5)));
  color = mix(color, baseColor * 0.5, edge);

  gl_FragColor = vec4(color, 0.95 - edge * 0.3);
}
`

export function usePuddleRenderer(containerRef, ripples, getEngine, marbleDepressions) {
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

    // Orthographic fullscreen quad — plane fills NDC exactly regardless of aspect ratio.
    // CSS clip-path owns the puddle shape; Three.js just fills the container with texture.
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10)
    camera.position.set(0, 0, 1)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: false,
      powerPreference: 'default',
    })
    renderer.setClearColor(0x000000, 0)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    rendererRef.current = renderer
    container.appendChild(renderer.domElement)

    // Simple flat plane — fills the camera view exactly; clip-path handles shape
    const geometry = new THREE.PlaneGeometry(2, 2, 64, 64)
    geometry.computeVertexNormals()

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uRipples: { value: new Array(24).fill(null).map(() => new THREE.Vector3(0, 0, 0)) },
        uRippleIntensities: { value: new Float32Array(24) },
        uRippleTimes: { value: new Float32Array(24) },
        uRippleCount: { value: 0 },
        uDepressions: { value: new Array(9).fill(null).map(() => new THREE.Vector3(0, 0, 0)) },
        uDepressionCount: { value: 0 },
      },
      transparent: true,
      side: THREE.DoubleSide,
    })
    materialRef.current = material

    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)

    // Resize handler — ortho camera fills NDC regardless of aspect; just update renderer
    function resize() {
      const w = container.clientWidth
      const h = container.clientHeight
      if (w === 0 || h === 0) return
      renderer.setSize(w, h)
    }
    resize()

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(container)

    // UV remapping: ortho fullscreen quad → UV 0-1 maps directly to div 0-1
    const UV_X_SCALE = 1.0, UV_X_OFF = 0.0
    const UV_Y_SCALE = 1.0, UV_Y_OFF = 0.0

    // Pre-allocate Vector3 objects so animate loop never heap-allocates
    const rippleVecs = new Array(24).fill(null).map(() => new THREE.Vector3())

    // Idle throttling: render at 30fps when no active ripples, 60fps when busy
    let lastRenderTime = 0

    // Animation loop
    function animate(now) {
      frameRef.current = requestAnimationFrame(animate)

      // Pause when tab is not visible
      if (document.hidden) return

      const rips = ripples.current
      const count = Math.min(rips.length, 24)
      const elapsed = (now - startTime.current) / 1000

      // Throttle to 30fps when idle (no active ripples)
      const hasActiveRipples = count > 0 && rips.some(r => elapsed - (r.t - startTime.current) / 1000 < 3.5)
      const targetInterval = hasActiveRipples ? 1000 / 60 : 1000 / 30
      if (now - lastRenderTime < targetInterval - 1) return
      lastRenderTime = now

      material.uniforms.uTime.value = elapsed
      material.uniforms.uRippleCount.value = count

      // Update ripple uniforms — reuse pre-allocated vectors (no heap allocation)
      for (let i = 0; i < count; i++) {
        const r = rips[rips.length - count + i]
        rippleVecs[i].set(
          r.x * UV_X_SCALE + UV_X_OFF,
          r.y * UV_Y_SCALE + UV_Y_OFF,
          0
        )
        material.uniforms.uRipples.value[i] = rippleVecs[i]
        material.uniforms.uRippleIntensities.value[i] = r.intensity
        material.uniforms.uRippleTimes.value[i] = (r.t - startTime.current) / 1000
      }

      // Update marble depression uniforms
      const deps = marbleDepressions?.current ?? []
      const depCount = Math.min(deps.length, 9)
      material.uniforms.uDepressionCount.value = depCount
      for (let i = 0; i < depCount; i++) {
        material.uniforms.uDepressions.value[i].set(
          deps[i].x * UV_X_SCALE + UV_X_OFF,
          deps[i].y * UV_Y_SCALE + UV_Y_OFF,
          deps[i].radius * (UV_X_SCALE + UV_Y_SCALE) / 2
        )
      }

      renderer.render(scene, camera)
    }
    animate(performance.now())

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
