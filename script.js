let spells = [];
let prepared = new Set();

async function loadSpells() {
    const res = await fetch("spells.json");
    spells = await res.json();
    setupFilters();
    renderSpells();
}

function setupFilters() {
    const classFilter = document.getElementById("classFilter");
    const levelFilter = document.getElementById("levelFilter");

    const classes = new Set();
    const levels = new Set();

    spells.forEach(spell => {
        spell.classes.forEach(c => classes.add(c));
        levels.add(spell.level);
    });

    [...classes].sort().forEach(c => {
        const opt = document.createElement("option");
        opt.value = c;
        opt.textContent = capitalize(c);
        classFilter.appendChild(opt);
    });

    [...levels].sort().forEach(l => {
        const opt = document.createElement("option");
        opt.value = l;
        opt.textContent = capitalize(l);
        levelFilter.appendChild(opt);
    });

    classFilter.onchange = renderSpells;
    levelFilter.onchange = renderSpells;
}

function renderSpells() {
    const classFilter = document.getElementById("classFilter").value;
    const levelFilter = document.getElementById("levelFilter").value;
    const container = document.getElementById("spellList");

    container.innerHTML = "";

    spells
        .filter(spell => {
            if (classFilter !== "all" && !spell.classes.includes(classFilter)) return false;
            if (levelFilter !== "all" && spell.level !== levelFilter) return false;
            return true;
        })
        .forEach(spell => {
            const div = document.createElement("div");
            div.className = "spell";

            const checked = prepared.has(spell.name) ? "checked" : "";

            div.innerHTML = `
                <label>
                    <input type="checkbox" ${checked}>
                    <strong>${spell.name}</strong> (${capitalize(spell.level)})
                </label>
                <div class="desc">${spell.description.substring(0, 120)}...</div>
            `;

            const checkbox = div.querySelector("input");
            checkbox.onchange = () => {
                if (checkbox.checked) {
                    prepared.add(spell.name);
                } else {
                    prepared.delete(spell.name);
                }
            };

            container.appendChild(div);
        });
}

function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

loadSpells();
