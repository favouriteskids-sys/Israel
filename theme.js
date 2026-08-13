(function () {
    "use strict";

    const THEME_KEY = "estateflow_theme";

    const THEMES = [
        { id: "brand",  label: "Brand",  primary: "#2b4bd8", primaryDark: "#1b2f8a", primarySoft: "#eef1ff", accent: "#f0a500" },
        { id: "emerald", label: "Emerald", primary: "#0e9f6e", primaryDark: "#087a53", primarySoft: "#e6f7f0", accent: "#f0a500" },
        { id: "royal",  label: "Royal",   primary: "#7c3aed", primaryDark: "#5b21b6", primarySoft: "#f1ecfe", accent: "#f59e0b" },
        { id: "ocean",  label: "Ocean",   primary: "#0891b2", primaryDark: "#0e7490", primarySoft: "#e0f5f9", accent: "#fbbf24" },
        { id: "sunset", label: "Sunset",  primary: "#d9480f", primaryDark: "#a83a08", primarySoft: "#fdeee6", accent: "#ffd43b" },
        { id: "rose",   label: "Rose",    primary: "#e11d48", primaryDark: "#be123c", primarySoft: "#fde8ee", accent: "#fbbf24" }
    ];

    function getSaved() {
        try { return localStorage.getItem(THEME_KEY) || "brand"; }
        catch (e) { return "brand"; }
    }

    function applyTheme(id) {
        const theme = THEMES.find((t) => t.id === id) || THEMES[0];
        const root = document.documentElement;
        root.style.setProperty("--primary", theme.primary);
        root.style.setProperty("--primary-dark", theme.primaryDark);
        root.style.setProperty("--primary-soft", theme.primarySoft);
        root.style.setProperty("--accent", theme.accent);
        try { localStorage.setItem(THEME_KEY, id); } catch (e) {}
        document.querySelectorAll(".theme-swatch").forEach((el) => {
            el.classList.toggle("active", el.dataset.theme === id);
        });
    }

    function buildUI() {
        if (document.getElementById("themeRoot")) return;

        const root = document.createElement("div");
        root.id = "themeRoot";
        root.innerHTML = `
            <button id="themeBtn" aria-label="Change color theme">🎨</button>
            <div id="themePanel" class="theme-panel">
                <div class="theme-panel-title">Choose a colour theme</div>
                <div class="theme-swatches">
                    ${THEMES.map((t) =>
                        `<button class="theme-swatch" data-theme="${t.id}" title="${t.label}"
                            style="background:${t.primary}"></button>`).join("")}
                </div>
            </div>`;
        document.body.appendChild(root);

        document.getElementById("themeBtn").addEventListener("click", (e) => {
            e.stopPropagation();
            document.getElementById("themePanel").classList.toggle("show");
        });

        document.querySelectorAll(".theme-swatch").forEach((el) => {
            el.addEventListener("click", () => {
                applyTheme(el.dataset.theme);
            });
        });

        document.addEventListener("click", (e) => {
            if (!e.target.closest("#themeRoot")) {
                document.getElementById("themePanel").classList.remove("show");
            }
        });
    }

    function init() {
        buildUI();
        applyTheme(getSaved());
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
