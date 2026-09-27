/**
 * Orbit camera for the room view: yaw/pitch/distance around a target point, smooth
 * transitions between the room overview and a single bookcase, and it never leaves the room.
 */
import * as THREE from 'three';

import type { BookcaseFocus, RoomScene } from './room-scene';

type Pose = { target: THREE.Vector3; yaw: number; pitch: number; radius: number };

const EYE_HEIGHT = 1.45;
const MIN_RADIUS = 0.45;
const PITCH_MIN = -0.6;
const PITCH_MAX = 1.1;
const YAW_LIMIT = 1.35; // never swing round behind the walls
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export class CameraRig {
  readonly camera: THREE.PerspectiveCamera;
  private pose: Pose;
  private anim: { from: Pose; to: Pose; start: number; duration: number } | null = null;
  private dirty = true;

  constructor(
    private readonly rs: RoomScene,
    aspect: number,
  ) {
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.05, 50);
    this.pose = this.overviewPose();
    this.apply();
  }

  setAspect(aspect: number) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    this.dirty = true;
  }

  /**
   * Doll's-house view: stand back beyond the open front of the room, a little above, turned
   * towards the walls that hold bookcases, far enough to see every bookcase.
   */
  overviewPose(): Pose {
    const { width, depth, height } = this.rs.room;
    const all = [...this.rs.focus.values()];
    if (!all.length) return poseFromEye(new THREE.Vector3(width / 2, height, depth + 3), new THREE.Vector3(width / 2, 1, depth / 2));
    const box = new THREE.Box3();
    for (const f of all) {
      box.expandByPoint(f.center.clone().addScaledVector(f.normal, -0.3));
      box.expandByPoint(f.center.clone().setY(f.center.y - f.height / 2));
      box.expandByPoint(f.center.clone().setY(f.center.y + f.height / 2));
    }
    box.expandByPoint(new THREE.Vector3(box.min.x, 0.4, box.max.z + 0.5)); // a strip of floor in front
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const n = all.reduce((a, f) => a.add(f.normal), new THREE.Vector3());
    const yaw = THREE.MathUtils.clamp(Math.atan2(n.x, n.z), -0.55, 0.55);
    const pitch = 0.32;
    const vfov = THREE.MathUtils.degToRad(this.camera.fov);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * this.camera.aspect);
    const radius = sphere.radius / Math.sin(Math.min(vfov, hfov) / 2);
    return { target: sphere.center, yaw, pitch, radius };
  }

  /** Straight in front of one bookcase, far enough to see all of it. */
  focusPose(f: BookcaseFocus): Pose {
    const vfov = THREE.MathUtils.degToRad(this.camera.fov);
    const fitH = f.height / 2 / Math.tan(vfov / 2);
    const fitW = f.width / 2 / (Math.tan(vfov / 2) * this.camera.aspect);
    const dist = Math.max(fitH, fitW) * 1.35 + 0.1;
    const eye = f.center.clone().addScaledVector(f.normal, dist);
    eye.y = Math.min(f.center.y - 0.15, Math.max(EYE_HEIGHT, f.center.y - dist * 0.35));
    return poseFromEye(eye, f.center.clone());
  }

  goOverview() {
    this.animateTo(this.overviewPose());
  }

  goFocus(id: string) {
    const f = this.rs.focus.get(id);
    if (f) this.animateTo(this.focusPose(f));
  }

  orbit(dYaw: number, dPitch: number) {
    this.anim = null;
    this.pose.yaw += dYaw;
    this.pose.pitch = THREE.MathUtils.clamp(this.pose.pitch + dPitch, PITCH_MIN, PITCH_MAX);
    this.apply();
  }

  zoom(scale: number) {
    this.anim = null;
    this.pose.radius = THREE.MathUtils.clamp(this.pose.radius / scale, MIN_RADIUS, 14);
    this.apply();
  }

  get moving() {
    return this.anim !== null;
  }

  /** Advances any running animation. Returns true when the frame needs drawing. */
  update(now: number): boolean {
    if (this.anim) {
      const k = Math.min(1, (now - this.anim.start) / this.anim.duration);
      const e = ease(k);
      const { from, to } = this.anim;
      this.pose = {
        target: from.target.clone().lerp(to.target, e),
        yaw: from.yaw + shortestAngle(from.yaw, to.yaw) * e,
        pitch: from.pitch + (to.pitch - from.pitch) * e,
        radius: from.radius + (to.radius - from.radius) * e,
      };
      if (k >= 1) this.anim = null;
      this.apply();
    }
    const d = this.dirty;
    this.dirty = false;
    return d;
  }

  private animateTo(to: Pose, duration = 550) {
    this.anim = { from: { ...this.pose, target: this.pose.target.clone() }, to, start: Date.now(), duration };
    this.dirty = true;
  }

  /** Places the camera; keeps it above the floor and in front of the walls. */
  private apply() {
    this.pose.yaw = THREE.MathUtils.clamp(this.pose.yaw, -YAW_LIMIT, YAW_LIMIT);
    const { target, yaw, pitch, radius } = this.pose;
    const dir = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
    const pos = target.clone().addScaledVector(dir, radius);
    pos.y = Math.max(0.3, pos.y);
    this.camera.position.copy(pos);
    this.camera.lookAt(target);
    this.camera.updateMatrixWorld();
    this.dirty = true;
  }
}

function poseFromEye(eye: THREE.Vector3, target: THREE.Vector3): Pose {
  const off = eye.clone().sub(target);
  const radius = off.length();
  return {
    target,
    radius,
    yaw: Math.atan2(off.x, off.z),
    pitch: THREE.MathUtils.clamp(Math.asin(off.y / radius), PITCH_MIN, PITCH_MAX),
  };
}

function shortestAngle(a: number, b: number) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}
