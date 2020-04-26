export function loadTexture(gl, url) {

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
    ]);
    gl.texImage2D(
        gl.TEXTURE_2D,
        level,
        internalFormat,
        width, height,
        border,
        srcFormat,
        srcType,
        pixel
    );

    const image = new Image();
    image.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(
            gl.TEXTURE_2D,
            level,
            internalFormat,
            srcFormat,
            srcType,
            image
        );

        console.log(`loaded image -> ${url} ${image}`);

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
 * @param target {number} The type of buffer
 * @return {WebGLBuffer}
 */
export function fillBuffer(gl, data, target = gl.ARRAY_BUFFER) {
    const buffer = gl.createBuffer();
    gl.bindBuffer(target, buffer);
    gl.bufferData(target, data, gl.STATIC_DRAW);
    return buffer;
}
