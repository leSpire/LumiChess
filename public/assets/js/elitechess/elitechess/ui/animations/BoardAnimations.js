export class BoardAnimations {
    animateTransform(el) {
        el.classList.add("ec-animating");
        window.setTimeout(() => el.classList.remove("ec-animating"), 170);
    }
}
