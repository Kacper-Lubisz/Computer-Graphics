import "./test_original.css";

console.log("lol");

const newChild = document.createElement("div");
newChild.classList.add("class");
newChild.style.width = "100px";
newChild.style.height = "100px";
document.body.appendChild(newChild);
