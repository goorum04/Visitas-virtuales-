import * as THREE from 'three';

// Salón de demostración construido en 3D real con texturas PBR fotográficas (CC0).
// Al ser geometría de verdad, la cámara puede girar libremente sin deformaciones.

export const ROOM = {
  W: 5.2,   // ancho (x)
  D: 6.2,   // fondo (z): de -3.4 a +2.8
  H: 2.85,
  zBack: -3.4,
  zFront: 2.8,
};

function pbr(
  loader: THREE.TextureLoader,
  base: string,
  repeat: [number, number],
  extra?: Partial<THREE.MeshStandardMaterialParameters>
): THREE.MeshStandardMaterial {
  const setup = (t: THREE.Texture, srgb: boolean) => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  const mat = new THREE.MeshStandardMaterial({
    map: setup(loader.load(`/textures/${base}_diff_1k.jpg`), true),
    normalMap: setup(loader.load(`/textures/${base}_nor_gl_1k.jpg`), false),
    aoMap: setup(loader.load(`/textures/${base}_arm_1k.jpg`), false),
    roughnessMap: setup(loader.load(`/textures/${base}_arm_1k.jpg`), false),
    ...extra,
  });
  return mat;
}

export function buildSyntheticRoom(scene: THREE.Scene, loader: THREE.TextureLoader): THREE.Group {
  const g = new THREE.Group();
  const { W, D, H, zBack, zFront } = ROOM;
  const zMid = (zBack + zFront) / 2;

  const floorMat = pbr(loader, 'laminate_floor_02', [2.6, 3.1]);
  const wallMat = pbr(loader, 'painted_plaster_wall', [3.2, 1.7], { color: '#fdf6ea' });
  const woodMat = pbr(loader, 'brown_planks_09', [1.6, 0.35], { color: '#b98d5f' });
  const whiteMat = new THREE.MeshStandardMaterial({ color: '#faf7f0', roughness: 0.85 });
  // los planos de la envolvente deben tapar el sol por ambas caras:
  // si no, la luz atraviesa el techo y raya la sala con las sombras de las vigas
  [floorMat, wallMat, whiteMat].forEach((m) => { m.shadowSide = THREE.DoubleSide; });

  const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, rx = 0, ry = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.x = rx;
    m.rotation.y = ry;
    m.receiveShadow = true;
    m.castShadow = true;
    g.add(m);
    return m;
  };

  // Suelo y techo
  mesh(new THREE.PlaneGeometry(W, D), floorMat, 0, 0, zMid, -Math.PI / 2);
  mesh(new THREE.PlaneGeometry(W, D), whiteMat, 0, H, zMid, Math.PI / 2);

  // Paredes fondo, frente y derecha
  mesh(new THREE.PlaneGeometry(W, H), wallMat, 0, H / 2, zBack);
  mesh(new THREE.PlaneGeometry(W, H), wallMat, 0, H / 2, zFront, 0, Math.PI);
  mesh(new THREE.PlaneGeometry(D, H), wallMat, W / 2, H / 2, zMid, 0, -Math.PI / 2);

  // Pared izquierda con hueco de ventana en arco (la luz del sol entra por aquí)
  const winZ = -0.6;                 // centro de la ventana (coordenada z del mundo)
  const cx = zFront - winZ;          // en coords locales del muro (x local = zFront - z)
  const sillY = 0.78, archBaseY = 2.05, archR = 0.72;
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(D, 0);
  shape.lineTo(D, H);
  shape.lineTo(0, H);
  shape.closePath();
  const hole = new THREE.Path();
  hole.moveTo(cx - archR, sillY);
  hole.lineTo(cx + archR, sillY);
  hole.lineTo(cx + archR, archBaseY);
  hole.absarc(cx, archBaseY, archR, 0, Math.PI, false);
  hole.lineTo(cx - archR, sillY);
  shape.holes.push(hole);
  const leftWall = new THREE.Mesh(new THREE.ShapeGeometry(shape, 24), wallMat);
  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.set(-W / 2, 0, zFront);
  leftWall.receiveShadow = true;
  leftWall.castShadow = true; // el hueco del arco recorta la luz del sol
  g.add(leftWall);
  // las cortinas no deben tapar la cámara si la órbita se acerca: se excluyen del raycast/vista trasera con render normal, basta limitar la órbita

  // Marco de la ventana (jambas, alféizar y arco)
  const frameMat = new THREE.MeshStandardMaterial({ color: '#caa87c', roughness: 0.55 });
  const jamb = (z: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.14, archBaseY - sillY, 0.09), frameMat);
    m.position.set(-W / 2 + 0.02, (sillY + archBaseY) / 2, z);
    m.castShadow = true;
    g.add(m);
  };
  jamb(winZ - archR + 0.045);
  jamb(winZ + archR - 0.045);
  const sill = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, archR * 2 + 0.24), frameMat);
  sill.position.set(-W / 2 + 0.05, sillY - 0.03, winZ);
  sill.castShadow = true;
  g.add(sill);
  const archFrame = new THREE.Mesh(new THREE.TorusGeometry(archR - 0.03, 0.05, 10, 32, Math.PI), frameMat);
  archFrame.rotation.y = Math.PI / 2;
  archFrame.position.set(-W / 2 + 0.04, archBaseY, winZ);
  archFrame.castShadow = true;
  g.add(archFrame);
  // Parteluz vertical
  const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.05, archBaseY - sillY + archR, 0.055), frameMat);
  mullion.position.set(-W / 2 + 0.03, (sillY + archBaseY + archR) / 2 - 0.15, winZ);
  g.add(mullion);

  // "Exterior": plano luminoso tras la ventana (cielo/calle desenfocados)
  const outside = new THREE.Mesh(
    new THREE.PlaneGeometry(4.2, 3.4),
    new THREE.MeshBasicMaterial({ color: '#eaf3fd' })
  );
  outside.rotation.y = Math.PI / 2;
  outside.position.set(-W / 2 - 0.55, 1.7, winZ);
  g.add(outside);

  // Cortinas vaporosas a ambos lados (ligera onda)
  const curtainMat = new THREE.MeshStandardMaterial({ color: '#efe7d8', transparent: true, opacity: 0.55, roughness: 0.9, side: THREE.DoubleSide });
  const makeCurtain = (z: number) => {
    const geo = new THREE.PlaneGeometry(0.55, 2.45, 12, 1);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setX(i, pos.getX(i) + Math.sin(pos.getY(i) * 2.1 + z) * 0.0); // mantener plano en x local
      pos.setZ(i, Math.sin((pos.getX(i) + 0.3) * 9) * 0.05);
    }
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, curtainMat);
    m.rotation.y = Math.PI / 2;
    m.position.set(-W / 2 + 0.16, 1.55, z);
    g.add(m);
  };
  makeCurtain(winZ - archR - 0.32);
  makeCurtain(winZ + archR + 0.32);
  // Barra de cortina
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, archR * 2 + 1.5, 10), frameMat);
  rod.rotation.x = Math.PI / 2;
  rod.position.set(-W / 2 + 0.16, 2.82, winZ);
  g.add(rod);

  // Radiador bajo la ventana
  const radMat = new THREE.MeshStandardMaterial({ color: '#d3ccbd', roughness: 0.45, metalness: 0.35 });
  const rad = new THREE.Group();
  for (let i = 0; i < 13; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.52, 0.028), radMat);
    fin.position.set(0, 0, -0.42 + i * 0.07);
    fin.castShadow = true;
    rad.add(fin);
  }
  const radBar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.92), radMat);
  radBar.position.y = 0.25;
  rad.add(radBar);
  rad.position.set(-W / 2 + 0.14, 0.32, winZ);
  g.add(rad);

  // Vigas de madera en el techo
  for (let i = 0; i < 5; i++) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(W, 0.15, 0.17), woodMat);
    beam.position.set(0, H - 0.075, zBack + 0.9 + i * 1.15);
    beam.castShadow = true;
    beam.receiveShadow = true;
    g.add(beam);
  }

  // Puerta de madera en la pared derecha
  const doorZ = 0.7;
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.055, 2.06, 0.92), woodMat);
  door.position.set(W / 2 - 0.04, 1.03, doorZ);
  door.castShadow = true;
  g.add(door);
  const doorTrim = new THREE.Mesh(new THREE.BoxGeometry(0.03, 2.18, 1.06), whiteMat);
  doorTrim.position.set(W / 2 - 0.012, 1.09, doorZ);
  g.add(doorTrim);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 10), new THREE.MeshStandardMaterial({ color: '#8a7b5c', roughness: 0.3, metalness: 0.8 }));
  knob.position.set(W / 2 - 0.09, 1.02, doorZ - 0.35);
  g.add(knob);

  // Rodapiés
  const skirt = (w: number, x: number, z: number, ry: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.11, 0.028), whiteMat);
    m.position.set(x, 0.055, z);
    m.rotation.y = ry;
    g.add(m);
  };
  skirt(W, 0, zBack + 0.015, 0);
  skirt(W, 0, zFront - 0.015, 0);
  skirt(D, W / 2 - 0.015, zMid, Math.PI / 2);
  skirt(zFront - (winZ + archR) - 0.35, -W / 2 + 0.015, (zFront + winZ + archR + 0.35) / 2, Math.PI / 2);
  skirt((winZ - archR - 0.35) - zBack, -W / 2 + 0.015, (zBack + winZ - archR - 0.35) / 2, Math.PI / 2);

  scene.add(g);
  return g;
}

export function addSyntheticLights(scene: THREE.Scene): { dir: THREE.DirectionalLight; hemi: THREE.HemisphereLight } {
  // Sol cálido entrando por la ventana del arco (la pared con hueco recorta la luz);
  // alto para que el charco de luz caiga en el suelo y no raye las paredes
  const dir = new THREE.DirectionalLight('#ffe3b8', 3.0);
  dir.position.set(-6, 7, 0.8);
  dir.target.position.set(1.3, 0, -0.7);
  dir.castShadow = true;
  dir.shadow.mapSize.set(2048, 2048);
  dir.shadow.bias = -0.0003;
  dir.shadow.radius = 6;
  dir.shadow.blurSamples = 14;
  dir.shadow.camera.left = -6;
  dir.shadow.camera.right = 6;
  dir.shadow.camera.top = 6;
  dir.shadow.camera.bottom = -6;
  dir.shadow.camera.far = 25;
  scene.add(dir);
  scene.add(dir.target);

  const hemi = new THREE.HemisphereLight('#dfeaf7', '#a08a68', 0.95);
  scene.add(hemi);
  const amb = new THREE.AmbientLight('#fff6ea', 0.32);
  scene.add(amb);
  return { dir, hemi };
}
