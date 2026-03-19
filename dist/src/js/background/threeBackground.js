export function initThreeBackground() {
    const container = document.getElementById("webgl-background");
    if (!container || typeof THREE === "undefined") return () => {};

    if (typeof container.__threeCleanup === "function") {
        container.__threeCleanup();
    }

    /* =========================
       SETTINGS
    ========================= */
    const isCoarsePointer = typeof window.matchMedia === "function"
        && window.matchMedia("(pointer: coarse)").matches;
    const isSmallViewport = window.innerWidth <= 900;
    const PARTICLE_COUNT = isCoarsePointer || isSmallViewport ? 900 : 1500;
    const MAX_SPARKS = isCoarsePointer || isSmallViewport ? 70 : 150;
    const SEGMENTS_PER_SPARK = isCoarsePointer || isSmallViewport ? 4 : 6;
    const ATTRACTION_RADIUS = 10.0;
    const PULL_STRENGTH = 0.08;
    const FIELD_SIZE = 40; // Size of the floating area
    let animationFrameId = null;
    let isDisposed = false;

    // Scene
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    // Dynamic distance to ensure globe fits on screen
    camera.position.z = Math.max(12, 12 * (window.innerHeight / window.innerWidth));

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: !isCoarsePointer, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isCoarsePointer ? 1.2 : 2));
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    /* =========================
       TEXTURES (NEON & GLOW)
    ========================= */
    const createWhiteGlowingCircle = (alphaStops) => {
        const canvas = document.createElement("canvas");
        canvas.width = 64; canvas.height = 64;
        const ctx = canvas.getContext("2d");
        const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        alphaStops.forEach(stop => grad.addColorStop(stop.offset, `rgba(255, 255, 255, ${stop.alpha})`));
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 64, 64);
        return new THREE.CanvasTexture(canvas);
    };

    // Base White Textures (Colorizing handled in material)
    const particleTexture = createWhiteGlowingCircle([
        { offset: 0, alpha: 1 },
        { offset: 0.2, alpha: 0.8 },
        { offset: 0.5, alpha: 0.2 },
        { offset: 1, alpha: 0 }
    ]);

    // Bright Core (Follows Mouse)
    const coreTexture = createWhiteGlowingCircle([
        { offset: 0, alpha: 1 },
        { offset: 0.2, alpha: 1 },
        { offset: 0.5, alpha: 0.6 },
        { offset: 1, alpha: 0 }
    ]);

    // Define colors to transition between (Purple and Blue)
    const COLOR_PURPLE = new THREE.Color(0xa200ff);
    const COLOR_BLUE = new THREE.Color(0x1d4ed8);

    /* =========================
       GEOMETRY - PARTICLES
    ========================= */
    const COMET_COUNT = isCoarsePointer || isSmallViewport ? 18 : 30; // Meteors shooting to center
    const STRAY_COUNT = isCoarsePointer || isSmallViewport ? 160 : 300; // Random asteroids/atoms floating outside
    const ORBITAL_COUNT = PARTICLE_COUNT - COMET_COUNT - STRAY_COUNT;

    const ORBIT_COUNT = 5; // Number of distinct planet/electron orbital paths
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const velocities = new Float32Array(PARTICLE_COUNT * 3);
    const orbitAxes = new Float32Array(PARTICLE_COUNT * 3);
    const targetRadii = new Float32Array(PARTICLE_COUNT);
    const phases = new Float32Array(PARTICLE_COUNT);
    const particleTypes = new Int8Array(PARTICLE_COUNT); // 0: Orbital, 1: Stray, 2: Comet

    // Pre-define 3D tilted axes for the orbits to get an "Atomic" look
    const orbitTiltedAxes = [];
    for (let r = 0; r < ORBIT_COUNT; r++) {
        const ax = (Math.random() - 0.5);
        const ay = (Math.random() - 0.5);
        const az = (Math.random() - 0.5);
        const len = Math.sqrt(ax * ax + ay * ay + az * az);
        orbitTiltedAxes.push({ x: ax / len, y: ay / len, z: az / len });
    }

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        // Distribute points randomly in a box initially
        positions[i * 3] = (Math.random() - 0.5) * FIELD_SIZE;
        positions[i * 3 + 1] = (Math.random() - 0.5) * FIELD_SIZE;
        positions[i * 3 + 2] = (Math.random() - 0.5) * (FIELD_SIZE / 2);

        // Assign particle types
        let type = 0; // Orbital
        if (i >= ORBITAL_COUNT + STRAY_COUNT) {
            type = 2; // Comet
        } else if (i >= ORBITAL_COUNT) {
            type = 1; // Stray
        }
        particleTypes[i] = type;

        if (type === 2) {
            // Comets get fast speeds
            velocities[i * 3] = (Math.random() - 0.5) * 0.1;
            velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.1;
            velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.1;
        } else {
            // Slow, random velocities for Orbitals and Strays
            velocities[i * 3] = (Math.random() - 0.5) * 0.02;
            velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.02;
            velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.01;
        }

        if (type === 0) {
            // Assign each orbital particle to a specific 3D ring
            const orbitIndex = i % ORBIT_COUNT;
            const axis = orbitTiltedAxes[orbitIndex];

            orbitAxes[i * 3] = axis.x;
            orbitAxes[i * 3 + 1] = axis.y;
            orbitAxes[i * 3 + 2] = axis.z;

            // Define fixed radii for these planetary orbits (e.g. 3, 4.5, 6, 7.5, 9)
            targetRadii[i] = 3.0 + orbitIndex * 1.5 + (Math.random() - 0.5) * 0.4;
        } else if (type === 1) {
            // Strays just orbit randomly at a very wide, loose distance
            const ax = Math.random() - 0.5;
            const ay = Math.random() - 0.5;
            const az = Math.random() - 0.5;
            const len = Math.sqrt(ax * ax + ay * ay + az * az) || 1;
            orbitAxes[i * 3] = ax / len;
            orbitAxes[i * 3 + 1] = ay / len;
            orbitAxes[i * 3 + 2] = az / len;

            // Stray radius is large and random
            targetRadii[i] = 10.0 + Math.random() * 8.0;
        }

        phases[i] = Math.random() * Math.PI * 2;
    }

    const particlesGeo = new THREE.BufferGeometry();
    particlesGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const particlesMat = new THREE.PointsMaterial({
        size: 0.25,
        map: particleTexture,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0.8
    });

    const particlesMesh = new THREE.Points(particlesGeo, particlesMat);
    scene.add(particlesMesh);

    /* =========================
       INNER MOUSE CORE 
    ========================= */
    const coreMat = new THREE.SpriteMaterial({
        map: coreTexture,
        color: 0xffffff,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
        opacity: 0 // hidden initially
    });
    const coreSprite = new THREE.Sprite(coreMat);
    coreSprite.scale.set(4, 4, 1);
    scene.add(coreSprite);

    /* =========================
       SPARKS (LIGHTNING RAYS)
    ========================= */
    const TOTAL_LINE_SEGMENTS = MAX_SPARKS * SEGMENTS_PER_SPARK;
    const sparkPositions = new Float32Array(TOTAL_LINE_SEGMENTS * 2 * 3);
    const sparkColors = new Float32Array(TOTAL_LINE_SEGMENTS * 2 * 3);

    const sparkGeo = new THREE.BufferGeometry();
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3).setUsage(THREE.DynamicDrawUsage));
    sparkGeo.setAttribute('color', new THREE.BufferAttribute(sparkColors, 3).setUsage(THREE.DynamicDrawUsage));

    const sparkMat = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0.9,
    });

    const sparkMesh = new THREE.LineSegments(sparkGeo, sparkMat);
    scene.add(sparkMesh);

    const sparks = [];
    for (let i = 0; i < MAX_SPARKS; i++) {
        sparks.push({
            life: 0,
            maxLife: 0,
            vertices: []
        });
    }

    /* =========================
       MOUSE INTERACTION
    ========================= */
    const mouse = new THREE.Vector2(999, 999);
    const mousePos3D = new THREE.Vector3();

    const resetMouse = () => {
        mouse.set(999, 999);
    };

    const updatePointer = (clientX, clientY) => {
        // Map 2D mouse exactly to the 3D plane
        mouse.x = (clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(clientY / window.innerHeight) * 2 + 1;

        const vector = new THREE.Vector3(mouse.x, mouse.y, 0.5);
        vector.unproject(camera);
        const dir = vector.sub(camera.position).normalize();

        if (Math.abs(dir.z) < 0.0001) {
            return;
        }

        // Find intersection where z = 0
        const distance = -camera.position.z / dir.z;
        const pos = camera.position.clone().add(dir.multiplyScalar(distance));
        mousePos3D.copy(pos);
    };

    const handleMouseMove = (e) => {
        updatePointer(e.clientX, e.clientY);
    };

    const handleTouchMove = (e) => {
        const touch = e.touches[0];

        if (!touch) {
            return;
        }

        updatePointer(touch.clientX, touch.clientY);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchstart", handleTouchMove, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", resetMouse, { passive: true });
    window.addEventListener("touchcancel", resetMouse, { passive: true });
    document.addEventListener("mouseleave", resetMouse);
    window.addEventListener("blur", resetMouse);

    /* =========================
       ANIMATION LOOP
    ========================= */
    const clock = new THREE.Clock();
    let lastTime = 0;

    function animate() {
        if (isDisposed) {
            return;
        }

        animationFrameId = requestAnimationFrame(animate);

        const time = clock.getElapsedTime();
        const dt = time - lastTime;
        lastTime = time;

        // Dynamic Color Transition (Sine wave oscillating smoothly between 0 and 1)
        const colorMix = (Math.sin(time * 0.5) + 1) / 2;

        // Update global materials smoothly between purple and blue
        particlesMat.color.copy(COLOR_PURPLE).lerp(COLOR_BLUE, colorMix);
        coreMat.color.copy(COLOR_BLUE).lerp(COLOR_PURPLE, colorMix); // Opposite phase for core

        // Sync HTML Navbar color perfectly with the atoms
        document.documentElement.style.setProperty('--nav-color', '#' + particlesMat.color.getHexString());

        // 1. Update Core Sprite (Mouse Glow)
        if (mouse.x !== 999) {
            coreSprite.position.lerp(mousePos3D, 0.2);
            coreSprite.material.opacity = Math.min(1, coreSprite.material.opacity + 0.1);
            coreSprite.scale.set(
                3 + Math.sin(time * 15) * 0.4,
                3 + Math.sin(time * 15) * 0.4,
                1
            );
        } else {
            coreSprite.material.opacity = Math.max(0, coreSprite.material.opacity - 0.05);
        }

        // Keep track of particles that are near the ring for lightning targets
        const ringParticles = [];

        // 2. Update all particles
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            let ix = i * 3;
            const pType = particleTypes[i];

            // Wrap around edges to simulate infinite field for Orbitals/Strays
            if (pType !== 2) {
                const halfField = FIELD_SIZE / 2;
                if (positions[ix] > halfField) positions[ix] = -halfField;
                if (positions[ix] < -halfField) positions[ix] = halfField;
                if (positions[ix + 1] > halfField) positions[ix + 1] = -halfField;
                if (positions[ix + 1] < -halfField) positions[ix + 1] = halfField;
            }

            // Mouse gravity active
            if (mouse.x !== 999 && coreSprite.material.opacity > 0.1) {
                const dx = coreSprite.position.x - positions[ix];
                const dy = coreSprite.position.y - positions[ix + 1];
                const dz = coreSprite.position.z - positions[ix + 2]; // Full 3D distance

                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

                // --- TYPE 2: COMETS (Shooting Stars towards center) ---
                if (pType === 2) {
                    if (dist < 1.0) {
                        // Comet hit the core, respawn it far away
                        positions[ix] = coreSprite.position.x + (Math.random() - 0.5) * 30;
                        positions[ix + 1] = coreSprite.position.y + (Math.random() - 0.5) * 30;
                        positions[ix + 2] = coreSprite.position.z + (Math.random() - 0.5) * 20;

                        // Give it new high velocity towards the center
                        const cdx = coreSprite.position.x - positions[ix];
                        const cdy = coreSprite.position.y - positions[ix + 1];
                        const cdz = coreSprite.position.z - positions[ix + 2];
                        const cdist = Math.sqrt(cdx * cdx + cdy * cdy + cdz * cdz);

                        // Slightly random approach angle
                        velocities[ix] = (cdx / cdist) * 0.2 + (Math.random() - 0.5) * 0.05;
                        velocities[ix + 1] = (cdy / cdist) * 0.2 + (Math.random() - 0.5) * 0.05;
                        velocities[ix + 2] = (cdz / cdist) * 0.2 + (Math.random() - 0.5) * 0.05;
                    } else if (dist < ATTRACTION_RADIUS * 2) {
                        // Accelerate towards the center
                        positions[ix] += velocities[ix];
                        positions[ix + 1] += velocities[ix + 1];
                        positions[ix + 2] += velocities[ix + 2];

                        // Leave a higher chance of spark trailing for comets
                        if (Math.random() > 0.8) ringParticles.push(ix);
                    } else {
                        // Just float until mouse comes close
                        positions[ix] += velocities[ix] * 0.2;
                        positions[ix + 1] += velocities[ix + 1] * 0.2;
                        positions[ix + 2] += velocities[ix + 2] * 0.2;
                    }

                    // --- TYPE 0: ORBITAL PLANETS & TYPE 1: STRAY ASTEROIDS ---
                } else {
                    const maxDistCheck = pType === 0 ? ATTRACTION_RADIUS + 5.0 : ATTRACTION_RADIUS + 8.0;
                    if (dist < maxDistCheck && dist > 0.1) {
                        const dirX = dx / dist;
                        const dirY = dy / dist;
                        const dirZ = dz / dist;

                        const specificRadius = targetRadii[i];
                        const distFromOrbit = dist - specificRadius;

                        // Smooth falloff to pull particles to their designated radius
                        // Orbitals have a tight falloff, strays have a very loose chaotic falloff
                        const maxPullDist = pType === 0 ? ATTRACTION_RADIUS + 5.0 : ATTRACTION_RADIUS + 10.0;
                        const force = (maxPullDist - Math.abs(distFromOrbit)) / maxPullDist;

                        if (force > 0) {
                            // Pull towards the specific orbital shell radius
                            const pullMult = pType === 0 ? 1.5 : 0.4; // Strays pull very loosely
                            positions[ix] += dirX * distFromOrbit * force * PULL_STRENGTH * pullMult;
                            positions[ix + 1] += dirY * distFromOrbit * force * PULL_STRENGTH * pullMult;
                            positions[ix + 2] += dirZ * distFromOrbit * force * PULL_STRENGTH * pullMult;

                            // Orbital Force (Tangential movement using cross product)
                            const ax = orbitAxes[ix];
                            const ay = orbitAxes[ix + 1];
                            const az = orbitAxes[ix + 2];

                            // Type 0 (Planets) are forced onto a flat 2D plane ring along their axis
                            if (pType === 0) {
                                const distFromPlane = (-dx * ax + -dy * ay + -dz * az);
                                positions[ix] -= ax * distFromPlane * 0.05;
                                positions[ix + 1] -= ay * distFromPlane * 0.05;
                                positions[ix + 2] -= az * distFromPlane * 0.05;
                            }

                            // Cross product of dir (direction to center) and axis vector gives rotation direction
                            const crossX = dirY * az - dirZ * ay;
                            const crossY = dirZ * ax - dirX * az;
                            const crossZ = dirX * ay - dirY * ax;

                            // Speed of rotation
                            // Type 0: Inner orbits spin faster, Type 1: chaotic slow spin
                            const orbitSpeed = pType === 0 ? (0.2 + (10.0 / specificRadius) * 0.05) * force : 0.05 * force;
                            positions[ix] += crossX * orbitSpeed;
                            positions[ix + 1] += crossY * orbitSpeed;
                            positions[ix + 2] += crossZ * orbitSpeed;
                        }

                        // Mark as a valid target for lightning if it's very close to its orbit
                        if (Math.abs(distFromOrbit) < 1.0 && pType === 0) {
                            ringParticles.push(ix);
                        }
                    } else {
                        // Float naturally if outside gravity
                        positions[ix] += velocities[ix];
                        positions[ix + 1] += velocities[ix + 1];
                        positions[ix + 2] += velocities[ix + 2];
                        positions[ix + 2] += Math.sin(time + phases[i]) * 0.005; // neon pulse
                    }
                }
            } else {
                // Return to floating naturally when mouse is completely away
                positions[ix] += velocities[ix] * (pType === 2 ? 0.2 : 1.0); // Slow down comets when idle
                positions[ix + 1] += velocities[ix + 1] * (pType === 2 ? 0.2 : 1.0);
                positions[ix + 2] += velocities[ix + 2] * (pType === 2 ? 0.2 : 1.0);
                positions[ix + 2] += Math.sin(time + phases[i]) * 0.005; // neon pulse
            }
        }

        particlesGeo.attributes.position.needsUpdate = true;

        // 3. Update Sparks (Lightning Physics)
        let lineIdx = 0;

        for (let i = 0; i < MAX_SPARKS; i++) {
            const spark = sparks[i];

            // Re-ignite a dead spark
            if (spark.life <= 0) {
                // Only spawn new sparks if mouse is active and we have ring particles
                if (mouse.x !== 999 && ringParticles.length > 5 && Math.random() > 0.4) {
                    spark.life = 0.05 + Math.random() * 0.1; // Flash duration
                    spark.maxLife = spark.life;

                    // Pick a random particle on the ring to zap
                    const randomRingIx = ringParticles[Math.floor(Math.random() * ringParticles.length)];

                    const targetVec = new THREE.Vector3(
                        positions[randomRingIx],
                        positions[randomRingIx + 1],
                        positions[randomRingIx + 2]
                    );

                    // Add slight random offset to the impact point 
                    targetVec.x += (Math.random() - 0.5) * 0.5;
                    targetVec.y += (Math.random() - 0.5) * 0.5;

                    // Generate jagged path
                    spark.vertices = [];
                    const start = coreSprite.position;

                    for (let s = 0; s <= SEGMENTS_PER_SPARK; s++) {
                        const t = s / SEGMENTS_PER_SPARK;
                        const p = new THREE.Vector3().lerpVectors(start, targetVec, t);

                        // Jiggle middle segments
                        if (s > 0 && s < SEGMENTS_PER_SPARK) {
                            const noiseAmplitude = 0.8 * Math.sin(t * Math.PI);
                            p.x += (Math.random() - 0.5) * noiseAmplitude;
                            p.y += (Math.random() - 0.5) * noiseAmplitude;
                            p.z += (Math.random() - 0.5) * noiseAmplitude;
                        }
                        spark.vertices.push(p);
                    }
                }
            } else {
                spark.life -= dt;
            }

            // Draw active spark
            if (spark.life > 0) {
                const alpha = Math.max(0, spark.life / spark.maxLife);

                for (let s = 0; s < SEGMENTS_PER_SPARK; s++) {
                    const p1 = spark.vertices[s];
                    const p2 = spark.vertices[s + 1];

                    const pIdx = lineIdx * 6;
                    sparkPositions[pIdx] = p1.x;
                    sparkPositions[pIdx + 1] = p1.y;
                    sparkPositions[pIdx + 2] = p1.z;
                    sparkPositions[pIdx + 3] = p2.x;
                    sparkPositions[pIdx + 4] = p2.y;
                    sparkPositions[pIdx + 5] = p2.z;

                    const cIdx = lineIdx * 6;

                    // Sync spark color with current dynamic particle color
                    const pCol = particlesMat.color;

                    sparkColors[cIdx] = pCol.r * alpha * 1.5;
                    sparkColors[cIdx + 1] = pCol.g * alpha * 1.5;
                    sparkColors[cIdx + 2] = pCol.b * alpha * 1.5;

                    sparkColors[cIdx + 3] = pCol.r * alpha * 1.5;
                    sparkColors[cIdx + 4] = pCol.g * alpha * 1.5;
                    sparkColors[cIdx + 5] = pCol.b * alpha * 1.5;

                    lineIdx++;
                }
            }
        }

        sparkGeo.attributes.position.needsUpdate = true;
        sparkGeo.attributes.color.needsUpdate = true;
        sparkGeo.setDrawRange(0, lineIdx * 2);

        renderer.render(scene, camera);
    }

    animate();

    /* =========================
       RESIZE
    ========================= */
    const handleResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        camera.position.z = Math.max(12, 12 * (window.innerHeight / window.innerWidth));
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, isCoarsePointer ? 1.2 : 2));
    };

    window.addEventListener("resize", handleResize);

    const cleanup = () => {
        if (isDisposed) {
            return;
        }

        isDisposed = true;
        container.__threeCleanup = null;

        if (animationFrameId !== null) {
            cancelAnimationFrame(animationFrameId);
        }

        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("touchstart", handleTouchMove);
        window.removeEventListener("touchmove", handleTouchMove);
        window.removeEventListener("touchend", resetMouse);
        window.removeEventListener("touchcancel", resetMouse);
        document.removeEventListener("mouseleave", resetMouse);
        window.removeEventListener("blur", resetMouse);
        window.removeEventListener("resize", handleResize);

        particlesGeo.dispose();
        particlesMat.dispose();
        particleTexture.dispose();
        coreTexture.dispose();
        coreMat.dispose();
        sparkGeo.dispose();
        sparkMat.dispose();
        renderer.dispose();

        if (typeof renderer.forceContextLoss === "function") {
            renderer.forceContextLoss();
        }

        container.replaceChildren();
    };

    container.__threeCleanup = cleanup;

    return cleanup;
}
