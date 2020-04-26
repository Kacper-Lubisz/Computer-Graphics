import {SceneObject} from "./SceneObject";
import {fillBuffer} from "./glUtils";

export class MeshObject extends SceneObject {
    /**
     *
     * @param gl {WebGLRenderingContext}
     * @param name {string}
     * @param modelMatrix {mat4}
     * @param children {SceneObject[]}
     * @param positions
     * @param normals
     * @param texCoords
     * @param startPositions
     * @param startNormals
     * @param startTexCoords
     * @param vertexCombinations
     * @param indexToVertex
     * @param materials
     */
    constructor(
        gl,
        name,
        modelMatrix,
        children,
        {
            positions,
            normals,
            texCoords,
            startPositions,
            startNormals,
            startTexCoords,
            vertexCombinations,
            indexToVertex,
            materials
        }
    ) {
        super(name, modelMatrix, children);
        this.gl = gl;

        this.positionArray = [];
        this.normalArray = [];
        this.uvArray = [];

        Array(vertexCombinations).fill(0).map((_, i) =>
            indexToVertex.get(i)
        ).forEach(([p, u, n]) => {
            this.positionArray = this.positionArray.concat(positions[p - startPositions]);
            this.normalArray = this.normalArray.concat(normals[n - startNormals]);
            this.uvArray = this.uvArray.concat(texCoords[u - startTexCoords]);
        });

        this.positionBuffer = fillBuffer(gl, new Float32Array(this.positionArray));
        this.normalBuffer = fillBuffer(gl, new Float32Array(this.normalArray));
        this.uvBuffer = fillBuffer(gl, new Float32Array(this.uvArray));

        for (let material of materials.keys()) {
            const faces = materials.get(material);

            faces.indexArray = faces.facesByIndex.flat();
            faces.indexBuffer = fillBuffer(gl, new Uint16Array(faces.indexArray), gl.ELEMENT_ARRAY_BUFFER);

        }

        this.materials = materials;

    }

}