
import { Sphere } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { MutableRefObject, useEffect, useMemo, useRef } from "react";
import { DoubleSide, Euler, Mesh, MeshBasicMaterial, Quaternion, Vector3 } from "three";

type ShadowProps = {
  mesh: Mesh;
  shipRef: MutableRefObject<Mesh>;
};

const Shadow = ({ mesh, shipRef }: ShadowProps) => {
  const shadow = useMemo(() =>  mesh?.children[0].clone(), [mesh]);
  const shadowRef = useRef<Mesh>(null);

  useFrame(() => {
    if (!shadowRef.current || !shipRef.current) {
      return;
    }

    const { rotation, scale } = shipRef.current;
    const shrink = 0.5;
    shadowRef.current.scale.set(scale.x * shrink, 0.001, scale.z * shrink);
  })

  if (!shadow) {
    return null;
  }

  return (
    <primitive object={shadow} position={[0,-85,0]} ref={shadowRef}>
      <meshBasicMaterial color="black" opacity={0.1} side={DoubleSide} transparent />
    </primitive>
  );
};

export default Shadow;