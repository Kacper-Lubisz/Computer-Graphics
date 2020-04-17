const keyPressedMap = new Map();

const mouse = {
    deltaX: 0,
    deltaY: 0,

    lastX: undefined,
    lastY: undefined
};

const speed = 0.05; // m/frame
const rotationSpeed = 0.01; // radians/pixel

window.onkeydown = (e) => {
    keyPressedMap.set(e.key.toLowerCase(), true);
};

window.onkeyup = (e) => {
    keyPressedMap.set(e.key.toLowerCase(), false);
};

window.onmousemove = (e) => {
    mouse.lastX = e.x;
    mouse.lastY = e.y;

    mouse.deltaX += e.movementX;
    mouse.deltaY += e.movementY;
};


window.addEventListener("DOMContentLoaded", async () => {

    const canvas = document.getElementById("canvas");
    const gl = canvas.getContext("webgl");

    if (gl === null) {
        alert("Unable to initialize WebGL. Your browser or machine may not support it.");
        return;
    }

    const shader = initShaderProgram(gl, vertexShaderSource, fragmentShaderSource);
    if (shader == null) {
        alert("Unable to initialize the shader.");
        return;
    }

    const shaderInfo = {
        program: shader,
        attribLocations: {
            position: gl.getAttribLocation(shader, "aPosition"),
            normal: gl.getAttribLocation(shader, "aNormal"),
            texCoord: gl.getAttribLocation(shader, "aTexCoord"),
        },
        uniformLocations: {
            projectionMatrix: gl.getUniformLocation(shader, "uProjectionMatrix"),
            modelMatrix: gl.getUniformLocation(shader, "uModelMatrix"),
            viewMatrix: gl.getUniformLocation(shader, "uViewMatrix"),

            albedoMap: gl.getUniformLocation(shader, "uAlbedoMap"),
            normalMap: gl.getUniformLocation(shader, "uNormalMap"),
            roughnessMap: gl.getUniformLocation(shader, "uRoughnessMap"),

            albedo: gl.getUniformLocation(shader, "uAlbedo"),
            useAlbedoMap: gl.getUniformLocation(shader, "uUseAlbedoMap"),

            roughness: gl.getUniformLocation(shader, "uRoughness"),
            useRoughnessMap: gl.getUniformLocation(shader, "uUseRoughnessMap"),

            metalness: gl.getUniformLocation(shader, "uMetalness"),

            cameraPosition: gl.getUniformLocation(shader, "uCameraPosition")
        },

    };

    const scene = await loadOBJ("models/livingroom.obj");
    addAnimationsToLivingRoom(scene);

    // const scene = await loadOBJ("untitled.obj");

    Object.getOwnPropertyNames(scene.materials).forEach(materialName => { // load textures into gl

        const material = scene.materials[materialName];

        if (material.normalPath) {
            material.normalMap = loadTexture(gl, material.normalPath);
        }
        if (material.albedoPath) {
            material.albedoMap = loadTexture(gl, material.albedoPath);
        }
        if (material.roughnessPath) {
            material.roughnessMap = loadTexture(gl, material.roughnessPath);
        }
    });

    scene.objects.forEach(object => { // process and load the mesh into gl buffers

        object.positionArray = [];
        object.normalArray = [];
        object.uvArray = [];

        Array(object.vertexCombinations).fill(0).map((_, i) =>
            object.indexToVertex.get(i)
        ).forEach(([p, u, n]) => {
            object.positionArray = object.positionArray.concat(object.positions[p - object.startPositions]);
            object.normalArray = object.normalArray.concat(object.normals[n - object.startNormals]);
            object.uvArray = object.uvArray.concat(object.texCoords[u - object.startTexCoords]);
        });

        object.positionBuffer = fillBuffer(gl, new Float32Array(object.positionArray));
        object.normalBuffer = fillBuffer(gl, new Float32Array(object.normalArray));
        object.uvBuffer = fillBuffer(gl, new Float32Array(object.uvArray));

        Object.getOwnPropertyNames(object.faces).map(materialName => {

            const material = object.faces[materialName];

            material.indexArray = material.facesByIndex.reduce((acc, vertex) => {
                return acc.concat(vertex);
            }, []);
            material.indexBuffer = fillBuffer(gl, new Uint16Array(material.indexArray), gl.ELEMENT_ARRAY_BUFFER);

        });

    });

    setInterval(update.bind(undefined, gl, scene, shaderInfo), 1000 / 60);
});


function addAnimationsToLivingRoom(scene) {

    const root = scene.objectMap["root"];


    const fan = scene.objectMap["Ceiling_Fan_Fan"];
    const blade = scene.objectMap["Fan_Blade_Blade"];

    const fanSpeed = 3; // revolutions per second
    const bladeNumber = 6;
    Array(bladeNumber).fill(0).map(_ => ({__proto__: blade})).forEach((current, index) => {

        current.name = `${blade.name} ${index}`;
        current.bladeOffset = index * Math.PI * 2 / bladeNumber;

        current.modelMatrix = mat4.clone(current.modelMatrix);
        mat4.rotateY(current.modelMatrix, current.modelMatrix, current.bladeOffset);

        current.tempParentMatrix = mat4.create();
        current.tempCurrentMatrix = mat4.create();

        fan.children.push(current);

    });

    const baseFanMatrix = mat4.clone(fan.modelMatrix);

    fan.updateAnimation = () => {

        const time = new Date().getTime() / 1000;

        mat4.copy(fan.modelMatrix, baseFanMatrix);
        mat4.rotateY(fan.modelMatrix, fan.modelMatrix, time * fanSpeed);

    };

    // remove the blade as the child of the root
    // clone several versions of the blade and add each one as a child of the fan
    root.children.splice(root.children.findIndex(child => child.name === "Fan Blade"), 1);

}

function update(gl, scene, shader) {

    if (mouse.deltaX !== 0) {
        // vec3.add(scene.camera.rotation, scene.camera.rotation, vec3.fromValues(0, mouse.deltaX * rotationSpeed, 0));
        // vec3.add(scene.camera.rotation, scene.camera.rotation, vec3.fromValues(0, mouse.deltaX * rotationSpeed, 0));

        scene.camera.rotation[1] += mouse.deltaX * rotationSpeed;

        mouse.deltaX = 0;
    }

    if (mouse.deltaY !== 0) {

        scene.camera.rotation[0] += mouse.deltaY * rotationSpeed;
        scene.camera.rotation[0] = Math.max(Math.min(scene.camera.rotation[0], Math.PI / 2), -Math.PI / 2);

        mouse.deltaY = 0;
    }

    if (keyPressedMap.get("w")) {
        const forward = vec3.fromValues(0, 0, -1);

        const cameraRotation = mat4.create();
        mat4.rotateY(cameraRotation, cameraRotation, -scene.camera.rotation[1]);
        vec3.transformMat4(forward, forward, cameraRotation);

        vec3.scaleAndAdd(scene.camera.location, scene.camera.location, forward, speed);

    }
    if (keyPressedMap.get("s")) {
        const backwards = vec3.fromValues(0, 0, 1);

        const cameraRotation = mat4.create();
        mat4.rotateY(cameraRotation, cameraRotation, -scene.camera.rotation[1]);
        vec3.transformMat4(backwards, backwards, cameraRotation);

        vec3.scaleAndAdd(scene.camera.location, scene.camera.location, backwards, speed);
    }

    if (keyPressedMap.get("a")) {
        const left = vec3.fromValues(-1, 0, 0);

        const cameraRotation = mat4.create();
        mat4.rotateY(cameraRotation, cameraRotation, -scene.camera.rotation[1]);
        vec3.transformMat4(left, left, cameraRotation);

        vec3.scaleAndAdd(scene.camera.location, scene.camera.location, left, speed);
    }

    if (keyPressedMap.get("d")) {
        const right = vec3.fromValues(1, 0, 0);

        const cameraRotation = mat4.create();
        mat4.rotateY(cameraRotation, cameraRotation, -scene.camera.rotation[1]);
        vec3.transformMat4(right, right, cameraRotation);

        vec3.scaleAndAdd(scene.camera.location, scene.camera.location, right, speed);
    }

    if (keyPressedMap.get(" ")) {
        const up = vec3.fromValues(0, 1, 0);
        vec3.scaleAndAdd(scene.camera.location, scene.camera.location, up, speed);
    }

    if (keyPressedMap.get("shift")) {
        const down = vec3.fromValues(0, -1, 0);
        vec3.scaleAndAdd(scene.camera.location, scene.camera.location, down, speed);
    }


    draw(gl, scene, shader);
}

function drawObjectSubGraph(gl, scene, shader, object, parentModelMatrix) {

    if (object.updateAnimation) {
        object.updateAnimation();
    }

    mat4.copy(object.tempParentMatrix, parentModelMatrix);
    mat4.mul(object.tempCurrentMatrix, object.tempParentMatrix, object.modelMatrix);

    if (object.name !== "root") {// render current object

        gl.uniformMatrix4fv(shader.uniformLocations.modelMatrix, false, object.tempCurrentMatrix);

        gl.bindBuffer(gl.ARRAY_BUFFER, object.positionBuffer);
        gl.vertexAttribPointer(shader.attribLocations.position, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shader.attribLocations.position);

        gl.bindBuffer(gl.ARRAY_BUFFER, object.normalBuffer);
        gl.vertexAttribPointer(shader.attribLocations.normal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shader.attribLocations.normal);

        gl.bindBuffer(gl.ARRAY_BUFFER, object.uvBuffer);
        gl.vertexAttribPointer(shader.attribLocations.texCoord, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shader.attribLocations.texCoord);

        Object.getOwnPropertyNames(object.faces).forEach((materialName, index) => {

            const faces = object.faces[materialName];
            const material = scene.materials[materialName];

            gl.uniform1f(shader.uniformLocations.metalness, material.metalness ? material.metalness : 0);
            gl.uniform3fv(shader.uniformLocations.albedo, material.albedo ? material.albedo : [1, 1, 1]);
            gl.uniform1i(shader.uniformLocations.useAlbedoMap, material.albedoMap ? 1 : 0);
            gl.uniform1f(shader.uniformLocations.roughness, material.roughness ? material.roughness : 0.8);
            gl.uniform1i(shader.uniformLocations.useRoughnessMap, material.roughnessMap ? 1 : 0);

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, material.albedoMap ? material.albedoMap : null);

            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, material.normalMap ? material.normalMap : null);

            gl.activeTexture(gl.TEXTURE2);
            gl.bindTexture(gl.TEXTURE_2D, material.roughnessMap ? material.roughnessMap : null);

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, faces.indexBuffer);

            gl.drawElements(
                gl.TRIANGLES,
                faces.indexArray.length,
                gl.UNSIGNED_SHORT,
                0
            );

        });

    }

    object.children.forEach(child => {

        drawObjectSubGraph(gl, scene, shader, child, object.tempCurrentMatrix);

    });

}

/**
 * @param gl {WebGLRenderingContext} The WebGL context
 */
function draw(gl, scene, shader) {

    gl.clearDepth(1.0);
    gl.clearColor(0.9, 0.9, 0.9, 1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    gl.depthFunc(gl.LEQUAL);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(shader.program);

    if (!scene.projectionMatrix) {
        scene.projectionMatrix = mat4.create();
        mat4.perspective(
            scene.projectionMatrix,
            fieldOfView,
            gl.canvas.clientWidth / gl.canvas.clientHeight,
            zNear,
            zFar
        );

    }
    if (!scene.viewMatrix) {
        scene.viewMatrix = mat4.create();
    }

    mat4.identity(scene.viewMatrix);
    mat4.rotateX(scene.viewMatrix, scene.viewMatrix, scene.camera.rotation[0]);
    mat4.rotateY(scene.viewMatrix, scene.viewMatrix, scene.camera.rotation[1]);
    mat4.rotateZ(scene.viewMatrix, scene.viewMatrix, scene.camera.rotation[2]);
    mat4.translate(scene.viewMatrix, scene.viewMatrix, scene.camera.location.map(elem => -elem));


    gl.uniformMatrix4fv(shader.uniformLocations.projectionMatrix, false, scene.projectionMatrix);
    gl.uniformMatrix4fv(shader.uniformLocations.viewMatrix, false, scene.viewMatrix);

    gl.uniform3fv(shader.uniformLocations.cameraPosition, scene.camera.location);

    gl.uniform1i(shader.uniformLocations.albedoMap, 0);
    gl.uniform1i(shader.uniformLocations.normalMap, 1);
    gl.uniform1i(shader.uniformLocations.roughnessMap, 2);

    drawObjectSubGraph(gl, scene, shader, scene.graph, scene.graph.modelMatrix);

}

async function loadOBJ(file) {
    const objectFetch = await fetch(file);
    const objectData = await objectFetch.text();

    const objectLines = objectData.split("\n");

    let materialFile = undefined;
    const objects = [];
    const objectMap = {};

    let currentObject = undefined;
    let selectedMaterial = "none";

    let positionIndex = 1;
    let normalIndex = 1;
    let texCoordsIndex = 1;

    for (let i = 0; i < objectLines.length; i++) {
        const line = objectLines[i];

        if (line.charAt(0) === "o") {

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
                faces: {}
            };
            objectMap[currentObject.name] = currentObject;
            objects.push(currentObject);

        } else if (line.startsWith("v ")) {

            currentObject.positions.push(line.substr(2).split(" ").map(num => Number(num)));
            positionIndex++;

        } else if (line.startsWith("vt ")) {

            currentObject.texCoords.push(line.substr(3).split(" ").map(num => Number(num)));
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

            if (currentObject.faces[selectedMaterial] === undefined) {
                currentObject.faces[selectedMaterial] = {
                    facesByIndex: [vertexIndices],
                };
            } else {
                currentObject.faces[selectedMaterial].facesByIndex.push(vertexIndices);
            }
        } else if (line.startsWith("mtllib")) {
            const fileName = line.substr(7);
            materialFile = fetch(fileName);

        } else if (line.startsWith("usemtl")) {
            selectedMaterial = line.substr(7);

        } else if (line.startsWith("p ")) { // parent
            currentObject.parent = line.substr(2);

        } else if (line.startsWith("mm ")) { // model matrix
            currentObject.modelMatrix = line.substr(3).split(" ").map(elem => Number(elem));

        } else if (line.charAt(0) === "#") {
            // ignore comment
        }

    }

    const sceneGraph = {
        name: "root",
        modelMatrix: mat4.create(),
        tempParentMatrix: mat4.create(),
        tempCurrentMatrix: mat4.create(),
        children: []
    };
    objectMap["root"] = sceneGraph;

    objects.forEach(object => {

        object.children = [];
        object.modelMatrix = object.modelMatrix ? mat4.fromValues(...object.modelMatrix) : mat4.create();

        object.tempParentMatrix = mat4.create();
        object.tempCurrentMatrix = mat4.create();

        const parentName = object.parent ? object.parent : "root";
        const parent = objectMap[parentName];

        parent.children.push(object);

    });

    const materialFetch = await materialFile;
    const materialData = await materialFetch.text();


    const materials = {};
    let currentMaterial = undefined;

    const materialLines = materialData.split("\n");
    for (let i = 0; i < materialLines.length; i++) {
        const line = materialLines[i];

        if (line.startsWith("newmtl")) {
            currentMaterial = {};
            materials[line.substr(7)] = currentMaterial;

        } else if (line.startsWith("map_Bump")) {

            let elements = line.substr(9).split(" ");
            currentMaterial.normalPath = elements[elements.length - 1];

        } else if (line.startsWith("map_Kd")) {

            let elements = line.substr(7).split(" ");
            currentMaterial.albedoPath = elements[elements.length - 1];

        } else if (line.startsWith("map_Ns")) {

            let elements = line.substr(7).split(" ");
            currentMaterial.roughnessPath = elements[elements.length - 1];

        } else if (line.startsWith("Pm")) {
            currentMaterial.metalness = Number(line.substr(3));

        } else if (line.startsWith("Kd")) {
            currentMaterial.albedo = line.substr(3).split(" ").map(elem => Number(elem));

        } else if (line.charAt(0) === "#") {
            // ignore comment
        }

    }

    return {
        objectMap: objectMap,
        objects: objects,
        materials: materials,
        graph: sceneGraph,
        camera: {
            location: vec3.create(),
            rotation: vec3.create(),
        }
    };
}

function loadTexture(gl, url) {

    function isPowerOfTwo(value) {
        return (value & (value - 1)) === 0;
    }

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    const level = 0;
    const internalFormat = gl.RGBA;
    const width = 2;
    const height = 2;
    const border = 0;
    const srcFormat = gl.RGBA;
    const srcType = gl.UNSIGNED_BYTE;
    const pixel = new Uint8Array([
        100, 100, 100, 255,
        150, 150, 150, 255,
        100, 100, 100, 255,
        150, 150, 150, 255
    ]);  // opaque blue
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
        width, height, border, srcFormat, srcType,
        pixel);

    const image = new Image();
    image.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
            srcFormat, srcType, image);

        // WebGL1 has different requirements for power of 2 images
        // vs non power of 2 images so check if the image is a
        // power of 2 in both dimensions.
        if (isPowerOfTwo(image.width) && isPowerOfTwo(image.height)) {
            // Yes, it's a power of 2. Generate mips.
            gl.generateMipmap(gl.TEXTURE_2D);
        } else {
            // No, it's not a power of 2. Turn off mips and set
            // wrapping to clamp to edge
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        }
    };
    image.src = url;

    return texture;
}


/**
 * Creates a new WebGL buffer and fills it with the data specified
 * @param gl {WebGLRenderingContext} The WebGL context
 * @param data {Float32Array | Uint16Array} The data to fill the buffer with
 * @return {WebGLBuffer}
 */
function fillBuffer(gl, data, target = gl.ARRAY_BUFFER) {
    const buffer = gl.createBuffer();
    gl.bindBuffer(target, buffer);
    gl.bufferData(target, data, gl.STATIC_DRAW);
    return buffer;
}

const zNear = 0.1;
const zFar = 100;
const fieldOfView = 90 * Math.PI / 180;

// language=GLSL
const vertexShaderSource = `attribute vec4 aPosition;
attribute vec3 aNormal;
attribute vec2 aTexCoord;

uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;

varying vec2 vTexCoord;
varying vec3 vNormal;
varying vec4 vPosition;

void main() {
    vTexCoord = aTexCoord;
    vNormal = aNormal;

    vPosition = uModelMatrix * aPosition;
    gl_Position = uProjectionMatrix * uViewMatrix * vPosition;
}
`;

// language=GLSL
const fragmentShaderSource = `precision mediump float;

#define PI 3.1415926538
#define EPSILON 0.000001

varying vec2 vTexCoord;
varying vec3 vNormal;
varying vec4 vPosition;

uniform sampler2D uAlbedoMap;
uniform sampler2D uNormalMap;
uniform sampler2D uRoughnessMap;

uniform vec3 uCameraPosition;

uniform bool uUseAlbedoMap;
uniform vec3 uAlbedo;
uniform bool uUseRoughnessMap;
uniform float uRoughness;
uniform float uMetalness;

vec3 fresnelSchlick(vec3 h, vec3 v, vec3 baseReflectivity) {
    float hDotV = dot(h, v);
    return baseReflectivity + (1.0 - baseReflectivity) * pow(1.0 - hDotV, 5.0);
}

float distributionGGX(vec3 n, vec3 h, float roughness){ // GGX NDF
    float r2 = pow(roughness, 2.0);
    float nDotH = max(dot(n, h), EPSILON);
    return r2 / (PI * pow(pow(nDotH, 2.0) * (r2 - 1.0) + 1.0, 2.0));
}

float schlickGeometry(vec3 n, vec3 v, float roughness){
    float nDotv = max(dot(n, v), EPSILON);
    return nDotv / (nDotv * (1.0 - roughness) + roughness);
}

float geometrySmith(vec3 n, vec3 v, vec3 l, float roughness){
    return schlickGeometry(n, v, roughness) * schlickGeometry(n, l, roughness);
}

void main() {

    vec3 normal = normalize(vNormal);//texture2D(uNormalMap, vTexCoord).rgb;

    float roughness;
    if (uUseRoughnessMap){
        roughness = texture2D(uRoughnessMap, vTexCoord).x;
    } else {
        roughness = uRoughness;
    }

    vec3 albedo;
    if (uUseAlbedoMap){
        albedo = texture2D(uAlbedoMap, vTexCoord).rbg;
        albedo = pow(albedo, vec3(2.2));
        // gamma correct, ideally this should be done during loading to save flops
    } else {
        albedo = uAlbedo;
    }

    vec3 lightPositions[2];
    lightPositions[0] = vec3(0.964312, 1.3, 0.0);
    lightPositions[1] = vec3(0.0, 1.3, 0.0);
    vec3 lightColors[2];
    lightColors[0] = vec3(.8, .5, .5) * 2.0;
    lightColors[1] = vec3(.8, .2, 0.2);

    vec3 v = normalize(uCameraPosition - vPosition.xyz);// vector to the camera, the view vector

    vec3 baseReflec = mix(vec3(0.04), albedo, uMetalness);

    vec3 luminance = vec3(0.04) * albedo;// start as ambient light

    for (int i = 0; i < 1; i ++){ // for each light

        vec3 lightPosition = lightPositions[i];
        vec3 lightColor = lightColors[i];

        vec3 L = vPosition.xyz - lightPosition;// vector to the light
        vec3 l = normalize(L);// vector to the light

        vec3 h = normalize(v - l);

        float distance = length(L);
        vec3 radiance = lightColor / (distance * distance);
        vec3 brightness = radiance * max(-dot(normal, l), 0.0);

        vec3 F = fresnelSchlick(normal, v, baseReflec);
        float D = distributionGGX(normal, h, roughness);
        float G = geometrySmith(normal, v, l, roughness);

        vec3 specular = D * G * F;
        specular /= 4.0 * max(dot(normal, v), EPSILON) * max(dot(normal, l), EPSILON);

        vec3 diffuse = (vec3(1.0) - F) * (1.0 - uMetalness);

        luminance += (diffuse * albedo / PI + specular) * brightness;

    }

    vec3 color = luminance / (luminance + vec3(1.0));//tone map

    color = pow(color, vec3(1.0 / 2.2));

    //final color
    gl_FragColor = vec4(color, 1.0);
    //    gl_FragColor = vec4(uMetalness, uMetalness, uMetalness, 1.0);
}

`;

/**
 * Loads a shader program
 * @param gl {WebGLRenderingContext} The WebGL context
 * @param vertexSource {string} The GLSL source code of the vertex shader
 * @param fragmentSource {string} The GLSL source code of the fragment shader
 * @return {WebGLProgram | null} The shader program object or null if failed
 */
function initShaderProgram(gl, vertexSource, fragmentSource) {

    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    const shaderProgram = gl.createProgram();

    if (vertexShader === null || fragmentShader === null || shaderProgram === null) {
        gl.deleteShader(vertexShader);
        gl.deleteShader(vertexShader);
        gl.deleteProgram(shaderProgram);

        return null;
    }

    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);

    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert(`Unable to initialize the shader program: ${gl.getProgramInfoLog(shaderProgram)}`);
        return null;
    }

    return shaderProgram;

}

/**
 * Loads a shader
 * @param gl {WebGLRenderingContext} The WebGL context
 * @param type {GLenum} The type of shader (Fragment or Vertex)
 * @param source {string} The GLSL source code of the shader
 * @return {WebGLShader | null} The shader object or null if failed
 */
function loadShader(gl, type, source) {
    const shader = gl.createShader(type);
    if (shader === null) {
        return null;
    } else {

        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            return shader;
        } else {
            alert(`An error occurred compiling the shaders: ${gl.getShaderInfoLog(shader)}`);
            gl.deleteShader(shader);
            return null;
        }
    }
}