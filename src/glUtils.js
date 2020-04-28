import UTIF from "utif";

/**
 *
 * @param gl {WebGLRenderingContext}
 * @param texture {WebGLTexture}
 * @param data
 * @param width {number} the width of the image
 * @param height {number} the height of the image
 */
function replaceTexture(gl, texture, data, width, height,) {

    gl.bindTexture(gl.TEXTURE_2D, texture);

    if (data instanceof Uint8Array) {
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            width,
            height,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            data
        );

    } else {
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            data
        );
    }

    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

}


export async function loadCubeMap(gl, urls) {

    const texture = gl.createTexture();

    return Promise.all(Array(6).fill(0).map((_, i) => {
        const image = new Image();
        image.src = urls[i];
        return new Promise(resolve => {
            image.onload = resolve.bind(undefined, image);
        });
    })).then((images) => {
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);

        for (let i = 0; i < 6; i++) {
            gl.texImage2D(
                gl.TEXTURE_CUBE_MAP_POSITIVE_X + i,
                0,
                gl.RGBA,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                images[i]
            );

        }

        // gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        // gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        // gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);

        gl.generateMipmap(gl.TEXTURE_CUBE_MAP);

        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);

        return texture;

    }, err => alert(`Failed to load sky box cube map, ${err}`));
}


export function loadTexture(gl, url) {

    const texture = gl.createTexture();

    const replace = replaceTexture.bind(undefined, gl, texture);
    // bound this because the compiler was having a hard time

    replace(new Uint8Array([
        255, 255, 0, 255,
        0, 0, 0, 255,
        0, 0, 0, 255,
        255, 255, 0, 255,
    ]), 2, 2);

    if (url.endsWith(".tif")) {

        fetch(url).then(async response => {
            const encoded = await (await (response.blob())).arrayBuffer();

            const ifds = UTIF.decode(encoded);
            UTIF.decodeImage(encoded, ifds[0]);
            const decoded = UTIF.toRGBA8(ifds[0]);

            replace(decoded, ifds[0].width, ifds[0].height);
        });

    } else {

        const image = new Image();
        image.onload = () => {
            replace(image);
        };
        image.src = url;
    }

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
