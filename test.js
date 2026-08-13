"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

/* ---------- Test harness ---------- */
let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        passed++;
        console.log("  PASS  " + name);
    } catch (e) {
        failed++;
        console.log("  FAIL  " + name + " — " + e.message);
    }
}

function assert(cond, msg) {
    if (!cond) throw new Error(msg || "assertion failed");
}

/* ---------- Browser stubs ---------- */
function makeStorage() {
    const m = new Map();
    return {
        getItem: (k) => (m.has(k) ? m.get(k) : null),
        setItem: (k, v) => m.set(k, String(v)),
        removeItem: (k) => m.delete(k)
    };
}

function makeElement(id) {
    return {
        id,
        style: {},
        dataset: {},
        value: "",
        textContent: "",
        innerHTML: "",
        children: [],
        classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
        addEventListener() {},
        appendChild(c) { this.children.push(c); return c; },
        querySelectorAll() { return []; },
        querySelector() { return null; },
        closest() { return null; }
    };
}

function makeContext() {
    const elements = new Map();
    const readyFns = [];
    const globals = new Map();
    const windowObj = { addEventListener() {} };

    const document = {
        readyState: "loading",
        body: makeElement("body"),
        documentElement: { style: { setProperty() {} } },
        getElementById: (id) => {
            if (!elements.has(id)) elements.set(id, makeElement(id));
            return elements.get(id);
        },
        createElement: (tag) => makeElement(tag),
        createTextNode: () => ({ textContent: "" }),
        querySelector: () => makeElement("qs"),
        querySelectorAll: () => [],
        addEventListener: (type, fn) => {
            if (type === "DOMContentLoaded") readyFns.push(fn);
        }
    };

    const location = { pathname: "/index.html", hash: "", href: "", replace() {} };
    const history = { replaceState() {} };

    const sandbox = {
        document,
        window: windowObj,
        localStorage: makeStorage(),
        sessionStorage: makeStorage(),
        location,
        history,
        AbortSignal: { timeout: () => ({}) },
        console,
        setTimeout,
        clearTimeout,
        fetch: async () => ({ ok: false, text: async () => "" })
    };
    vm.createContext(sandbox);

    return {
        run(code) { vm.runInContext(code, sandbox); },
        eval(code) { return vm.runInContext(code, sandbox); },
        globals: sandbox,
        readyFns,
        elements
    };
}

function loadSite(ctx) {
    for (const file of ["script.js", "auth.js", "finder.js"]) {
        ctx.run(fs.readFileSync(path.join(__dirname, file), "utf8"));
    }
    ctx.readyFns.forEach((fn) => fn());
    ctx.readyFns.length = 0;
}

/* ---------- Tests ---------- */
console.log("EstateFlow test suite\n");

let ctx = makeContext();
loadSite(ctx);

test("site exposes property data", () => {
    const data = ctx.eval("window.EstateFlowData");
    assert(data && data.PROPERTIES.length === 9, "expected 9 properties");
});

test("formatPrice renders sale price", () => {
    const out = ctx.eval('window.EstateFlowData.formatPrice(350000, "sale")');
    assert(out === "$350,000", "got " + out);
});

test("formatPrice renders monthly rent", () => {
    const out = ctx.eval('window.EstateFlowData.formatPrice(2800, "rent")');
    assert(out === "$2,800/mo", "got " + out);
});

test("auth: register creates account", () => {
    const res = ctx.eval('window.EstateFlowAuth.registerUser("Ada", "ada@test.com", "secret1")');
    assert(res.ok === true, "register failed: " + JSON.stringify(res));
});

test("auth: duplicate email rejected", () => {
    const res = ctx.eval('window.EstateFlowAuth.registerUser("Ada2", "ada@test.com", "secret1")');
    assert(res.ok === false && /exists/.test(res.error), "got " + JSON.stringify(res));
});

test("auth: weak password rejected", () => {
    const res = ctx.eval('window.EstateFlowAuth.registerUser("Bob", "bob@test.com", "123")');
    assert(res.ok === false, "weak password accepted");
});

test("auth: wrong password rejected", () => {
    const res = ctx.eval('window.EstateFlowAuth.loginUser("ada@test.com", "wrong")');
    assert(res.ok === false, "wrong password accepted");
});

test("auth: correct login works", () => {
    const res = ctx.eval('window.EstateFlowAuth.loginUser("ada@test.com", "secret1")');
    assert(res.ok === true, "login failed: " + JSON.stringify(res));
    const user = ctx.eval("window.EstateFlowAuth.currentUser()");
    assert(user && user.email === "ada@test.com", "no session set");
});

test("auth: logout clears session", () => {
    ctx.eval("window.EstateFlowAuth.logout()");
    const user = ctx.eval("window.EstateFlowAuth.currentUser()");
    assert(user === null, "session not cleared");
});

test("finder: parses 3-bedroom rent under $2,000", () => {
    const p = ctx.eval('window.EstateFlowFinder.extractParams("a 3-bedroom house for rent in Lagos under $2,000")');
    assert(p.type === "rent", "type=" + p.type);
    assert(p.beds === 3, "beds=" + p.beds);
    assert(p.budget === 2000, "budget=" + p.budget);
    assert(p.city === "lagos", "city=" + p.city);
});

test("finder: parses buy under 500k", () => {
    const p = ctx.eval('window.EstateFlowFinder.extractParams("buy a home under 500k")');
    assert(p.type === "sale", "type=" + p.type);
    assert(p.budget === 500000, "budget=" + p.budget);
});

test("finder: matches rentals under $2,000", () => {
    const p = { type: "rent", beds: null, budget: 2000, city: null };
    const m = ctx.eval("window.EstateFlowFinder.findMatches(" + JSON.stringify(p) + ")");
    assert(Array.isArray(m) && m.length >= 1, "no matches");
    m.forEach((prop) => {
        assert(prop.type === "rent", "non-rent match");
        assert(prop.price <= 2000, "over budget: " + prop.price);
    });
});

test("finder: bed count excludes 0-bed offices", () => {
    const p = { type: "sale", beds: 4, budget: null, city: null };
    const m = ctx.eval("window.EstateFlowFinder.findMatches(" + JSON.stringify(p) + ")");
    assert(m.length >= 1 && m.every((x) => x.beds >= 4), "expected 4+ bed sales only, got " + JSON.stringify(m.map((x) => x.name)));
});

/* ---------- Summary ---------- */
console.log("\n" + passed + " passed, " + failed + " failed");
if (failed > 0) process.exit(1);
