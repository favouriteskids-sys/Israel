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

function formatPrice(price, type) {
    const n = type === "rent" ? "$" + price.toLocaleString() + "/mo" : "$" + price.toLocaleString();
    return n;
}

function propertyCard(p) {
    const beds = p.beds > 0 ? p.beds + " bd" : "";
    const baths = p.baths > 0 ? p.baths + " ba" : "";
    return `
        <div class="property-card">
            <div class="thumb">${p.emoji}</div>
            <div class="body">
                <span class="tag ${p.type}">${p.type}</span>
                <h3>${p.name}</h3>
                <div class="location">📍 ${p.location}</div>
                <div class="meta">
                    ${beds ? `<span>${beds}</span>` : ""}
                    ${baths ? `<span>${baths}</span>` : ""}
                    <span>${p.area.toLocaleString()} sqft</span>
                </div>
                <div class="price">${formatPrice(p.price, p.type)}</div>
            </div>
        </div>`;
}

function renderPropertyGrid(containerId, list) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = list.map(propertyCard).join("");
}

function initRating() {
    const stars = document.querySelectorAll('#stars .star');
    const countEl = document.getElementById('ratingCount');
    const noteEl = document.getElementById('ratingNote');
    if (!stars.length) return;
    const STORAGE_KEY = 'realstack_ratings';
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"count":0,"total":0,"mine":0}');
    let myRating = saved.mine;
    let total = saved.total;
    let count = saved.count;

    function save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ count, total, mine: myRating }));
    }

    function average() {
        return count > 0 ? (total / count).toFixed(1) : '0.0';
    }

    function update() {
        countEl.textContent = count;
        stars.forEach((star, i) => {
            star.classList.toggle('active', i < myRating);
        });
        if (myRating > 0) {
            noteEl.textContent = 'You rated ' + myRating + ' ★ · Avg ' + average() + ' (' + count + ')';
        } else {
            noteEl.textContent = 'Rate us · Avg ' + average() + ' (' + count + ')';
        }
        save();
    }

    function hover(n) {
        stars.forEach((star, i) => {
            star.classList.toggle('hovered', i < n);
        });
    }

    stars.forEach((star) => {
        const value = Number(star.dataset.value);
        star.addEventListener('click', () => {
            if (myRating > 0) {
                total -= myRating;
                count -= 1;
            }
            myRating = value;
            total += value;
            count += 1;
            update();
        });
        star.addEventListener('mouseenter', () => hover(value));
        star.addEventListener('mouseleave', () => hover(0));
    });

    update();
}

function openModal() {
    const modal = document.getElementById('agentModal');
    if (modal) modal.classList.add('show');
}

function closeModal() {
    const modal = document.getElementById('agentModal');
    if (modal) modal.classList.remove('show');
}

initRating();
renderPropertyGrid('featuredGrid', PROPERTIES.slice(0, 3));
