precision mediump float;

varying vec3 vTexCoord;

uniform samplerCube uSkyMap;

void main() {
    gl_FragColor = vec4(vTexCoord, 1.0);
    gl_FragColor = textureCube(uSkyMap, vTexCoord);
}

