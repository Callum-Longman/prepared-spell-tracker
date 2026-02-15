// Global application state
// `spells` holds the array of spell objects loaded from JSON.
// `prepared` is a Set of spell names the user has marked as prepared.
let spells = [];
let prepared = new Set();
// `preparedIgnored` holds names of prepared spells that should NOT count towards the total
let preparedIgnored = new Set();

// loadSpells: fetch the spells JSON, store it, then initialize UI
// - Uses `spells2014.json` by default (can be changed to another file)
async function loadSpells() {
    const res = await fetch("spells2014.json");
    spells = await res.json();
    setupFilters(); // populate class/level dropdowns based on data
    renderSpells(); // show the first view of spells
}

// setupFilters: builds the <select> options for class and level filters
// - Finds unique classes and levels from `spells` and appends options
// - Attaches change handlers so the spell list updates when filters change
function setupFilters() {
    const classFilter = document.getElementById("classFilter");
    const levelFilter = document.getElementById("levelFilter");
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

    // Create an <option> for each level (sorted)
    [...levels].sort().forEach(l => {
        const opt = document.createElement("option");
        opt.value = l;
        opt.textContent = capitalize(l);
        levelFilter.appendChild(opt);
    });

    // Re-render spells when the user changes filters
    classFilter.onchange = renderSpells;
    levelFilter.onchange = renderSpells;
    if (sortSelect) sortSelect.onchange = renderSpells;
    // Wire search input (re-render while typing)
    const searchInput = document.getElementById("searchInput");
    if (searchInput) searchInput.oninput = renderSpells;
}

// renderSpells: filters spells according to selected filters and renders
// each spell as a small card with a checkbox to mark it as prepared.
function renderSpells() {
    const classFilter = document.getElementById("classFilter").value;
    const levelFilter = document.getElementById("levelFilter").value;
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

    // Build available and prepared arrays
    const filtered = spells.filter(spell => {
        if (classFilter !== "all" && !spell.classes.includes(classFilter)) return false;
        if (levelFilter !== "all" && spell.level !== levelFilter) return false;
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
                    Not counted
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
                renderSpells();
            }
        };

        // Toggle whether this prepared spell counts towards the total
        ignoreToggle.onchange = () => {
            if (ignoreToggle.checked) preparedIgnored.add(spell.name);
            else preparedIgnored.delete(spell.name);
            // Only the counter needs updating, but re-render to keep UI consistent
            renderSpells();
        };

        preparedContainer.appendChild(div);
    });

    // Render available spells (right column) as cards in a grid
    available.forEach(spell => {
        const div = document.createElement("div");
        div.className = "spell";
        // Show checkbox checked if this spell is prepared
        const isPrepared = prepared.has(spell.name);

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
