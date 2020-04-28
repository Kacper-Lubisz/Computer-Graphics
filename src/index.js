import {mat4, vec3} from "gl-matrix";
import "./styles.css";
import {Renderer} from "./Renderer";
import {Canvas} from "./Canvas";
import {loadOBJ} from "./Scene";
import {Light} from "./Light";
import {SceneObject} from "./SceneObject";

async function main() {

    const canvas = new Canvas(1280, 720);

    const renderer = new Renderer(canvas, (scene) => { // onload
        loadLivingRoom(scene, canvas);
    });

}

window.addEventListener('DOMContentLoaded', main);

async function loadLivingRoom(scene, canvas) {
    await loadOBJ(scene, "/res/models/livingroom.obj");
    canvas.isLoading = false;

    const lampShade = scene.rootObject.removeChildByName("Lamp_Shade");
    const lampBodyPrototype = scene.rootObject.removeChildByName("Lamp_Body_Lamp");

    lampBodyPrototype.children.push(lampShade);
    lampBodyPrototype.children.push(new Light(
        "Lamp Light",
        mat4.fromTranslation(mat4.create(), [0, 1.41746, 0]),
        [],
        [1.0, 0.630203, 0.16403].map(it => it * 3)
    ));

    [
        mat4.fromTranslation(mat4.create(), [0.964312, 0, -1.282]),
        mat4.fromTranslation(mat4.create(), [4.3234, 0, -1.24048])
    ].map(modelMatrix => {
        const newLamp = lampBodyPrototype.clone();
        newLamp.modelMatrix = modelMatrix;
        return newLamp;
    }).forEach(lamp => {
        scene.rootObject.children.push(lamp);
    });

    const topBook = scene.rootObject.getChildByName("Top_Book_Book");
    const bottomBook = scene.rootObject.getChildByName("Bottom_Book_Book_Red");

    Array(10).fill(0).map((_, i) => {

        const book = topBook.clone();
        mat4.translate(book.modelMatrix, book.modelMatrix, [Math.random() * 0.05, 0, i * -0.04]);
        scene.rootObject.children.push(book);

    });
    Array(15).fill(0).map((_, i) => {

        const book = bottomBook.clone();
        mat4.translate(book.modelMatrix, book.modelMatrix, [Math.random() * 0.05, 0, i * 0.04]);
        scene.rootObject.children.push(book);

    });

    const clockCentre = scene.rootObject.getChildByName("Clock_Centre_Circle.001");
    const secondsHand = scene.rootObject.removeChildByName("Seconds_Hand_Plane.014");
    const minutesHand = scene.rootObject.removeChildByName("Minutes_Hand_Plane.005");
    const hoursHand = scene.rootObject.removeChildByName("Hours_Hand_Plane");

    clockCentre.children.push(secondsHand, minutesHand, hoursHand);
    secondsHand.update = () => {
        const second = new Date().getSeconds();

        mat4.identity(secondsHand.modelMatrix);
        mat4.rotate(secondsHand.modelMatrix, secondsHand.modelMatrix, second / 60 * Math.PI * 2, [0, 0, 1]);
    };
    minutesHand.update = () => {
        const minute = new Date().getMinutes();

        mat4.identity(minutesHand.modelMatrix);
        mat4.rotate(minutesHand.modelMatrix, minutesHand.modelMatrix, minute / 60 * Math.PI * 2, [0, 0, 1]);
    };
    hoursHand.update = () => {
        const hour = new Date().getHours() + new Date().getMinutes() / 60;

        mat4.identity(hoursHand.modelMatrix);
        mat4.rotate(hoursHand.modelMatrix, hoursHand.modelMatrix, hour / 12 * Math.PI * 2, [0, 0, 1]);
    };
    mat4.translate(clockCentre.modelMatrix, clockCentre.modelMatrix, [3.69773, 1.76746, -1.47903]);
    mat4.rotate(clockCentre.modelMatrix, clockCentre.modelMatrix, Math.PI, [0, 1, 0]);

    const fan = scene.rootObject.getChildByName("Ceiling_Fan_Fan");
    mat4.translate(fan.modelMatrix, fan.modelMatrix, [1.4531, 2.7, 0.510657]);
    const fanStandardTransform = mat4.clone(fan.modelMatrix);

    const blade = scene.rootObject.removeChildByName("Fan_Blade_Blade");
    Array(6).fill(0).map((_, i) => {

        const newBlade = blade.clone();
        mat4.rotate(newBlade.modelMatrix, newBlade.modelMatrix, 2 * i * Math.PI / 6, [0, 1, 0]);
        fan.children.push(newBlade);

    });

    fan.update = () => {
        const rad = new Date().getTime() / 1000.0;
        mat4.rotate(fan.modelMatrix, fanStandardTransform, rad, [0, 1, 0]);
    };


    const bigSpeaker = scene.rootObject.removeChildByName("Big_Speaker");
    [
        mat4.fromTranslation(mat4.create(), [-2.44257, 0, 0]),
        mat4.fromTranslation(mat4.create(), [0, 0, 0])
    ].map(modelMatrix => {
        const newSpeaker = bigSpeaker.clone();
        newSpeaker.modelMatrix = modelMatrix;
        return newSpeaker;
    }).forEach(speaker => {
        scene.rootObject.children.push(speaker);
    });

    const bigFlame = scene.rootObject.removeChildByName("Flame");
    const smallFlamesLeft = bigFlame.clone();
    const smallFlamesRight = bigFlame.clone();

    const baseFlamesLeft = mat4.translate(mat4.create(), bigFlame.modelMatrix, [0.25, 0.0, 0.2]);
    mat4.scale(baseFlamesLeft, baseFlamesLeft, [0.6, 0.6, 0.6]);
    const baseFlamesRight = mat4.translate(mat4.create(), bigFlame.modelMatrix, [-0.25, 0.0, 0.2]);
    mat4.scale(baseFlamesRight, baseFlamesRight, [0.6, 0.6, 0.6]);

    const baseFlame = mat4.clone(bigFlame.modelMatrix);


    const fireObject = new SceneObject("Fire", mat4.fromTranslation(mat4.create(), [1.86809, 0.301388, 2.12625]), [
        bigFlame,
        smallFlamesLeft,
        smallFlamesRight,
    ]);

    const baseColor = [0.9607843137254902, 0.20784313725490197, 0.0010980392156862747];
    const flameLight = new Light("Flame light", mat4.fromTranslation(mat4.create(), [0, 0.2, 0.1]), [], baseColor);
    bigFlame.children.push(
        flameLight
    );

    scene.rootObject.children.push(fireObject);
    fireObject.update = () => {
        const timeLeft = new Date().getTime() / 700 + 0.1;
        const timeRight = new Date().getTime() / 1100 + 0.2;
        const timeBig = new Date().getTime() / 1700;


        const timeLeftMod = timeLeft % 1;
        const timeRightMod = timeRight % 1;
        const timeBigMod = timeBig % 1;

        const brightness = timeBigMod * (timeBigMod - 1) / (timeBigMod - 1.05) + 1;

        flameLight.color = baseColor.map(it => it * brightness);

        const scaleLeft = timeLeftMod * (timeLeftMod - 1) / (timeLeftMod - 1.05) / 8 + 1;
        const scaleRight = (timeRightMod) * (timeRightMod - 1) / (timeRightMod - 1.05) / 8 + 1;
        const scaleBig = (timeBigMod) * (timeBigMod - 1) / (timeBigMod - 1.05) / 8 + 1;

        mat4.scale(smallFlamesLeft.modelMatrix, baseFlamesLeft, [scaleLeft, scaleLeft, scaleLeft]);
        mat4.scale(smallFlamesRight.modelMatrix, baseFlamesRight, [scaleRight, scaleRight, scaleRight]);
        mat4.scale(bigFlame.modelMatrix, baseFlame, [scaleBig, scaleBig, scaleBig]);

        mat4.translate(smallFlamesLeft.modelMatrix, smallFlamesLeft.modelMatrix, [Math.sin(timeLeft) * 0.05, 0, Math.cos(2 * timeLeft) * 0.05]);
        mat4.translate(smallFlamesRight.modelMatrix, smallFlamesRight.modelMatrix, [Math.sin(timeRight) * 0.05, 0, Math.cos(2 * timeRight) * 0.05]);
        mat4.translate(bigFlame.modelMatrix, bigFlame.modelMatrix, [Math.sin(timeBig) * 0.05, 0, Math.cos(2 * timeBig) * 0.05]);

    };

    const smallSpeaker = scene.rootObject.getChildByName("Small_Speaker_Speaker");
    [
        mat4.fromTranslation(mat4.create(), [2.61962, 0, 0]),
        mat4.fromTranslation(mat4.create(), [0, 0, 0])
    ].map(modelMatrix => {
        const newSpeaker = smallSpeaker.clone();
        newSpeaker.modelMatrix = modelMatrix;
        return newSpeaker;
    }).forEach(speaker => {
        scene.rootObject.children.push(speaker);
    });

    const blind = scene.rootObject.removeChildByName("Blind_Plane.002");
    Array(34).fill(0).map((_, i) => {

        const isLeft = i < 16;

        const end = [0, 0, (isLeft ? -17 : 17) * 0.08];
        const current = [0, 0, (i - 17) * 0.08];

        const newBlind = blind.clone();
        const baseTransform = mat4.clone(newBlind.modelMatrix);
        mat4.translate(baseTransform, baseTransform, [-1.91235, 2.14686, 0.603861 + 0.04]);

        scene.rootObject.children.push(newBlind);

        newBlind.update = () => {
            const time = new Date().getTime() / 10000;

            const fold = Math.max(Math.abs(Math.sin(time)), 0.05);

            // mat4.translate(newBlind.modelMatrix, baseTransform, current.map(it => it * fold));
            mat4.translate(newBlind.modelMatrix, baseTransform, Array(3).fill(0).map((_, i) => {
                return (1 - fold) * end[i] + fold * current[i];
            }));

            mat4.rotate(newBlind.modelMatrix, newBlind.modelMatrix, Math.pow(Math.sin(time), 2) * Math.PI / 2, [0, 1, 0]);
        };

    });

    const tuft = scene.rootObject.removeChildByName("Tuft_Plane.010");
    const lawn = scene.rootObject.getChildByName("Lawn_Plane.018");
    Array(1000).fill(0).forEach((_, i) => {
        const lawnMesh = lawn.mesh;
        const grass = lawnMesh.materials.get("Grass");


        const vertexIndicesIndex = Math.floor(grass.faceVertexIndices.length * Math.random());

        const [aPos, bPos, cPos] = grass.faceVertexIndices[vertexIndicesIndex].map(index =>
            vec3.fromValues(...lawnMesh.positionArray.slice(index * 3, index * 3 + 3))
        );

        const aToB = vec3.sub(vec3.create(), bPos, aPos);
        const aToC = vec3.sub(vec3.create(), cPos, aPos);

        const [sA, sB] = (() => {
            const a = Math.random();
            const b = Math.random();

            if (a + b > 0.5) {
                return [1 - a, 1 - b];
            } else {
                return [a, b];
            }
        })();

        const newTuft = tuft.clone();
        mat4.identity(newTuft.modelMatrix);

        const location = vec3.clone(bPos);
        vec3.scaleAndAdd(location, location, aToB, sA);
        vec3.scaleAndAdd(location, location, aToC, sB);

        mat4.translate(newTuft.modelMatrix, newTuft.modelMatrix, location);
        mat4.rotate(newTuft.modelMatrix, newTuft.modelMatrix, Math.random() * Math.PI, [0, 1, 0]);

        const baseTransform = mat4.clone(newTuft.modelMatrix);

        newTuft.update = () => {
            mat4.copy(newTuft.modelMatrix, baseTransform);

            const time = new Date().getTime() / 1000;

            let xTurn = Math.sin(time + location[0] - location[2]) / 3 + 0.5;
            let yTurn = Math.cos(time + location[0] + location[2]) / 3 + 0.5;

            mat4.rotate(newTuft.modelMatrix, newTuft.modelMatrix, xTurn, [1, 0, 0]);
            mat4.rotate(newTuft.modelMatrix, newTuft.modelMatrix, yTurn, [0, 0, 1]);

        };

        lawn.children.push(newTuft);

    });

}
