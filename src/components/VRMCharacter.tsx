import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRM, VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";

const DEFAULT_VRM_PATH = "/vrm/character.vrm";
const FALLBACK_VRM_PATH = "/vrm/sample.vrm";

type LoadState = "loading" | "ready" | "error";

interface Props {
  size?: number;
  /** 0..1 — drives the mouth blendshape when TTS is talking. */
  mouthAmplitude?: number;
  onReady?: () => void;
  onError?: () => void;
}

/**
 * Renders a VRM 3D avatar on a transparent canvas via three.js.
 * - Procedural breathing (gentle bob + scale)
 * - Periodic blink via the model's blink expression
 * - Cursor look-at via VRMLookAt
 * - Mouth blendshape driven by `mouthAmplitude` prop (lip-sync hook)
 *
 * Tries /vrm/character.vrm first (user-supplied), falls back to /vrm/sample.vrm
 * (bundled). If both fail, calls `onError` so the parent can show a fallback.
 */
export function VRMCharacter({ size = 280, mouthAmplitude = 0, onReady, onError }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<{
    renderer?: THREE.WebGLRenderer;
    scene?: THREE.Scene;
    camera?: THREE.PerspectiveCamera;
    vrm?: VRM;
    lookTarget?: THREE.Object3D;
    clock?: THREE.Clock;
    raf?: number;
    blinkUntil: number;
    nextBlinkAt: number;
    mouthAmp: number;
  }>({ blinkUntil: 0, nextBlinkAt: 0, mouthAmp: 0 });
  const [state, setState] = useState<LoadState>("loading");

  // Update mouth-amplitude ref so the rAF loop reads the freshest value
  // without retriggering the effect.
  useEffect(() => {
    stateRef.current.mouthAmp = mouthAmplitude;
  }, [mouthAmplitude]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      premultipliedAlpha: false,
    });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(size, size, false);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();

    // Soft sakura-ish key light + neutral fill.
    const key = new THREE.DirectionalLight(0xfff0f3, 1.4);
    key.position.set(0.8, 2.5, 1.5);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xb4d4ff, 0.5);
    fill.position.set(-1.5, 1.5, -0.5);
    scene.add(fill);
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));

    const camera = new THREE.PerspectiveCamera(28, 1, 0.05, 20);
    camera.position.set(0, 1.4, 0.8);
    camera.lookAt(0, 1.4, 0);

    const lookTarget = new THREE.Object3D();
    lookTarget.position.set(0, 1.4, 1);
    scene.add(lookTarget);

    const clock = new THREE.Clock();

    stateRef.current.renderer = renderer;
    stateRef.current.scene = scene;
    stateRef.current.camera = camera;
    stateRef.current.lookTarget = lookTarget;
    stateRef.current.clock = clock;
    stateRef.current.nextBlinkAt = performance.now() + 2500 + Math.random() * 2500;

    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    const tryLoad = (path: string, isFallback = false) => {
      loader.load(
        path,
        (gltf) => {
          if (disposed) return;
          const vrm = gltf.userData.vrm as VRM | undefined;
          if (!vrm) {
            if (!isFallback) tryLoad(FALLBACK_VRM_PATH, true);
            else {
              setState("error");
              onError?.();
            }
            return;
          }

          // Optimisation passes recommended by @pixiv/three-vrm docs.
          VRMUtils.removeUnnecessaryVertices(gltf.scene);
          VRMUtils.combineSkeletons(gltf.scene);
          vrm.scene.traverse((obj) => {
            obj.frustumCulled = false;
          });

          // VRM 0.x models face -Z by default; VRM 1.0 faces +Z. This util
          // does nothing on 1.0 and rotates 180° on 0.x — works for both.
          VRMUtils.rotateVRM0(vrm);

          scene.add(vrm.scene);
          stateRef.current.vrm = vrm;

          // Camera framing: place the camera in front of the character (the
          // direction the character now faces after rotateVRM0). We compute
          // forward by sampling a point in front of the head bone in local
          // space, then transforming to world.
          const head = vrm.humanoid?.getRawBoneNode("head");
          if (head) {
            const hp = new THREE.Vector3();
            head.getWorldPosition(hp);
            // Character now faces +Z. Camera goes +Z in front, slightly above
            // head height, looking at the chest level so head + shoulders fit.
            camera.position.set(hp.x, hp.y + 0.02, hp.z + 0.42);
            camera.lookAt(hp.x, hp.y - 0.05, hp.z);
            // Look target positioned far in front so the eyes track naturally.
            lookTarget.position.set(hp.x, hp.y, hp.z + 1);
          }

          // Wire VRM look-at to our movable target.
          if (vrm.lookAt) {
            vrm.lookAt.target = lookTarget;
          }

          setState("ready");
          onReady?.();
        },
        undefined,
        (err) => {
          console.warn("[VRMCharacter] load failed", path, err);
          if (!isFallback) tryLoad(FALLBACK_VRM_PATH, true);
          else {
            setState("error");
            onError?.();
          }
        },
      );
    };
    tryLoad(DEFAULT_VRM_PATH);

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      // Normalise cursor to camera local space ~ NDC. Then push out as a world point.
      const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      const v = new THREE.Vector3(ndcX, ndcY, 0.5).unproject(camera);
      lookTarget.position.copy(v);
    };
    // Use window-wide tracking — the character looks even when mouse is outside the canvas.
    window.addEventListener("mousemove", onMouseMove);

    const tick = () => {
      if (disposed) return;
      const t = performance.now();
      const dt = clock.getDelta();
      const vrm = stateRef.current.vrm;

      if (vrm) {
        vrm.update(dt);

        // ---- Procedural blink ----
        const blink = vrm.expressionManager;
        if (blink) {
          if (t < stateRef.current.blinkUntil) {
            blink.setValue("blink", 1);
          } else {
            blink.setValue("blink", 0);
            if (t > stateRef.current.nextBlinkAt) {
              stateRef.current.blinkUntil = t + 130;
              stateRef.current.nextBlinkAt = t + 2800 + Math.random() * 2800;
            }
          }

          // ---- Mouth (lip-sync) ----
          const amp = stateRef.current.mouthAmp;
          blink.setValue("aa", Math.max(0, Math.min(1, amp)));
        }

        // ---- Subtle breathing — bob the whole rig a hair ----
        const phase = t / 1000;
        vrm.scene.position.y = Math.sin(phase * 1.6) * 0.004;
        vrm.scene.rotation.y = Math.sin(phase * 0.5) * 0.04;
      }

      renderer.render(scene, camera);
      stateRef.current.raf = requestAnimationFrame(tick);
    };
    stateRef.current.raf = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      window.removeEventListener("mousemove", onMouseMove);
      if (stateRef.current.raf) cancelAnimationFrame(stateRef.current.raf);
      const v = stateRef.current.vrm;
      if (v) {
        scene.remove(v.scene);
        VRMUtils.deepDispose(v.scene);
      }
      renderer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size]);

  return (
    <canvas
      ref={canvasRef}
      className="vrm-canvas"
      style={{
        width: size,
        height: size,
        display: state === "error" ? "none" : "block",
      }}
    />
  );
}
