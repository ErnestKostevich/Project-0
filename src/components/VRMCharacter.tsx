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
  /** Increments to trigger a click reaction (random expression). */
  reactionTrigger?: number;
  onReady?: () => void;
  onError?: () => void;
  onClick?: () => void;
}

/**
 * Renders a VRM 3D avatar on a transparent canvas via three.js.
 * - Procedural breathing (gentle bob + scale)
 * - Periodic blink via the model's blink expression
 * - Cursor look-at via VRMLookAt
 * - Mouth blendshape driven by `mouthAmplitude` prop (lip-sync hook)
 * - Rest pose: arms hanging down (no T-pose), with subtle idle sway
 *
 * Tries /vrm/character.vrm first (user-supplied), falls back to /vrm/sample.vrm
 * (bundled). If both fail, calls `onError` so the parent can show a fallback.
 */

/**
 * Apply natural arms-down rest pose to a freshly loaded VRM.
 * VRMs default to T-pose because rest skinning is bound that way.
 * We rotate the upper-arm bones ~72° around their local Z so they hang,
 * add a small elbow bend, and relax the hands inward.
 */
function applyRestPose(vrm: VRM) {
  const set = (name: string, x: number, y: number, z: number) => {
    const bone = vrm.humanoid?.getRawBoneNode(name as never);
    if (bone) bone.rotation.set(x, y, z);
  };
  // Upper arms: positive Z for left, negative for right brings them down.
  set("leftUpperArm", 0, 0, 1.2);
  set("rightUpperArm", 0, 0, -1.2);
  // Slight forward bend at elbow + hand for relaxed posture.
  set("leftLowerArm", 0, 0, 0.18);
  set("rightLowerArm", 0, 0, -0.18);
  set("leftHand", 0, 0, 0.1);
  set("rightHand", 0, 0, -0.1);
}
export function VRMCharacter({
  size = 280,
  mouthAmplitude = 0,
  reactionTrigger = 0,
  onReady,
  onError,
  onClick,
}: Props) {
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
    reaction: { name: string; until: number } | null;
    /** Cached references + base rotations for the idle sway loop. */
    armRest: {
      leftUpperArm: THREE.Object3D | null;
      rightUpperArm: THREE.Object3D | null;
      head: THREE.Object3D | null;
      baseLeftUpperArmZ: number;
      baseRightUpperArmZ: number;
    };
  }>({
    blinkUntil: 0,
    nextBlinkAt: 0,
    mouthAmp: 0,
    reaction: null,
    armRest: {
      leftUpperArm: null,
      rightUpperArm: null,
      head: null,
      baseLeftUpperArmZ: 0,
      baseRightUpperArmZ: 0,
    },
  });
  const [state, setState] = useState<LoadState>("loading");

  // Update mouth-amplitude ref so the rAF loop reads the freshest value
  // without retriggering the effect.
  useEffect(() => {
    stateRef.current.mouthAmp = mouthAmplitude;
  }, [mouthAmplitude]);

  // Trigger a random reaction expression when the parent bumps reactionTrigger.
  useEffect(() => {
    if (!reactionTrigger) return;
    const expressions = ["happy", "surprised", "relaxed", "happy", "happy"];
    const pick = expressions[Math.floor(Math.random() * expressions.length)];
    stateRef.current.reaction = { name: pick, until: performance.now() + 1400 };
  }, [reactionTrigger]);

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

    const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 20);
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

          // Step 1: rotate VRM 0.x (no-op on 1.0).
          VRMUtils.rotateVRM0(vrm);

          // Step 2: FORCE additional 180° rotation. Our bundled VRoid exports
          // (Shino + AvatarSample_*) all face -Z despite being marked 1.0 —
          // VRMUtils.rotateVRM0 only fixes 0.x. We always need the extra flip.
          // If users later supply a properly-exported VRM 1.0 that faces +Z,
          // we can expose a settings toggle then.
          vrm.scene.rotation.y += Math.PI;
          vrm.scene.updateMatrixWorld(true);

          // Step 3: apply natural REST POSE (arms down) — VRMs ship in T-pose
          // by default, which looks creepy. We rotate upper arms to hang
          // by the sides, add elbow bend, settle hands.
          applyRestPose(vrm);
          vrm.scene.updateMatrixWorld(true);

          scene.add(vrm.scene);
          stateRef.current.vrm = vrm;

          // Cache bone refs + base rotations for the idle-sway tick loop.
          const luArm = vrm.humanoid?.getRawBoneNode("leftUpperArm") as THREE.Object3D | undefined;
          const ruArm = vrm.humanoid?.getRawBoneNode("rightUpperArm") as THREE.Object3D | undefined;
          const headBone = vrm.humanoid?.getRawBoneNode("head") as THREE.Object3D | undefined;
          stateRef.current.armRest = {
            leftUpperArm: luArm ?? null,
            rightUpperArm: ruArm ?? null,
            head: headBone ?? null,
            baseLeftUpperArmZ: luArm?.rotation.z ?? 0,
            baseRightUpperArmZ: ruArm?.rotation.z ?? 0,
          };

          // Step 4: compute upper-body frame (head + chest) using bones.
          const head = vrm.humanoid?.getRawBoneNode("head");
          const chest =
            vrm.humanoid?.getRawBoneNode("chest") ||
            vrm.humanoid?.getRawBoneNode("upperChest") ||
            vrm.humanoid?.getRawBoneNode("spine");

          let frameTopY = 1.6;
          let frameBottomY = 1.2;
          let frameCenterX = 0;
          let frameCenterY = 1.4;
          let frameCenterZ = 0;
          // FIXED frameWidth = ~55cm covers head + hair + shoulders generously.
          // Don't use fullSize.x because T-pose hands/sleeves balloon the bbox.
          const frameWidth = 0.55;

          const fullBox = new THREE.Box3().setFromObject(vrm.scene);

          if (head) {
            const hp = head.getWorldPosition(new THREE.Vector3());
            frameCenterX = hp.x;
            frameCenterZ = hp.z;
            frameTopY = hp.y + 0.22;
            if (chest) {
              const cp = chest.getWorldPosition(new THREE.Vector3());
              frameBottomY = cp.y - 0.1;
            } else {
              frameBottomY = hp.y - 0.4;
            }
          } else {
            const center = fullBox.getCenter(new THREE.Vector3());
            const sz = fullBox.getSize(new THREE.Vector3());
            frameCenterX = center.x;
            frameCenterZ = center.z;
            frameTopY = fullBox.max.y + 0.05;
            frameBottomY = center.y + sz.y * 0.05;
          }

          const frameHeight = Math.max(0.001, frameTopY - frameBottomY);
          frameCenterY = (frameTopY + frameBottomY) / 2;

          const fovRad = (camera.fov * Math.PI) / 180;
          const distanceH = (frameHeight / 2 / Math.tan(fovRad / 2)) * 1.25;
          const distanceW = (frameWidth / 2 / Math.tan(fovRad / 2)) * 1.1;
          const distance = Math.max(distanceH, distanceW);

          // After our forced flip, character faces +Z, so camera goes +Z.
          camera.position.set(frameCenterX, frameCenterY, frameCenterZ + distance);
          camera.lookAt(frameCenterX, frameCenterY, frameCenterZ);
          lookTarget.position.set(frameCenterX, frameCenterY + 0.1, frameCenterZ + 1);

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

          // ---- Reaction expression (decays smoothly over 1.4s) ----
          const reaction = stateRef.current.reaction;
          if (reaction) {
            if (t < reaction.until) {
              const remaining = (reaction.until - t) / 1400;
              const eased = Math.sin(remaining * Math.PI); // 0 → 1 → 0
              try {
                blink.setValue(reaction.name, eased);
              } catch {
                /* expression name not in model */
              }
            } else {
              try {
                blink.setValue(reaction.name, 0);
              } catch {
                /* ignore */
              }
              stateRef.current.reaction = null;
            }
          }
        }

        // ---- Subtle breathing + idle motion ----
        const phase = t / 1000;
        // Whole-rig vertical bob (chest breathing illusion)
        vrm.scene.position.y = Math.sin(phase * 1.6) * 0.005;
        // Gentle Y-rotation around the forced-flip baseline (Math.PI).
        vrm.scene.rotation.y = Math.PI + Math.sin(phase * 0.45) * 0.06;

        // Procedural idle: gentle arm sway + head tilt + neck breathing.
        const arms = stateRef.current.armRest;
        if (arms.leftUpperArm) {
          arms.leftUpperArm.rotation.z =
            arms.baseLeftUpperArmZ + Math.sin(phase * 0.7) * 0.025;
        }
        if (arms.rightUpperArm) {
          arms.rightUpperArm.rotation.z =
            arms.baseRightUpperArmZ - Math.sin(phase * 0.7) * 0.025;
        }
        if (arms.head) {
          arms.head.rotation.z = Math.sin(phase * 0.4) * 0.04;
          arms.head.rotation.x = Math.sin(phase * 0.6) * 0.02;
        }
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
      onClick={onClick}
      style={{
        width: size,
        height: size,
        display: state === "error" ? "none" : "block",
        cursor: onClick ? "pointer" : "default",
        // Click-through stays via App.tsx CSS unless onClick is supplied
        pointerEvents: onClick ? "auto" : "none",
      }}
    />
  );
}
