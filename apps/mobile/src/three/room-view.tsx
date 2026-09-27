/**
 * The 3D room on screen: expo-gl + three.js, one-finger orbit, pinch to zoom, tap a bookcase.
 * Draws only when something changed, so an idle room costs no battery.
 */
import { toArabicDigits } from '@maktabatna/shared';
import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as THREE from 'three';

import { AppText } from '@/components/text';
import { useColors } from '@/theme';
import { CameraRig } from './camera-rig';
import { buildRoomScene, type RoomLayout, type RoomScene } from './room-scene';

type Label = { id: string; number: number; x: number; y: number };

export function RoomView({
  layout,
  selectedId,
  onSelect,
}: {
  layout: RoomLayout;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  // Imperative 3D engine held in refs: keep the React Compiler out of this component.
  'use no memo';
  const c = useColors();
  const size = useRef({ w: 1, h: 1 });
  const engine = useRef<{ rs: RoomScene; rig: CameraRig } | null>(null);
  const cleanup = useRef<(() => void) | null>(null);
  const [labels, setLabels] = useState<Label[]>([]);
  const [labelsVisible, setLabelsVisible] = useState(true);
  const numbers = useRef(new Map(layout.bookcases.map((b) => [b.id, b.number])));

  const refreshLabels = useCallback(() => {
    const e = engine.current;
    if (!e) return;
    const { w, h } = size.current;
    const next: Label[] = [];
    for (const [id, f] of e.rs.focus) {
      const p = f.labelAnchor.clone().project(e.rig.camera);
      if (p.z > 1 || p.x < -1.1 || p.x > 1.1 || p.y < -1.1 || p.y > 1.1) continue;
      next.push({ id, number: numbers.current.get(id) ?? 0, x: ((p.x + 1) / 2) * w, y: ((1 - p.y) / 2) * h });
    }
    setLabels(next);
    setLabelsVisible(true);
  }, []);

  const onContextCreate = useCallback(
    (gl: ExpoWebGLRenderingContext) => {
      const width = gl.drawingBufferWidth;
      const height = gl.drawingBufferHeight;
      // three.js expects a canvas; expo-gl gives a bare GL context, so we hand it a minimal stand-in.
      const canvas = {
        width,
        height,
        style: {},
        clientHeight: height,
        addEventListener: () => {},
        removeEventListener: () => {},
        getContext: () => gl,
      } as unknown as HTMLCanvasElement;
      const renderer = new THREE.WebGLRenderer({ canvas, context: gl as unknown as WebGL2RenderingContext, antialias: true });
      renderer.setPixelRatio(1);
      renderer.setSize(width, height, false);
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      const rs = buildRoomScene(layout);
      const rig = new CameraRig(rs, width / height);
      let wasMoving = false;
      let raf = 0;
      const frame = () => {
        raf = requestAnimationFrame(frame);
        const needsDraw = rig.update(Date.now());
        if (needsDraw) {
          renderer.render(rs.scene, rig.camera);
          gl.endFrameEXP();
        }
        if (wasMoving && !rig.moving) refreshLabels();
        wasMoving = rig.moving;
      };
      engine.current = { rs, rig };
      frame();
      refreshLabels();
      cleanup.current = () => {
        cancelAnimationFrame(raf);
        rs.dispose();
        renderer.dispose();
      };
    },
    // The scene is built once per mount; the room screen remounts when the room changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => () => cleanup.current?.(), []);

  // Selection drives the camera: fly to the bookcase, or back to the room overview.
  useEffect(() => {
    const e = engine.current;
    if (!e) return;
    e.rs.setSelected(selectedId);
    setLabelsVisible(false);
    if (selectedId) e.rig.goFocus(selectedId);
    else e.rig.goOverview();
  }, [selectedId]);

  const pick = useCallback(
    (x: number, y: number) => {
      const e = engine.current;
      if (!e) return;
      const { w, h } = size.current;
      const ray = new THREE.Raycaster();
      ray.setFromCamera(new THREE.Vector2((x / w) * 2 - 1, -(y / h) * 2 + 1), e.rig.camera);
      const hit = ray.intersectObjects(e.rs.pickables, false)[0];
      onSelect((hit?.object.userData.bookcaseId as string | undefined) ?? null);
    },
    [onSelect],
  );

  const orbit = useCallback((dx: number, dy: number) => engine.current?.rig.orbit(-dx * 0.005, dy * 0.005), []);
  const zoom = useCallback((scale: number) => engine.current?.rig.zoom(scale), []);
  const hideLabels = useCallback(() => setLabelsVisible(false), []);

  // Gesture callbacks run on the JS thread (runOnJS) when the user touches the screen, never
  // during render. The refs rule can't see through the gesture builder, so it's off for this block.
  /* eslint-disable react-hooks/refs */
  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .runOnJS(true)
      .maxPointers(1)
      .onStart(hideLabels)
      .onChange((ev) => orbit(ev.changeX, ev.changeY))
      .onEnd(refreshLabels);
    const pinch = Gesture.Pinch()
      .runOnJS(true)
      .onStart(hideLabels)
      .onChange((ev) => zoom(ev.scaleChange))
      .onEnd(refreshLabels);
    const tap = Gesture.Tap()
      .runOnJS(true)
      .onEnd((ev, ok) => {
        if (ok) pick(ev.x, ev.y);
      });
    return Gesture.Race(tap, Gesture.Simultaneous(pan, pinch));
  }, [hideLabels, orbit, zoom, refreshLabels, pick]);
  /* eslint-enable react-hooks/refs */

  const onLayout = (ev: LayoutChangeEvent) => {
    const { width, height } = ev.nativeEvent.layout;
    size.current = { w: width, h: height };
    engine.current?.rig.setAspect(width / height);
    refreshLabels();
  };

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.fill} onLayout={onLayout} collapsable={false}>
        <GLView style={styles.fill} onContextCreate={onContextCreate} />
        {labelsVisible
          ? labels.map((l) => (
              <Pressable
                key={l.id}
                onPress={() => onSelect(l.id)}
                hitSlop={10}
                style={[
                  styles.badge,
                  {
                    left: l.x - 17,
                    top: l.y - 34,
                    backgroundColor: l.id === selectedId ? c.accent : c.primary,
                    borderColor: c.accent,
                  },
                ]}>
                <AppText variant="label" style={{ color: '#fff', fontSize: 15, lineHeight: 20 }}>
                  {toArabicDigits(l.number)}
                </AppText>
              </Pressable>
            ))
          : null}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  badge: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
