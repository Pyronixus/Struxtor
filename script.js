const importBtn = document.getElementById("import-btn");
const folderInput = document.getElementById("folderInput");
const outputDiv = document.getElementById("structure-output");
const middler = document.getElementById("middler");
const loadingContainer = document.getElementById("loading-container");
const fileCountLabel = document.getElementById("file-count");
const historyList = document.getElementById("history-list");
const clearHistoryBtn = document.getElementById("clear-history");
const sidebarToggle = document.getElementById("sidebar-toggle");
const progressBar = document.getElementById("progress-bar");
const progressBarContainer = document.getElementById("progress-bar-container");
const filterDevCheckbox = document.getElementById("filter-dev");
const exportModal = document.getElementById("export-modal");
const exportCancel = document.getElementById("export-cancel");

let currentExportText = "";
let currentExportRoot = null;
let historyRecords = [];

const ICONS = {
  clipboard: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>`,
  check: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
};

const EXCLUDED_FOLDERS = [
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  ".nuxt",
  "vendor",
  ".cache",
  "out",
];

// --- EFFET DE SUIVI DE SOURIS ET PARALLAXE (NOUVEAU) ---
middler.addEventListener("mousemove", (e) => {
  const rect = middler.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  // Calcul pour l'effet d'inclinaison 3D
  const rotateX = ((y - rect.height / 2) / rect.height) * -10; // max 10 deg
  const rotateY = ((x - rect.width / 2) / rect.width) * 10;   // max 10 deg

  middler.style.setProperty("--mouse-x", `${x}px`);
  middler.style.setProperty("--mouse-y", `${y}px`);
  middler.style.setProperty("--rotate-x", `${rotateX}deg`);
  middler.style.setProperty("--rotate-y", `${rotateY}deg`);
});

middler.addEventListener("mouseleave", () => {
  // Réinitialisation fluide des angles
  middler.style.setProperty("--rotate-x", `0deg`);
  middler.style.setProperty("--rotate-y", `0deg`);
});

importBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  folderInput.click();
});

folderInput.addEventListener("change", async (e) => {
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
    folderInput.value = "";
  }, 50);
});

exportCancel.addEventListener("click", closeExportModal);
exportModal.addEventListener("click", (e) => {
  if (e.target === exportModal) closeExportModal();
});

sidebarToggle.addEventListener("click", (e) => {
  e.stopPropagation();
  document.querySelector(".sidebar").classList.toggle("collapsed");
});

middler.addEventListener("click", () => {
  folderInput.click();
});

// Drag and Drop
["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
  middler.addEventListener(
    eventName,
    (e) => {
      e.preventDefault();
      e.stopPropagation();
    },
    false,
  );
});

middler.addEventListener("dragover", () => middler.classList.add("drag-over"));
middler.addEventListener("dragleave", () =>
  middler.classList.remove("drag-over"),
);

middler.addEventListener("drop", async (e) => {
  middler.classList.remove("drag-over");
  const items = e.dataTransfer.items;
  if (!items) return;

  showLoading(true, false);
  fileCountLabel.textContent = "Analyse des répertoires...";

  const fileList = [];
  const promises = [];

  for (let i = 0; i < items.length; i++) {
    const entry = items[i].webkitGetAsEntry();
    if (entry) {
      promises.push(traverseFileTree(entry, ""));
    }
  }

  const results = await Promise.all(promises);
  results.flat().forEach((file) => fileList.push(file));

  if (fileList.length) {
    fileCountLabel.textContent = `Construction de l'arbre...`;
    await new Promise((resolve) => setTimeout(resolve, 0));
    const root = await buildTree(fileList);
    generateAndDisplayTree(root, true);
  }
  showLoading(false);
});

clearHistoryBtn.addEventListener("click", clearHistory);

let scannedCount = 0;

function showLoading(show, isProgressive = false) {
  loadingContainer.style.display = show ? "flex" : "none";
  progressBarContainer.style.display = isProgressive ? "block" : "none";
  if (show) {
    scannedCount = 0;
    progressBar.style.width = "0%";
    fileCountLabel.textContent = "Initialisation...";
  }
}

function traverseFileTree(item, path = "") {
  return new Promise((resolve) => {
    const currentPath = path === "" ? item.name : `${path}/${item.name}`;

    if (filterDevCheckbox.checked) {
      const pathParts = currentPath.split("/");
      if (pathParts.some((part) => EXCLUDED_FOLDERS.includes(part))) {
        resolve([]);
        return;
      }
    }

    if (item.isFile) {
      scannedCount++;
      if (scannedCount % 50 === 0)
        fileCountLabel.textContent = `${scannedCount} fichiers trouvés...`;
      resolve([{ webkitRelativePath: currentPath }]);
    } else if (item.isDirectory) {
      const dirReader = item.createReader();
      const entries = [];

      const readEntries = () => {
        dirReader.readEntries(async (result) => {
          if (!result.length) {
            const subPromises = entries.map((entry) =>
              traverseFileTree(entry, currentPath),
            );
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
    const parts = filePath.replace(/^\/+|\/+$/g, "").split("/");

    if (shouldFilter && parts.some((part) => EXCLUDED_FOLDERS.includes(part))) {
      return;
    }

    let currentLevel = root;
    parts.forEach((part, index) => {
      if (!part) return;
      let existingPath = currentLevel.find((item) => item.name === part);
      const isFile = index === parts.length - 1;
      if (!existingPath) {
        existingPath = {
          name: part,
          type: isFile ? "file" : "folder",
          children: [],
        };
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
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  sortTree(root);
  return root;
}

function sortTree(nodes) {
  nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name, "fr", {
      numeric: true,
      sensitivity: "base",
    });
  });
  nodes.forEach((node) => {
    if (node.children && node.children.length > 0) sortTree(node.children);
  });
}

function generateAndDisplayTree(root, saveToHistory = true) {
  if (root.length === 0) {
    outputDiv.innerHTML =
      '<div style="text-align:center; color: var(--text-muted); margin-top:20px;">Aucun fichier à afficher (Arbre vide ou totalement filtré).</div>';
    return;
  }

  if (saveToHistory) {
    addToHistory(root);
  }

  outputDiv.innerHTML = "";

  const wrapper = document.createElement("div");
  wrapper.className = "output-wrapper";

  const header = document.createElement("div");
  header.className = "window-header";

  const controls = document.createElement("div");
  controls.className = "window-controls";
  ["red", "yellow", "green"].forEach((color) => {
    const dot = document.createElement("span");
    dot.className = `dot ${color}`;

    if (color === "red") {
      dot.style.cursor = "pointer";
      dot.title = "Fermer l'architecture";
      dot.onclick = () => wrapper.remove();
    }

    controls.appendChild(dot);
  });

  const copyBtn = document.createElement("button");
  copyBtn.className = "copy-btn";
  copyBtn.innerHTML = `${ICONS.clipboard} Copier`;
  copyBtn.onclick = () => performCopy(pre.innerText, copyBtn);

  const exportBtn = document.createElement("button");
  exportBtn.className = "export-btn";
  exportBtn.innerHTML = "Exporter";
  exportBtn.onclick = () => performExport(pre.innerText, root);

  header.appendChild(controls);
  header.appendChild(copyBtn);
  header.appendChild(exportBtn);

  const pre = document.createElement("pre");
  pre.className = "tree-container";
  pre.innerHTML = renderTreeHTML(root);

  wrapper.appendChild(header);
  wrapper.appendChild(pre);
  outputDiv.appendChild(wrapper);

  performCopy(pre.innerText, copyBtn, true);
  wrapper.scrollIntoView({ behavior: "smooth", block: "start" });
}

function performCopy(text, btnElement, isAuto = false) {
  navigator.clipboard
    .writeText(text)
    .then(() => {
      btnElement.innerHTML = isAuto
        ? `${ICONS.check} Copié Auto !`
        : `${ICONS.check} Copié !`;
      setTimeout(
        () => (btnElement.innerHTML = `${ICONS.clipboard} Copier`),
        2000,
      );
    })
    .catch((err) => console.error("Erreur de copie:", err));
}

function performExport(text, root) {
  currentExportText = text;
  currentExportRoot = root;
  exportModal.classList.add("visible");
  exportModal.setAttribute("aria-hidden", "false");
}

function closeExportModal() {
  exportModal.classList.remove("visible");
  exportModal.setAttribute("aria-hidden", "true");
}

function chooseExportFormat(format) {
  let finalText = currentExportText;
  let filename = "structure";
  let mimeType = "text/plain;charset=utf-8";

  if (format === "json") {
    finalText = JSON.stringify({ structure: currentExportText }, null, 2);
    filename += ".json";
    mimeType = "application/json;charset=utf-8";
  } else if (format === "csv") {
    finalText = buildCsvFromTree(currentExportRoot || []);
    filename += ".csv";
    mimeType = "text/csv;charset=utf-8";
  } else {
    filename += ".txt";
  }

  const blobPayload = format === "csv" ? ["\uFEFF", finalText] : [finalText];
  const blob = new Blob(blobPayload, { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  closeExportModal();
}

function escapeCsvCell(value) {
  const text = String(value || "").replace(/"/g, '""');
  return `"${text}"`;
}

function getTreeMaxDepth(nodes, depth = 1) {
  return nodes.reduce((max, node) => {
    const nodeDepth =
      node.type === "folder" && node.children.length
        ? getTreeMaxDepth(node.children, depth + 1)
        : depth;
    return Math.max(max, nodeDepth);
  }, depth);
}

function appendTreeRows(nodes, depth, maxDepth, rows) {
  nodes.forEach((node) => {
    const row = Array(maxDepth + 1).fill("");
    row[depth - 1] = node.type === "folder" ? `${node.name}/` : node.name;
    row[maxDepth] = node.type;
    rows.push(row.map(escapeCsvCell).join(";"));

    if (node.type === "folder" && node.children.length) {
      appendTreeRows(node.children, depth + 1, maxDepth, rows);
    }
  });
}

function buildCsvFromTree(root) {
  if (!Array.isArray(root) || !root.length) {
    return (
      "Niveau 1;Type\r\n" + escapeCsvCell("Vide") + ";" + escapeCsvCell("empty")
    );
  }

  const maxDepth = getTreeMaxDepth(root);
  const headers = [];
  for (let i = 1; i <= maxDepth; i += 1) {
    headers.push(`Niveau ${i}`);
  }
  headers.push("Type");

  const rows = [headers.map(escapeCsvCell).join(";")];
  appendTreeRows(root, 1, maxDepth, rows);
  return rows.join("\r\n");
}

exportModal.querySelectorAll("[data-format]").forEach((button) => {
  button.addEventListener("click", () =>
    chooseExportFormat(button.dataset.format),
  );
});

function renderTreeHTML(nodes, prefix = "") {
  let output = "";

  nodes.forEach((node, index) => {
    const isLast = index === nodes.length - 1;
    const connector = isLast ? "└─── " : "├─── ";

    output += `<span class="t-line">${prefix}${connector}</span>`;

    if (node.type === "folder") {
      output += `<span class="t-folder">${node.name}/</span>\n`;
      if (node.children && node.children.length > 0) {
        output += renderTreeHTML(
          node.children,
          prefix + (isLast ? "    " : "│   "),
        );
      }
    } else {
      const extClass = getFileExtensionClass(node.name);
      output += `<span class="t-file ${extClass}">${node.name}</span>\n`;
    }
  });

  return output;
}

function addToHistory(root) {
  const record = {
    id: Date.now().toString(),
    root,
    timestamp: new Date().toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    itemCount: countNodes(root),
  };

  historyRecords.unshift(record);
  if (historyRecords.length > 12) historyRecords.pop();
  renderHistory();
}

function renderHistory() {
  historyList.innerHTML = "";

  if (!historyRecords.length) {
    const emptyBlock = document.createElement("div");
    emptyBlock.className = "empty-history";
    emptyBlock.innerHTML = `
            <i data-lucide="compass" class="empty-icon"></i>
            <p>Aucun historique</p>
        `;
    historyList.appendChild(emptyBlock);
    lucide.createIcons();
    return;
  }

  const fragment = document.createDocumentFragment();
  historyRecords.forEach((record) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "history-item";
    item.dataset.id = record.id;
    item.innerHTML = `
            <span class="history-name">Analyse ${record.timestamp}</span>
            <span class="history-time">${record.itemCount} éléments</span>
        `;
    item.addEventListener("click", () =>
      generateAndDisplayTree(record.root, false),
    );
    fragment.appendChild(item);
  });

  historyList.appendChild(fragment);
}

function countNodes(nodes) {
  return nodes.reduce((count, node) => {
    if (node.type === "folder" && node.children) {
      return count + 1 + countNodes(node.children);
    }
    return count + 1;
  }, 0);
}

function clearHistory() {
  const items = Array.from(historyList.querySelectorAll(".history-item"));
  if (!items.length) return;

  items.forEach((item) => item.classList.add("removing"));
  setTimeout(() => {
    historyRecords = [];
    renderHistory();
  }, 320);
}

function getFileExtensionClass(filename) {
  const ext = filename.split(".").pop().toLowerCase();
  if (filename.indexOf(".") === -1 || filename.startsWith(".")) {
    if (filename === ".gitignore" || filename === ".env") return "ext-git";
    return "";
  }

  switch (ext) {
    case "js":
    case "jsx":
    case "mjs":
      return "ext-js";
    case "ts":
    case "tsx":
      return "ext-ts";
    case "html":
    case "htm":
      return "ext-html";
    case "css":
      return "ext-css";
    case "scss":
    case "sass":
      return "ext-less";
    case "json":
      return "ext-json";
    case "py":
      return "ext-py";
    case "java":
      return "ext-java";
    case "md":
      return "ext-md";
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "svg":
    case "ico":
      return "ext-img";
    case "lock":
      return "ext-lock";
    default:
      return "";
  }
}

renderHistory();