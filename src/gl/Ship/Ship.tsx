import { Matrix4, Mesh, Quaternion, Vector3 } from "three";
import HermiteCurve3 from "../../phobos/utils/HermiteCurve3";
import { useFrame } from "@react-three/fiber";
import { MutableRefObject, useMemo, useRef } from "react";
import useStore from "../../store";
import { Sphere } from "@react-three/drei";

const TARGET_SPEED = 10;
const CAMERA_VERTICAL_OFFSET = new Vector3(0, 350, 0);
const CAMERA_BEHIND_OFFSET = 2000;
const ROLL_STRENGTH = 0.5;
const ROLL_MAX = 0.5;

// Reusable vectors
const UP = new Vector3(0, 1, 0);

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const Ship = ({ isPlayer = false, mesh, speed, splineRef }: { isPlayer: boolean, mesh?: Mesh, splineRef?: MutableRefObject<HermiteCurve3 | null>}) => {
  const tempo = useStore(state => state.tempo);

  const shipRef = useRef<Mesh>();
  const currentProgress = useRef<number>(0);

  const debugForwardRef = useRef<Mesh>();
  const debugPlayerRef = useRef<Mesh>();

  useFrame(({ camera }) => {
    if (!shipRef.current || !splineRef || !splineRef.current ) {
      return;
    }
    const spline = splineRef.current;

    const BASE_MOVEMENT = 0.00008;
    //currentProgress.current += STEPS * 10;
    let progressChange = speed * BASE_MOVEMENT;
    if (!isPlayer) {
      progressChange *= (Math.random() + 0.5);
    }

    currentProgress.current += progressChange;
    currentProgress.current %= 1;

    const currentSplinePosition = spline.getPointAt(currentProgress.current).clone();
    const currentSplineTangent = spline.getTangentAt(currentProgress.current).clone();

    const nextProgress = (currentProgress.current + 0.002) % 1;
    const upcomingSplinePosition = spline.getPointAt(nextProgress).clone();
    const upcomingSplineTangent = spline.getTangentAt(nextProgress).clone();
  
    debugForwardRef.current.position.copy(upcomingSplinePosition);
    if (debugPlayerRef.current) {
      debugPlayerRef.current.position.copy(currentSplinePosition).add(new Vector3(0, 250, 0));
    }
    
    // Calculate current turning direction
    const curvature = currentSplineTangent.angleTo(upcomingSplineTangent);
    const direction = upcomingSplineTangent.x < currentSplineTangent.x ? -1 : 1;
    debugForwardRef.current?.material.color.set(direction > 0 ? 0x0000ff : 0x00ff00);

    const rollAmount = clamp(curvature * ROLL_STRENGTH * direction, -ROLL_MAX, ROLL_MAX);

    const normalizedTangent = currentSplineTangent.clone().normalize();
  
    // Set ship values
    shipRef.current.position.copy(currentSplinePosition);
    shipRef.current.position.y += 150;
    shipRef.current.lookAt(currentSplinePosition.clone().add(normalizedTangent));

    // Look at the next point
    const lookAtMatrix = new Matrix4();
    lookAtMatrix.lookAt(currentSplinePosition, currentSplinePosition.clone().add(currentSplineTangent), UP);

    // Apply roll
    const lookAtQuaternion = new Quaternion().setFromRotationMatrix(lookAtMatrix);
    const rollQuaternion = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), rollAmount);
    lookAtQuaternion.multiply(rollQuaternion);

    // Ensure the ship rotates 180 degrees to face the right way
    const correctiveQuaternion = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI);
    lookAtQuaternion.multiply(correctiveQuaternion);
    shipRef.current.quaternion.copy(lookAtQuaternion);

    if (isPlayer) {
      const scaledTangent = normalizedTangent.multiplyScalar(CAMERA_BEHIND_OFFSET);
      const pointBehind = currentSplinePosition.clone().sub(scaledTangent).add(CAMERA_VERTICAL_OFFSET);
    
      camera.position.copy(pointBehind);

      camera.lookAt(currentSplinePosition);
    }
  });

  const shipMesh = useMemo(() => mesh?.clone(), [mesh]);

  if (!mesh) {
    return null;
  }

  return (
    <>
      <Sphere args={[10, 10, 10]} position={[0, 0, 0]} ref={debugForwardRef} scale={10} />
      {isPlayer && (
        <Sphere args={[10, 10, 10]} position={[0, 0, 0]} ref={debugPlayerRef} scale={5}>
          <meshBasicMaterial color={0xff0000} />
        </Sphere>
        )}
      <primitive object={shipMesh} ref={shipRef}  />
    </>
  );
}

export default Ship;