/* ---------- Property data ---------- */
const PROPERTIES = [
    { id: 1, emoji: "🏡", name: "Luxury 4-Bedroom Home", location: "Lagos, Nigeria", price: 350000, type: "sale", beds: 4, baths: 4, area: 3200 },
    { id: 2, emoji: "🏢", name: "Modern City Apartment", location: "Abuja, Nigeria", price: 2800, type: "rent", beds: 2, baths: 2, area: 1250 },
    { id: 3, emoji: "🏘️", name: "Suburban Family House", location: "Ikeja, Lagos", price: 185000, type: "sale", beds: 3, baths: 3, area: 2100 },
    { id: 4, emoji: "🏠", name: "Cozy Bungalow", location: "Accra, Ghana", price: 1200, type: "rent", beds: 2, baths: 1, area: 980 },
    { id: 5, emoji: "🏬", name: "Downtown Office Suite", location: "Victoria Island, Lagos", price: 420000, type: "sale", beds: 0, baths: 2, area: 4600 },
    { id: 6, emoji: "🏙️", name: "Skyline Penthouse", location: "Cape Town, South Africa", price: 890000, type: "sale", beds: 5, baths: 5, area: 5400 },
    { id: 7, emoji: "🏡", name: "Garden Villa", location: "Nairobi, Kenya", price: 1900, type: "rent", beds: 3, baths: 2, area: 1700 },
    { id: 8, emoji: "🏢", name: "Executive Condo", location: "Kigali, Rwanda", price: 155000, type: "sale", beds: 2, baths: 2, area: 1400 },
    { id: 9, emoji: "🏘️", name: "Riverside Townhouse", location: "Dakar, Senegal", price: 1450, type: "rent", beds: 3, baths: 2, area: 1500 }
];

/* ---------- Formatting ---------- */
function formatPrice(price, type) {
    const n = price.toLocaleString();
    return type === "rent" ? "$" + n + "/mo" : "$" + n;
}

/* ---------- Rendering ---------- */
function propertyCard(p) {
    const meta = [];
    if (p.beds > 0) meta.push(`<span>${p.beds} bd</span>`);
    if (p.baths > 0) meta.push(`<span>${p.baths} ba</span>`);
    meta.push(`<span>${p.area.toLocaleString()} sqft</span>`);

    return `
        <article class="property-card">
            <div class="thumb ${p.type}">${p.emoji}</div>
            <div class="body">
                <span class="tag ${p.type}">${p.type}</span>
                <h3>${p.name}</h3>
                <div class="location">📍 ${p.location}</div>
                <div class="meta">${meta.join("")}</div>
                <div class="price">${formatPrice(p.price, p.type)}</div>
            </div>
        </article>`;
}

function renderPropertyGrid(containerId, list) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = list.map(propertyCard).join("");
}

/* ---------- Star rating ---------- */
function initRating() {
    const stars = document.querySelectorAll("#stars .star");
    const countEl = document.getElementById("ratingCount");
    const noteEl = document.getElementById("ratingNote");
    if (!stars.length || !countEl) return;

    const KEY = "estateflow_ratings";
    const saved = JSON.parse(localStorage.getItem(KEY) || '{"count":0,"total":0,"mine":0}');
    let mine = saved.mine;
    let total = saved.total;
    let count = saved.count;

    function persist() {
        localStorage.setItem(KEY, JSON.stringify({ count, total, mine }));
    }

    function average() {
        return count > 0 ? (total / count).toFixed(1) : "0.0";
    }

    function paint() {
        countEl.textContent = count;
        stars.forEach((star, i) => star.classList.toggle("active", i < mine));
        noteEl.textContent = mine > 0
            ? `You rated ${mine} ★ · Avg ${average()} (${count})`
            : `Rate us · Avg ${average()} (${count})`;
        persist();
    }

    function hover(n) {
        stars.forEach((star, i) => star.classList.toggle("hovered", i < n));
    }

    stars.forEach((star) => {
        const value = Number(star.dataset.value);
        star.addEventListener("click", () => {
            if (mine > 0) {
                total -= mine;
                count -= 1;
            }
            mine = value;
            total += value;
            count += 1;
            paint();
            showToast("Thanks for rating EstateFlow! ⭐");
        });
        star.addEventListener("mouseenter", () => hover(value));
        star.addEventListener("mouseleave", () => hover(0));
    });

    paint();
}

/* ---------- Agent modal ---------- */
function openModal() {
    const modal = document.getElementById("agentModal");
    if (modal) modal.classList.add("show");
}

function closeModal() {
    const modal = document.getElementById("agentModal");
    if (modal) modal.classList.remove("show");
}

document.addEventListener("click", (event) => {
    const modal = document.getElementById("agentModal");
    if (modal && event.target === modal) closeModal();
    if (modal && event.target.closest(".modal-close")) closeModal();
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModal();
});

/* ---------- Toast notifications ---------- */
function showToast(message) {
    let toast = document.getElementById("toast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "toast";
        toast.setAttribute("aria-live", "polite");
        toast.style.cssText = `
            position: fixed;
            left: 50%;
            bottom: 24px;
            transform: translateX(-50%) translateY(80px);
            background: #1f2a44;
            color: #ffffff;
            padding: 14px 24px;
            border-radius: 12px;
            font-weight: 600;
            font-size: 15px;
            box-shadow: 0 12px 32px rgba(18, 28, 61, 0.4);
            z-index: 200;
            opacity: 0;
            transition: transform 0.3s ease, opacity 0.3s ease;
            pointer-events: none;
        `;
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.transform = "translateX(-50%) translateY(0)";
    toast.style.opacity = "1";
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
        toast.style.transform = "translateX(-50%) translateY(80px)";
        toast.style.opacity = "0";
    }, 3000);
}

/* ---------- Scroll reveal ---------- */
function initReveal() {
    const targets = document.querySelectorAll(".card, .property-card, .panel");
    if (!("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = "1";
                entry.target.style.transform = "translateY(0)";
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    targets.forEach((el) => {
        el.style.opacity = "0";
        el.style.transform = "translateY(16px)";
        el.style.transition = "opacity 0.5s ease, transform 0.5s ease";
        observer.observe(el);
    });
}

/* ---------- Auto-update footer year ---------- */
function initYear() {
    document.querySelectorAll("[data-year]").forEach((el) => {
        el.textContent = new Date().getFullYear();
    });
}

/* ---------- Boot ---------- */
initRating();
renderPropertyGrid("featuredGrid", PROPERTIES.slice(0, 3));
initReveal();
initYear();

window.EstateFlowData = { PROPERTIES, formatPrice, propertyCard, renderPropertyGrid };
