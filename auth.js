(function () {
    "use strict";

    const USERS_KEY = "estateflow_users";
    const SESSION_KEY = "estateflow_session";
    const PROTECTED_PAGES = ["properties.html", "contact.html"];

    let pendingAction = null;
    let mode = "login";

    /* ---------- Storage helpers ---------- */
    function getUsers() {
        try { return JSON.parse(localStorage.getItem(USERS_KEY)) || {}; }
        catch (e) { return {}; }
    }

    function saveUsers(users) {
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }

    function getSession() {
        try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); }
        catch (e) { return null; }
    }

    function setSession(user) {
        if (user) sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
        else sessionStorage.removeItem(SESSION_KEY);
    }

    function hash(str) {
        let h = 5381;
        for (let i = 0; i < str.length; i++) {
            h = ((h << 5) + h + str.charCodeAt(i)) | 0;
        }
        return "h" + (h >>> 0).toString(36);
    }

    /* ---------- Public API ---------- */
    const currentUser = () => getSession();

    function registerUser(name, email, password) {
        const users = getUsers();
        const key = email.trim().toLowerCase();
        if (users[key]) return { ok: false, error: "An account with this email already exists." };
        if (password.length < 6) return { ok: false, error: "Password must be at least 6 characters." };
        users[key] = { name: name.trim(), email: key, pass: hash(password) };
        saveUsers(users);
        return { ok: true };
    }

    function loginUser(email, password) {
        const users = getUsers();
        const key = email.trim().toLowerCase();
        const user = users[key];
        if (!user || user.pass !== hash(password)) {
            return { ok: false, error: "Invalid email or password." };
        }
        setSession({ name: user.name, email: key });
        return { ok: true };
    }

    function logout() {
        setSession(null);
        renderAuthUI();
        showToast("You have been logged out.");
    }

    function requireAuth(action) {
        if (currentUser()) {
            action();
            return true;
        }
        pendingAction = action;
        openAuthModal("login", "Please log in to continue.");
        return false;
    }

    /* ---------- Modal ---------- */
    function openAuthModal(nextMode, note) {
        mode = nextMode || mode;
        const modal = document.getElementById("authModal");
        if (!modal) return;
        modal.classList.add("show");
        if (note) {
            const hint = document.getElementById("authHint");
            hint.style.display = "block";
            hint.textContent = note;
        }
        renderForm();
    }

    function closeAuthModal() {
        const modal = document.getElementById("authModal");
        if (modal) modal.classList.remove("show");
        const hint = document.getElementById("authHint");
        if (hint) hint.style.display = "none";
        const err = document.getElementById("authError");
        if (err) err.style.display = "none";
    }

    function renderForm() {
        const title = document.getElementById("authTitle");
        const nameRow = document.getElementById("authNameRow");
        const switchEl = document.getElementById("authSwitch");
        const submitBtn = document.getElementById("authSubmit");

        if (mode === "login") {
            title.textContent = "Log In";
            nameRow.style.display = "none";
            switchEl.textContent = "Don't have an account? Create one";
            submitBtn.textContent = "Log In";
        } else {
            title.textContent = "Create Account";
            nameRow.style.display = "block";
            switchEl.textContent = "Already have an account? Log in";
            submitBtn.textContent = "Sign Up";
        }
    }

    function setError(msg) {
        const err = document.getElementById("authError");
        err.textContent = msg || "";
        err.style.display = msg ? "block" : "none";
    }

    function buildAuthModal() {
        if (document.getElementById("authModal")) return;

        const html = `
        <div class="modal-overlay" id="authModal">
            <div class="modal">
                <button class="modal-close" id="authClose" type="button">&times;</button>
                <h3 id="authTitle">Log In</h3>
                <p id="authHint" class="auth-hint" style="display:none;"></p>
                <p id="authError" class="auth-error" style="display:none;"></p>
                <form id="authForm" novalidate>
                    <div id="authNameRow">
                        <label for="authName">Full Name</label>
                        <input type="text" id="authName" placeholder="Your full name">
                    </div>
                    <label for="authEmail">Email Address</label>
                    <input type="email" id="authEmail" placeholder="you@example.com">
                    <label for="authPass">Password</label>
                    <input type="password" id="authPass" placeholder="At least 6 characters">
                    <button type="submit" id="authSubmit" class="btn btn-primary" style="width:100%;">Log In</button>
                    <p style="text-align:center; margin-top:14px; font-size:14px; color:#5b6478;">
                        <a id="authSwitch" style="color:#2b4bd8; font-weight:600; cursor:pointer;">Don't have an account? Create one</a>
                    </p>
                </form>
            </div>
        </div>`;

        const div = document.createElement("div");
        div.innerHTML = html.trim();
        document.body.appendChild(div.firstChild);

        document.getElementById("authClose").addEventListener("click", closeAuthModal);
        document.getElementById("authModal").addEventListener("click", (e) => {
            if (e.target === document.getElementById("authModal")) closeAuthModal();
        });
        document.getElementById("authSwitch").addEventListener("click", () => {
            mode = mode === "login" ? "register" : "login";
            setError(null);
            renderForm();
        });
        document.getElementById("authForm").addEventListener("submit", (e) => {
            e.preventDefault();
            handleSubmit();
        });
    }

    function handleSubmit() {
        const name = (document.getElementById("authName").value || "").trim();
        const email = (document.getElementById("authEmail").value || "").trim();
        const password = document.getElementById("authPass").value || "";

        if (!email || !password) {
            setError("Please fill in all required fields.");
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setError("Please enter a valid email address.");
            return;
        }

        let result;
        if (mode === "register") {
            if (!name) { setError("Please enter your full name."); return; }
            result = registerUser(name, email, password);
            if (result.ok) result = loginUser(email, password);
        } else {
            result = loginUser(email, password);
        }

        if (!result.ok) {
            setError(result.error);
            return;
        }

        setError(null);
        closeAuthModal();
        renderAuthUI();
        showToast("Welcome, " + currentUser().name + "!");

        const action = pendingAction;
        pendingAction = null;
        if (action) action();
    }

    /* ---------- Nav UI ---------- */
    function renderAuthUI() {
        const box = document.getElementById("authBox");
        if (!box) return;
        const user = currentUser();
        if (user) {
            box.innerHTML = `
                <span class="nav-user" title="${user.email}">Hi, ${user.name.split(" ")[0]}</span>
                <button class="btn btn-ghost" id="logoutBtn">Log Out</button>`;
            const btn = document.getElementById("logoutBtn");
            if (btn) btn.addEventListener("click", logout);
        } else {
            box.innerHTML = `<button class="btn btn-primary" id="loginBtn">Log In</button>`;
            const btn = document.getElementById("loginBtn");
            if (btn) btn.addEventListener("click", () => openAuthModal("login"));
        }
    }

    function buildNavAuth() {
        const links = document.querySelector(".nav .links");
        if (!links || document.getElementById("authBox")) return;
        const box = document.createElement("div");
        box.className = "nav-auth";
        box.id = "authBox";
        links.appendChild(box);
    }

    /* ---------- Toast ---------- */
    function showToast(message) {
        let toast = document.getElementById("toast");
        if (!toast) {
            toast = document.createElement("div");
            toast.id = "toast";
            toast.setAttribute("aria-live", "polite");
            toast.style.cssText = `
                position: fixed; left: 50%; bottom: 24px;
                transform: translateX(-50%) translateY(80px);
                background: #1f2a44; color: #ffffff; padding: 14px 24px;
                border-radius: 12px; font-weight: 600; font-size: 15px;
                box-shadow: 0 12px 32px rgba(18,28,61,0.4); z-index: 200;
                opacity: 0; transition: transform .3s ease, opacity .3s ease;
                pointer-events: none;`;
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

    /* ---------- Page gating ---------- */
    function currentPage() {
        return (location.pathname.split("/").pop() || "index.html").split("?")[0].split("#")[0];
    }

    function gatePage() {
        if (PROTECTED_PAGES.includes(currentPage()) && !currentUser()) {
            location.replace("index.html#login");
            return true;
        }
        return false;
    }

    /* ---------- Link interception ---------- */
    function interceptProtectedLinks() {
        document.addEventListener("click", (e) => {
            const link = e.target.closest("a[href]");
            if (!link) return;
            const href = (link.getAttribute("href") || "").split("#")[0].split("?")[0];
            if (PROTECTED_PAGES.includes(href)) {
                e.preventDefault();
                requireAuth(() => { location.href = link.getAttribute("href"); });
            }
        });
    }

    function gateAgentModal() {
        const orig = window.openModal;
        if (typeof orig === "function") {
            window.openModal = function () {
                requireAuth(() => orig());
            };
        }
    }

    /* ---------- Init ---------- */
    window.addEventListener("DOMContentLoaded", () => {
        buildNavAuth();
        buildAuthModal();
        renderAuthUI();

        if (gatePage()) return;

        if (location.hash === "#login" && !currentUser()) {
            openAuthModal("login", "Please log in to access that page.");
            history.replaceState(null, "", location.pathname);
        }

        interceptProtectedLinks();
        gateAgentModal();
    });

    window.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeAuthModal();
    });

    window.EstateFlowAuth = {
        currentUser,
        registerUser,
        loginUser,
        logout,
        requireAuth,
        openAuthModal,
        closeAuthModal
    };
})();
