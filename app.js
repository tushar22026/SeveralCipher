// Telemetry Integration
function logTelemetry(cipherType, mode, textLength, timeMs) {
    // Placeholder Google Form Action URL
    const FORM_URL = "https://docs.google.com/forms/u/0/d/e/1FAIpQLSf_PLACEHOLDER/formResponse";
    
    // Using URLSearchParams to construct form payload
    const data = new URLSearchParams();
    data.append("entry.12345", cipherType);   // Cipher
    data.append("entry.12346", mode);         // Operation
    data.append("entry.12347", textLength);   // Text Length
    data.append("entry.12348", timeMs);       // Time ms
    
    fetch(FORM_URL, {
        method: "POST",
        mode: "no-cors",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: data.toString()
    }).then(() => {
        // Find current active status element
        const activeSection = document.querySelector('.cipher-section.active');
        if(activeSection) {
            const statusEl = activeSection.querySelector('.telemetry-status');
            if(statusEl) {
                statusEl.textContent = `Telemetry Sent: ${cipherType} ${mode} (${timeMs}ms)`;
                setTimeout(() => { statusEl.textContent = ''; }, 3000);
            }
        }
    }).catch(err => console.error("Telemetry error:", err));
}

// Utility
const cleanText = (text) => text.toUpperCase().replace(/[^A-Z]/g, '');

// ==========================================
// Monoalphabetic Cipher
// ==========================================
const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function monoEncrypt(text, key) {
    let res = "";
    for (let char of text) {
        let idx = alpha.indexOf(char);
        res += idx !== -1 ? key[idx] : char;
    }
    return res;
}

function monoDecrypt(text, key) {
    let res = "";
    for (let char of text) {
        let idx = key.indexOf(char);
        res += idx !== -1 ? alpha[idx] : char;
    }
    return res;
}

function updateMonoMap(key) {
    const mapContainer = document.getElementById('mono-map');
    mapContainer.innerHTML = '';
    key = (key + alpha).substring(0, 26).toUpperCase();
    for (let i = 0; i < 26; i++) {
        let cell = document.createElement('div');
        cell.className = 'mono-map-cell';
        cell.innerHTML = `<b>${alpha[i]}</b>&rarr;${key[i] || '?'}`;
        mapContainer.appendChild(cell);
    }
}

// ==========================================
// Playfair Cipher
// ==========================================
function generatePlayfairGrid(key) {
    key = cleanText(key).replace(/J/g, 'I');
    let grid = [];
    let used = new Set();
    
    for (let char of key) {
        if (!used.has(char)) {
            used.add(char);
            grid.push(char);
        }
    }
    for (let char of alpha) {
        if (char === 'J') continue;
        if (!used.has(char)) {
            used.add(char);
            grid.push(char);
        }
    }
    return grid;
}

function updatePlayfairGridUI(grid) {
    const gridUI = document.getElementById('playfair-grid-ui');
    gridUI.innerHTML = '';
    for (let i = 0; i < 25; i++) {
        let cell = document.createElement('div');
        cell.className = 'playfair-cell';
        cell.textContent = grid[i] || '';
        gridUI.appendChild(cell);
    }
}

function formatPlayfairPairs(text) {
    text = cleanText(text).replace(/J/g, 'I');
    let pairs = [];
    for (let i = 0; i < text.length; i += 2) {
        let p1 = text[i];
        let p2 = text[i+1];
        if (!p2) {
            p2 = 'X';
        } else if (p1 === p2) {
            p2 = 'X';
            i--; // push back 1
        }
        pairs.push([p1, p2]);
    }
    return pairs;
}

function playfairProcess(text, key, decrypt = false) {
    const grid = generatePlayfairGrid(key);
    let pairs = formatPlayfairPairs(text);
    if(decrypt) {
        // Usually, decryption doesn't re-pair with 'X', just takes exactly pairs. 
        text = cleanText(text);
        pairs = [];
        for(let i=0; i<text.length; i+=2) {
            pairs.push([text[i], text[i+1] || 'X']);
        }
    }

    let result = "";
    const shift = decrypt ? 4 : 1; // +4 is equivalent to -1 mod 5
    
    for (let [p1, p2] of pairs) {
        let idx1 = grid.indexOf(p1);
        let idx2 = grid.indexOf(p2);
        
        let r1 = Math.floor(idx1 / 5), c1 = idx1 % 5;
        let r2 = Math.floor(idx2 / 5), c2 = idx2 % 5;
        
        if (r1 === r2) {
            result += grid[r1 * 5 + (c1 + shift) % 5];
            result += grid[r2 * 5 + (c2 + shift) % 5];
        } else if (c1 === c2) {
            result += grid[((r1 + shift) % 5) * 5 + c1];
            result += grid[((r2 + shift) % 5) * 5 + c2];
        } else {
            result += grid[r1 * 5 + c2];
            result += grid[r2 * 5 + c1];
        }
    }
    return result;
}

// ==========================================
// Hill Cipher
// ==========================================
function modInverse(a, m) {
    a = (a % m + m) % m;
    for (let x = 1; x < m; x++) {
        if ((a * x) % m === 1) return x;
    }
    return -1;
}

function getMatrixInverse(k) {
    let det = k[0]*k[3] - k[1]*k[2];
    det = ((det % 26) + 26) % 26;
    let invDet = modInverse(det, 26);
    if (invDet === -1) return null; // Not invertible
    
    // Adj matrix
    let adj = [
        k[3], -k[1],
        -k[2], k[0]
    ];
    return adj.map(val => (((val * invDet) % 26) + 26) % 26);
}

function hillProcess(text, k, decrypt = false) {
    text = cleanText(text);
    if (text.length % 2 !== 0) text += 'X';
    
    if (decrypt) {
        k = getMatrixInverse(k);
        if (!k) return "Matrix is not invertible mod 26!";
    }
    
    let res = "";
    for (let i = 0; i < text.length; i += 2) {
        let v1 = text.charCodeAt(i) - 65;
        let v2 = text.charCodeAt(i+1) - 65;
        
        let c1 = (k[0]*v1 + k[1]*v2) % 26;
        let c2 = (k[2]*v1 + k[3]*v2) % 26;
        
        res += String.fromCharCode(c1 + 65, c2 + 65);
    }
    return res;
}

function updateHillMatrixUI() {
    let k11 = parseInt(document.getElementById('hill-k11').value) || 0;
    let k12 = parseInt(document.getElementById('hill-k12').value) || 0;
    let k21 = parseInt(document.getElementById('hill-k21').value) || 0;
    let k22 = parseInt(document.getElementById('hill-k22').value) || 0;
    
    document.getElementById('hill-matrix-display').innerHTML = `
        <div>[ ${k11} &nbsp; ${k12} ]</div>
        <div>[ ${k21} &nbsp; ${k22} ]</div>
    `;
}

// ==========================================
// Caesar Cipher
// ==========================================
function caesarProcess(text, shift, decrypt = false) {
    text = cleanText(text);
    shift = ((shift % 26) + 26) % 26;
    if (decrypt) shift = (26 - shift) % 26;
    let res = "";
    for (let char of text) {
        let code = char.charCodeAt(0) - 65;
        res += String.fromCharCode(((code + shift) % 26) + 65);
    }
    return res;
}

function updateCaesarMap(shift) {
    const mapContainer = document.getElementById('caesar-map');
    if(!mapContainer) return;
    mapContainer.innerHTML = '';
    shift = ((shift % 26) + 26) % 26;
    for (let i = 0; i < 26; i++) {
        let cell = document.createElement('div');
        cell.className = 'caesar-cell';
        let original = alpha[i];
        let shifted = alpha[(i + shift) % 26];
        cell.innerHTML = `<b>${original}</b>&rarr;${shifted}`;
        mapContainer.appendChild(cell);
    }
}

// ==========================================
// Vigenère Cipher
// ==========================================
function vigenereProcess(text, key, decrypt = false) {
    text = cleanText(text);
    key = cleanText(key);
    if (!key) key = "A";
    let res = "";
    for (let i = 0; i < text.length; i++) {
        let tCode = text.charCodeAt(i) - 65;
        let kCode = key.charCodeAt(i % key.length) - 65;
        let shift = decrypt ? (26 - kCode) : kCode;
        res += String.fromCharCode(((tCode + shift) % 26) + 65);
    }
    return res;
}

function updateVigenereAlignment(text, key) {
    const alignContainer = document.getElementById('vigenere-alignment');
    if(!alignContainer) return;
    text = cleanText(text).substring(0, 50); // limit for visualizer
    key = cleanText(key);
    if (!key) key = "A";
    
    let textHtml = "";
    let keyHtml = "";
    
    for (let i = 0; i < text.length; i++) {
        textHtml += text[i];
        keyHtml += `<span class="key-char">${key[i % key.length]}</span>`;
    }
    
    alignContainer.innerHTML = `Text: ${textHtml || '...'}<br>Key : ${keyHtml || '...'}`;
}

// ==========================================
// Web Worker Setup for Cracking
// ==========================================

const workerCode = `
// Worker Code
const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// Simple bigram fitness (dummy version for demonstration)
function getFitness(text) {
    let score = 0;
    const common = ["TH","HE","IN","ER","AN","RE","ON","AT","EN","ND","TI","ES","OR","TE","OF","ED","IS","IT","AL","AR","ST","TO","NT","NG","SE","HA","AS","OU","IO","LE","VE","CO","ME","DE","HI","RI","RO","IC","NE","EA","RA","CE","LI","CH","LL","BE","MA","SI","OM","UR"];
    for(let i=0; i<text.length-1; i++) {
        let bg = text.substring(i, i+2);
        if(common.includes(bg)) score++;
    }
    return score;
}

function modInverse(a, m) {
    a = (a % m + m) % m;
    for (let x = 1; x < m; x++) {
        if ((a * x) % m === 1) return x;
    }
    return -1;
}

function getMatrixInverse(k) {
    let det = k[0]*k[3] - k[1]*k[2];
    det = ((det % 26) + 26) % 26;
    let invDet = modInverse(det, 26);
    if (invDet === -1) return null;
    let adj = [k[3], -k[1], -k[2], k[0]];
    return adj.map(val => (((val * invDet) % 26) + 26) % 26);
}

function hillDecryptWorker(text, k) {
    k = getMatrixInverse(k);
    if (!k) return "";
    let res = "";
    for (let i = 0; i < text.length; i += 2) {
        let v1 = text.charCodeAt(i) - 65;
        let v2 = text.charCodeAt(i+1) - 65;
        let c1 = (k[0]*v1 + k[1]*v2) % 26;
        let c2 = (k[2]*v1 + k[3]*v2) % 26;
        res += String.fromCharCode(c1 + 65, c2 + 65);
    }
    return res;
}

function playfairProcessWorker(text, key, decrypt=true) {
    key = key.toUpperCase().replace(/[^A-Z]/g, '').replace(/J/g, 'I');
    let grid = [];
    let used = new Set();
    for (let char of key) {
        if (!used.has(char)) { used.add(char); grid.push(char); }
    }
    for (let char of alpha) {
        if (char === 'J') continue;
        if (!used.has(char)) { used.add(char); grid.push(char); }
    }
    
    let pairs = [];
    text = text.toUpperCase().replace(/[^A-Z]/g, '');
    for(let i=0; i<text.length; i+=2) {
        pairs.push([text[i], text[i+1] || 'X']);
    }

    let result = "";
    const shift = 4; // Decrypt
    
    for (let [p1, p2] of pairs) {
        let idx1 = grid.indexOf(p1);
        let idx2 = grid.indexOf(p2);
        let r1 = Math.floor(idx1 / 5), c1 = idx1 % 5;
        let r2 = Math.floor(idx2 / 5), c2 = idx2 % 5;
        if (r1 === r2) {
            result += grid[r1 * 5 + (c1 + shift) % 5];
            result += grid[r2 * 5 + (c2 + shift) % 5];
        } else if (c1 === c2) {
            result += grid[((r1 + shift) % 5) * 5 + c1];
            result += grid[((r2 + shift) % 5) * 5 + c2];
        } else {
            result += grid[r1 * 5 + c2];
            result += grid[r2 * 5 + c1];
        }
    }
    return result;
}

function monoDecryptWorker(text, key) {
    let res = "";
    for (let char of text) {
        let idx = key.indexOf(char);
        res += idx !== -1 ? alpha[idx] : char;
    }
    return res;
}

function caesarDecryptWorker(text, shift) {
    shift = (26 - (shift % 26)) % 26;
    let res = "";
    for (let i = 0; i < text.length; i++) {
        let code = text.charCodeAt(i) - 65;
        res += String.fromCharCode(((code + shift) % 26) + 65);
    }
    return res;
}

function vigenereDecryptWorker(text, key) {
    if(!key) key = "A";
    let res = "";
    for (let i = 0; i < text.length; i++) {
        let tCode = text.charCodeAt(i) - 65;
        let kCode = key.charCodeAt(i % key.length) - 65;
        res += String.fromCharCode(((tCode + (26 - kCode)) % 26) + 65);
    }
    return res;
}

self.onmessage = function(e) {
    const { type, text } = e.data;
    
    if (type === 'hill') {
        let top3 = [];
        for (let a=0; a<26; a++) {
            for (let b=0; b<26; b++) {
                for (let c=0; c<26; c++) {
                    for (let d=0; d<26; d++) {
                        let k = [a,b,c,d];
                        let det = a*d - b*c;
                        det = ((det % 26) + 26) % 26;
                        if(modInverse(det, 26) !== -1) {
                            let dec = hillDecryptWorker(text, k);
                            let score = getFitness(dec);
                            if(top3.length < 3 || score > top3[2].score) {
                                top3.push({key: k, text: dec, score});
                                top3.sort((x,y) => y.score - x.score);
                                if(top3.length > 3) top3.pop();
                            }
                        }
                    }
                }
            }
        }
        self.postMessage({ type: 'hill-result', top3 });
    } 
    else if (type === 'playfair') {
        const keywords = ["THE","AND","THAT","HAVE","FOR","NOT","WITH","YOU","THIS","BUT","HIS","FROM","THEY","WE","SAY","HER","SHE","OR","AN","WILL","MY","ONE","ALL","WOULD","THERE","THEIR","WHAT","SO","UP","OUT","IF","ABOUT","WHO","GET","WHICH","GO","ME","WHEN","MAKE","CAN","LIKE","TIME","NO","JUST","HIM","KNOW","TAKE","PEOPLE","INTO","YEAR"];
        let top = [];
        keywords.forEach(kw => {
            let dec = playfairProcessWorker(text, kw);
            top.push({ key: kw, text: dec, score: getFitness(dec) });
        });
        top.sort((x,y) => y.score - x.score);
        self.postMessage({ type: 'playfair-result', top3: top.slice(0,3) });
    }
    else if (type === 'mono') {
        // Hill climbing simulation
        let bestKey = alpha.split('').sort(() => 0.5 - Math.random()).join('');
        let bestScore = getFitness(monoDecryptWorker(text, bestKey));
        
        // Iterations
        for(let i=0; i<10000; i++) {
            let keyArr = bestKey.split('');
            let idx1 = Math.floor(Math.random() * 26);
            let idx2 = Math.floor(Math.random() * 26);
            let tmp = keyArr[idx1];
            keyArr[idx1] = keyArr[idx2];
            keyArr[idx2] = tmp;
            let testKey = keyArr.join('');
            
            let dec = monoDecryptWorker(text, testKey);
            let score = getFitness(dec);
            if(score > bestScore) {
                bestScore = score;
                bestKey = testKey;
                if(i % 500 === 0) {
                    self.postMessage({ type: 'mono-progress', text: dec, key: bestKey });
                }
            }
        }
        self.postMessage({ type: 'mono-result', text: monoDecryptWorker(text, bestKey), key: bestKey });
    }
    else if (type === 'caesar') {
        let top = [];
        for (let shift = 1; shift < 26; shift++) {
            let dec = caesarDecryptWorker(text, shift);
            top.push({ shift: shift, text: dec, score: getFitness(dec) });
        }
        top.sort((x,y) => y.score - x.score);
        self.postMessage({ type: 'caesar-result', top3: top.slice(0, 3) });
    }
    else if (type === 'vigenere') {
        const keywords = ["THE","AND","THAT","HAVE","FOR","NOT","WITH","YOU","THIS","BUT","HIS","FROM","THEY","WE","SAY","HER","SHE","OR","AN","WILL","MY","ONE","ALL","WOULD","THERE","THEIR","WHAT","SO","UP","OUT","IF","ABOUT","WHO","GET","WHICH","GO","ME","WHEN","MAKE","CAN","LIKE","TIME","NO","JUST","HIM","KNOW","TAKE","PEOPLE","INTO","YEAR","SECRET","KEY","PASSWORD","CIPHER","CRYPT"];
        let top = [];
        keywords.forEach(kw => {
            let dec = vigenereDecryptWorker(text, kw);
            top.push({ key: kw, text: dec, score: getFitness(dec) });
        });
        top.sort((x,y) => y.score - x.score);
        self.postMessage({ type: 'vigenere-result', top3: top.slice(0,3) });
    }
};
`;

const blob = new Blob([workerCode], { type: 'application/javascript' });
const worker = new Worker(URL.createObjectURL(blob));

worker.onmessage = function(e) {
    const data = e.data;
    if (data.type === 'hill-result') {
        const ul = document.getElementById('hill-top-results');
        ul.innerHTML = '';
        data.top3.forEach(res => {
            let li = document.createElement('li');
            li.textContent = `Key: [${res.key}] -> ${res.text.substring(0,50)}... (Score: ${res.score})`;
            ul.appendChild(li);
        });
        document.getElementById('hill-crack').classList.remove('running');
    }
    else if (data.type === 'playfair-result') {
        const ul = document.getElementById('playfair-top-results');
        ul.innerHTML = '';
        data.top3.forEach(res => {
            let li = document.createElement('li');
            li.textContent = `Keyword: ${res.key} -> ${res.text.substring(0,50)}...`;
            ul.appendChild(li);
        });
        document.getElementById('playfair-crack').classList.remove('running');
    }
    else if (data.type === 'mono-progress' || data.type === 'mono-result') {
        document.getElementById('mono-live-text').textContent = data.text;
        if(data.type === 'mono-result') {
            document.getElementById('mono-crack').classList.remove('running');
            document.getElementById('mono-key').value = data.key;
            updateMonoMap(data.key);
        }
    }
    else if (data.type === 'caesar-result') {
        const ul = document.getElementById('caesar-top-results');
        ul.innerHTML = '';
        data.top3.forEach(res => {
            let li = document.createElement('li');
            li.textContent = `Shift: ${res.shift} -> ${res.text.substring(0,50)}... (Score: ${res.score})`;
            ul.appendChild(li);
        });
        document.getElementById('caesar-crack').classList.remove('running');
    }
    else if (data.type === 'vigenere-result') {
        const ul = document.getElementById('vigenere-top-results');
        ul.innerHTML = '';
        data.top3.forEach(res => {
            let li = document.createElement('li');
            li.textContent = `Keyword: ${res.key} -> ${res.text.substring(0,50)}...`;
            ul.appendChild(li);
        });
        document.getElementById('vigenere-crack').classList.remove('running');
    }
};

// ==========================================
// Event Listeners & UI Binding
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    
    // Navigation
    const navLinks = document.querySelectorAll('.nav-links li');
    const sections = document.querySelectorAll('.cipher-section');
    
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navLinks.forEach(l => l.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));
            link.classList.add('active');
            document.getElementById(link.dataset.cipher).classList.add('active');
        });
    });

    // Monoalphabetic
    document.getElementById('mono-key').addEventListener('input', (e) => {
        updateMonoMap(e.target.value.toUpperCase());
    });
    updateMonoMap("ABCDEFGHIJKLMNOPQRSTUVWXYZ");

    document.getElementById('mono-encrypt').addEventListener('click', () => {
        const t0 = performance.now();
        const text = cleanText(document.getElementById('mono-input').value);
        const key = document.getElementById('mono-key').value.toUpperCase().padEnd(26, 'A').substring(0, 26);
        const res = monoEncrypt(text, key);
        document.getElementById('mono-output').value = res;
        logTelemetry('Monoalphabetic', 'Encrypt', text.length, Math.round(performance.now() - t0));
    });

    document.getElementById('mono-decrypt').addEventListener('click', () => {
        const t0 = performance.now();
        const text = cleanText(document.getElementById('mono-input').value);
        const key = document.getElementById('mono-key').value.toUpperCase().padEnd(26, 'A').substring(0, 26);
        const res = monoDecrypt(text, key);
        document.getElementById('mono-output').value = res;
        logTelemetry('Monoalphabetic', 'Decrypt', text.length, Math.round(performance.now() - t0));
    });

    document.getElementById('mono-crack').addEventListener('click', () => {
        const btn = document.getElementById('mono-crack');
        if(btn.classList.contains('running')) return;
        btn.classList.add('running');
        document.getElementById('mono-crack-results').style.display = 'block';
        const text = cleanText(document.getElementById('mono-input').value);
        worker.postMessage({ type: 'mono', text });
        logTelemetry('Monoalphabetic', 'Crack', text.length, 0); // time 0 for start
    });

    // Playfair
    document.getElementById('playfair-key').addEventListener('input', (e) => {
        updatePlayfairGridUI(generatePlayfairGrid(e.target.value));
    });
    updatePlayfairGridUI(generatePlayfairGrid("SECRET"));

    document.getElementById('playfair-encrypt').addEventListener('click', () => {
        const t0 = performance.now();
        const text = document.getElementById('playfair-input').value;
        const key = document.getElementById('playfair-key').value;
        const res = playfairProcess(text, key, false);
        document.getElementById('playfair-output').value = res;
        logTelemetry('Playfair', 'Encrypt', cleanText(text).length, Math.round(performance.now() - t0));
    });

    document.getElementById('playfair-decrypt').addEventListener('click', () => {
        const t0 = performance.now();
        const text = document.getElementById('playfair-input').value;
        const key = document.getElementById('playfair-key').value;
        const res = playfairProcess(text, key, true);
        document.getElementById('playfair-output').value = res;
        logTelemetry('Playfair', 'Decrypt', cleanText(text).length, Math.round(performance.now() - t0));
    });

    document.getElementById('playfair-crack').addEventListener('click', () => {
        const btn = document.getElementById('playfair-crack');
        if(btn.classList.contains('running')) return;
        btn.classList.add('running');
        document.getElementById('playfair-crack-results').style.display = 'block';
        const text = document.getElementById('playfair-input').value;
        worker.postMessage({ type: 'playfair', text });
        logTelemetry('Playfair', 'Crack', text.length, 0);
    });

    // Hill
    const hillInputs = ['hill-k11', 'hill-k12', 'hill-k21', 'hill-k22'];
    hillInputs.forEach(id => {
        document.getElementById(id).addEventListener('input', updateHillMatrixUI);
    });

    document.getElementById('hill-encrypt').addEventListener('click', () => {
        const t0 = performance.now();
        const text = document.getElementById('hill-input').value;
        let k = hillInputs.map(id => parseInt(document.getElementById(id).value) || 0);
        const res = hillProcess(text, k, false);
        document.getElementById('hill-output').value = res;
        logTelemetry('Hill', 'Encrypt', cleanText(text).length, Math.round(performance.now() - t0));
    });

    document.getElementById('hill-decrypt').addEventListener('click', () => {
        const t0 = performance.now();
        const text = document.getElementById('hill-input').value;
        let k = hillInputs.map(id => parseInt(document.getElementById(id).value) || 0);
        const res = hillProcess(text, k, true);
        document.getElementById('hill-output').value = res;
        logTelemetry('Hill', 'Decrypt', cleanText(text).length, Math.round(performance.now() - t0));
    });

    document.getElementById('hill-crack').addEventListener('click', () => {
        const btn = document.getElementById('hill-crack');
        if(btn.classList.contains('running')) return;
        btn.classList.add('running');
        document.getElementById('hill-crack-results').style.display = 'block';
        const text = cleanText(document.getElementById('hill-input').value);
        worker.postMessage({ type: 'hill', text });
        logTelemetry('Hill', 'Crack', text.length, 0);
    });

    // Caesar
    document.getElementById('caesar-key').addEventListener('input', (e) => {
        updateCaesarMap(parseInt(e.target.value) || 0);
    });
    updateCaesarMap(3);

    document.getElementById('caesar-encrypt').addEventListener('click', () => {
        const t0 = performance.now();
        const text = document.getElementById('caesar-input').value;
        const shift = parseInt(document.getElementById('caesar-key').value) || 0;
        const res = caesarProcess(text, shift, false);
        document.getElementById('caesar-output').value = res;
        logTelemetry('Caesar', 'Encrypt', cleanText(text).length, Math.round(performance.now() - t0));
    });

    document.getElementById('caesar-decrypt').addEventListener('click', () => {
        const t0 = performance.now();
        const text = document.getElementById('caesar-input').value;
        const shift = parseInt(document.getElementById('caesar-key').value) || 0;
        const res = caesarProcess(text, shift, true);
        document.getElementById('caesar-output').value = res;
        logTelemetry('Caesar', 'Decrypt', cleanText(text).length, Math.round(performance.now() - t0));
    });

    document.getElementById('caesar-crack').addEventListener('click', () => {
        const btn = document.getElementById('caesar-crack');
        if(btn.classList.contains('running')) return;
        btn.classList.add('running');
        document.getElementById('caesar-crack-results').style.display = 'block';
        const text = cleanText(document.getElementById('caesar-input').value);
        worker.postMessage({ type: 'caesar', text });
        logTelemetry('Caesar', 'Crack', text.length, 0);
    });

    // Vigenere
    const updateVigVisualizer = () => {
        const text = document.getElementById('vigenere-input').value;
        const key = document.getElementById('vigenere-key').value;
        updateVigenereAlignment(text, key);
    };
    document.getElementById('vigenere-input').addEventListener('input', updateVigVisualizer);
    document.getElementById('vigenere-key').addEventListener('input', updateVigVisualizer);
    updateVigenereAlignment("", "KEYWORD");

    document.getElementById('vigenere-encrypt').addEventListener('click', () => {
        const t0 = performance.now();
        const text = document.getElementById('vigenere-input').value;
        const key = document.getElementById('vigenere-key').value;
        const res = vigenereProcess(text, key, false);
        document.getElementById('vigenere-output').value = res;
        logTelemetry('Vigenere', 'Encrypt', cleanText(text).length, Math.round(performance.now() - t0));
    });

    document.getElementById('vigenere-decrypt').addEventListener('click', () => {
        const t0 = performance.now();
        const text = document.getElementById('vigenere-input').value;
        const key = document.getElementById('vigenere-key').value;
        const res = vigenereProcess(text, key, true);
        document.getElementById('vigenere-output').value = res;
        logTelemetry('Vigenere', 'Decrypt', cleanText(text).length, Math.round(performance.now() - t0));
    });

    document.getElementById('vigenere-crack').addEventListener('click', () => {
        const btn = document.getElementById('vigenere-crack');
        if(btn.classList.contains('running')) return;
        btn.classList.add('running');
        document.getElementById('vigenere-crack-results').style.display = 'block';
        const text = cleanText(document.getElementById('vigenere-input').value);
        worker.postMessage({ type: 'vigenere', text });
        logTelemetry('Vigenere', 'Crack', text.length, 0);
    });
});
