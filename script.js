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
const filterDevCheckbox = document.getElementById('filter-dev');

const ICONS = {
    clipboard: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>`,
    check: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`
};

// Liste des dossiers de dev à exclure si le filtre est actif
const EXCLUDED_FOLDERS = ['node_modules', '.git', 'dist', 'build', '.next', '.nuxt', 'vendor', '.cache', 'out'];

importBtn.addEventListener('click', (e) => {
    e.stopPropagation(); 
    folderInput.click();
});

folderInput.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    
    showLoading(true, true);
    
    setTimeout(async () => {
        const progressCallback = (current, total) => {
            const percentage = Math.round((current / total) * 100);
            progressBar.style.width = `${percentage}%`;
            fileCountLabel.textContent = `${percentage}% (${current} / ${total} fichiers)`;
        };

        const root = await buildTree(files, progressCallback);
        generateAndDisplayTree(root, true);
        showLoading(false);
        folderInput.value = ''; 
    }, 50);
});

// Fix du repliement de la barre latérale historique
sidebarToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    document.querySelector('.sidebar').classList.toggle('collapsed');
});

middler.addEventListener('click', () => {
    folderInput.click();
});

// Drag and Drop
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

    showLoading(true, false);
    fileCountLabel.textContent = "Analyse des répertoires...";

    const fileList = [];
    const promises = [];

    for (let i = 0; i < items.length; i++) {
        const entry = items[i].webkitGetAsEntry();
        if (entry) {
            promises.push(traverseFileTree(entry, ''));
        }
    }

    const results = await Promise.all(promises);
    results.flat().forEach(file => fileList.push(file));
    
    if (fileList.length) {
        fileCountLabel.textContent = `Construction de l'arbre...`;
        await new Promise(resolve => setTimeout(resolve, 0));
        const root = await buildTree(fileList);
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
        const currentPath = path === '' ? item.name : `${path}/${item.name}`;

        // Vérification de filtre immédiat pendant le drag & drop pour optimiser les performances
        if (filterDevCheckbox.checked) {
            const pathParts = currentPath.split('/');
            if (pathParts.some(part => EXCLUDED_FOLDERS.includes(part))) {
                resolve([]);
                return;
            }
        }

        if (item.isFile) {
            scannedCount++;
            if (scannedCount % 50 === 0) fileCountLabel.textContent = `${scannedCount} fichiers trouvés...`;
            resolve([{ webkitRelativePath: currentPath }]);
        } else if (item.isDirectory) {
            const dirReader = item.createReader();
            const entries = [];
            
            const readEntries = () => {
                dirReader.readEntries(async (result) => {
                    if (!result.length) {
                        const subPromises = entries.map(entry => traverseFileTree(entry, currentPath));
                        const subFiles = await Promise.all(subPromises);
                        resolve(subFiles.flat());
                    } else {
                        entries.push(...result);
                        readEntries();
                    }
                });
            };
            readEntries();
        }
    });
}

async function buildTree(files, progressCallback = null) {
    const root = [];
    const totalFiles = files.length;
    const shouldFilter = filterDevCheckbox.checked;

    const addPathToTree = (filePath) => {
        const parts = filePath.replace(/^\/+|\/+$/g, '').split('/');
        
        // Filtrage des fichiers issus de l'input classique
        if (shouldFilter && parts.some(part => EXCLUDED_FOLDERS.includes(part))) {
            return; 
        }

        let currentLevel = root;
        parts.forEach((part, index) => {
            if (!part) return;
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

    for (let i = 0; i < totalFiles; i++) {
        addPathToTree(files[i].webkitRelativePath);
        if (progressCallback && (i % 200 === 0 || i === totalFiles - 1)) {
            progressCallback(i + 1, totalFiles);
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }

    sortTree(root);
    return root;
}

function sortTree(nodes) {
    nodes.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
        return a.name.localeCompare(b.name, 'fr', { numeric: true, sensitivity: 'base' });
    });
    nodes.forEach(node => {
        if (node.children && node.children.length > 0) sortTree(node.children);
    });
}

function generateAndDisplayTree(root, saveToHistory = true) {
    if (root.length === 0) {
        outputDiv.innerHTML = '<div style="text-align:center; color: var(--text-muted); margin-top:20px;">Aucun fichier à afficher (Arbre vide ou totalement filtré).</div>';
        return;
    }

    if (saveToHistory) {
        addToHistory(root);
    }

    outputDiv.innerHTML = '';
    
    const wrapper = document.createElement('div');
    wrapper.className = 'output-wrapper';

    const header = document.createElement('div');
    header.className = 'window-header';

    const controls = document.createElement('div');
    controls.className = 'window-controls';
    ['red', 'yellow', 'green'].forEach(color => {
        const dot = document.createElement('span');
        dot.className = `dot ${color}`;

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

    const exportBtn = document.createElement('button');
    exportBtn.className = 'export-btn';
    exportBtn.innerHTML = 'Exporter';
    exportBtn.onclick = () => performExport(pre.innerText);

    header.appendChild(controls);
    header.appendChild(copyBtn);
    header.appendChild(exportBtn);

    const pre = document.createElement('pre');
    pre.className = 'tree-container';
    pre.innerHTML = renderTreeHTML(root);
    
    wrapper.appendChild(header);
    wrapper.appendChild(pre);
    outputDiv.appendChild(wrapper);

    performCopy(pre.innerText, copyBtn, true);
    wrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function performCopy(text, btnElement, isAuto = false) {
    navigator.clipboard.writeText(text).then(() => {
        btnElement.innerHTML = isAuto ? `${ICONS.check} Copié Auto !` : `${ICONS.check} Copié !`;
        setTimeout(() => btnElement.innerHTML = `${ICONS.clipboard} Copier`, 2000);
    }).catch(err => console.error('Erreur de copie:', err));
}

function performExport(text) {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'structure.txt';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

function renderTreeHTML(nodes, prefix = '') {
    let output = '';

    nodes.forEach((node, index) => {
        const isLast = index === nodes.length - 1;
        const connector = isLast ? '└─── ' : '├─── ';
        
        output += `<span class="t-line">${prefix}${connector}</span>`;
        
        if (node.type === 'folder') {
            output += `<span class="t-folder">${node.name}/</span>\n`;
            if (node.children && node.children.length > 0) {
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

function addToHistory(root) {
    let history = JSON.parse(localStorage.getItem('struxtor_history') || '[]');
    const rootName = root.find(n => n.type === 'folder')?.name || "Projet Analysé";
    
    const newItem = {
        id: Date.now(),
        name: rootName,
        timestamp: new Date().toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'}),
        data: root
    };

    history.unshift(newItem);
    if (history.length > 10) history.pop();

    localStorage.setItem('struxtor_history', JSON.stringify(history));
    renderHistory();
}

function renderHistory() {
    const history = JSON.parse(localStorage.getItem('struxtor_history') || '[]');
    historyList.innerHTML = '';

    if (history.length === 0) {
        historyList.innerHTML = '<div class="empty-history"><i data-lucide="compass" class="empty-icon"></i><p>Aucun historique</p></div>';
        if(window.lucide) lucide.createIcons();
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

renderHistory();