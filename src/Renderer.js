import {mat4, vec3} from "gl-matrix";
import {CameraController} from "./CameraController";
import {loadShaderProgram} from "./ShaderProgram";
import {Light} from "./Light";
import {fillBuffer, loadCubeMap} from "./glUtils";
import {SceneObject} from "./SceneObject";
import {Scene} from "./Scene";
import {Material} from "./Material";
import {MeshObject} from "./MeshObject";


const zNear = 0.1;
const zFar = 100;
const fieldOfView = 80 * Math.PI / 180;

export class Renderer {
    constructor(canvas, onLoaded) {

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

        this.scene = new Scene(
            this.gl,
            new SceneObject("root", mat4.create(), []),
            new Map()
        );

        this.defaultMaterial = new Material(this.gl, {
            name: "default",
            albedo: [100, 100, 100],
            metalness: 0.0,
            roughness: 0.5,
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


        new Promise(async acc => {
            this.pbrShader = await loadShaderProgram(
                this.gl,
                "/res/shaders/pbr.vert",
                "/res/shaders/pbr.frag",
                ["aPosition", "aNormal", "aTexCoord",],
                [
                    "uModelMatrix", "uViewMatrix", "uProjectionMatrix",
                    "uUseNormalMap", "uNormalMap",
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
            this.skyBoxCubeMap = await loadCubeMap(this.gl, [
                "/res/textures/sky_map_px.png",
                "/res/textures/sky_map_nx.png",
                "/res/textures/sky_map_py.png",
                "/res/textures/sky_map_ny.png",
                "/res/textures/sky_map_pz.png",
                "/res/textures/sky_map_nz.png",
            ]);

            onLoaded(this.scene);
            this.paint();

            acc();
        }).catch((error) => {
            alert(`Unrecoverable Error, failed to load scene. ${error}`);
            console.error(error);
        });

        this.gl.getExtension('OES_standard_derivatives');
        this.gl.getExtension('EXT_shader_texture_lod');

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
        this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, this.skyBoxCubeMap);

        const unwrappedSceneGraph = this.scene.rootObject.unwrapChildren(); // pre order traversal
        const transformationMap = new Map();

        const lights = [];

        for (let object of unwrappedSceneGraph) {
            object.object.update();
        }

        for (let object of unwrappedSceneGraph) {

            if (object.parent === null) {
                transformationMap.set(object.object, mat4.create());
            } else {
                let matrix = mat4.clone(transformationMap.get(object.parent));
                mat4.multiply(matrix, matrix, object.object.modelMatrix);
                transformationMap.set(object.object, matrix);
            }

            if (object.object instanceof Light) {
                lights.push(object.object);
            }

        }

        const lightColors = lights.map(light => light.color);
        const lightPositions = lights.map(light => mat4.getTranslation(vec3.create(), transformationMap.get(light)));

        this.gl.uniform3fv(this.pbrShader.uniformLocations["uLightPositions"], Array(5).fill(0).map((_, i) => {
            if (i < lightPositions.length) {
                return Array.from(lightPositions[i]);
            } else {
                return [0, 0, 0];
            }
        }).flat());
        this.gl.uniform3fv(this.pbrShader.uniformLocations["uLightColors"], Array(5).fill(0).map((_, i) => {
                if (i < lightColors.length) {
                    return lightColors[i];
                } else {
                    return [0, 0, 0];
                }
            }).flat()
        );

        for (let object of unwrappedSceneGraph) {

            if (object.object instanceof MeshObject) {

                const mesh = object.object.mesh;

                this.gl.uniformMatrix4fv(this.pbrShader.uniformLocations["uModelMatrix"], false, transformationMap.get(object.object));

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
                    const material = this.scene.materials.get(materialName) ?? this.defaultMaterial;

                    this.gl.uniform3fv(this.pbrShader.uniformLocations["uAlbedo"], material.albedo ? material.albedo : [1, 1, 1]);
                    this.gl.uniform1i(this.pbrShader.uniformLocations["uUseAlbedoMap"], material.albedoMap ? 1 : 0);

                    this.gl.uniform1i(this.pbrShader.uniformLocations["uUseNormalMap"], material.normalMap ? 1 : 0);

                    this.gl.uniform1f(this.pbrShader.uniformLocations["uRoughness"], material.roughness ? material.roughness : 0.8);
                    this.gl.uniform1i(this.pbrShader.uniformLocations["uUseRoughnessMap"], material.roughnessMap ? 1 : 0);

                    this.gl.uniform1f(this.pbrShader.uniformLocations["uMetalness"], material.metalness ? material.metalness : 0);
                    this.gl.uniform1i(this.pbrShader.uniformLocations["uUseMetalnessMap"], material.metalnessMap ? 1 : 0);

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