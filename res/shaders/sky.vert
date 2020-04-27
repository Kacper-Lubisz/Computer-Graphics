attribute vec4 aPosition;

uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;

varying vec3 vTexCoord;

void main() {
    vTexCoord = aPosition.xyz;
    gl_Position = (uProjectionMatrix * mat4(mat3(uViewMatrix)) * aPosition).xyww;
}
