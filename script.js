// Global application state
let spells = [];
let prepared = new Set();
let preparedIgnored = new Set();
let currentProfile = null;
let profiles = [];

// --- Profile management ---
function loadProfiles() {
    const raw = localStorage.getItem('spellProfiles');
    profiles = raw ? JSON.parse(raw) : [];
    if (!profiles.length) {
        profiles = [{ name: 'Default', prepared: [], ignored: [] }];
        saveProfiles();
    }
}

function saveProfiles() {
    localStorage.setItem('spellProfiles', JSON.stringify(profiles));
}

function setCurrentProfile(name) {
    const profile = profiles.find(p => p.name === name);
    if (!profile) return;
    currentProfile = profile.name;
    prepared = new Set(profile.prepared);
    preparedIgnored = new Set(profile.ignored);
    updateProfileSelect();
    renderSpells();
}

function updateProfileSelect() {
    const select = document.getElementById('profileSelect');
    if (!select) return;
    select.innerHTML = '';
    profiles.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.name;
        opt.textContent = p.name;
        if (p.name === currentProfile) opt.selected = true;
        select.appendChild(opt);
    });
}

function addProfile() {
    let name = prompt('Enter new profile name:');
    if (!name) return;
    name = name.trim();
    if (!name || profiles.some(p => p.name === name)) {
        alert('Profile name must be unique and non-empty.');
        return;
    }
    profiles.push({ name, prepared: [], ignored: [] });
    saveProfiles();
    setCurrentProfile(name);
}

function deleteProfile() {
    if (profiles.length === 1) {
        alert('At least one profile must exist.');
        return;
    }
    if (!confirm('Delete this profile? This cannot be undone.')) return;
    const idx = profiles.findIndex(p => p.name === currentProfile);
    if (idx !== -1) {
        profiles.splice(idx, 1);
        saveProfiles();
        setCurrentProfile(profiles[0].name);
    }
}

function saveCurrentProfileState() {
    const profile = profiles.find(p => p.name === currentProfile);
    if (profile) {
        profile.prepared = Array.from(prepared);
        profile.ignored = Array.from(preparedIgnored);
        saveProfiles();
    }
}

// loadSpells: fetch the spells JSON, store it, then initialize UI
// - Uses `spells2014.json` by default (can be changed to another file)
async function loadSpells() {
    const res = await fetch("spells2014.json");
    spells = await res.json();
    loadProfiles();
    setupFilters();
    // Setup profile select/add/delete
    const select = document.getElementById('profileSelect');
    if (select) {
        select.onchange = e => setCurrentProfile(e.target.value);
    }
    const addBtn = document.getElementById('addProfileBtn');
    if (addBtn) addBtn.onclick = addProfile;
    const delBtn = document.getElementById('deleteProfileBtn');
    if (delBtn) delBtn.onclick = deleteProfile;
    // Set initial profile
    setCurrentProfile(profiles[0].name);
}

// setupFilters: builds the <select> options for class and level filters
// - Finds unique classes and levels from `spells` and appends options
// - Attaches change handlers so the spell list updates when filters change
function setupFilters() {
    const classFilter = document.getElementById("classFilter");
    const minLevelFilter = document.getElementById("minLevelFilter");
    const maxLevelFilter = document.getElementById("maxLevelFilter");
    const sortSelect = document.getElementById("sortSelect");

    const classes = new Set();
    const levels = new Set();

    // Gather unique classes and levels from the spells data
    spells.forEach(spell => {
        spell.classes.forEach(c => classes.add(c));
        levels.add(spell.level);
    });

    // Create an <option> for each class (sorted alphabetically)
    [...classes].sort().forEach(c => {
        const opt = document.createElement("option");
        opt.value = c;
        opt.textContent = capitalize(c);
        classFilter.appendChild(opt);
    });

    // Level options: sort numerically/cantrip first, then by number
    const levelArr = [...levels];
    levelArr.sort((a, b) => {
        function levelToNumber(l) {
            if (!l) return 100;
            const s = String(l);
            const m = s.match(/\d+/);
            if (m) return Number(m[0]);
            if (/cantrip/i.test(s)) return 0;
            return 100;
        }
        return levelToNumber(a) - levelToNumber(b);
    });

    // Populate min/max level dropdowns
    [minLevelFilter, maxLevelFilter].forEach((filter, idx) => {
        if (!filter) return;
        filter.innerHTML = '<option value="all">All</option>';
        levelArr.forEach(l => {
            const opt = document.createElement("option");
            opt.value = l;
            opt.textContent = capitalize(l);
            filter.appendChild(opt);
        });
    });

    // Re-render spells when the user changes filters
    classFilter.onchange = renderSpells;
    if (minLevelFilter) minLevelFilter.onchange = renderSpells;
    if (maxLevelFilter) maxLevelFilter.onchange = renderSpells;
    if (sortSelect) sortSelect.onchange = renderSpells;
    // Wire search input (re-render while typing)
    const searchInput = document.getElementById("searchInput");
    if (searchInput) searchInput.oninput = renderSpells;
}

// renderSpells: filters spells according to selected filters and renders
// each spell as a small card with a checkbox to mark it as prepared.
function renderSpells() {
    const classFilter = document.getElementById("classFilter").value;
    const minLevel = document.getElementById("minLevelFilter")?.value || "all";
    const maxLevel = document.getElementById("maxLevelFilter")?.value || "all";
    const sortMethod = document.getElementById("sortSelect")?.value || "none";
    const searchTerm = document.getElementById("searchInput")?.value.trim().toLowerCase() || "";

    const availableContainer = document.getElementById("spellList");
    const preparedContainer = document.getElementById("preparedList");

    // Clear previous results
    availableContainer.innerHTML = "";
    preparedContainer.innerHTML = "";

    // Helper: convert level string to number for sorting (cantrips -> 0)
    function levelToNumber(level) {
        if (!level) return 100;
        const s = String(level);
        const m = s.match(/\d+/);
        if (m) return Number(m[0]);
        if (/cantrip/i.test(s)) return 0;
        return 100; // unknown/other types go to the end
    }

    // Comparator based on selected sort method
    function getComparator(method) {
        if (method === "alpha") return (a, b) => a.name.localeCompare(b.name);
        if (method === "level") return (a, b) => {
            const na = levelToNumber(a.level);
            const nb = levelToNumber(b.level);
            if (na !== nb) return na - nb;
            return a.name.localeCompare(b.name);
        };
        return null;
    }

    const comparator = getComparator(sortMethod);

    // Helper for level string to number
    function levelToNumber(level) {
        if (!level) return 100;
        const s = String(level);
        const m = s.match(/\d+/);
        if (m) return Number(m[0]);
        if (/cantrip/i.test(s)) return 0;
        return 100;
    }

    // Build available and prepared arrays
    const filtered = spells.filter(spell => {
        if (classFilter !== "all" && !spell.classes.includes(classFilter)) return false;
        const spellLevelNum = levelToNumber(spell.level);
        if (minLevel !== "all" && spellLevelNum < levelToNumber(minLevel)) return false;
        if (maxLevel !== "all" && spellLevelNum > levelToNumber(maxLevel)) return false;
        return true;
    });

    // Available shows all filtered spells (including those already prepared)
    // Apply search filtering to available list (search name and description)
    const available = filtered.slice().filter(spell => {
        if (!searchTerm) return true;
        const hay = ((spell.name || "") + " " + (spell.description || "")).toLowerCase();
        return hay.includes(searchTerm);
    });
    // Prepared list shows all prepared spells (regardless of current filters)
    const preparedList = spells.filter(s => prepared.has(s.name));

    if (comparator) {
        available.sort(comparator);
        preparedList.sort(comparator);
    }

    // Update prepared counter (exclude any marked as ignored)
    const countedPrepared = Array.from(prepared).filter(n => !preparedIgnored.has(n)).length;
    const counterEl = document.getElementById("preparedCounter");
    if (counterEl) counterEl.textContent = `Prepared: ${countedPrepared}`;

    // Render prepared spells (left column)
    preparedList.forEach(spell => {
        const div = document.createElement("div");
        div.className = "spell";

        // Two checkboxes:
        // - main checkbox: reflects prepared state (can unprepare)
        // - ignore checkbox: marks this prepared spell as not counted against total
        const isIgnored = preparedIgnored.has(spell.name);

        div.innerHTML = `
            <div style="display:flex;align-items:center;gap:8px;">
                <label style="margin:0;">
                    <input type="checkbox" checked class="prepared-toggle">
                    <strong>${spell.name}</strong>
                </label>
                <label style="font-size:0.85em;opacity:0.9;">
                    <input type="checkbox" class="ignore-toggle" ${isIgnored ? 'checked' : ''}>
                    Domain Spell
                </label>
            </div>
            <div class="desc">${spell.description.substring(0, 120)}...</div>
        `;

        const preparedToggle = div.querySelector(".prepared-toggle");
        const ignoreToggle = div.querySelector(".ignore-toggle");

        // Unprepare when main checkbox is unchecked
        preparedToggle.onchange = () => {
            if (!preparedToggle.checked) {
                prepared.delete(spell.name);
                preparedIgnored.delete(spell.name);
                saveCurrentProfileState();
                renderSpells();
            }
        };

        // Toggle whether this prepared spell counts towards the total
        ignoreToggle.onchange = () => {
            if (ignoreToggle.checked) preparedIgnored.add(spell.name);
            else preparedIgnored.delete(spell.name);
            saveCurrentProfileState();
            renderSpells();
        };

        preparedContainer.appendChild(div);
    });

    // Render available spells (right column) as cards in a grid
    available.forEach(spell => {
        const div = document.createElement("div");
        const isPrepared = prepared.has(spell.name);
        div.className = "spell" + (isPrepared ? " checked" : "");

        // Compose some extra metadata (type, classes) if available
        const typeInfo = spell.type ? ` • ${spell.type}` : "";
        const classesInfo = (spell.classes && spell.classes.length) ? ` • ${spell.classes.join(", ")}` : "";

        div.innerHTML = `
            <div class="card-header">
                <label style="margin:0;display:flex;align-items:center;gap:8px;">
                    <input type="checkbox" ${isPrepared ? 'checked' : ''}>
                    <strong>${spell.name}</strong>
                </label>
            </div>
            <div class="card-meta">${capitalize(spell.level)}${typeInfo}${classesInfo}</div>
            <div class="desc">${(spell.description || "").substring(0, 140)}${(spell.description && spell.description.length>140)?'...':''}</div>
        `;

        const checkbox = div.querySelector("input");
        checkbox.onchange = () => {
            if (checkbox.checked) {
                prepared.add(spell.name);
            } else {
                prepared.delete(spell.name);
                preparedIgnored.delete(spell.name);
            }
            saveCurrentProfileState();
            renderSpells();
        };

        availableContainer.appendChild(div);
    });
}

// Helper: capitalizes the first letter of a string
function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

// Kick off initial load
loadSpells();
