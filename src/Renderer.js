import {mat4, vec3} from "gl-matrix";
import {CameraController} from "./CameraController";
import {loadShaderProgram} from "./ShaderProgram";
import path from "path";
import {Material} from "./Material";
import {SceneObject} from "./SceneObject";
import {Light} from "./Light";
import {MeshObject} from "./MeshObject";
import {fillBuffer, loadCubeMap} from "./glUtils";


const zNear = 0.1;
const zFar = 100;
const fieldOfView = 80 * Math.PI / 180;

export class Renderer {
    constructor(canvas, scene, onLoaded) {

        this.camera = {
            location: vec3.create(),
            rotation: vec3.create(),
        };
        this.cameraController = new CameraController(this);

        this.gl = canvas.getGlContext();

        this.projectionMatrix = mat4.create();
        mat4.perspective(
            this.projectionMatrix,
            fieldOfView,
            canvas.width / canvas.height,
            zNear,
            zFar
        );
        this.viewMatrix = mat4.create();

        // const skyBoxPromise = loadOBJ(scene);


        new Promise(async (acc, rej) => {
            try {
                this.scene = await loadOBJ(this.gl, scene);

                this.pbrShader = await loadShaderProgram(
                    this.gl,
                    "/res/shaders/pbr.vert",
                    "/res/shaders/pbr.frag",
                    ["aPosition", "aNormal", "aTexCoord",],
                    [
                        "uModelMatrix", "uViewMatrix", "uProjectionMatrix",
                        "uNormalMap",
                        "uCameraPosition",
                        "uUseAlbedoMap", "uAlbedo", "uAlbedoMap",
                        "uUseRoughnessMap", "uRoughness", "uRoughnessMap",
                        "uUseMetalnessMap", "uMetalness", "uMetalnessMap",
                        "uLightPositions", "uLightColors",
                        "uSkyMap"
                    ]
                );

                this.skyShader = await loadShaderProgram(
                    this.gl,
                    "/res/shaders/sky.vert",
                    "/res/shaders/sky.frag",
                    ["aPosition"],
                    [
                        "uProjectionMatrix", "uViewMatrix",
                        "uSkyMap"
                    ]
                );
                onLoaded();
                this.paint();

                acc();
            } catch (e) {
                rej(e);

            }
        }).catch((error) => {
            alert(`Unrecoverable Error, failed to load scene. ${error}`);
            console.error(error);
        });

        this.skyBoxPositionsBuffer = fillBuffer(this.gl, new Float32Array([ // using gl.TRIANGLES
            0, 1, 0,
            0, -1, 0,
            1, 0, 0,
            -1, 0, 0,
            0, 0, 1,
            0, 0, -1,
        ]));
        this.skyBoxIndicesBuffer = fillBuffer(this.gl, new Uint16Array([
            2, 4, 0,
            0, 4, 3,
            3, 5, 0,
            5, 2, 0,
            2, 1, 4,
            1, 2, 5,
            3, 4, 1,
            5, 3, 1,
        ]), this.gl.ELEMENT_ARRAY_BUFFER);

        this.skyBoxCubeMap = loadCubeMap(this.gl, [
            "/res/textures/sky_map_px.png",
            "/res/textures/sky_map_nx.png",
            "/res/textures/sky_map_py.png",
            "/res/textures/sky_map_ny.png",
            "/res/textures/sky_map_pz.png",
            "/res/textures/sky_map_nz.png",
        ]);

    }

    paint() {
        this.cameraController.update();

        this.gl.clearDepth(1.0);
        this.gl.clearColor(0.9, 0.9, 0.9, 1.0);
        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.enable(this.gl.CULL_FACE);
        this.gl.cullFace(this.gl.BACK);
        this.gl.depthFunc(this.gl.LEQUAL);

        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        mat4.identity(this.viewMatrix);
        mat4.rotateX(this.viewMatrix, this.viewMatrix, this.camera.rotation[0]);
        mat4.rotateY(this.viewMatrix, this.viewMatrix, this.camera.rotation[1]);
        mat4.rotateZ(this.viewMatrix, this.viewMatrix, this.camera.rotation[2]);
        mat4.translate(this.viewMatrix, this.viewMatrix, this.camera.location.map(elem => -elem));

        // this.gl.useProgram(this.skyShader.program);
        //
        // this.gl.uniformMatrix4fv(this.skyShader.getUniformLocation("uProjectionMatrix"), false, this.projectionMatrix);
        // this.gl.uniformMatrix4fv(this.skyShader.getUniformLocation("uViewMatrix"), false, this.viewMatrix);

        this.gl.useProgram(this.pbrShader.shaderProgram);

        this.gl.uniformMatrix4fv(this.pbrShader.uniformLocations["uProjectionMatrix"], false, this.projectionMatrix);
        this.gl.uniformMatrix4fv(this.pbrShader.uniformLocations["uViewMatrix"], false, this.viewMatrix);

        this.gl.uniform3fv(this.pbrShader.uniformLocations["uCameraPosition"], this.camera.location);

        this.gl.uniform1i(this.pbrShader.uniformLocations["uSkyMap"], 0);
        this.gl.uniform1i(this.pbrShader.uniformLocations["uAlbedoMap"], 1);
        this.gl.uniform1i(this.pbrShader.uniformLocations["uNormalMap"], 2);
        this.gl.uniform1i(this.pbrShader.uniformLocations["uRoughnessMap"], 3);
        this.gl.uniform1i(this.pbrShader.uniformLocations["uMetalnessMap"], 4);

        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.skyBoxCubeMap);

        const unwrappedSceneGraph = this.scene.rootObject.unwrapChildren(); // pre order traversal
        const transformationMap = new Map();

        const lights = [];

        for (let object of unwrappedSceneGraph) {

            if (object.parent === null) {
                transformationMap.set(object.object, mat4.create());
            } else {
                let matrix = mat4.clone(transformationMap.get(object.parent));
                mat4.multiply(matrix, matrix, object.object.modelMatrix);
                transformationMap.set(object.object, matrix);
            }

            if (object instanceof Light) {
                lights.push(object);
            }

        }

        const lightColors = lights.map(light => light.color);
        const lightPositions = lights.map(light => mat4.getTranslation(vec3.create(), light.modelMatrix));

        for (let object of unwrappedSceneGraph) {

            let mesh = object.object;
            if (mesh instanceof MeshObject) {

                this.gl.uniformMatrix4fv(this.pbrShader.uniformLocations["uModelMatrix"], false, transformationMap.get(mesh));

                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, mesh.positionBuffer);
                this.gl.vertexAttribPointer(this.pbrShader.attributeLocations["aPosition"], 3, this.gl.FLOAT, false, 0, 0);
                this.gl.enableVertexAttribArray(this.pbrShader.attributeLocations["aPosition"]);

                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, mesh.normalBuffer);
                this.gl.vertexAttribPointer(this.pbrShader.attributeLocations["aNormal"], 3, this.gl.FLOAT, false, 0, 0);
                this.gl.enableVertexAttribArray(this.pbrShader.attributeLocations["aNormal"]);

                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, mesh.uvBuffer);
                this.gl.vertexAttribPointer(this.pbrShader.attributeLocations["aTexCoord"], 2, this.gl.FLOAT, false, 0, 0);
                this.gl.enableVertexAttribArray(this.pbrShader.attributeLocations["aTexCoord"]);

                for (let materialName of mesh.materials.keys()) {

                    const faces = mesh.materials.get(materialName);
                    const material = this.scene.materials[materialName];

                    // console.log(material.albedoMap);

                    // uUseMetalnessMap
                    // uMetalness
                    // uMetalnessMap

                    this.gl.uniform3fv(this.pbrShader.uniformLocations["uAlbedo"], material.albedo ? material.albedo : [1, 1, 1]);
                    this.gl.uniform1i(this.pbrShader.uniformLocations["uUseAlbedoMap"], material.albedoMap ? 1 : 0);

                    this.gl.uniform1f(this.pbrShader.uniformLocations["roughness"], material.roughness ? material.roughness : 0.8);
                    this.gl.uniform1i(this.pbrShader.uniformLocations["useRoughnessMap"], material.roughnessMap ? 1 : 0);

                    this.gl.uniform1f(this.pbrShader.uniformLocations["uMetalness"], material.metalness ? material.metalness : 0);
                    this.gl.uniform1i(this.pbrShader.uniformLocations["uUseMetalnessMap"], material.albedoMap ? 1 : 0);

                    this.gl.activeTexture(this.gl.TEXTURE1);
                    this.gl.bindTexture(this.gl.TEXTURE_2D, material.albedoMap ?? null);

                    this.gl.activeTexture(this.gl.TEXTURE2);
                    this.gl.bindTexture(this.gl.TEXTURE_2D, material.normalMap ?? null);

                    this.gl.activeTexture(this.gl.TEXTURE3);
                    this.gl.bindTexture(this.gl.TEXTURE_2D, material.roughnessMap ?? null);

                    this.gl.activeTexture(this.gl.TEXTURE4);
                    this.gl.bindTexture(this.gl.TEXTURE_2D, material.metalnessMap ?? null);

                    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, faces.indexBuffer);

                    this.gl.drawElements(
                        this.gl.TRIANGLES,
                        faces.indexArray.length,
                        this.gl.UNSIGNED_SHORT,
                        0
                    );
                }
            }
        }

        // draw sky

        this.gl.depthFunc(this.gl.LEQUAL);
        this.gl.useProgram(this.skyShader.shaderProgram);

        this.gl.uniformMatrix4fv(this.skyShader.uniformLocations["uProjectionMatrix"], false, this.projectionMatrix);
        this.gl.uniformMatrix4fv(this.skyShader.uniformLocations["uViewMatrix"], false, this.viewMatrix);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.skyBoxPositionsBuffer);
        this.gl.vertexAttribPointer(this.skyShader.attributeLocations["aPosition"], 3, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(this.skyShader.attributeLocations["aPosition"]);

        this.gl.uniform1i(this.skyShader.uniformLocations["uSkyMap"], 0);

        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, this.skyBoxCubeMap);

        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.skyBoxIndicesBuffer);
        this.gl.drawElements(
            this.gl.TRIANGLES,
            24,
            this.gl.UNSIGNED_SHORT,
            0
        );

        this.gl.depthFunc(this.gl.LESS);


        window.requestAnimationFrame(this.paint.bind(this));

    }
}


async function loadOBJ(gl, file) {

    const objectData = await fetch(file).then(res => res.text(), err => {
        alert(`Failed to load the scene .obj file ${err}`);
    });

    const objectLines = objectData.split("\n");

    let materialPromise = undefined;
    const objects = [];

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
                objects.push(new MeshObject(
                    gl,
                    currentObject.name,
                    mat4.create(),
                    [],
                    currentObject
                ));
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

            const vertexIndices = vertices.map(vertex => {

                if (currentObject.vertexToIndex.has(vertex)) {
                    return currentObject.vertexToIndex.get(vertex);
                } else {
                    currentObject.vertexToIndex.set(vertex, currentObject.vertexCombinations);
                    currentObject.indexToVertex.set(currentObject.vertexCombinations, vertex.split("/").map(ent => Number(ent)));
                    return currentObject.vertexCombinations++;
                }
            });

            if (currentObject.materials.has(selectedMaterial)) {
                currentObject.materials.get(selectedMaterial).facesByIndex.push(vertexIndices);
            } else {
                currentObject.materials.set(selectedMaterial, {
                    facesByIndex: [vertexIndices],
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

    const rootObject = new SceneObject("root", mat4.create(), objects);

    const materialData = await materialPromise;
    const materials = loadMTL(gl, materialData);

    return new Scene(rootObject, materials);
}

class Scene {
    constructor(rootObject, materials) {
        this.rootObject = rootObject;
        this.materials = materials;
    }
}

function loadMTL(gl, source) {

    const materials = {};
    let currentMaterial = null;

    const materialLines = source.split("\n");
    for (let i = 0; i < materialLines.length; i++) {
        const withComment = materialLines[i];
        const line = withComment.split("#")[0];

        if (line.startsWith("newmtl ") || i === materialLines.length - 1) {

            if (currentMaterial !== null) {
                materials[currentMaterial.name] = new Material(
                    gl,
                    currentMaterial
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

        } else if (line.startsWith("map_Pm ")) {
            currentMaterial.metalnessMapPath = Number(line.substr(7));

        }
    }

    return materials;

}
