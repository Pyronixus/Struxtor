const importBtn = document.getElementById('import-btn');
const folderInput = document.getElementById('folderInput');
const outputDiv = document.getElementById('structure-output');
const middler = document.getElementById('middler');
const loadingContainer = document.getElementById('loading-container');
const fileCountLabel = document.getElementById('file-count');
const historyList = document.getElementById('history-list');
const clearHistoryBtn = document.getElementById('clear-history');
const sidebarToggle = document.getElementById('sidebar-toggle');
const progressBar = document.getElementById('progress-bar');
const progressBarContainer = document.getElementById('progress-bar-container');

const ICONS = {
    clipboard: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>`,
    check: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`
};

importBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // Empêche le clic de remonter au middler (éviter double ouverture)
    folderInput.click();
});

folderInput.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    
    showLoading(true, true); // Show loading with progress bar
    
    // Use a timeout to ensure the loading UI renders before the heavy work starts
    setTimeout(async () => {
        // Define the progress callback to update the UI
        const progressCallback = (current, total) => {
            const percentage = Math.round((current / total) * 100);
            progressBar.style.width = `${percentage}%`;
            fileCountLabel.textContent = `${percentage}% (${current} / ${total} fichiers)`;
        };

        const root = await buildTree(files, progressCallback);
        generateAndDisplayTree(root, true);
        showLoading(false);
    }, 50);
});

// Basculer la barre latérale (Historique)
sidebarToggle.addEventListener('click', () => {
    document.querySelector('.sidebar').classList.toggle('collapsed');
});

// Clic sur toute la zone d'import
middler.addEventListener('click', () => {
    folderInput.click();
});

// Drag and Drop Logic
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    middler.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
    }, false);
});

middler.addEventListener('dragover', () => middler.classList.add('drag-over'));
middler.addEventListener('dragleave', () => middler.classList.remove('drag-over'));

middler.addEventListener('drop', async (e) => {
    middler.classList.remove('drag-over');
    const items = e.dataTransfer.items;
    if (!items) return;

    showLoading(true, false); // Show loading, no progress bar
    fileCountLabel.textContent = "Analyse des répertoires...";

    const fileList = [];
    const promises = [];

    for (let i = 0; i < items.length; i++) {
        const entry = items[i].webkitGetAsEntry();
        if (entry) {
            promises.push(traverseFileTree(entry));
        }
    }

    const results = await Promise.all(promises);
    results.flat().forEach(file => fileList.push(file));
    
    if (fileList.length) {
        fileCountLabel.textContent = `Construction de l'arbre pour ${fileList.length} fichiers...`;
        // Yield to UI thread to show the message before potentially heavy processing
        await new Promise(resolve => setTimeout(resolve, 0));
        const root = await buildTree(fileList); // Use unified function without progress
        generateAndDisplayTree(root, true);
    }
    showLoading(false);
});

let scannedCount = 0;

function showLoading(show, isProgressive = false) {
    loadingContainer.style.display = show ? 'flex' : 'none';
    progressBarContainer.style.display = isProgressive ? 'block' : 'none';
    if (show) {
        scannedCount = 0;
        progressBar.style.width = '0%';
        fileCountLabel.textContent = 'Initialisation...';
    }
}

function traverseFileTree(item, path = '') {
    return new Promise((resolve) => {
        if (item.isFile) {
            scannedCount++;
            if (scannedCount % 20 === 0) fileCountLabel.textContent = `${scannedCount} fichiers trouvés...`;
            resolve([{ webkitRelativePath: path + item.name }]);
        } else if (item.isDirectory) {
            const dirReader = item.createReader();
            const entries = [];
            
            const readEntries = () => {
                dirReader.readEntries(async (result) => {
                    if (!result.length) {
                        // Done reading directory
                        fileCountLabel.textContent = `${scannedCount} fichiers trouvés, construction de l'arbre...`;
                        const subPromises = entries.map(entry => traverseFileTree(entry, path + item.name + '/'));
                        const subFiles = await Promise.all(subPromises);
                        resolve(subFiles.flat());
                    } else {
                        entries.push(...result);
                        readEntries(); // Keep reading (chunks)
                    }
                });
            };
            readEntries();
        }
    });
}

function generateAndDisplayTree(root, saveToHistory = true) {
    if (saveToHistory) {
        addToHistory(root);
    }

    outputDiv.innerHTML = '';
    
    const wrapper = document.createElement('div');
    wrapper.className = 'output-wrapper';

    // Create Window Header
    const header = document.createElement('div');
    header.className = 'window-header';

    const controls = document.createElement('div');
    controls.className = 'window-controls';
    ['red', 'yellow', 'green'].forEach(color => {
        const dot = document.createElement('span');
        dot.className = `dot ${color}`;

        // Logique de fermeture (Point rouge)
        if (color === 'red') {
            dot.style.cursor = 'pointer';
            dot.title = "Fermer l'architecture";
            dot.onclick = () => wrapper.remove();
        }
        
        controls.appendChild(dot);
    });

    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-btn';
    copyBtn.innerHTML = `${ICONS.clipboard} Copier`;
    copyBtn.onclick = () => performCopy(pre.innerText, copyBtn);

    header.appendChild(controls);
    header.appendChild(copyBtn);

    const pre = document.createElement('pre');
    pre.className = 'tree-container';
    pre.innerHTML = renderTreeHTML(root); // Use HTML renderer
    
    wrapper.appendChild(header);
    wrapper.appendChild(pre);
    outputDiv.appendChild(wrapper);

    // Auto Copy feature
    performCopy(pre.innerText, copyBtn, true);
}

function performCopy(text, btnElement, isAuto = false) {
    navigator.clipboard.writeText(text).then(() => {
        btnElement.innerHTML = isAuto ? `${ICONS.check} Copié Auto !` : `${ICONS.check} Copié !`;
        setTimeout(() => btnElement.innerHTML = `${ICONS.clipboard} Copier`, 2000);
    }).catch(err => console.error('Copy failed:', err));
}

/**
 * Builds a tree structure from a flat list of files.
 * Can optionally report progress via a callback.
 * @param {File[]} files - The array of file objects from the input.
 * @param {Function|null} progressCallback - A function to call with progress updates.
 * @returns {Promise<Array>} The generated tree structure.
 */
async function buildTree(files, progressCallback = null) {
    const root = [];
    const totalFiles = files.length;

    // Core logic to add a single file path to the tree structure
    const addPathToTree = (filePath) => {
        const parts = filePath.split('/');
        let currentLevel = root;

        parts.forEach((part, index) => {
            if (!part) return; // Ignore empty parts from paths like /folder/file
            let existingPath = currentLevel.find(item => item.name === part);
            const isFile = index === parts.length - 1;
            if (!existingPath) {
                existingPath = { name: part, type: isFile ? 'file' : 'folder', children: [] };
                currentLevel.push(existingPath);
            }
            if (!isFile) {
                currentLevel = existingPath.children;
            }
        });
    };

    // Process files in chunks to keep the UI responsive
    for (let i = 0; i < totalFiles; i++) {
        addPathToTree(files[i].webkitRelativePath);
        // If a progress callback is provided, update UI periodically
        if (progressCallback && (i % 100 === 0 || i === totalFiles - 1)) {
            progressCallback(i + 1, totalFiles);
            await new Promise(resolve => setTimeout(resolve, 0)); // Yield to main thread
        }
    }

    sortTree(root);
    return root;
}

function sortTree(nodes) {
    // Sorts nodes: folders first, then files, both alphabetically.
    nodes.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
        return a.name.localeCompare(b.name);
    });
    // Recurse for children
    nodes.forEach(node => {
        if (node.children.length > 0) sortTree(node.children);
    });
}

function renderTreeHTML(nodes, prefix = '') {
    let output = '';

    nodes.forEach((node, index) => {
        const isLast = index === nodes.length - 1;
        const connector = isLast ? '└─── ' : '├─── ';
        
        output += `<span class="t-line">${prefix}${connector}</span>`;
        
        if (node.type === 'folder') {
            output += `<span class="t-folder">${node.name}/</span>\n`;
            if (node.children.length > 0) {
                output += renderTreeHTML(node.children, prefix + (isLast ? '    ' : '│   '));
            }
        } else {
            const extClass = getFileExtensionClass(node.name);
            output += `<span class="t-file ${extClass}">${node.name}</span>\n`;
        }
    });

    return output;
}

function getFileExtensionClass(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    // If filename has no extension or starts with dot (like .gitignore)
    if (filename.indexOf('.') === -1 || filename.startsWith('.')) {
        if (filename === '.gitignore' || filename === '.env') return 'ext-git';
        return ''; 
    }

    switch (ext) {
        case 'js': case 'jsx': case 'mjs': return 'ext-js';
        case 'ts': case 'tsx': return 'ext-ts';
        case 'html': case 'htm': return 'ext-html';
        case 'css': return 'ext-css';
        case 'scss': case 'sass': case 'less': return 'ext-scss';
        case 'json': return 'ext-json';
        case 'py': return 'ext-py';
        case 'java': return 'ext-java';
        case 'md': return 'ext-md';
        case 'png': case 'jpg': case 'jpeg': case 'gif': case 'svg': case 'ico': return 'ext-img';
        case 'lock': return 'ext-lock';
        default: return '';
    }
}

// --- History Management ---

function addToHistory(root) {
    let history = JSON.parse(localStorage.getItem('struxtor_history') || '[]');
    
    // Assume root folder name is the first folder's name if exists, or "Projet"
    const rootName = root.find(n => n.type === 'folder')?.name || "Projet Sans Titre";
    
    const newItem = {
        id: Date.now(),
        name: rootName,
        timestamp: new Date().toLocaleString(),
        data: root
    };

    // Keep last 10 items
    history.unshift(newItem);
    if (history.length > 10) history.pop();

    localStorage.setItem('struxtor_history', JSON.stringify(history));
    renderHistory();
}

function renderHistory() {
    const history = JSON.parse(localStorage.getItem('struxtor_history') || '[]');
    historyList.innerHTML = '';

    if (history.length === 0) {
        historyList.innerHTML = '<div class="empty-history">Aucun historique</div>';
        return;
    }

    history.forEach(item => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.innerHTML = `
            <span class="history-name">${item.name}</span>
            <span class="history-time">${item.timestamp}</span>
        `;
        div.onclick = () => generateAndDisplayTree(item.data, false);
        historyList.appendChild(div);
    });
}

clearHistoryBtn.addEventListener('click', () => {
    localStorage.removeItem('struxtor_history');
    renderHistory();
});

// Init
renderHistory();