/**
 * Builds a room and its bookcases as a three.js scene, from database rows (sizes in cm).
 * Pure three.js — no React Native — so it can be previewed in a browser too.
 *
 * World frame (metres): origin at the back-left floor corner seen from inside the room,
 * +x along the back wall to the right, +y up, +z from the back wall towards the viewer.
 */
import * as THREE from 'three';

export type WallSide = 'back' | 'left' | 'right';

export type Opening = {
  kind: 'door' | 'window';
  wall: WallSide;
  offsetCm: number;
  widthCm: number;
  heightCm: number;
  elevationCm: number;
};

export type BookcaseLayout = {
  id: string;
  number: number;
  kind: 'open' | 'glass';
  finish: 'wood' | 'aluminum';
  wallSide: WallSide | null;
  offsetCm: number | null;
  elevationCm: number | null;
  widthCm: number | null;
  heightCm: number | null;
  depthCm: number | null;
  shelfCount: number;
  /** Volumes on this bookcase, each shelf's list ordered from the right. shelfNumber 0 = on top. */
  books?: BookOnShelf[];
};

export type BookOnShelf = { shelfNumber: number; bookId: string; placement: 'standing' | 'lying' | 'on_top' };

export type RoomLayout = {
  widthCm: number | null;
  depthCm: number | null;
  heightCm: number | null;
  openings: Opening[];
  bookcases: BookcaseLayout[];
};

export type BookcaseFocus = {
  /** Centre of the bookcase front, world space. */
  center: THREE.Vector3;
  /** Unit vector pointing out of the bookcase into the room. */
  normal: THREE.Vector3;
  width: number;
  height: number;
  /** Point just above the bookcase, for the number label. */
  labelAnchor: THREE.Vector3;
};

export type RoomScene = {
  scene: THREE.Scene;
  room: { width: number; depth: number; height: number };
  /** Invisible boxes used for tap-picking; userData.bookcaseId. */
  pickables: THREE.Object3D[];
  focus: Map<string, BookcaseFocus>;
  setSelected: (id: string | null) => void;
  dispose: () => void;
};

const cm = (v: number | null | undefined, fallback: number) => (v ?? fallback) / 100;

const PALETTE = {
  background: 0x1c1415,
  wall: 0xe9e3da,
  sideWall: 0xded7cc,
  floor: 0x8a7462,
  skirting: 0x6b5646,
  wood: 0xc38f55,
  woodBack: 0x9d7447,
  aluBoard: 0xf1efeb,
  aluBack: 0xc9c3ba,
  aluFrame: 0x9aa1a8,
  brass: 0xb38a3a,
  glass: 0xd8ecee,
  door: 0x7a3b22,
  doorFrame: 0xe8e2d8,
  window: 0xbfd8e6,
  curtain: 0xd9d4ca,
  highlight: 0xd6ae63,
};

/** Places a bookcase-local frame (x along the wall as seen from inside, z out of the wall) onto a wall. */
function wallTransform(side: WallSide, offset: number, width: number, room: { width: number }) {
  switch (side) {
    case 'back':
      return { position: new THREE.Vector3(offset, 0, 0), rotationY: 0, normal: new THREE.Vector3(0, 0, 1) };
    case 'left':
      // Seen from inside, the left wall runs right-to-left as z grows; its left end is the far one.
      return { position: new THREE.Vector3(0, 0, offset + width), rotationY: Math.PI / 2, normal: new THREE.Vector3(1, 0, 0) };
    case 'right':
      return { position: new THREE.Vector3(room.width, 0, offset), rotationY: -Math.PI / 2, normal: new THREE.Vector3(-1, 0, 0) };
  }
}

export function buildRoomScene(layout: RoomLayout): RoomScene {
  const room = { width: cm(layout.widthCm, 420), depth: cm(layout.depthCm, 400), height: cm(layout.heightCm, 290) };
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.background);

  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const box = new THREE.BoxGeometry(1, 1, 1);
  geometries.push(box);
  const mat = (color: number, extra: THREE.MeshLambertMaterialParameters = {}) => {
    const m = new THREE.MeshLambertMaterial({ color, ...extra });
    materials.push(m);
    return m;
  };

  /** Axis-aligned box by its min corner, inside `parent`'s frame. */
  const addBox = (parent: THREE.Object3D, material: THREE.Material, x: number, y: number, z: number, w: number, h: number, d: number) => {
    const m = new THREE.Mesh(box, material);
    m.scale.set(w, h, d);
    m.position.set(x + w / 2, y + h / 2, z + d / 2);
    parent.add(m);
    return m;
  };

  // ---- lights: soft ambient plus a warm key light from the room's front ----
  scene.add(new THREE.HemisphereLight(0xfff6ea, 0x8a7462, 1.7));
  const key = new THREE.DirectionalLight(0xffe9cc, 1.5);
  key.position.set(room.width * 0.8, room.height * 1.6, room.depth * 1.6);
  key.target.position.set(room.width / 2, 1.6, 0);
  scene.add(key, key.target);

  // ---- shell: floor and the back/left/right walls as one-sided planes facing into the room.
  // Seen from outside a wall is invisible, so the camera can stand back and see the whole room
  // like a doll's house. No ceiling, for the same reason.
  const shell = new THREE.Group();
  scene.add(shell);
  const plane = new THREE.PlaneGeometry(1, 1);
  geometries.push(plane);
  const addPlane = (material: THREE.Material, w: number, h: number, pos: THREE.Vector3, rotX: number, rotY: number) => {
    const m = new THREE.Mesh(plane, material);
    m.scale.set(w, h, 1);
    m.position.copy(pos);
    m.rotation.set(rotX, rotY, 0, 'YXZ');
    shell.add(m);
  };
  const wallMat = mat(PALETTE.wall);
  const sideWallMat = mat(PALETTE.sideWall);
  const { width: RW, depth: RD, height: RH } = room;
  addPlane(mat(PALETTE.floor), RW, RD, new THREE.Vector3(RW / 2, 0, RD / 2), -Math.PI / 2, 0);
  addPlane(wallMat, RW, RH, new THREE.Vector3(RW / 2, RH / 2, 0), 0, 0);
  addPlane(sideWallMat, RD, RH, new THREE.Vector3(0, RH / 2, RD / 2), 0, Math.PI / 2);
  addPlane(sideWallMat, RD, RH, new THREE.Vector3(RW, RH / 2, RD / 2), 0, -Math.PI / 2);
  // Skirting along the walls, for a sense of the floor edge.
  const skirt = mat(PALETTE.skirting);
  addBox(shell, skirt, 0, 0, 0, RW, 0.08, 0.015);
  addBox(shell, skirt, 0, 0, 0, 0.015, 0.08, RD);
  addBox(shell, skirt, RW - 0.015, 0, 0, 0.015, 0.08, RD);

  // ---- doors and windows ----
  const doorMat = mat(PALETTE.door);
  const frameMat = mat(PALETTE.doorFrame);
  const windowMat = mat(PALETTE.window);
  const curtainMat = mat(PALETTE.curtain);
  for (const o of layout.openings) {
    const w = o.widthCm / 100;
    const h = o.heightCm / 100;
    const tr = wallTransform(o.wall, o.offsetCm / 100, w, room);
    const g = new THREE.Group();
    g.position.copy(tr.position);
    g.rotation.y = tr.rotationY;
    g.position.y = o.elevationCm / 100;
    scene.add(g);
    if (o.kind === 'door') {
      addBox(g, frameMat, -0.05, 0, 0, w + 0.1, h + 0.05, 0.02);
      addBox(g, doorMat, 0, 0, 0.02, w, h, 0.03);
    } else {
      addBox(g, frameMat, -0.04, -0.04, 0, w + 0.08, h + 0.08, 0.02);
      addBox(g, windowMat, 0, 0, 0.02, w, h, 0.01);
      addBox(g, curtainMat, -0.35, -0.15, 0.08, 0.3, h + 0.35, 0.04);
      addBox(g, curtainMat, w + 0.05, -0.15, 0.08, 0.3, h + 0.35, 0.04);
    }
  }

  // ---- bookcases ----
  const woodMat = mat(PALETTE.wood);
  const woodBackMat = mat(PALETTE.woodBack);
  const aluBoardMat = mat(PALETTE.aluBoard);
  const aluBackMat = mat(PALETTE.aluBack);
  const aluFrameMat = mat(PALETTE.aluFrame);
  const brassMat = mat(PALETTE.brass);
  const glassMat = mat(PALETTE.glass, { transparent: true, opacity: 0.18, depthWrite: false });
  const pickMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false });
  materials.push(pickMat);

  const pickables: THREE.Object3D[] = [];
  const focus = new Map<string, BookcaseFocus>();
  // Every book in the room goes into ONE instanced mesh: a single draw call however many books.
  const bookMatrices: THREE.Matrix4[] = [];
  const bookColors: THREE.Color[] = [];
  const highlights = new Map<string, THREE.LineSegments>();
  const edges = new THREE.EdgesGeometry(box);
  geometries.push(edges);
  const highlightMat = new THREE.LineBasicMaterial({ color: PALETTE.highlight });
  materials.push(highlightMat);

  for (const b of layout.bookcases) {
    if (!b.wallSide) continue; // not placed yet
    const W = cm(b.widthCm, 120);
    const H = cm(b.heightCm, 100);
    const D = cm(b.depthCm, 30);
    const tr = wallTransform(b.wallSide, cm(b.offsetCm, 0), W, room);
    const g = new THREE.Group();
    g.position.copy(tr.position);
    g.position.y = cm(b.elevationCm, 160);
    g.rotation.y = tr.rotationY;
    scene.add(g);

    const alu = b.finish === 'aluminum';
    const board = alu ? aluBoardMat : woodMat;
    const T = 0.018;
    // Carcass
    addBox(g, board, 0, 0, 0, T, H, D);
    addBox(g, board, W - T, 0, 0, T, H, D);
    addBox(g, board, T, 0, 0, W - 2 * T, T, D);
    addBox(g, board, T, H - T, 0, W - 2 * T, T, D);
    addBox(g, alu ? aluBackMat : woodBackMat, T, T, 0, W - 2 * T, H - 2 * T, 0.006);
    // Shelf boards: shelfCount compartments, evenly spaced.
    const n = Math.max(1, b.shelfCount);
    const inner = H - 2 * T - (n - 1) * T;
    for (let i = 1; i < n; i++) addBox(g, board, T, T + (inner / n) * i + T * (i - 1), 0, W - 2 * T, T, D - 0.01);
    if (alu) {
      // Aluminium profiles on the front edges.
      const f = 0.022;
      addBox(g, aluFrameMat, 0, 0, D - 0.01, W, f, 0.015);
      addBox(g, aluFrameMat, 0, H - f, D - 0.01, W, f, 0.015);
      addBox(g, aluFrameMat, 0, 0, D - 0.01, f, H, 0.015);
      addBox(g, aluFrameMat, W - f, 0, D - 0.01, f, H, 0.015);
    }
    if (b.kind === 'glass') {
      const frame = alu ? aluFrameMat : brassMat;
      const f = 0.02;
      if (!alu) {
        addBox(g, frame, 0, 0, D - 0.004, W, f, 0.02);
        addBox(g, frame, 0, H - f, D - 0.004, W, f, 0.02);
        addBox(g, frame, 0, 0, D - 0.004, f, H, 0.02);
        addBox(g, frame, W - f, 0, D - 0.004, f, H, 0.02);
      }
      // Two sliding panels on two tracks.
      const pw = W / 2 + 0.02;
      addBox(g, glassMat, f, f, D + 0.006, pw, H - 2 * f, 0.004).renderOrder = 2;
      addBox(g, glassMat, W - f - pw, f, D + 0.02, pw, H - 2 * f, 0.004).renderOrder = 2;
      addBox(g, frame, W / 2 - 0.01, f, D + 0.012, 0.014, H - 2 * f, 0.012);
    }

    // Books: simple coloured blocks, placed shelf by shelf from the right.
    if (b.books?.length) {
      g.updateMatrixWorld(true);
      const pitch = inner / n + T; // one compartment plus its board
      const byShelf = new Map<number, BookOnShelf[]>();
      for (const v of b.books) byShelf.set(v.shelfNumber, [...(byShelf.get(v.shelfNumber) ?? []), v]);
      const place = (x: number, y: number, z: number, w: number, h: number, d: number, bookId: string, i: number) => {
        const local = new THREE.Matrix4().compose(new THREE.Vector3(x + w / 2, y + h / 2, z + d / 2), new THREE.Quaternion(), new THREE.Vector3(w, h, d));
        bookMatrices.push(new THREE.Matrix4().multiplyMatrices(g.matrixWorld, local));
        // Alternate the shade a touch so each volume of a set reads as its own spine.
        bookColors.push(spineColor(bookId).offsetHSL(0, 0, i % 2 ? -0.035 : 0.02));
      };
      for (const [shelfNumber, vols] of byShelf) {
        const onTop = shelfNumber === 0;
        const floorY = onTop ? H : T + (n - shelfNumber) * pitch;
        const maxH = onTop ? 0.3 : inner / n - 0.015;
        const standing = vols.filter((v) => v.placement !== 'lying');
        const lying = vols.filter((v) => v.placement === 'lying');
        const avail = W - 2 * T - 0.02 - (lying.length ? 0.24 : 0);
        const widths = standing.map((v) => 0.026 + hash01(v.bookId, 1) * 0.016);
        const total = widths.reduce((a, w) => a + w + 0.0025, 0);
        const k = total > avail ? avail / total : 1;
        let x = W - T - 0.006;
        standing.forEach((v, i) => {
          const w = widths[i] * k;
          const h = Math.min(maxH, 0.21 + hash01(v.bookId, 2) * 0.08);
          const d = Math.min(D - 0.04, 0.21);
          x -= w;
          place(x, floorY, D - 0.02 - d, w, h, d, v.bookId, i);
          x -= 0.0025 * k;
        });
        let y = floorY;
        for (const [i, v] of lying.entries()) {
          place(T + 0.01, y, D - 0.24, 0.22, 0.035, 0.17, v.bookId, i);
          y += 0.036;
        }
      }
    }

    // Tap target and selection outline.
    const pick = addBox(g, pickMat, 0, 0, 0, W, H, D + 0.03);
    pick.userData.bookcaseId = b.id;
    pickables.push(pick);
    const hl = new THREE.LineSegments(edges, highlightMat);
    hl.scale.set(W + 0.03, H + 0.03, D + 0.05);
    hl.position.set(W / 2, H / 2, (D + 0.03) / 2);
    hl.visible = false;
    g.add(hl);
    highlights.set(b.id, hl);

    g.updateMatrixWorld(true);
    const center = new THREE.Vector3(W / 2, H / 2, D).applyMatrix4(g.matrixWorld);
    const labelAnchor = new THREE.Vector3(W / 2, H + 0.08, D).applyMatrix4(g.matrixWorld);
    focus.set(b.id, { center, normal: tr.normal.clone(), width: W, height: H, labelAnchor });
  }

  if (bookMatrices.length) {
    const bookMat = mat(0xffffff);
    const books = new THREE.InstancedMesh(box, bookMat, bookMatrices.length);
    bookMatrices.forEach((m, i) => {
      books.setMatrixAt(i, m);
      books.setColorAt(i, bookColors[i]);
    });
    books.instanceMatrix.needsUpdate = true;
    if (books.instanceColor) books.instanceColor.needsUpdate = true;
    scene.add(books);
  }

  return {
    scene,
    room,
    pickables,
    focus,
    setSelected(id) {
      for (const [bid, hl] of highlights) hl.visible = bid === id;
    },
    dispose() {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}

// Deep binding colours seen on the family's shelves.
const SPINES = [0x1d2742, 0x5b1d1f, 0x1f3b2c, 0x3b2419, 0x8c2a24, 0x2a4f8a, 0x6a1f2d, 0x23201e, 0x4a3322, 0x2f6a3d, 0xa9864f, 0xd9ccb0];

/** Stable 0..1 number from a book id, so a set's volumes share a colour and height. */
function hash01(id: string, salt: number): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}

export function spineColor(bookId: string): THREE.Color {
  return new THREE.Color(SPINES[Math.floor(hash01(bookId, 3) * SPINES.length)]);
}
