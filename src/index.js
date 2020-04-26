import "./styles.css";
import {Renderer} from "./Renderer";
import {Canvas} from "./Canvas";

function main() {

    const canvas = new Canvas(1280, 720);

    const renderer = new Renderer(canvas,"/res/models/livingroom.obj", () => { // onload
        canvas.isLoading = false;
    });

}


window.addEventListener('DOMContentLoaded', main);

