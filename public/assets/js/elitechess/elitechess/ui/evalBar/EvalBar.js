import { normalizeScore } from "../../analysis/evalModel/scoreNormalization.js";
export class EvalBar {
    root;
    fillEl;
    labelEl;
    constructor(root) {
        this.root = root;
        this.root.classList.add("ec-evalbar");
        this.fillEl = document.createElement("div");
        this.fillEl.className = "ec-evalbar__fill";
        this.labelEl = document.createElement("div");
        this.labelEl.className = "ec-evalbar__label";
        this.root.append(this.fillEl, this.labelEl);
    }
    update(score) {
        const normalized = normalizeScore(score);
        this.fillEl.style.height = `${Math.round(normalized.whiteAdvantageRatio * 100)}%`;
        this.labelEl.textContent = normalized.display;
    }
}
