// Global application state
// `spells` holds the array of spell objects loaded from JSON.
// `prepared` is a Set of spell names the user has marked as prepared.
    available.forEach(spell => {
        const div = document.createElement("div");
        div.className = "spell";
        // Show border if this spell is prepared
        const isPrepared = prepared.has(spell.name);
        const isExpanded = !!expandedSpells[spell.name];
        if (isPrepared) div.classList.add("selected");
        if (isExpanded) div.classList.add("expanded");

        // Compose extra metadata
        const typeInfo = spell.type ? ` • ${spell.type}` : "";
        const classesInfo = (spell.classes && spell.classes.length) ? ` • ${spell.classes.join(", ")}` : "";

        // Expand/collapse toggle
        const expandBtn = `<button class=\"expand-toggle\" tabindex=\"-1\" title=\"${isExpanded ? 'Collapse' : 'Expand'}\">${isExpanded ? '−' : '+'}</button>`;

        // Card header (always visible)
        div.innerHTML = `
            <div class=\"card-header\">\n                <span style=\"display:flex;align-items:center;gap:8px;\">\n                    <strong>${spell.name}</strong>\n                </span>\n                ${expandBtn}\n            </div>\n            <div class=\"card-meta\">${capitalize(spell.level)}${typeInfo}${classesInfo}</div>\n            <div class=\"desc\">${(spell.description || "").substring(0, 140)}${(spell.description && spell.description.length>140)?'...':''}</div>\n        `;

        // Add details if expanded
        if (isExpanded) {
            // School, ritual, actions, attack/save, damage, full description
            const school = spell.school || (spell.type ? spell.type.split(" ")[0] : "");
            const ritual = spell.ritual ? 'Yes' : (/ritual/i.test(spell.type||"") ? 'Yes' : 'No');
            const classes = (spell.classes || []).join(", ");
            const actions = spell.casting_time || spell.actions || '';
            const attack = spell.attack_roll || spell.save || spell['attack/save'] || '';
            const damage = spell.damage || spell['damage/effect'] || '';
            const desc = spell.description || '';
            div.innerHTML += `
                <div class=\"card-details\">\n                    <div><strong>Name:</strong> ${spell.name}</div>\n                    <div><strong>Level:</strong> ${capitalize(spell.level)}</div>\n                    <div><strong>School:</strong> ${school}</div>\n                    <div><strong>Ritual:</strong> ${ritual}</div>\n                    <div><strong>Class:</strong> ${classes}</div>\n                    <div><strong>Actions:</strong> ${actions}</div>\n                    <div><strong>Attack/Save:</strong> ${attack}</div>\n                    <div><strong>Damage/Effect:</strong> ${damage}</div>\n                    <div style=\"margin-top:8px;\"><strong>Description:</strong><br>${desc}</div>\n                </div>\n            `;
        }

        // Expand/collapse logic
        const expandToggle = div.querySelector(".expand-toggle");
        expandToggle.onclick = (e) => {
            e.stopPropagation();
            expandedSpells[spell.name] = !isExpanded;
            renderSpells();
        };

        // Toggle prepared state on card click (not on expand/collapse button)
        div.onclick = (e) => {
            if (e.target === expandToggle) {
                // handled above
                return;
            }
            // Toggle prepared state
            if (isPrepared) {
                prepared.delete(spell.name);
                preparedIgnored.delete(spell.name);
            } else {
                prepared.add(spell.name);
            }
            renderSpells();
        };

        availableContainer.appendChild(div);
    });

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

    // Track expanded state for cards (by spell name)
    if (!window._expandedSpells) window._expandedSpells = {};
    const expandedSpells = window._expandedSpells;

    available.forEach(spell => {
        const div = document.createElement("div");
        div.className = "spell";
        // Show checkbox checked if this spell is prepared
        const isPrepared = prepared.has(spell.name);
        const isExpanded = !!expandedSpells[spell.name];
        if (isExpanded) div.classList.add("expanded");

        // Compose extra metadata
        const typeInfo = spell.type ? ` • ${spell.type}` : "";
        const classesInfo = (spell.classes && spell.classes.length) ? ` • ${spell.classes.join(", ")}` : "";

        // Expand/collapse toggle
        const expandBtn = `<button class="expand-toggle" tabindex="-1" title="${isExpanded ? 'Collapse' : 'Expand'}">${isExpanded ? '−' : '+'}</button>`;

        // Card header (always visible)
        div.innerHTML = `
            <div class="card-header">
                <label style="margin:0;display:flex;align-items:center;gap:8px;">
                    <input type="checkbox" ${isPrepared ? 'checked' : ''}>
                    <strong>${spell.name}</strong>
                </label>
                ${expandBtn}
            </div>
            <div class="card-meta">${capitalize(spell.level)}${typeInfo}${classesInfo}</div>
            <div class="desc">${(spell.description || "").substring(0, 140)}${(spell.description && spell.description.length>140)?'...':''}</div>
        `;

        // Add details if expanded
        if (isExpanded) {
            // School, ritual, actions, attack/save, damage, full description
            const school = spell.school || (spell.type ? spell.type.split(" ")[0] : "");
            const ritual = spell.ritual ? 'Yes' : (/ritual/i.test(spell.type||"") ? 'Yes' : 'No');
            const classes = (spell.classes || []).join(", ");
            const actions = spell.casting_time || spell.actions || '';
            const attack = spell.attack_roll || spell.save || spell['attack/save'] || '';
            const damage = spell.damage || spell['damage/effect'] || '';
            const desc = spell.description || '';
            div.innerHTML += `
                <div class="card-details">
                    <div><strong>Name:</strong> ${spell.name}</div>
                    <div><strong>Level:</strong> ${capitalize(spell.level)}</div>
                    <div><strong>School:</strong> ${school}</div>
                    <div><strong>Ritual:</strong> ${ritual}</div>
                    <div><strong>Class:</strong> ${classes}</div>
                    <div><strong>Actions:</strong> ${actions}</div>
                    <div><strong>Attack/Save:</strong> ${attack}</div>
                    <div><strong>Damage/Effect:</strong> ${damage}</div>
                    <div style="margin-top:8px;"><strong>Description:</strong><br>${desc}</div>
                </div>
            `;
        }

        // Checkbox logic
        const checkbox = div.querySelector("input[type=checkbox]");
        checkbox.onchange = (e) => {
            e.stopPropagation();
            if (checkbox.checked) {
                prepared.add(spell.name);
            } else {
                prepared.delete(spell.name);
                preparedIgnored.delete(spell.name);
            }
            renderSpells();
        };

        // Expand/collapse logic
        const expandToggle = div.querySelector(".expand-toggle");
        expandToggle.onclick = (e) => {
            e.stopPropagation();
            expandedSpells[spell.name] = !isExpanded;
            renderSpells();
        };

        // Also expand/collapse on card click (not on checkbox)
        div.onclick = (e) => {
            if (e.target === checkbox || e.target === expandToggle) return;
            expandedSpells[spell.name] = !isExpanded;
            renderSpells();
        };

        availableContainer.appendChild(div);
    });


// Helper: capitalizes the first letter of a string
function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

// Kick off initial load
loadSpells();
