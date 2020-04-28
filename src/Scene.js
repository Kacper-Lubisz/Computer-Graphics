import {Material} from "./Material";
import {Mesh, MeshObject} from "./MeshObject";
import {mat4} from "gl-matrix";
import path from "path";

export class Scene {
    constructor(gl, rootObject, materials) {
        this.gl = gl;
        this.rootObject = rootObject;
        this.materials = materials;
    }
}

export async function loadOBJ(scene, file) {

    const gl = scene.gl;

    const objectData = await fetch(file).then(res => res.text(), err => {
        alert(`Failed to load the scene .obj file ${err}`);
    });

    const objectLines = objectData.split("\n");

    let materialPromise = undefined;

    let currentObject = null;
    let selectedMaterial = null;

    let positionIndex = 1;
    let normalIndex = 1;
    let texCoordsIndex = 1;

    for (let i = 0; i < objectLines.length; i++) {
        const withComment = objectLines[i];
        const line = withComment.split("#")[0];

        if (line.startsWith("o ") || i === objectLines.length - 1) {

            if (currentObject !== null) {
                const newObject = new MeshObject(
                    gl,
                    currentObject.name,
                    mat4.create(),
                    [],
                    new Mesh(
                        gl,
                        currentObject.positions,
                        currentObject.normals,
                        currentObject.texCoords,
                        currentObject.startPositions,
                        currentObject.startNormals,
                        currentObject.startTexCoords,
                        currentObject.vertexCombinations,
                        currentObject.indexToVertex,
                        currentObject.materials,
                    )
                );
                scene.rootObject.children.push(newObject);
            }

            currentObject = {
                name: line.substr(2),

                positions: [],
                normals: [],
                texCoords: [],

                startPositions: positionIndex,
                startNormals: normalIndex,
                startTexCoords: texCoordsIndex,

                vertexCombinations: 0,

                vertexToIndex: new Map(),
                indexToVertex: new Map(),
                materials: new Map()
            };

        } else if (line.startsWith("v ")) {

            currentObject.positions.push(line.substr(2).split(" ").map(num => Number(num)));
            positionIndex++;

        } else if (line.startsWith("vt ")) {

            const [x, y] = line.substr(3).split(" ").map(num => Number(num));
            currentObject.texCoords.push([x, 1 - y]);
            texCoordsIndex++;

        } else if (line.startsWith("vn ")) {

            currentObject.normals.push(line.substr(3).split(" ").map(num => Number(num)));
            normalIndex++;

        } else if (line.startsWith("f ")) {

            let vertices = line.substr(2).split(" ");

            const combinationIndices = vertices.map(vertex => {

                if (currentObject.vertexToIndex.has(vertex)) {
                    return currentObject.vertexToIndex.get(vertex);
                } else {
                    currentObject.vertexToIndex.set(vertex, currentObject.vertexCombinations);
                    currentObject.indexToVertex.set(currentObject.vertexCombinations, vertex.split("/").map(ent => Number(ent)));
                    return currentObject.vertexCombinations++;
                }
            });

            if (currentObject.materials.has(selectedMaterial)) {
                currentObject.materials.get(selectedMaterial).faceVertexIndices.push(combinationIndices);
            } else {
                currentObject.materials.set(selectedMaterial, {
                    faceVertexIndices: [combinationIndices],
                });
            }
        } else if (line.startsWith("mtllib")) {
            const fileName = line.substr(7);

            materialPromise = fetch(path.resolve("res/models/", fileName)).then(res => res.text(), err => {
                alert(`Failed to materials, failed to load .mtl file, ${err}`);
            });

        } else if (line.startsWith("usemtl")) {
            selectedMaterial = line.substr(7);

        } else if (line.startsWith("p ")) { // parent
            currentObject.parent = line.substr(2);

        } else if (line.startsWith("mm ")) { // model matrix
            currentObject.modelMatrix = line.substr(3).split(" ").map(elem => Number(elem));

        }

    }

    const materialData = await materialPromise;
    const materials = loadMTL(gl, materialData, scene);

}


export function loadMTL(gl, source, scene) {

    let currentMaterial = null;

    const materialLines = source.split("\n");
    for (let i = 0; i < materialLines.length; i++) {
        const withComment = materialLines[i];
        const line = withComment.split("#")[0];

        if (line.startsWith("newmtl ") || i === materialLines.length - 1) {

            if (currentMaterial !== null) {
                scene.materials.set(currentMaterial.name, new Material(
                    gl,
                    currentMaterial
                    )
                );
            }

            let materialName = line.substr(7);
            currentMaterial = {
                name: materialName,
                albedo: null,
                metalness: null,
                roughness: null,
                albedoMapPath: null,
                normalMapPath: null,
                metalnessMapPath: null,
                roughnessMapPath: null
            };

        } else if (line.startsWith("Kd")) {
            currentMaterial.albedo = line.substr(3).split(" ").map(elem => Number(elem));

        } else if (line.startsWith("map_Kd ")) {

            let elements = line.substr(7).split(" ");
            currentMaterial.albedoMapPath = elements[elements.length - 1];

        } else if (line.startsWith("map_Bump ")) {

            let elements = line.substr(9).split(" ");
            currentMaterial.normalMapPath = elements[elements.length - 1];


        } else if (line.startsWith("Ns ")) {
            currentMaterial.roughness = line.substr(3);

        } else if (line.startsWith("map_Ns ")) {

            let elements = line.substr(7).split(" ");
            currentMaterial.roughnessMapPath = elements[elements.length - 1];

        } else if (line.startsWith("Pm ")) {
            currentMaterial.metalness = Number(line.substr(3));

        } else if (line.startsWith("refl ")) {
            currentMaterial.metalnessMapPath = line.substr(5);

        }
    }

}