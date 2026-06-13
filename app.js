let oneWordBrain = {};
let twoWordBrain = {};
let words = [];
let uniqueWords = [];
let currentCreature = null;

function cleanText(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s.!?]/g, " ")
        .replace(/[.!?]/g, " . ")
        .replace(/\s+/g, " ")
        .trim();
}

function hashString(str) {
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return Math.abs(hash >>> 0);
}

function pick(list, seed) {
    return list[seed % list.length];
}

function buildOneWordBrain(wordList) {
    const model = {};
    for (let i = 0; i < wordList.length - 1; i++) {
        const current = wordList[i];
        const next = wordList[i + 1];
        if (current === "." || next === ".") continue;
        if (!model[current]) model[current] = {};
        model[current][next] = (model[current][next] || 0) + 1;
    }
    return model;
}

function buildTwoWordBrain(wordList) {
    const model = {};
    for (let i = 0; i < wordList.length - 2; i++) {
        if (wordList[i] === "." || wordList[i + 1] === "." || wordList[i + 2] === ".") continue;
        const phrase = wordList[i] + " " + wordList[i + 1];
        const next = wordList[i + 2];
        if (!model[phrase]) model[phrase] = {};
        model[phrase][next] = (model[phrase][next] || 0) + 1;
    }
    return model;
}

function formatBrain(model, limit = 50) {
    return Object.keys(model).slice(0, limit).map(key => {
        const nextWords = Object.entries(model[key])
            .sort((a, b) => b[1] - a[1])
            .map(([next, count]) => `${next}(${count})`)
            .join(", ");
        return `${key} -> ${nextWords}`;
    }).join("\n");
}

function chooseWeighted(options) {
    const entries = Object.entries(options);
    const total = entries.reduce((sum, item) => sum + item[1], 0);
    let roll = Math.random() * total;
    for (const [word, count] of entries) {
        roll -= count;
        if (roll <= 0) return word;
    }
    return entries[0][0];
}

function generateOneWord(prompt, length = 22) {
    let current = prompt.toLowerCase().trim().split(/\s+/).pop();
    if (!oneWordBrain[current]) current = uniqueWords[Math.floor(Math.random() * uniqueWords.length)];
    const output = [current];

    for (let i = 0; i < length; i++) {
        if (!oneWordBrain[current]) break;
        const next = chooseWeighted(oneWordBrain[current]);
        output.push(next);
        current = next;
    }
    return output.join(" ");
}

function generateTwoWord(prompt, length = 22) {
    const promptWords = cleanText(prompt).split(" ").filter(w => w && w !== ".");
    let output = promptWords.length >= 2 ? promptWords.slice(-2) : words.filter(w => w !== ".").slice(0, 2);

    for (let i = 0; i < length; i++) {
        const lastTwo = output.slice(-2).join(" ");
        if (twoWordBrain[lastTwo]) {
            output.push(chooseWeighted(twoWordBrain[lastTwo]));
            continue;
        }
        const lastOne = output[output.length - 1];
        if (oneWordBrain[lastOne]) {
            output.push(chooseWeighted(oneWordBrain[lastOne]));
            continue;
        }
        break;
    }
    return output.join(" ");
}

function getDatasetStats(rawText) {
    const clean = cleanText(rawText);
    const allWords = clean.length ? clean.split(" ") : [];
    const realWords = allWords.filter(w => w !== ".");
    const unique = [...new Set(realWords)];
    const sentenceCount = Math.max(1, rawText.split(/[.!?\n]+/).filter(s => s.trim().length > 0).length);
    const averageSentenceLength = realWords.length / sentenceCount;

    const oneConnections = Object.values(oneWordBrain).reduce((sum, nextWords) => sum + Object.keys(nextWords).length, 0);
    const twoConnections = Object.values(twoWordBrain).reduce((sum, nextWords) => sum + Object.keys(nextWords).length, 0);

    const diversity = realWords.length === 0 ? 0 : unique.length / realWords.length;
    const density = unique.length === 0 ? 0 : (oneConnections + twoConnections) / unique.length;

    const counts = {};
    realWords.forEach(w => counts[w] = (counts[w] || 0) + 1);
    const repeated = Object.values(counts).filter(c => c > 1).length;
    const repetition = unique.length === 0 ? 0 : repeated / unique.length;

    return {
        totalWords: realWords.length,
        uniqueWords: unique.length,
        sentenceCount,
        averageSentenceLength,
        oneConnections,
        twoConnections,
        diversity,
        density,
        repetition
    };
}

const PALETTES = {
    COMMON: ["#4ade80", "#166534", "#bbf7d0", "#052e16"],
    UNCOMMON: ["#60a5fa", "#1d4ed8", "#dbeafe", "#0f172a"],
    RARE: ["#c084fc", "#7e22ce", "#f3e8ff", "#1e1b4b"],
    EPIC: ["#fb923c", "#c2410c", "#ffedd5", "#431407"],
    LEGENDARY: ["#facc15", "#a16207", "#fef9c3", "#422006"],
    MYTHIC: ["#f0abfc", "#22d3ee", "#fef3c7", "#111827"]
};

function rarityFromHash(hash, stats) {
    const roll = hash % 1000;
    if (stats.uniqueWords >= 35 && stats.density > 2.5 && roll > 990) return "MYTHIC";
    if (stats.uniqueWords >= 25 && roll > 950) return "LEGENDARY";
    if (stats.density > 2.0 && roll > 890) return "EPIC";
    if (stats.diversity > 0.65 && roll > 760) return "RARE";
    if (roll > 550) return "UNCOMMON";
    return "COMMON";
}

function createCreature(rawText, stats) {
    const seed = hashString(rawText + JSON.stringify(stats));
    const rarity = rarityFromHash(seed, stats);
    const speciesList = [
        "Pixel Amoeba",
        "Syntax Beetle",
        "Knowledge Moth",
        "Pattern Toad",
        "Neural Sprout",
        "Dream Crawler",
        "Arcane Data Bug"
    ];

    return {
        id: "CRT-" + String(seed).slice(0, 6),
        family: "FAM-" + String(hashString(uniqueWords.slice(0, 5).join("-"))).slice(0, 5),
        seed,
        rarity,
        species: pick(speciesList, seed + stats.uniqueWords),
        palette: PALETTES[rarity],
        body: pick(["ROUND", "SQUARE", "DIAMOND", "TALL", "WIDE"], seed + stats.totalWords),
        eyes: pick(["DOT", "WIDE", "SLEEPY", "ARCANE"], seed + Math.floor(stats.diversity * 100)),
        horns: pick(["NONE", "TWIN", "ANTENNA", "CROWN"], seed + Math.floor(stats.density * 10)),
        tail: pick(["NONE", "CURL", "SPIKE", "COMET"], seed + stats.oneConnections + stats.twoConnections),
        pattern: pick(["NONE", "SPOTS", "STRIPES", "CORE", "STARS"], seed + Math.floor(stats.repetition * 100))
    };
}

function px(ctx, x, y, color, size = 8) {
    ctx.fillStyle = color;
    ctx.fillRect(x * size, y * size, size, size);
}

function rect(ctx, x, y, w, h, color) {
    for (let yy = y; yy < y + h; yy++) {
        for (let xx = x; xx < x + w; xx++) px(ctx, xx, yy, color);
    }
}

function drawPixelCreature(creature) {
    const canvas = document.getElementById("creatureCanvas");
    const ctx = canvas.getContext("2d");
    const [main, shadow, highlight, outline] = creature.palette;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;

    rect(ctx, 0, 0, 32, 32, "#05060a");

    let body = { x: 10, y: 10, w: 12, h: 14 };
    if (creature.body === "ROUND") body = { x: 9, y: 9, w: 14, h: 14 };
    if (creature.body === "SQUARE") body = { x: 9, y: 10, w: 14, h: 13 };
    if (creature.body === "DIAMOND") body = { x: 10, y: 9, w: 12, h: 15 };
    if (creature.body === "TALL") body = { x: 11, y: 7, w: 10, h: 18 };
    if (creature.body === "WIDE") body = { x: 7, y: 11, w: 18, h: 11 };

    rect(ctx, body.x - 1, body.y - 1, body.w + 2, body.h + 2, outline);
    rect(ctx, body.x, body.y, body.w, body.h, main);
    rect(ctx, body.x + 1, body.y + 1, Math.max(2, Math.floor(body.w / 2)), 2, highlight);
    rect(ctx, body.x + body.w - 3, body.y + body.h - 3, 2, 2, shadow);

    if (creature.body === "DIAMOND") {
        px(ctx, body.x, body.y, "#05060a");
        px(ctx, body.x + body.w - 1, body.y, "#05060a");
        px(ctx, body.x, body.y + body.h - 1, "#05060a");
        px(ctx, body.x + body.w - 1, body.y + body.h - 1, "#05060a");
    }

    if (creature.pattern === "SPOTS") {
        px(ctx, body.x + 3, body.y + 6, shadow);
        px(ctx, body.x + body.w - 4, body.y + 8, shadow);
        px(ctx, body.x + 6, body.y + 11, shadow);
    }

    if (creature.pattern === "STRIPES") {
        rect(ctx, body.x + 2, body.y + 4, body.w - 4, 1, shadow);
        rect(ctx, body.x + 2, body.y + 8, body.w - 4, 1, shadow);
    }

    if (creature.pattern === "CORE") {
        rect(ctx, 15, 16, 2, 2, highlight);
        px(ctx, 15, 15, "#ffffff");
    }

    if (creature.pattern === "STARS") {
        px(ctx, body.x + 3, body.y + 4, "#ffffff");
        px(ctx, body.x + body.w - 4, body.y + 9, "#ffffff");
    }

    const eyeY = body.y + 4;
    let leftEyeX = body.x + 3;
    let rightEyeX = body.x + body.w - 4;

    if (creature.eyes === "DOT") {
        px(ctx, leftEyeX, eyeY, "#000000");
        px(ctx, rightEyeX, eyeY, "#000000");
    } else if (creature.eyes === "WIDE") {
        rect(ctx, leftEyeX - 1, eyeY, 2, 2, "#ffffff");
        rect(ctx, rightEyeX, eyeY, 2, 2, "#ffffff");
        px(ctx, leftEyeX, eyeY + 1, "#000000");
        px(ctx, rightEyeX + 1, eyeY + 1, "#000000");
    } else if (creature.eyes === "SLEEPY") {
        rect(ctx, leftEyeX - 1, eyeY, 3, 1, "#000000");
        rect(ctx, rightEyeX - 1, eyeY, 3, 1, "#000000");
    } else if (creature.eyes === "ARCANE") {
        px(ctx, leftEyeX, eyeY, "#ffffff");
        px(ctx, rightEyeX, eyeY, "#ffffff");
        px(ctx, leftEyeX, eyeY + 1, "#22d3ee");
        px(ctx, rightEyeX, eyeY + 1, "#22d3ee");
    }

    rect(ctx, 14, body.y + 9, 4, 1, outline);

    if (creature.horns === "TWIN") {
        rect(ctx, body.x + 2, body.y - 4, 2, 4, outline);
        rect(ctx, body.x + body.w - 4, body.y - 4, 2, 4, outline);
        px(ctx, body.x + 2, body.y - 5, highlight);
        px(ctx, body.x + body.w - 3, body.y - 5, highlight);
    }

    if (creature.horns === "ANTENNA") {
        rect(ctx, body.x + 2, body.y - 5, 1, 5, highlight);
        rect(ctx, body.x + body.w - 3, body.y - 5, 1, 5, highlight);
        px(ctx, body.x + 1, body.y - 6, "#ffffff");
        px(ctx, body.x + body.w - 2, body.y - 6, "#ffffff");
    }

    if (creature.horns === "CROWN") {
        px(ctx, 13, body.y - 3, highlight);
        px(ctx, 15, body.y - 5, highlight);
        px(ctx, 17, body.y - 3, highlight);
        rect(ctx, 13, body.y - 2, 5, 1, outline);
    }

    if (creature.tail === "CURL") {
        rect(ctx, body.x + body.w, body.y + body.h - 5, 4, 1, outline);
        px(ctx, body.x + body.w + 4, body.y + body.h - 6, outline);
        px(ctx, body.x + body.w + 4, body.y + body.h - 7, outline);
    }

    if (creature.tail === "SPIKE") {
        rect(ctx, body.x + body.w, body.y + body.h - 5, 5, 1, outline);
        px(ctx, body.x + body.w + 5, body.y + body.h - 5, highlight);
    }

    if (creature.tail === "COMET") {
        rect(ctx, body.x + body.w, body.y + body.h - 5, 4, 2, highlight);
        px(ctx, body.x + body.w + 5, body.y + body.h - 6, "#ffffff");
        px(ctx, body.x + body.w + 6, body.y + body.h - 4, "#ffffff");
    }

    rect(ctx, body.x + 2, body.y + body.h, 2, 3, outline);
    rect(ctx, body.x + body.w - 4, body.y + body.h, 2, 3, outline);
}

function dnaText(creature) {
    return `Creature ID: ${creature.id}
Family Line: ${creature.family}
Rarity: ${creature.rarity}
Species: ${creature.species}
Seed: ${creature.seed}

DNA:
BODY=${creature.body}
EYES=${creature.eyes}
HORNS=${creature.horns}
TAIL=${creature.tail}
PATTERN=${creature.pattern}

Engine Rule:
Same dataset = same creature.`;
}

function statsText(creature, stats) {
    return `Species: ${creature.species}
Rarity: ${creature.rarity}
Family: ${creature.family}

Total Words: ${stats.totalWords}
Unique Words: ${stats.uniqueWords}
Sentences: ${stats.sentenceCount}
Avg Sentence Length: ${stats.averageSentenceLength.toFixed(2)}
Diversity: ${stats.diversity.toFixed(2)}
Repetition: ${stats.repetition.toFixed(2)}
Brain Density: ${stats.density.toFixed(2)}`;
}

function saveCollection() {
    if (!currentCreature) return;
    const collection = JSON.parse(localStorage.getItem("microLmCollection") || "[]");
    if (!collection.find(c => c.id === currentCreature.id)) {
        collection.push({
            id: currentCreature.id,
            family: currentCreature.family,
            rarity: currentCreature.rarity,
            species: currentCreature.species,
            seed: currentCreature.seed,
            body: currentCreature.body,
            eyes: currentCreature.eyes,
            horns: currentCreature.horns,
            tail: currentCreature.tail,
            pattern: currentCreature.pattern
        });
    }
    localStorage.setItem("microLmCollection", JSON.stringify(collection));
    updateCollection();
}

function updateCollection() {
    const collection = JSON.parse(localStorage.getItem("microLmCollection") || "[]");
    const output = document.getElementById("collectionOutput");

    if (collection.length === 0) {
        output.textContent = "No saved creatures yet.";
        return;
    }

    output.textContent = collection.map((c, i) =>
        `${i + 1}. ${c.id} | ${c.rarity} | ${c.species} | ${c.family}`
    ).join("\n");
}

document.getElementById("trainBtn").addEventListener("click", () => {
    const rawText = document.getElementById("dataset").value;
    const cleaned = cleanText(rawText);

    words = cleaned.length ? cleaned.split(" ").filter(Boolean) : [];
    uniqueWords = [...new Set(words.filter(w => w !== "."))];

    oneWordBrain = buildOneWordBrain(words);
    twoWordBrain = buildTwoWordBrain(words);

    const stats = getDatasetStats(rawText);
    currentCreature = createCreature(rawText, stats);

    drawPixelCreature(currentCreature);

    document.getElementById("creatureStats").textContent = statsText(currentCreature, stats);
    document.getElementById("dnaOutput").textContent = dnaText(currentCreature);
    document.getElementById("oneBrainOutput").textContent = formatBrain(oneWordBrain) || "No one-word brain yet.";
    document.getElementById("twoBrainOutput").textContent = formatBrain(twoWordBrain) || "No two-word brain yet.";
    document.getElementById("speechOutput").textContent = "Pixel creature hatched. Save it or ask it to speak.";
});

document.getElementById("generateOneBtn").addEventListener("click", () => {
    if (uniqueWords.length === 0) {
        document.getElementById("speechOutput").textContent = "The creature has not been trained yet.";
        return;
    }
    const prompt = document.getElementById("promptInput").value || uniqueWords[0];
    document.getElementById("speechOutput").textContent = "1-word memory:\n" + generateOneWord(prompt);
});

document.getElementById("generateTwoBtn").addEventListener("click", () => {
    if (uniqueWords.length === 0) {
        document.getElementById("speechOutput").textContent = "The creature has not been trained yet.";
        return;
    }
    const prompt = document.getElementById("promptInput").value || words.filter(w => w !== ".").slice(0, 2).join(" ");
    document.getElementById("speechOutput").textContent = "2-word memory:\n" + generateTwoWord(prompt);
});

document.getElementById("saveBtn").addEventListener("click", saveCollection);

document.getElementById("clearCollectionBtn").addEventListener("click", () => {
    localStorage.removeItem("microLmCollection");
    updateCollection();
});

updateCollection();
