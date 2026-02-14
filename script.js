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

    classes.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c;
        opt.textContent = c;
        classFilter.appendChild(opt);
    });

    [...levels].sort((a, b) => a - b).forEach(l => {
        const opt = document.createElement("option");
        opt.value = l;
        opt.textContent = l;
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
            if (levelFilter !== "all" && spell.level != levelFilter) return false;
            return true;
        })
        .forEach(spell => {
            const div = document.createElement("div");
            div.className = "spell";

            const checked = prepared.has(spell.name) ? "checked" : "";

            div.innerHTML = `
                <label>
                    <input type="checkbox" ${checked}>
                    <strong>${spell.name}</strong> (Level ${spell.level})
                </label>
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

loadSpells();
