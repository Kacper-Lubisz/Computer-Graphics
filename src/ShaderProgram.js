class ShaderProgram {

    /**
     * @param gl {WebGLRenderingContext} The WebGL context
     * @param vertexShaderSource {string} The fragment shader code string
     * @param fragmentShaderSource {string} The vertex shader code string
     * @param attributes {string[]} List of attribute locations to load
     * @param uniforms {string[]} List of uniform locations to load
     */
    constructor(gl, vertexShaderSource, fragmentShaderSource, attributes = [], uniforms = []) {

        this.vertexShader = loadShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
        this.fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
        this.shaderProgram = gl.createProgram();

        if (this.vertexShader === null || this.fragmentShader === null || this.shaderProgram === null) {
            gl.deleteShader(this.vertexShader);
            gl.deleteShader(this.fragmentShader);
            gl.deleteProgram(this.shaderProgram);
            alert("failed to compile shader");
        }

        gl.attachShader(this.shaderProgram, this.vertexShader);
        gl.attachShader(this.shaderProgram, this.fragmentShader);

        gl.linkProgram(this.shaderProgram);

        if (!gl.getProgramParameter(this.shaderProgram, gl.LINK_STATUS)) {
            alert(`Unable to initialize the shader program: ${gl.getProgramInfoLog(this.shaderProgram)}`);
        }

        this.attributeLocations = {};
        this.uniformLocations = {};

        gl.useProgram(this.shaderProgram);

        for (let attribute of attributes) {
            this.attributeLocations[attribute] = gl.getAttribLocation(this.shaderProgram, attribute);
        }
        for (let uniform of uniforms) {
            this.uniformLocations[uniform] = gl.getUniformLocation(this.shaderProgram, uniform);
        }

    }

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

export async function loadShaderProgram(gl, vertexShaderURL, fragmentShaderURL, attributes, uniforms) {

    const [vertSource, fragSource] = await Promise.all([
        fetch(vertexShaderURL).then(res => res.text()),
        fetch(fragmentShaderURL).then(res => res.text())
    ]);

    return new ShaderProgram(gl, vertSource, fragSource, attributes, uniforms);

}