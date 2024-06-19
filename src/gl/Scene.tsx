import { useFrame, useThree } from "@react-three/fiber"
import { useEffect, useRef, useState } from "react";
import { loadPath } from "../phobos";
import { BufferGeometry, Mesh, MeshBasicMaterial, Object3D } from "three";
import { Tracks } from "../phobos/constants";

const Scene = () => {
  const scene = useThree(state => state.scene);

  const [mesh, setMesh] = useState<Mesh>();
  const [mesh2, setMesh2] = useState<Object3D>();
  const [mesh3, setMesh3] = useState<Object3D>();


  useEffect(() => {
    loadPath(Tracks.Wipeout2097[0].path).then(({ sky, scene, track }) => {
      setMesh(track)
     setMesh2(scene)
     setMesh3(sky)
    });
  }, [scene]);

  useFrame(({camera, scene}) => {
    scene.traverse((object) => {
      if (object.userData.isFacingCamera) {
        object.rotation.set(object.rotation.x, camera.rotation.y, object.rotation.z);
      }
    });
  });

  return (
    <>
     {mesh && <primitive object={mesh} />}
     {mesh2 && <primitive object={mesh2} />}
     {mesh3 && <primitive object={mesh3} scale={48} />}
    </>
  );
}

export default Scene;