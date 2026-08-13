(function () {
    "use strict";

    const CITIES = ["lagos", "abuja", "accra", "nairobi", "kigali", "dakar", "cape town", "victoria island", "ikeja"];

    /* ---------- Natural-language parsing ---------- */
    function extractParams(text) {
        const q = text.toLowerCase();
        const params = { type: null, beds: null, budget: null, city: null };

        if (/(rent|lease|monthly|per month)/.test(q)) params.type = "rent";
        else if (/(buy|purchase|for sale|sale|own)/.test(q)) params.type = "sale";

        const bed = q.match(/(\d)\s*[+\- ]?\s*beds?/);
        if (bed) params.beds = Number(bed[1]);

        const under = q.match(/under\s*\$?\s*([\d,.]+)\s*k?\b/);
        const kMatch = q.match(/\$?\s*([\d,.]+)\s*k\b/);
        const full = q.match(/\$\s*([\d,.]+)\b/);
        if (under) {
            params.budget = Number(under[1].replace(/,/g, ""));
            if (q.includes("k") && under[1].length <= 3 && !/k\s*\d/.test(q)) params.budget *= 1000;
        } else if (kMatch) {
            params.budget = Number(kMatch[1].replace(/,/g, "")) * 1000;
        } else if (full) {
            params.budget = Number(full[1].replace(/,/g, ""));
        }

        for (const c of CITIES) {
            if (q.includes(c)) {
                params.city = c;
                break;
            }
        }

        return params;
    }

    /* ---------- Matching ---------- */
    function findMatches(params) {
        return PROPERTIES.filter((p) => {
            const loc = p.location.toLowerCase();
            if (params.type && p.type !== params.type) return false;
            if (params.beds && p.beds < params.beds) return false;
            if (params.budget && p.price > params.budget) return false;
            if (params.city && !(loc.includes(params.city) || p.name.toLowerCase().includes(params.city))) return false;
            return true;
        });
    }

    /* ---------- AI summary ---------- */
    async function aiSummary(params, matches) {
        const names = matches.slice(0, 5).map((p) => `${p.name} (${p.location}, $${p.price.toLocaleString()}${p.type === "rent" ? "/mo" : ""})`).join("; ");
        const prompt = "Based on the matched properties below, write a short, friendly 2-3 sentence recommendation for a home buyer. Do not mention 'matched properties'.\n" + names;
        const url = "https://text.pollinations.ai/" + encodeURIComponent(prompt) + "?model=openai";
        try {
            const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
            if (!res.ok) throw new Error("bad status");
            const data = await res.text();
            return data.trim() || fallbackSummary(params, matches);
        } catch (e) {
            return fallbackSummary(params, matches);
        }
    }

    function fallbackSummary(params, matches) {
        if (!matches.length) {
            return "We couldn't find a direct match, but you can broaden your search or ask Maya for help finding the perfect property.";
        }
        const parts = [];
        if (params.type) parts.push(params.type === "rent" ? "rentals" : "homes for sale");
        if (params.city) parts.push("in " + params.city.charAt(0).toUpperCase() + params.city.slice(1));
        if (params.budget) parts.push("up to $" + params.budget.toLocaleString());
        return "Based on your request, here " + (matches.length === 1 ? "is a great option" : "are " + matches.length + " great options") + " for " + (parts.length ? parts.join(" ") : "you") + ".";
    }

    /* ---------- UI ---------- */
    function buildUI() {
        if (document.getElementById("finderModal")) return;
        const div = document.createElement("div");
        div.innerHTML = `
        <div class="modal-overlay" id="finderModal">
            <div class="modal finder-modal">
                <button class="modal-close" id="finderClose" type="button">&times;</button>
                <h3>✨ AI Property Finder</h3>
                <p class="finder-hint">Describe your dream property in plain English, then let AI find the best matches.</p>
                <div id="finderResults" class="finder-results"></div>
                <div class="finder-form">
                    <input id="finderInput" type="text" placeholder="e.g. a 3-bedroom house for rent in Lagos under $2,000">
                    <button id="finderGo" class="btn btn-primary">Find My Property</button>
                </div>
            </div>
        </div>`;
        document.body.appendChild(div.firstChild);

        const open = () => {
            const auth = window.EstateFlowAuth;
            if (auth && !auth.currentUser()) {
                auth.openAuthModal("login", "Please log in to use the AI Property Finder.");
                return;
            }
            document.getElementById("finderModal").classList.add("show");
            document.getElementById("finderInput").focus();
        };

        document.getElementById("finderOpen").addEventListener("click", open);
        document.getElementById("finderClose").addEventListener("click", () => document.getElementById("finderModal").classList.remove("show"));
        document.getElementById("finderModal").addEventListener("click", (e) => {
            if (e.target === document.getElementById("finderModal")) document.getElementById("finderModal").classList.remove("show");
        });
        document.getElementById("finderInput").addEventListener("keydown", (e) => {
            if (e.key === "Enter") runFind();
        });
        document.getElementById("finderGo").addEventListener("click", runFind);
    }

    async function runFind() {
        const input = document.getElementById("finderInput");
        const resultsEl = document.getElementById("finderResults");
        const text = input.value.trim();
        if (!text) return;

        const params = extractParams(text);
        const matches = findMatches(params);

        resultsEl.innerHTML = '<p class="finder-loading">AI is searching the portfolio…</p>';
        const summary = await aiSummary(params, matches);

        resultsEl.innerHTML = `<p class="finder-summary">${summary}</p>` +
            matches.map((p) => `
                <div class="finder-item">
                    <span class="finder-emoji">${p.emoji}</span>
                    <div class="finder-info">
                        <strong>${p.name}</strong>
                        <span>${p.location} · ${p.beds || "—"} bd · ${p.baths || "—"} ba · ${p.area.toLocaleString()} sqft</span>
                    </div>
                    <span class="finder-price">$${p.price.toLocaleString()}${p.type === "rent" ? "/mo" : ""}</span>
                </div>`).join("") ||
            `<p class="finder-summary">No direct matches found — try broadening your search, e.g. removing the price limit or city.</p>`;
    }

    /* ---------- Init ---------- */
    function init() {
        buildUI();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

    window.EstateFlowFinder = { extractParams, findMatches };
})();
