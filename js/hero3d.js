// Three.js immersive Ferrari hero scene
(function () {
  if (typeof THREE === "undefined") return;

  const canvas = document.getElementById("hero3d");
  if (!canvas) return;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a18);
  scene.fog = new THREE.Fog(0x2a1030, 30, 180);

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 500);
  camera.position.set(0, 2.8, 8);
  camera.lookAt(0, 1, -20);

  // ---------- Lighting ----------
  scene.add(new THREE.AmbientLight(0x556699, 0.4));
  const sun = new THREE.DirectionalLight(0xffb070, 1.2);
  sun.position.set(-8, 10, -5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -15;
  sun.shadow.camera.right = 15;
  sun.shadow.camera.top = 15;
  sun.shadow.camera.bottom = -15;
  scene.add(sun);

  const carFill = new THREE.PointLight(0xff3020, 1.2, 12);
  carFill.position.set(0, 2, 2);
  scene.add(carFill);

  // ---------- Sky dome with sunset gradient ----------
  const skyGeo = new THREE.SphereGeometry(250, 32, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      topColor:    { value: new THREE.Color(0x0a0a28) },
      midColor:    { value: new THREE.Color(0x6a2050) },
      bottomColor: { value: new THREE.Color(0xf07030) }
    },
    vertexShader: `
      varying vec3 vWorld;
      void main() {
        vWorld = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor, midColor, bottomColor;
      varying vec3 vWorld;
      void main() {
        float h = normalize(vWorld).y;
        vec3 col;
        if (h > 0.0) col = mix(midColor, topColor, h);
        else         col = mix(midColor, bottomColor, -h * 2.0);
        gl_FragColor = vec4(col, 1.0);
      }
    `
  });
  scene.add(new THREE.Mesh(skyGeo, skyMat));

  // Sun disc
  const sunDisc = new THREE.Mesh(
    new THREE.CircleGeometry(6, 32),
    new THREE.MeshBasicMaterial({ color: 0xfff2c0, transparent: true, opacity: 0.95, fog: false })
  );
  sunDisc.position.set(-10, 6, -80);
  scene.add(sunDisc);

  // ---------- Road ----------
  const roadLength = 400;
  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(14, roadLength),
    new THREE.MeshStandardMaterial({ color: 0x1c1c20, roughness: 0.9, metalness: 0 })
  );
  road.rotation.x = -Math.PI / 2;
  road.position.z = -roadLength / 2 + 20;
  road.receiveShadow = true;
  scene.add(road);

  // Lane dashes (yellow strips that scroll toward camera)
  const dashGroup = new THREE.Group();
  const dashGeo = new THREE.PlaneGeometry(0.3, 3);
  const dashMat = new THREE.MeshStandardMaterial({
    color: 0xf8e050, emissive: 0x553500, roughness: 0.5
  });
  const dashSpacing = 8;
  const dashCount = 60;
  for (let i = 0; i < dashCount; i++) {
    const d = new THREE.Mesh(dashGeo, dashMat);
    d.rotation.x = -Math.PI / 2;
    d.position.set(0, 0.01, -i * dashSpacing);
    dashGroup.add(d);
  }
  scene.add(dashGroup);

  // Kerbs (red & white rumble strips on edges)
  function makeKerb(xOffset) {
    const group = new THREE.Group();
    const segLen = 2;
    const count = roadLength / segLen;
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: i % 2 === 0 ? 0xe10600 : 0xffffff, roughness: 0.6
      });
      const seg = new THREE.Mesh(new THREE.BoxGeometry(1, 0.15, segLen), mat);
      seg.position.set(xOffset, 0.08, -i * segLen + 10);
      group.add(seg);
    }
    return group;
  }
  const kerbLeft = makeKerb(-7.5);
  const kerbRight = makeKerb(7.5);
  scene.add(kerbLeft, kerbRight);

  // Grass / outside
  const grass = new THREE.Mesh(
    new THREE.PlaneGeometry(400, roadLength),
    new THREE.MeshStandardMaterial({ color: 0x203020, roughness: 1 })
  );
  grass.rotation.x = -Math.PI / 2;
  grass.position.set(0, -0.05, -roadLength / 2 + 20);
  grass.receiveShadow = true;
  scene.add(grass);

  // ---------- Grandstands & distant ambience ----------
  function makeGrandstand(side) {
    const g = new THREE.Group();
    const tiers = 6;
    for (let t = 0; t < tiers; t++) {
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(4, 0.8, 40),
        new THREE.MeshStandardMaterial({ color: 0x202028, roughness: 0.8 })
      );
      box.position.set(side * (12 + t * 0.9), 1 + t * 0.8, -40);
      g.add(box);
    }
    return g;
  }
  scene.add(makeGrandstand(-1));
  scene.add(makeGrandstand(1));

  // ---------- Ferrari F1 car (procedural) ----------
  const FERRARI_RED = 0xE10600;
  const DARK = 0x0a0a0a;

  const car = new THREE.Group();

  // Main body / chassis
  const chassisMat = new THREE.MeshStandardMaterial({
    color: FERRARI_RED, roughness: 0.35, metalness: 0.5
  });
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.4, 4.2), chassisMat);
  chassis.position.y = 0.55;
  chassis.castShadow = true;
  car.add(chassis);

  // Tapered nose — two trapezoid segments
  const nose = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.45, 1.6, 6),
    chassisMat
  );
  nose.rotation.z = Math.PI / 2;
  nose.position.set(0, 0.5, 2.8);
  nose.castShadow = true;
  car.add(nose);

  // Sidepods
  const sidepodMat = new THREE.MeshStandardMaterial({
    color: 0xc40500, roughness: 0.45, metalness: 0.4
  });
  for (const sx of [-1, 1]) {
    const pod = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 2.2), sidepodMat);
    pod.position.set(sx * 0.85, 0.5, 0.3);
    pod.castShadow = true;
    car.add(pod);
  }

  // Engine cover / airbox behind driver
  const airbox = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.6, 1.4),
    new THREE.MeshStandardMaterial({ color: DARK, roughness: 0.5 })
  );
  airbox.position.set(0, 1.0, -0.8);
  airbox.castShadow = true;
  car.add(airbox);

  // Halo
  const haloMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3, metalness: 0.7 });
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.06, 8, 24, Math.PI), haloMat);
  halo.rotation.x = Math.PI / 2;
  halo.position.set(0, 1.15, 0.2);
  car.add(halo);

  // Cockpit opening
  const cockpit = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.25, 0.7),
    new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.2 })
  );
  cockpit.position.set(0, 0.86, 0.2);
  car.add(cockpit);

  // Rear wing
  const rearWingPlate = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.08, 0.4),
    chassisMat
  );
  rearWingPlate.position.set(0, 1.25, -2.0);
  rearWingPlate.castShadow = true;
  car.add(rearWingPlate);
  const rearWingLower = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.08, 0.4),
    new THREE.MeshStandardMaterial({ color: DARK, roughness: 0.4 })
  );
  rearWingLower.position.set(0, 0.95, -2.0);
  car.add(rearWingLower);
  for (const sx of [-0.75, 0.75]) {
    const ep = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.4, 0.5),
      new THREE.MeshStandardMaterial({ color: DARK })
    );
    ep.position.set(sx, 1.1, -2.0);
    car.add(ep);
  }

  // Front wing
  const frontWing = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.08, 0.5),
    chassisMat
  );
  frontWing.position.set(0, 0.3, 3.4);
  frontWing.castShadow = true;
  car.add(frontWing);
  for (const sx of [-0.85, 0.85]) {
    const ep = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.35, 0.6),
      new THREE.MeshStandardMaterial({ color: DARK })
    );
    ep.position.set(sx, 0.4, 3.4);
    car.add(ep);
  }

  // Wheels
  const wheelMat = new THREE.MeshStandardMaterial({
    color: 0x0d0d0d, roughness: 0.8, metalness: 0.2
  });
  const rimMat = new THREE.MeshStandardMaterial({
    color: 0x444444, roughness: 0.4, metalness: 0.9
  });
  const wheels = [];
  function makeWheel(x, z) {
    const g = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.38, 24), wheelMat);
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;
    g.add(tire);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.4, 16), rimMat);
    rim.rotation.z = Math.PI / 2;
    g.add(rim);
    g.position.set(x, 0.5, z);
    car.add(g);
    wheels.push(g);
    return g;
  }
  makeWheel(-0.95, 1.7);
  makeWheel( 0.95, 1.7);
  makeWheel(-0.95, -1.7);
  makeWheel( 0.95, -1.7);

  car.position.y = 0;
  scene.add(car);

  // ---------- Animation loop ----------
  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener("resize", resize);

  const clock = new THREE.Clock();
  function animate() {
    const dt = clock.getDelta();
    const t = clock.elapsedTime;

    // Scroll road elements backwards past the camera
    const speed = 60;
    dashGroup.children.forEach(d => {
      d.position.z += speed * dt;
      if (d.position.z > 10) d.position.z -= dashCount * dashSpacing;
    });
    [kerbLeft, kerbRight].forEach(group => {
      group.children.forEach(seg => {
        seg.position.z += speed * dt;
        if (seg.position.z > 10) seg.position.z -= group.children.length * 2;
      });
    });

    // Spin wheels (fast)
    wheels.forEach(w => w.rotation.x -= speed * dt * 0.6);

    // Subtle car sway and bob
    car.position.x = Math.sin(t * 0.6) * 0.12;
    car.position.y = Math.sin(t * 11) * 0.015;
    car.rotation.z = Math.sin(t * 0.6) * 0.01;

    // Camera follows with slight lag + breathing
    camera.position.x = car.position.x * 0.5;
    camera.position.y = 2.4 + Math.sin(t * 0.7) * 0.08;
    camera.lookAt(car.position.x, 1, -15);

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  animate();
})();
