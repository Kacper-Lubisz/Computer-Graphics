import {mat4, vec3} from "gl-matrix";

const speed = 0.05; // m/frame
const rotationSpeed = 0.01; // radians/pixel

export class CameraController {

    constructor(renderer) {
        this.renderer = renderer;

        this.keyPressedMap = new Map();

        this.mouse = {
            deltaX: 0,
            deltaY: 0,
            lastX: undefined,
            lastY: undefined
        };

        window.onkeydown = (e) => {
            this.keyPressedMap.set(e.key.toLowerCase(), true);
        };

        window.onkeyup = (e) => {
            this.keyPressedMap.set(e.key.toLowerCase(), false);
        };

        window.onmousemove = (e) => {
            this.mouse.lastX = e.x;
            this.mouse.lastY = e.y;

            this.mouse.deltaX += e.movementX;
            this.mouse.deltaY += e.movementY;
        };

    }

    update() {

        if (this.mouse.deltaX !== 0 || this.mouse.deltaY !== 0) {

            this.renderer.camera.rotation[1] += this.mouse.deltaX * rotationSpeed;

            this.renderer.camera.rotation[0] += this.mouse.deltaY * rotationSpeed;
            this.renderer.camera.rotation[0] = Math.max(Math.min(this.renderer.camera.rotation[0], Math.PI / 2), -Math.PI / 2);

            this.mouse.deltaX = 0;
            this.mouse.deltaY = 0;

        }
        const directionMap = new Map([
            ["w", vec3.fromValues(0, 0, -1)],
            ["s", vec3.fromValues(0, 0, 1)],
            ["a", vec3.fromValues(-1, 0, 0)],
            ["d", vec3.fromValues(1, 0, 0)],

            [" ", vec3.fromValues(0, 1, 0)],
            ["shift", vec3.fromValues(0, -1, 0)]
        ]);


        for (let [key, direction] of directionMap.entries()) {
            if (this.keyPressedMap.get(key)) {

                const cameraRotation = mat4.create();

                mat4.rotateY(cameraRotation, cameraRotation, -this.renderer.camera.rotation[1]);
                vec3.transformMat4(direction, direction, cameraRotation);

                vec3.scaleAndAdd(
                    this.renderer.camera.location,
                    this.renderer.camera.location,
                    direction,
                    speed
                );

            }
        }

        // if (this.keyPressedMap.get("w")) {
        //
        //     const cameraRotation = mat4.create();
        //     mat4.rotateY(cameraRotation, cameraRotation, -scene.camera.rotation[1]);
        //     vec3.transformMat4(forward, forward, cameraRotation);
        //
        //     vec3.scaleAndAdd(scene.camera.location, scene.camera.location, forward, speed);
        //
        // }
        // if (this.keyPressedMap.get("s")) {
        //     const backwards = vec3.fromValues(0, 0, 1);
        //
        //     const cameraRotation = mat4.create();
        //     mat4.rotateY(cameraRotation, cameraRotation, -scene.camera.rotation[1]);
        //     vec3.transformMat4(backwards, backwards, cameraRotation);
        //
        //     vec3.scaleAndAdd(scene.camera.location, scene.camera.location, backwards, speed);
        // }
        //
        // if (this.keyPressedMap.get("a")) {
        //     const left = vec3.fromValues(-1, 0, 0);
        //
        //     const cameraRotation = mat4.create();
        //     mat4.rotateY(cameraRotation, cameraRotation, -scene.camera.rotation[1]);
        //     vec3.transformMat4(left, left, cameraRotation);
        //
        //     vec3.scaleAndAdd(scene.camera.location, scene.camera.location, left, speed);
        // }
        //
        // if (this.keyPressedMap.get("d")) {
        //     const right = vec3.fromValues(1, 0, 0);
        //
        //     const cameraRotation = mat4.create();
        //     mat4.rotateY(cameraRotation, cameraRotation, -scene.camera.rotation[1]);
        //     vec3.transformMat4(right, right, cameraRotation);
        //
        //     vec3.scaleAndAdd(scene.camera.location, scene.camera.location, right, speed);
        // }
        //
        // if (this.keyPressedMap.get(" ")) {
        //     const up = vec3.fromValues(0, 1, 0);
        //     vec3.scaleAndAdd(scene.camera.location, scene.camera.location, up, speed);
        // }
        //
        // if (this.keyPressedMap.get("shift")) {
        //     const down = vec3.fromValues(0, -1, 0);
        //     vec3.scaleAndAdd(scene.camera.location, scene.camera.location, down, speed);
        // }

    }
}