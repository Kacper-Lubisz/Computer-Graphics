attribute vec4 aPosition;
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
    vNormal = mat3(uModelMatrix) * aNormal;

    vPosition = uModelMatrix * aPosition;
    gl_Position = uProjectionMatrix * uViewMatrix * vPosition;
}
