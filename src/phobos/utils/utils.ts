import { BufferAttribute, BufferGeometry, Color, Float32BufferAttribute, Material, Mesh, MeshBasicMaterial, PlaneGeometry, Texture, Vector2, Vector3 } from "three";
import { POLYGON_TYPE } from "../structs";

export const int32ToColor = (v: number): Color => new Color(((v >> 24) & 0xff) / 0x80, ((v >> 16) & 0xff) / 0x80, ((v >> 8) & 0xff) / 0x80);

const loadBinary = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load: ${url}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return arrayBuffer;
};

export const loadBinaries = async (paths: Record<string, string>) => {
  const entries = await Promise.all(
    Object.entries(paths).map(async ([key, path]) => [key, await loadBinary(path)])
  );
  return Object.fromEntries(entries);
};

const createSprite = (polygon: Polygon, map: Texture, vertex: Vertex) => {
  if (!vertex) {
    console.warn('No vertex found for sprite');
    return;
  }

  const { color, header } = polygon;

  const yOffset = header.type === POLYGON_TYPE.SPRITE_BOTTOM_ANCHOR
    ? (polygon.height ?? 1) / 2
    : -(polygon.height ?? 1) / 2;

  // We can't use THREE.Sprite here, because they rotate to the camera on
  // all axis. We just want rotation around the Y axis, so we do it manually.
  const spriteMaterial = new MeshBasicMaterial({
    alphaTest: 0.5,
    map,
    color: int32ToColor(color ?? 0),
  });
  const spriteMesh = new Mesh(new PlaneGeometry(polygon.width, polygon.height), spriteMaterial);

  const sprite = new Mesh();
  sprite.userData.isFacingCamera = true;
  sprite.position.set(vertex.x, vertex.y + yOffset, vertex.z);
  sprite.add(spriteMesh);

  // We have to collect sprites separately, so we can go through all of them 
  // and rotate them to the camera before rendering the frame
  return sprite;
}

export const constructMeshFromBufferGeometryData = (data: BufferGeometryData, material: Material | Material[]) => {
  const { faceVertexUvs, colors, indices, positions, normals } = data;

  const geometry = new BufferGeometry();

  // Set positions
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));

  geometry.setAttribute('uv', new Float32BufferAttribute(faceVertexUvs, 2));
  geometry.setAttribute('color', new BufferAttribute(new Float32Array(colors), 3));
  geometry.setIndex(new BufferAttribute(new Uint16Array(indices), 1));
  geometry.setDrawRange(0, indices.length);
  geometry.addGroup(0, indices.length, 0);

  if (normals) {
    geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3));
  }

  geometry.computeVertexNormals();

  const mesh = new Mesh(geometry, material);

  data.sprites?.forEach(({ sprite, map }) => {
    const positions = geometry.getAttribute('position').array;
    const vertex = new Vector3(positions[sprite.index], positions[sprite.index + 1], positions[sprite.index + 2]);
    const spriteMesh = createSprite(sprite, map, vertex);
    if (spriteMesh) {
      mesh.add(spriteMesh);
    }
  });

  mesh.geometry.computeBoundingSphere();

  return mesh;
}

const nullVector = new Vector2(0, 0);
const whiteColor = new Color(1, 1, 1);

export const createBufferGeometryDataFromPolygons = (polygons: Polygon[] | Face[], vertices: Vertex[], sceneMaterial?: MeshBasicMaterial[]) => {
  const positions = vertices.map((vertex) => [vertex.x, -vertex.y, -vertex.z]).flat();

  const filteredPolygons = polygons.filter(polygon => polygon.indices !== undefined) as Array<Required<Polygon>>;

  const faceVertexUvs = filteredPolygons.map((polygon) => {
    // UVs
    let uvs = [nullVector, nullVector, nullVector, nullVector];
    const img = sceneMaterial && typeof polygon.texture === 'number' ? sceneMaterial[polygon.texture]?.map?.image : null;

    if (img && polygon.uv !== undefined) {
      uvs = polygon.uv.map(({ u, v }) => new Vector2(u / img.width, 1 - v / img.height));
    }

    const standardUvs = [uvs[2], uvs[1], uvs[0]];
    const polygonUvs = polygon.indices.length === 4
      ? [...standardUvs, uvs[2], uvs[3], uvs[1]]
      : standardUvs;

    return polygonUvs;
  }).flat().flatMap(uv => [uv.x, uv.y]);

  const indices = filteredPolygons.map((polygon) => {
    // Indices
    const standardIndices = [polygon.indices[2], polygon.indices[1], polygon.indices[0]];
    const polygonIndices = polygon.indices.length === 4
      ? [...standardIndices, polygon.indices[2], polygon.indices[3], polygon.indices[1]]
      : standardIndices;

    return polygonIndices;
  }).flat();

  const colors = filteredPolygons.map((polygon) => {
    // Colors
    const constructedColors = [whiteColor, whiteColor, whiteColor, whiteColor];
    const hasColors = !!(polygon.color || polygon.colors);
    if (hasColors) {
      for (let j = 0; j < polygon.indices.length; j++) {
        const validColor = polygon.color || polygon.colors?.[j];

        if (!validColor) {
          continue;
        }

        constructedColors[j] = int32ToColor(validColor);
      }
    }
    const standardColors = [constructedColors[2], constructedColors[1], constructedColors[0]];
    const polygonColors = polygon.indices.length === 4
      ? [...standardColors, constructedColors[2], constructedColors[3], constructedColors[1]]
      : standardColors;

    return polygonColors;
  }).flat().flatMap(color => [color.r, color.g, color.b]);

  return {
    colors,
    faceVertexUvs,
    indices,
    positions,
  }
}