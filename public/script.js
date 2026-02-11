const fileInput = document.getElementById('file-input');
const uploadBox = document.getElementById('upload-box');
const imagePreview = document.getElementById('image-preview');
const analyzeBtn = document.getElementById('analyze-btn');
const loading = document.getElementById('loading');
const loadingText = document.getElementById('loading-text');
const resultsSection = document.getElementById('results-section');
const resultsContainer = document.getElementById('results-container');
const saveSessionBtn = document.getElementById('save-session-btn');
const historyContainer = document.getElementById('history-container');
const historyEmpty = document.getElementById('history-empty');
const refreshHistoryBtn = document.getElementById('refresh-history-btn');
const tabBtns = document.querySelectorAll('.tab-btn');

let currentImagePath = null;
let currentItems = [];
let currentResults = [];
let itemSelectionSection = null;

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const tabName = btn.dataset.tab;
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');
        if (tabName === 'history') loadHistory();
    });
});

uploadBox.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            imagePreview.classList.remove('hidden');
            uploadBox.querySelector('.upload-prompt').style.display = 'none';
            analyzeBtn.disabled = false;
        };
        reader.readAsDataURL(file);
    }
});

analyzeBtn.addEventListener('click', async () => {
    const file = fileInput.files[0];
    if (!file) return;

    loading.classList.remove('hidden');
    resultsSection.classList.add('hidden');
    if (itemSelectionSection) {
        itemSelectionSection.remove();
        itemSelectionSection = null;
    }
    loadingText.textContent = 'Analyzing image with AI...';

    try {
        const formData = new FormData();
        formData.append('image', file);

        const analyzeResponse = await fetch('/api/analyze', {
            method: 'POST',
            body: formData
        });

        if (!analyzeResponse.ok) throw new Error('Failed to analyze image');

        const analyzeData = await analyzeResponse.json();
        currentImagePath = analyzeData.imagePath;
        currentItems = analyzeData.items;

        console.log('✅ Detected items:', currentItems);

        loading.classList.add('hidden');
        showItemSelection(currentItems);

    } catch (error) {
        console.error('❌ Error:', error);
        loading.classList.add('hidden');
        alert('Error: ' + error.message);
    }
});

function showItemSelection(items) {
    itemSelectionSection = document.createElement('div');
    itemSelectionSection.className = 'item-selection-section';
    itemSelectionSection.innerHTML = `
        <div class="selection-header">
            <h2>✅ Detected ${items.length} Items</h2>
            <p class="selection-subtitle">Select which items to search (default: top 5)</p>
        </div>
        <div class="selection-controls">
            <button class="btn-small" id="select-all-btn">Select All</button>
            <button class="btn-small" id="clear-all-btn">Clear All</button>
            <button class="btn-small" id="top-5-btn">Top 5 Only</button>
        </div>
        <div class="items-grid">
            ${items.map((item, i) => `
                <label class="item-card ${i < 5 ? 'selected' : ''}">
                    <input type="checkbox" value="${i}" ${i < 5 ? 'checked' : ''}>
                    <div class="item-card-content">
                        <div class="item-number">#${i + 1}</div>
                        <h3 class="item-name">${capitalize(item.type)}</h3>
                        <p class="item-desc">${item.description}</p>
                    </div>
                </label>
            `).join('')}
        </div>
        <div class="selection-footer">
            <button class="btn btn-primary" id="search-btn">
                🔍 Search <span id="selected-count">${Math.min(5, items.length)}</span> Selected Items
            </button>
        </div>
    `;

    const uploadSection = document.querySelector('.upload-section');
    uploadSection.after(itemSelectionSection);

    // Update selected count
    const updateCount = () => {
        const count = itemSelectionSection.querySelectorAll('input:checked').length;
        document.getElementById('selected-count').textContent = count;
        itemSelectionSection.querySelectorAll('.item-card').forEach(card => {
            const checkbox = card.querySelector('input');
            card.classList.toggle('selected', checkbox.checked);
        });
    };

    itemSelectionSection.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', updateCount);
    });

    document.getElementById('select-all-btn').addEventListener('click', () => {
        itemSelectionSection.querySelectorAll('input').forEach(cb => cb.checked = true);
        updateCount();
    });

    document.getElementById('clear-all-btn').addEventListener('click', () => {
        itemSelectionSection.querySelectorAll('input').forEach(cb => cb.checked = false);
        updateCount();
    });

    document.getElementById('top-5-btn').addEventListener('click', () => {
        itemSelectionSection.querySelectorAll('input').forEach((cb, i) => {
            cb.checked = i < 5;
        });
        updateCount();
    });

    document.getElementById('search-btn').addEventListener('click', async () => {
        const selected = Array.from(itemSelectionSection.querySelectorAll('input:checked'))
            .map(cb => parseInt(cb.value));

        if (selected.length === 0) {
            alert('Please select at least one item');
            return;
        }

        const selectedItems = selected.map(i => items[i]);
        await searchProducts(selectedItems);
    });
}

async function searchProducts(items) {
    loading.classList.remove('hidden');
    loadingText.textContent = `Searching ${items.length} items...`;

    try {
        const response = await fetch('/api/find-products-regional', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items })
        });

        if (!response.ok) throw new Error('Failed to find products');

        const data = await response.json();
        currentResults = data.results;

        console.log('✅ Found products:', currentResults);

        displayResultsWithTabs(currentResults);
        loading.classList.add('hidden');
        resultsSection.classList.remove('hidden');

    } catch (error) {
        console.error('❌ Error:', error);
        loading.classList.add('hidden');
        alert('Error: ' + error.message);
    }
}

function displayResultsWithTabs(results) {
    resultsContainer.innerHTML = '';

    results.forEach(result => {
        const kuwaitCount = result.kuwaitProducts?.length || 0;
        const regionalCount = result.regionalProducts?.length || 0;

        // Skip if no products found at all
        if (kuwaitCount === 0 && regionalCount === 0) {
            console.log(`⚠️ Skipping ${result.item.type} - no products found`);
            return;
        }

        const itemDiv = document.createElement('div');
        itemDiv.className = 'item-result';

        itemDiv.innerHTML = `
            <div class="item-header">
                <h3>${capitalize(result.item.type)}</h3>
                <p class="item-description">${result.item.description}</p>
            </div>
            <div class="regional-tabs">
                <button class="regional-tab-btn active" data-region="kuwait">
                    🇰🇼 In Kuwait (${kuwaitCount})
                </button>
                <button class="regional-tab-btn" data-region="regional">
                    🌍 Nearby Countries (${regionalCount})
                </button>
            </div>
            <div class="regional-content active" data-region="kuwait">
                ${kuwaitCount > 0 ? createProductsGridHTML(result.kuwaitProducts) : 
                  '<div class="no-products">❌ No products found in Kuwait</div>'}
            </div>
            <div class="regional-content" data-region="regional">
                ${regionalCount > 0 ? createProductsGridHTML(result.regionalProducts) : 
                  '<div class="no-products">No regional alternatives found</div>'}
            </div>
        `;

        const tabs = itemDiv.querySelectorAll('.regional-tab-btn');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                itemDiv.querySelectorAll('.regional-content').forEach(c => c.classList.remove('active'));
                itemDiv.querySelector(`.regional-content[data-region="${tab.dataset.region}"]`).classList.add('active');
            });
        });

        resultsContainer.appendChild(itemDiv);
    });
}

function createProductsGridHTML(products) {
    return `<div class="products-grid">${products.map(p => `
        <div class="product-card">
            ${p.image_url ? 
                `<img src="${p.image_url}" class="product-image" onerror="this.parentElement.innerHTML='<div class=\\'no-image-placeholder\\'>No Image</div>'">` :
                '<div class="no-image-placeholder">No Image</div>'}
            <div class="product-store">${p.store}</div>
            <div class="product-title">${p.title}</div>
            <div class="product-price">${p.price || 'Price not available'}</div>
            <a href="${p.product_url}" target="_blank" class="product-link">View Product →</a>
        </div>
    `).join('')}</div>`;
}

saveSessionBtn.addEventListener('click', async () => {
    if (!currentImagePath || currentResults.length === 0) {
        alert('No session to save');
        return;
    }

    try {
        const response = await fetch('/api/save-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                imagePath: currentImagePath,
                items: currentItems,
                results: currentResults
            })
        });

        if (!response.ok) throw new Error('Failed to save session');

        const data = await response.json();
        console.log('✅ Session saved:', data.sessionId);

        const alert = document.createElement('div');
        alert.className = 'alert alert-success';
        alert.textContent = '✅ Session saved successfully!';
        resultsSection.insertBefore(alert, resultsSection.firstChild);
        setTimeout(() => alert.remove(), 3000);

    } catch (error) {
        console.error('❌ Error saving session:', error);
        alert('Error: ' + error.message);
    }
});

async function loadHistory() {
    try {
        const response = await fetch('/api/history');
        if (!response.ok) throw new Error('Failed to load history');

        const data = await response.json();
        const sessions = data.sessions;

        if (sessions.length === 0) {
            historyContainer.innerHTML = '';
            historyEmpty.classList.remove('hidden');
        } else {
            historyEmpty.classList.add('hidden');
            displayHistory(sessions);
        }
    } catch (error) {
        console.error('❌ Error loading history:', error);
    }
}

function displayHistory(sessions) {
    historyContainer.innerHTML = sessions.map(s => `
        <div class="session-card" data-id="${s.id}">
            <img src="${s.image_path}" class="session-image">
            <div class="session-info">
                <span class="session-date">${new Date(s.created_at).toLocaleDateString()}</span>
                <span> • ${s.itemCount} items</span>
            </div>
        </div>
    `).join('');

    historyContainer.querySelectorAll('.session-card').forEach(card => {
        card.addEventListener('click', () => loadSession(card.dataset.id));
    });
}

async function loadSession(sessionId) {
    try {
        const response = await fetch(`/api/history/${sessionId}`);
        if (!response.ok) throw new Error('Failed to load session');

        const data = await response.json();
        const session = data.session;

        document.querySelector('[data-tab="search"]').click();
        imagePreview.src = session.imagePath;
        imagePreview.classList.remove('hidden');
        uploadBox.querySelector('.upload-prompt').style.display = 'none';

        currentImagePath = session.imagePath;
        currentItems = session.items.map(i => ({ type: i.item_name, description: i.description }));
        currentResults = session.results;

        displayResultsWithTabs(currentResults);
        resultsSection.classList.remove('hidden');
    } catch (error) {
        console.error('❌ Error loading session:', error);
        alert('Error: ' + error.message);
    }
}

refreshHistoryBtn.addEventListener('click', loadHistory);

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase().replace('_', ' ');
}

window.addEventListener('DOMContentLoaded', loadHistory);
