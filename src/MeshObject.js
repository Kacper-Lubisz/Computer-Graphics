import {SceneObject} from "./SceneObject";
import {mat4} from "gl-matrix";
import {fillBuffer} from "./glUtils";


export class MeshObject extends SceneObject {
    /**
     *
     * @param gl {WebGLRenderingContext}
     * @param name {string}
     * @param modelMatrix {mat4}
     * @param children {SceneObject[]}
     * @param mesh {Mesh} The mesh for this object
     */
    constructor(
        gl,
        name,
        modelMatrix,
        children,
        mesh,
    ) {
        super(name, modelMatrix, children);
        this.gl = gl;
        this.mesh = mesh;
    }

    clone() {
        return new MeshObject(this.gl, `${name} clone`, mat4.clone(this.modelMatrix), this.cloneChildren(), this.mesh);
    }

}

export class Mesh {

    constructor(
        gl,
        positions,
        normals,
        texCoords,
        startPositions,
        startNormals,
        startTexCoords,
        vertexCombinations,
        indexToVertex,
        materials
    ) {
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

            faces.indexArray = faces.faceVertexIndices.flat();
            faces.indexBuffer = fillBuffer(gl, new Uint16Array(faces.indexArray), gl.ELEMENT_ARRAY_BUFFER);

        }

        this.materials = materials;

    }
}
