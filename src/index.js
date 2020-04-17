import "./styles.css";

function main() {

    const canvas = new Canvas(1280, 720);

    const renderer = new Renderer(canvas, () => { // onload
        canvas.isLoading = false;
    });

}

class Renderer {
    constructor(canvas, onLoaded) {

    }
}


class Canvas {
    constructor(width, height) {
        this.container = document.createElement("div");
        this.container.classList.add("container");

        this.canvas = document.createElement("canvas");
        this.canvas.setAttribute("width", width);
        this.canvas.setAttribute("height", height);
        this.canvas.classList.add("canvas");

        this.loadingMessage = document.createElement("p");
        this.loadingMessage.innerText = "Loading...";
        this.loadingMessage.classList.add("loadingMessage");

        this.container.appendChild(this.canvas);
        this.container.appendChild(this.loadingMessage);
        document.body.appendChild(this.container);

        this.isLoading = true;
    }

    set isLoading(value) {
        this.canvas.style.display = value ? "none" : "block";
        this.loadingMessage.style.visibility = value ? "block" : "none";
    }
}


window.addEventListener('DOMContentLoaded', main);

