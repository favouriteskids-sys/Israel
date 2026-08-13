(function () {
    "use strict";

    const SYSTEM_PROMPT = "You are Maya, the EstateFlow real estate assistant. Help users find properties, understand pricing, and book demos. Be concise and friendly. Mention that to contact an agent they should use the Talk to an Agent button. Keep answers under 120 words.";

    const KNOWLEDGE = [
        { match: /price|cost|pricing|how much|budget/i, answer: "Our listings range from about $1,200/mo for rentals up to $890,000 for premium homes. On the Properties page you can filter by price, type (sale or rent), and search by name or location." },
        { match: /book.*demo|demo/i, answer: "You can book a demo from the 'Book a Demo' button on the home page. Since you're logged in, click Contact Us and tell us you'd like a demo." },
        { match: /talk.*agent|agent|contact|phone|email|reach/i, answer: "Use the 'Talk to an Agent' button on the home page — it shows our agent's phone, email, and office address. You can also use the Contact Us page." },
        { match: /rent|lease|monthly/i, answer: "We have rentals in Lagos, Abuja, Accra, Nairobi, Dakar, and more. Most rentals are between $1,200/mo and $2,800/mo. Use the 'For Rent' filter on the Properties page." },
        { match: /buy|purchase|sale/i, answer: "We have homes for sale from $155,000 up to $890,000, including houses, condos, office suites, and a penthouse in Cape Town. Filter 'For Sale' on the Properties page to browse." },
        { match: /location|where|city|country|area/i, answer: "Our properties span Lagos, Abuja, Accra, Nairobi, Kigali, Cape Town, and Dakar. Our main office is at 12 Adeola Odeku Street, Victoria Island, Lagos, Nigeria." },
        { match: /bedroom|beds|size|sqft|area|bath/i, answer: "Our listings include details like bedrooms, bathrooms, and square footage on each property card. For example, the Luxury 4-Bedroom Home is 3,200 sqft with 4 baths." },
        { match: /logo|about|who.*estateflow|company/i, answer: "EstateFlow is a property management platform that helps agents, landlords, and investors list properties, track deals, and manage clients in one place." },
        { match: /feature|what.*do|services|tools/i, answer: "EstateFlow offers smart property listings, deal tracking, client management, rent collection, market insights, and a secure document vault." },
        { match: /hello|hi|hey|good (morning|afternoon|evening)/i, answer: "Hello! I'm Maya, your EstateFlow assistant. I can help you find properties, understand pricing, or book a demo. What would you like to know?" },
        { match: /thanks|thank you|great|cool|nice/i, answer: "You're welcome! Anything else I can help you with?" }
    ];

    const DEFAULT_ANSWER = "I can help with property listings, pricing, locations, or booking a demo. Could you rephrase your question? For example: 'show me rentals under $2,000' or 'how do I contact an agent?'";

    let panel = null;
    let open = false;

    /* ---------- UI ---------- */
    function buildUI() {
        if (document.getElementById("assistantRoot")) return;

        const root = document.createElement("div");
        root.id = "assistantRoot";
        root.innerHTML = `
            <button id="assistBtn" aria-label="Open AI assistant">🤖</button>
            <div id="assistPanel" class="assist-panel">
                <div class="assist-header">
                    <strong>Maya · AI Assistant</strong>
                    <button id="assistClose" aria-label="Close chat">×</button>
                </div>
                <div id="assistMessages" class="assist-messages"></div>
                <form id="assistForm" class="assist-form">
                    <input id="assistInput" type="text" placeholder="Ask about properties, prices..." autocomplete="off">
                    <button type="submit">Send</button>
                </form>
            </div>`;
        document.body.appendChild(root);

        const btn = document.getElementById("assistBtn");
        btn.addEventListener("click", togglePanel);

        document.getElementById("assistClose").addEventListener("click", () => togglePanel(false));
        document.getElementById("assistForm").addEventListener("submit", onSend);
    }

    function togglePanel(force) {
        if (!panel) {
            panel = document.getElementById("assistPanel");
        }
        open = typeof force === "boolean" ? force : !open;
        panel.classList.toggle("show", open);
        document.getElementById("assistBtn").textContent = open ? "✕" : "🤖";
        if (open) {
            document.getElementById("assistInput").focus();
        }
    }

    function addMessage(text, who) {
        const wrap = document.getElementById("assistMessages");
        const div = document.createElement("div");
        div.className = "msg " + who;
        div.textContent = text;
        wrap.appendChild(div);
        wrap.scrollTop = wrap.scrollHeight;
    }

    function setTyping(on) {
        let el = document.getElementById("assistTyping");
        if (on && !el) {
            el = document.createElement("div");
            el.id = "assistTyping";
            el.className = "msg bot";
            el.textContent = "Maya is typing…";
            document.getElementById("assistMessages").appendChild(el);
        }
        if (el) el.style.display = on ? "block" : "none";
        const wrap = document.getElementById("assistMessages");
        if (wrap) wrap.scrollTop = wrap.scrollHeight;
    }

    /* ---------- Replies ---------- */
    function localAnswer(text) {
        for (const item of KNOWLEDGE) {
            if (item.match.test(text)) return item.answer;
        }
        return DEFAULT_ANSWER;
    }

    async function askLiveAI(text) {
        const url = "https://text.pollinations.ai/" + encodeURIComponent(text) +
            "?model=openai&system=" + encodeURIComponent(SYSTEM_PROMPT) +
            "&prompt=" + encodeURIComponent(text);
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15000);
        try {
            const res = await fetch(url, { signal: controller.signal });
            if (!res.ok) throw new Error("bad status " + res.status);
            const data = await res.text();
            return data.trim() || null;
        } catch (e) {
            return null;
        } finally {
            clearTimeout(timer);
        }
    }

    async function onSend(e) {
        e.preventDefault();
        const input = document.getElementById("assistInput");
        const text = input.value.trim();
        if (!text) return;

        const auth = window.EstateFlowAuth;
        if (auth && !auth.currentUser()) {
            auth.openAuthModal("login", "Please log in to chat with Maya.");
            return;
        }

        input.value = "";
        addMessage(text, "user");
        setTyping(true);

        const answer = await askLiveAI(text);
        setTyping(false);
        addMessage(answer || localAnswer(text), "bot");
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

    window.EstateFlowAssistant = { togglePanel };
})();
