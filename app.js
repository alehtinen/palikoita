// Site Configuration
const SITE_URL = 'http://localhost:8001'; // Change this to your production URL
const SITE_NAME = 'Päivää!'; // Change this to customize the site bookmark name

// Global state
let currentLang = localStorage.getItem('lang') || 'fi';
let currentTheme = localStorage.getItem('theme') || 'dark';
let currentMainTag = null; // null = show all, or specific main tag ID
let activeFilters = new Set();
let multiSelectMode = false;
let viewMode = localStorage.getItem('viewMode') || 'grid';
let sortMode = localStorage.getItem('sortMode') || 'default';
let currentRenderedItems = []; // Store items for table view clicks

// Initialize page
function initializePage() {
    applyTheme();
    applyLanguage();
    setupEventListeners();
    updateViewToggle();
    updateSortButtons();
}

// Theme Management
function applyTheme() {
    if (currentTheme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
}

function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', currentTheme);
    applyTheme();
}

// Language Management
function applyLanguage() {
    document.querySelectorAll('.lang-fi').forEach(el => {
        el.style.display = currentLang !== 'fi' ? 'none' : '';
    });
    document.querySelectorAll('.lang-en').forEach(el => {
        el.style.display = currentLang !== 'en' ? 'none' : '';
    });
    
    const langToggle = document.getElementById('langToggle');
    if (langToggle) {
        langToggle.textContent = currentLang === 'fi' ? 'EN' : 'FI';
    }
    
    updateSearchPlaceholder();
}

function toggleLanguage() {
    currentLang = currentLang === 'fi' ? 'en' : 'fi';
    localStorage.setItem('lang', currentLang);
    applyLanguage();
    
    // Re-render with new language
    if (window.contentData) {
        generateHeroCards();
        renderTagFilters();
        renderContent();
    }
}

function updateSearchPlaceholder() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.placeholder = currentLang === 'fi' ? 'Hae sisältöä...' : 'Search content...';
    }
}

// Event Listeners Setup
function setupEventListeners() {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    
    const langToggle = document.getElementById('langToggle');
    if (langToggle) {
        langToggle.addEventListener('click', toggleLanguage);
    }
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            renderContent(e.target.value);
        });
    }
    
    const multiSelectToggle = document.getElementById('multiSelectToggle');
    if (multiSelectToggle) {
        multiSelectToggle.addEventListener('click', toggleMultiSelect);
    }
    
    const viewToggle = document.getElementById('viewToggle');
    if (viewToggle) {
        viewToggle.addEventListener('click', toggleViewMode);
    }
}

// Generate hero cards with clickable area + separate PDF button
function generateHeroCards() {
    const container = document.getElementById('heroCards');
    if (!container || !window.mainTagDefinitions) return;
    
    container.innerHTML = '';
    
    const mainTags = Object.keys(window.mainTagDefinitions);
    
    const icons = {
        links: `<svg class="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path>
        </svg>`,
        tips: `<svg class="w-8 h-8 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
        </svg>`
    };
    
    mainTags.forEach(mainTagId => {
        const mainTagDef = window.mainTagDefinitions[mainTagId];
        const count = window.contentData.filter(item => 
            item.mainTag === mainTagId || (item.mainTags && item.mainTags.includes(mainTagId))
        ).length;
        
        const card = document.createElement('a');
        card.href = `category.html?category=${mainTagId}`;
        card.className = 'hero-card block';
        
        const iconHtml = mainTagDef.image 
            ? `<img src="${mainTagDef.image}" alt="${mainTagDef[currentLang]}" class="w-16 h-16 object-contain">`
            : (icons[mainTagId] || icons.links);
        
        card.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border-2 border-transparent hover:border-${mainTagDef.color}-500">
                <div class="flex items-center gap-4 mb-3">
                    <div class="w-16 h-16 bg-${mainTagDef.color}-100 dark:bg-${mainTagDef.color}-900 rounded-2xl flex items-center justify-center flex-shrink-0">
                        ${iconHtml}
                    </div>
                    <div class="min-w-0 flex-1">
                        <h3 class="text-2xl font-bold text-gray-900 dark:text-white break-words">
                            ${mainTagDef[currentLang]}
                        </h3>
                        <p class="text-gray-600 dark:text-gray-400 text-sm mt-1">
                            ${count} ${currentLang === 'fi' ? 'kohdetta' : 'items'}
                        </p>
                    </div>
                </div>
                <div class="flex gap-2">
                    <div class="flex-1 px-4 py-2 bg-${mainTagDef.color}-600 hover:bg-${mainTagDef.color}-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
                        ${currentLang === 'fi' ? 'Sisältö' : 'Contents'}
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                        </svg>
                    </div>
                    <button onclick="event.preventDefault(); event.stopPropagation(); downloadMainTagPDF('${mainTagId}')" class="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors" title="${currentLang === 'fi' ? 'Lataa PDF' : 'Download PDF'}">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `;
        
        container.appendChild(card);
    });
}

// Filter by main tag
function filterByMainTag(mainTagId) {
    currentMainTag = mainTagId;
    activeFilters.clear();
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    renderTagFilters();
    renderContent();
    
    // Scroll to browse section
    const browseSection = document.getElementById('allContent');
    if (browseSection) {
        browseSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Show all content (clear main tag filter)
function showAllContent() {
    currentMainTag = null;
    activeFilters.clear();
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    renderTagFilters();
    renderContent();
}

// Get unique tags (for current main tag or all)
function getUniqueTags() {
    if (!window.contentData) return [];
    
    const items = currentMainTag 
        ? window.contentData.filter(item => 
            item.mainTag === currentMainTag || 
            (item.mainTags && item.mainTags.includes(currentMainTag))
          )
        : window.contentData;
    
    const tags = new Set();
    items.forEach(item => {
        if (item.tags) {
            item.tags.forEach(tag => tags.add(tag));
        }
    });
    return Array.from(tags).sort();
}

// Render tag filters
function renderTagFilters() {
    const container = document.getElementById('tagFilters');
    if (!container || !window.tagDefinitions) return;
    
    const tags = getUniqueTags();
    container.innerHTML = '';
    
    if (tags.length === 0) return;
    
    // Sort tags alphabetically based on current language
    const sortedTags = tags.sort((a, b) => {
        const tagA = window.tagDefinitions[a];
        const tagB = window.tagDefinitions[b];
        if (!tagA || !tagB) return 0;
        return tagA[currentLang].localeCompare(tagB[currentLang]);
    });
    
    sortedTags.forEach(tag => {
        const tagDef = window.tagDefinitions[tag];
        if (!tagDef) return;
        
        const button = document.createElement('button');
        button.className = `tag-filter-btn px-4 py-2 rounded-full text-sm font-medium transition-all ${
            activeFilters.has(tag) 
                ? `bg-${tagDef.color}-500 text-white ring-2 ring-${tagDef.color}-500` 
                : `bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-${tagDef.color}-100 dark:hover:bg-${tagDef.color}-900`
        }`;
        button.textContent = tagDef[currentLang];
        button.onclick = () => toggleFilter(tag);
        container.appendChild(button);
    });
}

// Toggle filter
function toggleFilter(tag) {
    if (!multiSelectMode) {
        if (activeFilters.has(tag)) {
            activeFilters.clear();
        } else {
            activeFilters.clear();
            activeFilters.add(tag);
        }
    } else {
        if (activeFilters.has(tag)) {
            activeFilters.delete(tag);
        } else {
            activeFilters.add(tag);
        }
    }
    
    renderTagFilters();
    renderContent();
}

// Toggle multi-select mode
function toggleMultiSelect() {
    multiSelectMode = !multiSelectMode;
    const toggle = document.getElementById('multiSelectToggle');
    if (toggle) {
        const text = multiSelectMode 
            ? (currentLang === 'fi' ? 'Yksivalinta' : 'Single-select')
            : (currentLang === 'fi' ? 'Valitse useita' : 'Multi-select');
        toggle.textContent = text;
    }
}

// Toggle view mode
function toggleViewMode() {
    viewMode = viewMode === 'grid' ? 'list' : 'grid';
    localStorage.setItem('viewMode', viewMode);
    updateViewToggle();
    renderContent();
}

function updateViewToggle() {
    const toggle = document.getElementById('viewToggle');
    if (!toggle) return;
    
    if (viewMode === 'list') {
        toggle.innerHTML = `
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
            </svg>
            <span class="hidden sm:inline">${currentLang === 'fi' ? 'Ruudukko' : 'Grid'}</span>
        `;
    } else {
        toggle.innerHTML = `
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path>
            </svg>
            <span class="hidden sm:inline">${currentLang === 'fi' ? 'Lista' : 'List'}</span>
        `;
    }
}

// Filter items
function filterItems(items, searchTerm = '') {
    let filtered = items;
    
    // Filter by current main tag
    if (currentMainTag) {
        filtered = filtered.filter(item => 
            item.mainTag === currentMainTag || 
            (item.mainTags && item.mainTags.includes(currentMainTag))
        );
    }
    
    // Filter by active tag filters
    if (activeFilters.size > 0) {
        filtered = filtered.filter(item => {
            return Array.from(activeFilters).some(filter => item.tags.includes(filter));
        });
    }
    
    // Filter by search term
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(item => {
            return item.title.fi.toLowerCase().includes(term) ||
                   item.title.en.toLowerCase().includes(term) ||
                   item.description.fi.toLowerCase().includes(term) ||
                   item.description.en.toLowerCase().includes(term);
        });
    }
    
    return filtered;
}

// Sort items
function sortItems(items) {
    const sorted = [...items];
    
    switch (sortMode) {
        case 'added':
            sorted.sort((a, b) => {
                const dateA = a.added ? new Date(a.added.split('.').reverse().join('-')) : new Date(0);
                const dateB = b.added ? new Date(b.added.split('.').reverse().join('-')) : new Date(0);
                return dateB - dateA;
            });
            break;
        case 'updated':
            sorted.sort((a, b) => {
                const dateA = a.updated ? new Date(a.updated.split('.').reverse().join('-')) : (a.added ? new Date(a.added.split('.').reverse().join('-')) : new Date(0));
                const dateB = b.updated ? new Date(b.updated.split('.').reverse().join('-')) : (b.added ? new Date(b.added.split('.').reverse().join('-')) : new Date(0));
                return dateB - dateA;
            });
            break;
        case 'alphabetical':
            sorted.sort((a, b) => a.title[currentLang].localeCompare(b.title[currentLang]));
            break;
        case 'tags':
            sorted.sort((a, b) => {
                const aFirstTag = a.tags[0] || '';
                const bFirstTag = b.tags[0] || '';
                return aFirstTag.localeCompare(bFirstTag);
            });
            break;
        default:
            // Keep default order
            break;
    }
    
    return sorted;
}

// Render content
function renderContent(searchTerm = '') {
    if (!window.contentData) return;
    
    const items = window.contentData;
    const filteredItems = filterItems(items, searchTerm);
    const sortedItems = sortItems(filteredItems);
    
    // Update result count
    updateResultCount(sortedItems.length);
    
    // Render items
    const container = document.getElementById('allContent');
    if (!container) return;
    
    if (sortedItems.length === 0) {
        currentRenderedItems = [];
        container.className = '';
        container.innerHTML = `
            <div class="col-span-full text-center py-16">
                <svg class="w-20 h-20 mx-auto text-gray-400 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
                <p class="text-gray-600 dark:text-gray-400 text-lg">${currentLang === 'fi' ? 'Ei tuloksia' : 'No results'}</p>
            </div>
        `;
        return;
    }
    
    // Group items by first tag (only in default mode)
    const groupedItems = new Map();
    const shouldGroup = sortMode === 'default';
    
    if (shouldGroup) {
        sortedItems.forEach(item => {
            const firstTag = item.tags[0] || 'no-tag';
            if (!groupedItems.has(firstTag)) {
                groupedItems.set(firstTag, []);
            }
            groupedItems.get(firstTag).push(item);
        });
        
        // Sort subcategories alphabetically by tag label
        const sortedGroupedItems = new Map(
            Array.from(groupedItems.entries()).sort((a, b) => {
                const tagDefA = window.tagDefinitions[a[0]];
                const tagDefB = window.tagDefinitions[b[0]];
                const labelA = tagDefA ? tagDefA[currentLang] : a[0];
                const labelB = tagDefB ? tagDefB[currentLang] : b[0];
                return labelA.localeCompare(labelB);
            })
        );
        groupedItems.clear();
        sortedGroupedItems.forEach((value, key) => groupedItems.set(key, value));
    } else {
        // When not in default mode, create one group with all items
        groupedItems.set('all', sortedItems);
    }
    
    // Store items in display order for modal clicks
    currentRenderedItems = [];
    groupedItems.forEach(items => {
        currentRenderedItems.push(...items);
    });
    
    // Table view
    if (viewMode === 'list') {
        container.className = 'space-y-8';
        
        let html = '';
        let globalIndex = 0;
        
        groupedItems.forEach((items, firstTag) => {
            const tagDef = window.tagDefinitions[firstTag];
            const tagLabel = tagDef ? tagDef[currentLang] : firstTag;
            const tagColor = tagDef ? tagDef.color : 'gray';
            
            html += `
                <div>
                    ${shouldGroup ? `<h3 class="text-lg font-semibold text-${tagColor}-700 dark:text-${tagColor}-400 mb-4 pb-2 border-b-2 border-${tagColor}-200 dark:border-${tagColor}-800">
                        ${tagLabel}
                    </h3>` : ''}
                    <div class="overflow-x-auto">
                        <div class="inline-block min-w-full align-middle">
                            <div class="overflow-hidden">
                                <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead class="bg-gray-50 dark:bg-gray-900">
                                <tr class="sm:table-row h-2 sm:h-auto">
                                    <th class="px-6 py-0 sm:py-3 text-left text-xs font-medium text-transparent sm:text-gray-500 dark:sm:text-gray-400 uppercase tracking-wider">
                                        ${currentLang === 'fi' ? 'Otsikko' : 'Title'}
                                    </th>
                                    <th class="hidden md:table-cell px-6 py-0 sm:py-3 text-left text-xs font-medium text-transparent sm:text-gray-500 dark:sm:text-gray-400 uppercase tracking-wider">
                                        ${currentLang === 'fi' ? 'Kuvaus' : 'Description'}
                                    </th>
                                    <th class="hidden xl:table-cell px-6 py-0 sm:py-3 text-left text-xs font-medium text-transparent sm:text-gray-500 dark:sm:text-gray-400 uppercase tracking-wider">
                                        ${currentLang === 'fi' ? 'Tagit' : 'Tags'}
                                    </th>
                                    <th class="hidden lg:table-cell px-6 py-0 sm:py-3 text-center text-xs font-medium text-transparent sm:text-gray-500 dark:sm:text-gray-400 uppercase tracking-wider w-32">
                                        ${currentLang === 'fi' ? 'Päivämäärä' : 'Date'}
                                    </th>
                                    <th class="px-6 py-0 sm:py-3 text-center text-xs font-medium text-transparent sm:text-gray-500 dark:sm:text-gray-400 uppercase tracking-wider w-16"></th>
                                </tr>
                            </thead>
                            <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                ${items.map(item => {
                                    const index = globalIndex++;
                                    const mainTagDef = window.mainTagDefinitions[item.mainTag];
                                    const mainTagColor = mainTagDef ? mainTagDef.color : 'blue';
                                    const isLink = item.type === 'link' && item.url;
                                    
                                    // Get latest date
                                    let latestDate = '';
                                    if (item.lastChecked) {
                                        latestDate = item.lastChecked;
                                    } else if (item.updated) {
                                        latestDate = item.updated;
                                    } else if (item.added) {
                                        latestDate = item.added;
                                    }
                                    
                                    return `
                                        <tr class="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer" onclick='showItemModal(${index})'>
                                            <td class="px-6 py-4">
                                                <div class="text-sm font-medium text-${mainTagColor}-600 dark:text-${mainTagColor}-400 break-words">
                                                    ${item.title[currentLang]}
                                                </div>
                                            </td>
                                            <td class="hidden md:table-cell px-6 py-4">
                                                <div class="text-sm text-gray-600 dark:text-gray-400 max-w-md line-clamp-2 break-words">
                                                    ${item.description[currentLang]}
                                                </div>
                                            </td>
                                            <td class="hidden xl:table-cell px-6 py-4">
                                                <div class="flex flex-wrap gap-1">
                                                    ${item.tags.map(tag => {
                                                        const tagDef = window.tagDefinitions[tag];
                                                        return tagDef ? `<span class="px-2 py-1 text-xs rounded-full bg-${tagDef.color}-100 dark:bg-${tagDef.color}-900 text-${tagDef.color}-800 dark:text-${tagDef.color}-200">${tagDef[currentLang]}</span>` : '';
                                                    }).join('')}
                                                </div>
                                            </td>
                                            <td class="hidden lg:table-cell px-6 py-4">
                                                <div class="text-xs text-gray-600 dark:text-gray-400 text-center">
                                                    ${latestDate || ''}
                                                </div>
                                            </td>
                                            <td class="px-6 py-4 text-center">
                                                ${isLink ? `
                                                    <a href="${item.url}" target="_blank" onclick="event.stopPropagation()" class="inline-flex items-center justify-center text-${mainTagColor}-600 hover:text-${mainTagColor}-700 dark:text-${mainTagColor}-400 dark:hover:text-${mainTagColor}-300" title="${currentLang === 'fi' ? 'Avaa linkki' : 'Open link'}">
                                                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                                                        </svg>
                                                    </a>
                                                ` : ''}
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        return;
    }
    
    // Grid view
    container.className = 'space-y-8';
    
    let html = '';
    let globalIndex = 0;
    
    groupedItems.forEach((items, firstTag) => {
        const tagDef = window.tagDefinitions[firstTag];
        const tagLabel = tagDef ? tagDef[currentLang] : firstTag;
        const tagColor = tagDef ? tagDef.color : 'gray';
        
        html += `
            <div>
                ${sortMode === 'default' ? `<h3 class="text-lg font-semibold text-${tagColor}-700 dark:text-${tagColor}-400 mb-4 pb-2 border-b-2 border-${tagColor}-200 dark:border-${tagColor}-800">
                    ${tagLabel}
                </h3>` : ''}
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    ${items.map(item => {
                        const index = globalIndex++;
                        const mainTagDef = window.mainTagDefinitions[item.mainTag];
                        const mainTagColor = mainTagDef ? mainTagDef.color : 'blue';
                        const isLink = item.type === 'link' && item.url;
                        
                        return `
                            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl p-6 border border-gray-200 dark:border-gray-700 transition-shadow cursor-pointer relative" onclick='showItemModal(${index})'>
                                ${isLink ? `
                                    <a href="${item.url}" target="_blank" onclick="event.stopPropagation()" class="absolute top-4 right-4 w-8 h-8 bg-${mainTagColor}-100 dark:bg-${mainTagColor}-900 rounded-full flex items-center justify-center hover:bg-${mainTagColor}-200 dark:hover:bg-${mainTagColor}-800 transition-colors" title="${currentLang === 'fi' ? 'Avaa linkki' : 'Open link'}">
                                        <svg class="w-4 h-4 text-${mainTagColor}-600 dark:text-${mainTagColor}-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                                        </svg>
                                    </a>
                                ` : ''}
                                <div class="flex items-start gap-3">
                                    <div class="flex-shrink-0 w-10 h-10 bg-${mainTagColor}-100 dark:bg-${mainTagColor}-900 rounded-lg flex items-center justify-center">
                                        ${item.icon ? (
                                            item.icon.startsWith('http') ? 
                                            `<img src="${item.icon}" alt="icon" class="w-6 h-6 object-contain" />` : 
                                            `<span class="text-2xl">${item.icon}</span>`
                                        ) : `
                                        <svg class="w-5 h-5 text-${mainTagColor}-600 dark:text-${mainTagColor}-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            ${isLink ? `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path>` : `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>`}
                                        </svg>
                                        `}
                                    </div>
                                    <div class="flex-1 ${isLink ? 'pr-8' : ''} min-w-0">
                                        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2 break-words">
                                            ${item.title[currentLang]}
                                        </h3>
                                        <p class="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2 break-words">
                                            ${item.description[currentLang]}
                                        </p>
                                        <div class="flex flex-wrap gap-2">
                                            ${item.tags.map(tag => {
                                                const tagDef = window.tagDefinitions[tag];
                                                return tagDef ? `<span class="px-2 py-1 text-xs rounded-full bg-${tagDef.color}-100 dark:bg-${tagDef.color}-900 text-${tagDef.color}-800 dark:text-${tagDef.color}-200">${tagDef[currentLang]}</span>` : '';
                                            }).join('')}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Update result count
function updateResultCount(count) {
    const resultCount = document.getElementById('resultCount');
    if (resultCount) {
        resultCount.textContent = `${currentLang === 'fi' ? 'Näytetään' : 'Showing'} ${count} ${currentLang === 'fi' ? 'kohdetta' : 'items'}`;
    }
}

// Change sort mode
function changeSortMode(mode) {
    sortMode = mode;
    localStorage.setItem('sortMode', mode);
    updateSortButtons();
    renderContent();
}

// Update sort buttons
function updateSortButtons() {
    document.querySelectorAll('.sort-menu-item').forEach(btn => {
        const btnMode = btn.getAttribute('data-sort');
        if (btnMode === sortMode) {
            btn.classList.add('bg-gray-100', 'dark:bg-gray-700', 'font-bold');
        } else {
            btn.classList.remove('bg-gray-100', 'dark:bg-gray-700', 'font-bold');
        }
    });
}

// Toggle sort menu
function toggleSortMenu() {
    const menu = document.getElementById('sortMenu');
    if (menu) {
        menu.classList.toggle('hidden');
        
        // Close menu when clicking outside
        if (!menu.classList.contains('hidden')) {
            setTimeout(() => {
                document.addEventListener('click', function closeSortMenu(e) {
                    if (!e.target.closest('#sortToggle') && !e.target.closest('#sortMenuBtn') && !e.target.closest('#sortMenu')) {
                        menu.classList.add('hidden');
                        document.removeEventListener('click', closeSortMenu);
                    }
                });
            }, 0);
        }
    }
}

function toggleCategoryNav() {
    const menu = document.getElementById('categoryNavMenu');
    if (menu) {
        menu.classList.toggle('hidden');
    }
}

function toggleTagFilters() {
    const container = document.getElementById('tagFiltersContainer');
    if (container) {
        const isHidden = container.classList.contains('hidden');
        if (isHidden) {
            container.classList.remove('hidden');
            container.classList.add('block');
        } else {
            container.classList.add('hidden');
            container.classList.remove('block');
        }
    }
}

// Modal Functions
function showItemModal(index) {
    const item = currentRenderedItems[index];
    if (!item) return;
    
    const modal = document.getElementById('tipModal');
    document.getElementById('modalTitle').textContent = item.title[currentLang];
    document.getElementById('modalDescription').textContent = item.description[currentLang];
    
    // Show body content with markdown
    const modalBody = document.getElementById('modalBody');
    if (item.body && item.body[currentLang]) {
        const bodyHtml = window.markdownToHtml(item.body[currentLang]);
        modalBody.innerHTML = `<div class="prose dark:prose-invert max-w-none mt-4 text-gray-700 dark:text-gray-300">${bodyHtml}</div>`;
    } else {
        modalBody.innerHTML = '';
    }
    
    // Combine links based on language
    let linksToShow = [];
    if (item.links) linksToShow = [...linksToShow, ...item.links];
    if (currentLang === 'fi' && item.linksFI) linksToShow = [...linksToShow, ...item.linksFI];
    if (currentLang === 'en' && item.linksEN) linksToShow = [...linksToShow, ...item.linksEN];
    
    // Show links in table format
    const modalLinks = document.getElementById('modalLinks');
    if (linksToShow.length > 0) {
        modalLinks.innerHTML = `
            <div class="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    ${currentLang === 'fi' ? 'Lisätietoa:' : 'More info:'}
                </h4>
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead class="bg-gray-50 dark:bg-gray-900">
                            <tr>
                                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                    ${currentLang === 'fi' ? 'Nimi' : 'Name'}
                                </th>
                                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                    ${currentLang === 'fi' ? 'Kuvaus' : 'Description'}
                                </th>
                                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                    ${currentLang === 'fi' ? 'Linkki' : 'Link'}
                                </th>
                            </tr>
                        </thead>
                        <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            ${linksToShow.map(link => `
                                <tr>
                                    <td class="px-4 py-2 text-sm text-gray-900 dark:text-white">${link.name}</td>
                                    <td class="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">${link.description}</td>
                                    <td class="px-4 py-2 text-sm">
                                        <a href="${link.url}" target="_blank" class="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                                            </svg>
                                            ${currentLang === 'fi' ? 'Avaa' : 'Open'}
                                        </a>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } else if (item.url) {
        // Legacy URL field support
        modalLinks.innerHTML = `
            <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <a href="${item.url}" target="_blank" class="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline text-sm break-all">
                    <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                    </svg>
                    ${item.url}
                </a>
            </div>
        `;
    } else {
        modalLinks.innerHTML = '';
    }
    
    // Show PDF download button if enabled for this item
    const modalPdfButton = document.getElementById('modalPdfButton');
    if (item.downloadablePDF) {
        modalPdfButton.innerHTML = `
            <button onclick="downloadItemPDF(${index})" class="inline-flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                PDF
            </button>
        `;
    } else {
        modalPdfButton.innerHTML = '';
    }
    
    // Show tags below links
    const modalTags = document.getElementById('modalTags');
    modalTags.innerHTML = item.tags.map(tag => {
        const tagDef = window.tagDefinitions[tag];
        return tagDef ? `<span onclick="filterByTagFromModal('${tag}')" class="px-3 py-1 text-sm rounded-full bg-${tagDef.color}-100 dark:bg-${tagDef.color}-900 text-${tagDef.color}-800 dark:text-${tagDef.color}-200 cursor-pointer hover:bg-${tagDef.color}-200 dark:hover:bg-${tagDef.color}-800 transition-colors">${tagDef[currentLang]}</span>` : '';
    }).join('');
    
    // Show dates
    const modalDate = document.getElementById('modalDate');
    let dateText = '';
    if (item.lastChecked) {
        dateText = `${currentLang === 'fi' ? 'Tarkistettu' : 'Last Checked'}: ${item.lastChecked}`;
    } else if (item.added) {
        dateText = `${currentLang === 'fi' ? 'Lisätty' : 'Added'}: ${item.added}`;
    }
    if (item.updated) {
        dateText += (dateText ? ' | ' : '') + `${currentLang === 'fi' ? 'Päivitetty' : 'Updated'}: ${item.updated}`;
    }
    modalDate.textContent = dateText;
    
    modal.classList.remove('hidden');
}

// Keep old function name for backward compatibility
function showTipModal(item) {
    // Find item index
    const index = currentRenderedItems.findIndex(i => i.id === item.id);
    if (index >= 0) {
        showItemModal(index);
    }
}

function closeTipModal() {
    document.getElementById('tipModal').classList.add('hidden');
}

// Show all links modal
function showAllLinksModal(filterCategory = null) {
    if (!window.contentData) return;
    
    const modal = document.getElementById('allLinksModal');
    const content = document.getElementById('allLinksContent');
    const filterContainer = document.getElementById('allLinksFilter');
    
    // Build category filter checkboxes if not showing single category
    if (!filterCategory && filterContainer) {
        filterContainer.innerHTML = '';
        Object.keys(window.mainTagDefinitions).forEach(mainTagId => {
            const mainTagDef = window.mainTagDefinitions[mainTagId];
            const label = document.createElement('label');
            label.className = 'flex items-center gap-2 cursor-pointer text-sm';
            label.innerHTML = `
                <input type="checkbox" value="${mainTagId}" checked class="w-4 h-4 text-blue-600 rounded" onchange="renderAllLinks()">
                <span class="text-gray-900 dark:text-white">${mainTagDef[currentLang]}</span>
            `;
            filterContainer.appendChild(label);
        });
    }
    
    // Hide/show filter section based on whether we're filtering by category
    const filterSection = filterContainer?.closest('.mb-4');
    if (filterSection) {
        if (filterCategory) {
            filterSection.classList.add('hidden');
        } else {
            filterSection.classList.remove('hidden');
        }
    }
    
    // Render links
    renderAllLinks(filterCategory);
    
    modal.classList.remove('hidden');
}

// Render all links table based on current filter
function renderAllLinks(filterCategory = null) {
    const content = document.getElementById('allLinksContent');
    const filterContainer = document.getElementById('allLinksFilter');
    
    // Get selected categories from checkboxes
    let selectedCategories = null;
    if (!filterCategory && filterContainer) {
        const checkboxes = filterContainer.querySelectorAll('input[type="checkbox"]:checked');
        selectedCategories = Array.from(checkboxes).map(cb => cb.value);
    }
    
    // Collect all links from filtered items
    const allLinks = [];
    const seenUrls = new Set(); // Track seen URLs to avoid duplicates
    
    window.contentData.forEach(item => {
        // Filter by category if specified
        const itemMainTags = item.mainTags || [item.mainTag];
        if (filterCategory && !itemMainTags.includes(filterCategory)) return;
        if (selectedCategories && !itemMainTags.some(tag => selectedCategories.includes(tag))) return;
        
        const mainTagDef = window.mainTagDefinitions[item.mainTag];
        const categoryName = mainTagDef ? mainTagDef[currentLang] : '';
        const itemTitle = item.title[currentLang];
        
        // Primary URL
        if (item.url && !seenUrls.has(item.url)) {
            seenUrls.add(item.url);
            allLinks.push({
                category: categoryName,
                categoryId: item.mainTag,
                itemTitle: itemTitle,
                name: itemTitle,
                url: item.url,
                description: item.description[currentLang]
            });
        }
        
        // Additional links
        let additionalLinks = [];
        if (item.links) additionalLinks = [...additionalLinks, ...item.links];
        if (currentLang === 'fi' && item.linksFI) additionalLinks = [...additionalLinks, ...item.linksFI];
        if (currentLang === 'en' && item.linksEN) additionalLinks = [...additionalLinks, ...item.linksEN];
        
        additionalLinks.forEach(link => {
            if (!seenUrls.has(link.url)) {
                seenUrls.add(link.url);
                allLinks.push({
                    category: categoryName,
                    categoryId: item.mainTag,
                    itemTitle: itemTitle,
                    name: link.name || itemTitle,
                    url: link.url,
                    description: link.description || ''
                });
            }
        });
    });
    
    // Generate table
    if (allLinks.length > 0) {
        const showCategory = !filterCategory; // Hide category column if filtering by single category
        content.innerHTML = `
            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead class="bg-gray-50 dark:bg-gray-900">
                    <tr>
                        ${showCategory ? `<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            ${currentLang === 'fi' ? 'Kategoria' : 'Category'}
                        </th>` : ''}
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            ${currentLang === 'fi' ? 'Kohde' : 'Item'}
                        </th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            ${currentLang === 'fi' ? 'Nimi' : 'Name'}
                        </th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            ${currentLang === 'fi' ? 'Kuvaus' : 'Description'}
                        </th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            ${currentLang === 'fi' ? 'Linkki' : 'Link'}
                        </th>
                    </tr>
                </thead>
                <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    ${allLinks.map(link => `
                        <tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
                            ${showCategory ? `<td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">${link.category}</td>` : ''}
                            <td class="px-4 py-3 text-sm text-gray-900 dark:text-white">${link.itemTitle}</td>
                            <td class="px-4 py-3 text-sm text-gray-900 dark:text-white break-words">${link.name}</td>
                            <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 break-words">${link.description}</td>
                            <td class="px-4 py-3 text-sm">
                                <a href="${link.url}" target="_blank" class="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                                    </svg>
                                    ${currentLang === 'fi' ? 'Avaa' : 'Open'}
                                </a>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } else {
        content.innerHTML = `<p class="text-gray-600 dark:text-gray-400">${currentLang === 'fi' ? 'Ei linkkejä' : 'No links found'}</p>`;
    }
}

// Toggle all links filter visibility
function toggleAllLinksFilter() {
    const filter = document.getElementById('allLinksFilter');
    if (filter) {
        filter.classList.toggle('hidden');
    }
}

// Close all links modal
function closeAllLinksModal() {
    document.getElementById('allLinksModal').classList.add('hidden');
}

// Download All Links as PDF
function downloadAllLinksPDF() {
    if (!window.contentData) return;
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    const title = currentLang === 'fi' ? 'Kaikki Linkit' : 'All Links';
    const pageHeight = 280;
    const leftMargin = 14;
    const rightMargin = 196;
    let y = 20;
    
    // Helper function to check if we need a new page
    function checkPageBreak(requiredSpace) {
        if (y + requiredSpace > pageHeight) {
            doc.addPage();
            y = 20;
            return true;
        }
        return false;
    }
    
    // Title
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text(title, leftMargin, y);
    y += 10;
    
    // Collect all links
    const allLinks = [];
    window.contentData.forEach(item => {
        const mainTagDef = window.mainTagDefinitions[item.mainTag];
        const categoryName = mainTagDef ? mainTagDef[currentLang] : '';
        
        // Add primary URL if exists
        if (item.url) {
            allLinks.push({
                category: categoryName,
                itemTitle: item.title[currentLang],
                name: item.title[currentLang],
                description: item.description[currentLang] || '',
                url: item.url
            });
        }
        
        // Add additional links
        let additionalLinks = [];
        if (item.links) additionalLinks = [...additionalLinks, ...item.links];
        if (currentLang === 'fi' && item.linksFI) additionalLinks = [...additionalLinks, ...item.linksFI];
        if (currentLang === 'en' && item.linksEN) additionalLinks = [...additionalLinks, ...item.linksEN];
        
        additionalLinks.forEach(link => {
            allLinks.push({
                category: categoryName,
                itemTitle: item.title[currentLang],
                name: link.name || item.title[currentLang],
                description: link.description || '',
                url: link.url
            });
        });
    });
    
    // Headers
    const categoryLabel = currentLang === 'fi' ? 'Kategoria' : 'Category';
    const nameLabel = currentLang === 'fi' ? 'Nimi' : 'Name';
    const urlLabel = currentLang === 'fi' ? 'Linkki' : 'Link';
    
    // Add each link
    allLinks.forEach((link, index) => {
        checkPageBreak(20);
        
        // Category
        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        doc.text(`${categoryLabel}:`, leftMargin, y);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(8);
        const categoryLines = doc.splitTextToSize(link.category, rightMargin - leftMargin - 20);
        doc.text(categoryLines, leftMargin + 22, y);
        y += categoryLines.length * 4;
        
        // Name
        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        doc.text(`${nameLabel}:`, leftMargin, y);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(8);
        const nameLines = doc.splitTextToSize(link.name, rightMargin - leftMargin - 20);
        doc.text(nameLines, leftMargin + 22, y);
        y += nameLines.length * 4;
        
        // URL
        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        doc.text(`${urlLabel}:`, leftMargin, y);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(8);
        doc.setTextColor(0, 0, 255);
        const urlLines = doc.splitTextToSize(link.url, rightMargin - leftMargin - 20);
        doc.text(urlLines, leftMargin + 22, y);
        doc.setTextColor(0, 0, 0);
        y += urlLines.length * 4;
        
        // Description if exists
        if (link.description) {
            const descLabel = currentLang === 'fi' ? 'Kuvaus' : 'Description';
            doc.setFontSize(9);
            doc.setFont(undefined, 'bold');
            doc.text(`${descLabel}:`, leftMargin, y);
            doc.setFont(undefined, 'normal');
            doc.setFontSize(8);
            const descLines = doc.splitTextToSize(link.description, rightMargin - leftMargin - 20);
            doc.text(descLines, leftMargin + 22, y);
            y += descLines.length * 4;
        }
        
        y += 5; // spacing between entries
        
        // Divider line
        if (index < allLinks.length - 1) {
            checkPageBreak(5);
            doc.setDrawColor(200);
            doc.line(leftMargin, y, rightMargin, y);
            y += 5;
        }
    });
    
    // Save the PDF
    const fileName = currentLang === 'fi' ? 'Kaikki_linkit.pdf' : 'All_Links.pdf';
    doc.save(fileName);
}

// Close all links modal
function closeAllLinksModal() {
    document.getElementById('allLinksModal').classList.add('hidden');
}

// Download PDF for a single item
function downloadItemPDF(index) {
    const item = currentRenderedItems[index];
    if (!item || !item.downloadablePDF) return;
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    const title = item.title[currentLang];
    const mainTagDef = window.mainTagDefinitions[item.mainTag];
    const categoryName = mainTagDef ? mainTagDef[currentLang] : '';
    
    let y = 20;
    const pageHeight = 280;
    const leftMargin = 20;
    const rightMargin = 190;
    
    // Title
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    const titleLines = doc.splitTextToSize(title, rightMargin - leftMargin);
    titleLines.forEach(line => {
        y = checkPageBreak(doc, y, 15, pageHeight);
        doc.text(line, leftMargin, y);
        y += 8;
    });
    y += 5;
    
    // Category
    if (categoryName) {
        doc.setFontSize(12);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(`${currentLang === 'fi' ? 'Kategoria' : 'Category'}: ${categoryName}`, leftMargin, y);
        doc.setTextColor(0, 0, 0);
        y += 10;
    }
    
    // Description
    if (item.description && item.description[currentLang]) {
        y = checkPageBreak(doc, y, 15, pageHeight);
        doc.setFontSize(12);
        doc.setFont(undefined, 'italic');
        const descLines = doc.splitTextToSize(item.description[currentLang], rightMargin - leftMargin);
        descLines.forEach(line => {
            y = checkPageBreak(doc, y, 8, pageHeight);
            doc.text(line, leftMargin, y);
            y += 6;
        });
        y += 8;
    }
    
    // Separator
    doc.setLineWidth(0.5);
    doc.setDrawColor(150, 150, 150);
    doc.line(leftMargin, y, rightMargin, y);
    y += 10;
    
    // Body content
    if (item.body && item.body[currentLang]) {
        y = checkPageBreak(doc, y, 15, pageHeight);
        doc.setFontSize(11);
        doc.setFont(undefined, 'normal');
        
        // Simple markdown processing for PDF
        const bodyText = item.body[currentLang]
            .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold markers
            .replace(/\*([^*]+)\*/g, '$1') // Remove italic markers
            .replace(/`([^`]+)`/g, '$1'); // Remove code markers
        
        const bodyLines = doc.splitTextToSize(bodyText, rightMargin - leftMargin);
        bodyLines.forEach(line => {
            y = checkPageBreak(doc, y, 8, pageHeight);
            doc.text(line, leftMargin, y);
            y += 5;
        });
        y += 10;
    }
    
    // Links
    let linksToShow = [];
    if (item.links) linksToShow = [...linksToShow, ...item.links];
    if (currentLang === 'fi' && item.linksFI) linksToShow = [...linksToShow, ...item.linksFI];
    if (currentLang === 'en' && item.linksEN) linksToShow = [...linksToShow, ...item.linksEN];
    
    if (linksToShow.length > 0 || item.url) {
        y = checkPageBreak(doc, y, 20, pageHeight);
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text(currentLang === 'fi' ? 'Linkit:' : 'Links:', leftMargin, y);
        y += 8;
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        
        // Primary URL if exists
        if (item.url) {
            y = checkPageBreak(doc, y, 12, pageHeight);
            doc.setTextColor(0, 0, 255);
            doc.textWithLink(item.url, leftMargin, y, { url: item.url });
            doc.setTextColor(0, 0, 0);
            y += 6;
        }
        
        // Additional links
        linksToShow.forEach(link => {
            y = checkPageBreak(doc, y, 15, pageHeight);
            
            // Link name
            doc.setFont(undefined, 'bold');
            doc.text(link.name, leftMargin, y);
            y += 5;
            
            // Link description
            if (link.description) {
                doc.setFont(undefined, 'normal');
                doc.setFontSize(9);
                const descLines = doc.splitTextToSize(link.description, rightMargin - leftMargin);
                descLines.forEach(line => {
                    y = checkPageBreak(doc, y, 6, pageHeight);
                    doc.text(line, leftMargin, y);
                    y += 4;
                });
                doc.setFontSize(10);
                y += 2;
            }
            
            // Link URL
            doc.setTextColor(0, 0, 255);
            doc.textWithLink(link.url, leftMargin, y, { url: link.url });
            doc.setTextColor(0, 0, 0);
            y += 8;
        });
        y += 5;
    }
    
    // Tags
    if (item.tags && item.tags.length > 0) {
        y = checkPageBreak(doc, y, 15, pageHeight);
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(100, 100, 100);
        const tagLabels = item.tags.map(tag => {
            const tagDef = window.tagDefinitions[tag];
            return tagDef ? tagDef[currentLang] : tag;
        }).join(', ');
        doc.text(`${currentLang === 'fi' ? 'Tagit' : 'Tags'}: ${tagLabels}`, leftMargin, y);
        y += 6;
    }
    
    // Dates
    if (item.added || item.updated || item.lastChecked) {
        y = checkPageBreak(doc, y, 15, pageHeight);
        doc.setFontSize(9);
        doc.setTextColor(120, 120, 120);
        
        let dateText = '';
        if (item.added) dateText += `${currentLang === 'fi' ? 'Lisätty' : 'Added'}: ${item.added}`;
        if (item.updated) dateText += (dateText ? ' | ' : '') + `${currentLang === 'fi' ? 'Päivitetty' : 'Updated'}: ${item.updated}`;
        if (item.lastChecked) dateText += (dateText ? ' | ' : '') + `${currentLang === 'fi' ? 'Tarkistettu' : 'Last Checked'}: ${item.lastChecked}`;
        
        doc.text(dateText, leftMargin, y);
        doc.setTextColor(0, 0, 0);
    }
    
    // Save the PDF
    const fileName = title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
    doc.save(`${fileName}.pdf`);
}

// Filter by tag from modal
// Download PDF for a single item
function downloadItemPDF(index) {
    const item = currentRenderedItems[index];
    if (!item || !item.downloadablePDF) return;
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    const title = item.title[currentLang];
    const mainTagDef = window.mainTagDefinitions[item.mainTag];
    const categoryName = mainTagDef ? mainTagDef[currentLang] : '';
    
    let y = 20;
    const pageHeight = 280;
    const leftMargin = 20;
    const rightMargin = 190;
    
    // Title
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    const titleLines = doc.splitTextToSize(title, rightMargin - leftMargin);
    titleLines.forEach(line => {
        y = checkPageBreak(doc, y, 15, pageHeight);
        doc.text(line, leftMargin, y);
        y += 8;
    });
    y += 5;
    
    // Category
    if (categoryName) {
        doc.setFontSize(12);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(`${currentLang === 'fi' ? 'Kategoria' : 'Category'}: ${categoryName}`, leftMargin, y);
        doc.setTextColor(0, 0, 0);
        y += 10;
    }
    
    // Description
    if (item.description && item.description[currentLang]) {
        y = checkPageBreak(doc, y, 15, pageHeight);
        doc.setFontSize(12);
        doc.setFont(undefined, 'italic');
        const descLines = doc.splitTextToSize(item.description[currentLang], rightMargin - leftMargin);
        descLines.forEach(line => {
            y = checkPageBreak(doc, y, 8, pageHeight);
            doc.text(line, leftMargin, y);
            y += 6;
        });
        y += 8;
    }
    
    // Separator
    doc.setLineWidth(0.5);
    doc.setDrawColor(150, 150, 150);
    doc.line(leftMargin, y, rightMargin, y);
    y += 10;
    
    // Body content
    if (item.body && item.body[currentLang]) {
        y = checkPageBreak(doc, y, 15, pageHeight);
        doc.setFontSize(11);
        doc.setFont(undefined, 'normal');
        
        // Simple markdown processing for PDF
        const bodyText = item.body[currentLang]
            .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold markers
            .replace(/\*([^*]+)\*/g, '$1') // Remove italic markers
            .replace(/`([^`]+)`/g, '$1'); // Remove code markers
        
        const bodyLines = doc.splitTextToSize(bodyText, rightMargin - leftMargin);
        bodyLines.forEach(line => {
            y = checkPageBreak(doc, y, 8, pageHeight);
            doc.text(line, leftMargin, y);
            y += 5;
        });
        y += 10;
    }
    
    // Links
    let linksToShow = [];
    if (item.links) linksToShow = [...linksToShow, ...item.links];
    if (currentLang === 'fi' && item.linksFI) linksToShow = [...linksToShow, ...item.linksFI];
    if (currentLang === 'en' && item.linksEN) linksToShow = [...linksToShow, ...item.linksEN];
    
    if (linksToShow.length > 0 || item.url) {
        y = checkPageBreak(doc, y, 20, pageHeight);
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text(currentLang === 'fi' ? 'Linkit:' : 'Links:', leftMargin, y);
        y += 8;
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        
        // Primary URL if exists
        if (item.url) {
            y = checkPageBreak(doc, y, 12, pageHeight);
            doc.setTextColor(0, 0, 255);
            doc.textWithLink(item.url, leftMargin, y, { url: item.url });
            doc.setTextColor(0, 0, 0);
            y += 6;
        }
        
        // Additional links
        linksToShow.forEach(link => {
            y = checkPageBreak(doc, y, 15, pageHeight);
            
            // Link name
            doc.setFont(undefined, 'bold');
            doc.text(link.name, leftMargin, y);
            y += 5;
            
            // Link description
            if (link.description) {
                doc.setFont(undefined, 'normal');
                doc.setFontSize(9);
                const descLines = doc.splitTextToSize(link.description, rightMargin - leftMargin);
                descLines.forEach(line => {
                    y = checkPageBreak(doc, y, 6, pageHeight);
                    doc.text(line, leftMargin, y);
                    y += 4;
                });
                doc.setFontSize(10);
                y += 2;
            }
            
            // Link URL
            doc.setTextColor(0, 0, 255);
            doc.textWithLink(link.url, leftMargin, y, { url: link.url });
            doc.setTextColor(0, 0, 0);
            y += 8;
        });
        y += 5;
    }
    
    // Tags
    if (item.tags && item.tags.length > 0) {
        y = checkPageBreak(doc, y, 15, pageHeight);
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(100, 100, 100);
        const tagLabels = item.tags.map(tag => {
            const tagDef = window.tagDefinitions[tag];
            return tagDef ? tagDef[currentLang] : tag;
        }).join(', ');
        doc.text(`${currentLang === 'fi' ? 'Tagit' : 'Tags'}: ${tagLabels}`, leftMargin, y);
        y += 6;
    }
    
    // Dates
    if (item.added || item.updated || item.lastChecked) {
        y = checkPageBreak(doc, y, 15, pageHeight);
        doc.setFontSize(9);
        doc.setTextColor(120, 120, 120);
        
        let dateText = '';
        if (item.added) dateText += `${currentLang === 'fi' ? 'Lisätty' : 'Added'}: ${item.added}`;
        if (item.updated) dateText += (dateText ? ' | ' : '') + `${currentLang === 'fi' ? 'Päivitetty' : 'Updated'}: ${item.updated}`;
        if (item.lastChecked) dateText += (dateText ? ' | ' : '') + `${currentLang === 'fi' ? 'Tarkistettu' : 'Last Checked'}: ${item.lastChecked}`;
        
        doc.text(dateText, leftMargin, y);
        doc.setTextColor(0, 0, 0);
    }
    
    // Save the PDF
    const fileName = title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
    doc.save(`${fileName}.pdf`);
}

function filterByTagFromModal(tag) {
    // Close the modal
    closeTipModal();
    
    // Clear category filter to show all content
    currentMainTag = null;
    
    // Regenerate navigation to highlight "All" button
    if (typeof generateCategoryNav === 'function') {
        generateCategoryNav();
    }
    
    // Show tag filters if hidden
    const container = document.getElementById('tagFiltersContainer');
    if (container && container.classList.contains('hidden')) {
        container.classList.remove('hidden');
        container.classList.add('block');
    }
    
    // Clear existing filters and add the clicked tag
    activeFilters.clear();
    activeFilters.add(tag);
    
    // Update UI
    renderTagFilters();
    renderContent();
}

// Close modal on outside click
document.addEventListener('click', (e) => {
    const modal = document.getElementById('tipModal');
    if (modal && e.target === modal) {
        closeTipModal();
    }
});

// Close sort menu when clicking outside
document.addEventListener('click', (e) => {
    const menu = document.getElementById('sortMenu');
    const btn = e.target.closest('#sortMenuBtn');
    if (menu && !menu.contains(e.target) && !btn) {
        menu.classList.add('hidden');
    }
});

// Helper function to convert HTML to plain text with basic formatting
function htmlToText(html) {
    if (!html) return '';
    let text = html;
    // Remove HTML tags but preserve line breaks
    text = text.replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/<\/p>/gi, '\n');
    text = text.replace(/<p>/gi, '');
    text = text.replace(/<\/li>/gi, '\n');
    text = text.replace(/<li>/gi, '  • ');
    text = text.replace(/<ol[^>]*>/gi, '');
    text = text.replace(/<\/ol>/gi, '\n');
    text = text.replace(/<ul[^>]*>/gi, '');
    text = text.replace(/<\/ul>/gi, '\n');
    text = text.replace(/<strong>/gi, '');
    text = text.replace(/<\/strong>/gi, '');
    text = text.replace(/<em>/gi, '');
    text = text.replace(/<\/em>/gi, '');
    text = text.replace(/<[^>]+>/g, '');
    // Clean up excessive newlines
    text = text.replace(/\n\n+/g, '\n\n');
    return text.trim();
}

// Helper function to check if we need a new page
function checkPageBreak(doc, y, neededSpace, pageHeight) {
    if (y + neededSpace > pageHeight) {
        doc.addPage();
        return 20;
    }
    return y;
}

// Helper function to add item to PDF with grouping support
function addItemToPDF(doc, item, index, y, pageHeight, leftMargin, rightMargin, showNumber = true) {
    // Item number and title
    y = checkPageBreak(doc, y, 20, pageHeight);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    const itemTitle = showNumber ? `${index + 1}. ${item.title[currentLang]}` : item.title[currentLang];
    const titleLines = doc.splitTextToSize(itemTitle, rightMargin - leftMargin);
    doc.text(titleLines, leftMargin, y);
    y += (titleLines.length * 7) + 3;
    
    // Description
    y = checkPageBreak(doc, y, 10, pageHeight);
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    const descLines = doc.splitTextToSize(item.description[currentLang], rightMargin - leftMargin);
    doc.text(descLines, leftMargin, y);
    y += (descLines.length * 5) + 5;
    
    // Body content (with markdown converted to text)
    if (item.body && item.body[currentLang]) {
        y = checkPageBreak(doc, y, 10, pageHeight);
        const bodyHtml = window.markdownToHtml(item.body[currentLang]);
        const bodyText = htmlToText(bodyHtml);
        const bodyLines = doc.splitTextToSize(bodyText, rightMargin - leftMargin);
        
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        
        // Handle long body content with page breaks
        let lineIndex = 0;
        while (lineIndex < bodyLines.length) {
            const remainingLines = bodyLines.slice(lineIndex);
            const availableLines = Math.floor((pageHeight - y) / 4.5);
            const linesToPrint = remainingLines.slice(0, availableLines);
            
            doc.text(linesToPrint, leftMargin, y);
            lineIndex += linesToPrint.length;
            
            if (lineIndex < bodyLines.length) {
                doc.addPage();
                y = 20;
            } else {
                y += (linesToPrint.length * 4.5) + 5;
            }
        }
    }
    
    // Links
    let linksToShow = [];
    if (item.links) linksToShow = [...linksToShow, ...item.links];
    if (currentLang === 'fi' && item.linksFI) linksToShow = [...linksToShow, ...item.linksFI];
    if (currentLang === 'en' && item.linksEN) linksToShow = [...linksToShow, ...item.linksEN];
    
    if (linksToShow.length > 0) {
        y = checkPageBreak(doc, y, 10, pageHeight);
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text(`${currentLang === 'fi' ? 'Linkit:' : 'Links'}`, leftMargin, y);
        y += 6;
        
        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        
        linksToShow.forEach(link => {
            y = checkPageBreak(doc, y, 12, pageHeight);
            
            // Link name
            doc.setFont(undefined, 'bold');
            doc.text(link.name, leftMargin + 5, y);
            y += 5;
            
            // Link description
            if (link.description) {
                doc.setFont(undefined, 'normal');
                const descLines = doc.splitTextToSize(link.description, rightMargin - leftMargin - 10);
                doc.text(descLines, leftMargin + 5, y);
                y += descLines.length * 4;
            }
            
            // URL
            doc.setFont(undefined, 'normal');
            doc.setTextColor(0, 0, 255);
            const urlLines = doc.splitTextToSize(link.url, rightMargin - leftMargin - 10);
            doc.text(urlLines, leftMargin + 5, y);
            doc.setTextColor(0, 0, 0);
            y += urlLines.length * 4 + 3;
        });
        
        y += 3;
    }
    
    // Dates
    y = checkPageBreak(doc, y, 7, pageHeight);
    doc.setFontSize(8);
    doc.setFont(undefined, 'italic');
    doc.setTextColor(100, 100, 100);
    let dateText = '';
    if (item.lastChecked) {
        dateText = `${currentLang === 'fi' ? 'Tarkistettu' : 'Last Checked'}: ${item.lastChecked}`;
    } else if (item.added) {
        dateText = `${currentLang === 'fi' ? 'Lisätty' : 'Added'}: ${item.added}`;
    }
    if (item.updated) {
        dateText += (dateText ? ' | ' : '') + `${currentLang === 'fi' ? 'Päivitetty' : 'Updated'}: ${item.updated}`;
    }
    if (dateText) {
        doc.text(dateText, leftMargin, y);
        y += 10;
    }
    doc.setTextColor(0, 0, 0);
    
    // Separator line
    y = checkPageBreak(doc, y, 5, pageHeight);
    doc.setDrawColor(200, 200, 200);
    doc.line(leftMargin, y, rightMargin, y);
    y += 8;
    
    return y;
}

// PDF Download for specific main tag
function downloadMainTagPDF(mainTagId) {
    if (!window.contentData) return;
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    const items = window.contentData.filter(item => item.mainTag === mainTagId);
    const mainTagDef = window.mainTagDefinitions[mainTagId];
    const title = mainTagDef[currentLang];
    
    let y = 20;
    const pageHeight = 280;
    const leftMargin = 20;
    const rightMargin = 190;
    
    // Helper function to check if we need a new page
    const checkPageBreak = (neededSpace) => {
        if (y + neededSpace > pageHeight) {
            doc.addPage();
            y = 20;
            return true;
        }
        return false;
    };
    
    // Helper function to convert HTML to plain text with basic formatting
    // Title
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text(title, leftMargin, y);
    y += 15;
    
    // Generation date
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`${currentLang === 'fi' ? 'Luotu' : 'Generated'}: ${new Date().toLocaleDateString()}`, leftMargin, y);
    y += 10;
    
    // Group items by first tag
    const groupedItems = new Map();
    items.forEach(item => {
        const firstTag = item.tags[0] || 'no-tag';
        if (!groupedItems.has(firstTag)) {
            groupedItems.set(firstTag, []);
        }
        groupedItems.get(firstTag).push(item);
    });
    
    let itemNumber = 0;
    groupedItems.forEach((groupItems, firstTag) => {
        const tagDef = window.tagDefinitions[firstTag];
        const tagLabel = tagDef ? tagDef[currentLang] : firstTag;
        
        // Add group heading
        y = checkPageBreak(doc, y, 15, pageHeight);
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text(tagLabel, leftMargin, y);
        y += 10;
        
        // Add separator line under heading
        doc.setDrawColor(150, 150, 150);
        doc.line(leftMargin, y, rightMargin, y);
        y += 8;
        
        // Add items in this group
        groupItems.forEach(item => {
            y = addItemToPDF(doc, item, itemNumber++, y, pageHeight, leftMargin, rightMargin);
        });
    });
    
    doc.save(`${title}.pdf`);
}

// Export Modal Management
function showExportModal(type) {
    const modalId = type + 'Modal';
    const categoriesId = type + 'Categories';
    const modal = document.getElementById(modalId);
    const categoriesContainer = document.getElementById(categoriesId);
    
    if (!modal || !categoriesContainer || !window.mainTagDefinitions) return;
    
    // Build checkboxes for each main category
    categoriesContainer.innerHTML = '';
    Object.keys(window.mainTagDefinitions).forEach(mainTagId => {
        const mainTagDef = window.mainTagDefinitions[mainTagId];
        const label = document.createElement('label');
        label.className = 'flex items-center gap-2 cursor-pointer';
        label.innerHTML = `
            <input type="checkbox" value="${mainTagId}" checked class="w-4 h-4 text-blue-600 rounded">
            <span class="text-gray-900 dark:text-white">${mainTagDef[currentLang]}</span>
        `;
        categoriesContainer.appendChild(label);
    });
    
    modal.classList.remove('hidden');
    applyLanguage(); // Ensure language is applied to modal content
}

function closeExportModal(type) {
    const modalId = type + 'Modal';
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
    }
}

function getSelectedCategories(type) {
    const categoriesId = type + 'Categories';
    const categoriesContainer = document.getElementById(categoriesId);
    if (!categoriesContainer) return [];
    
    const checkboxes = categoriesContainer.querySelectorAll('input[type="checkbox"]:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}

function confirmPdfDownload() {
    const selectedCategories = getSelectedCategories('pdf');
    if (selectedCategories.length === 0) {
        alert(currentLang === 'fi' ? 'Valitse vähintään yksi kategoria' : 'Please select at least one category');
        return;
    }
    const includeAllLinks = document.getElementById('pdfIncludeAllLinks')?.checked ?? false;
    closeExportModal('pdf');
    downloadCombinedPDF(selectedCategories, includeAllLinks);
}

function confirmZipDownload() {
    const selectedCategories = getSelectedCategories('zip');
    if (selectedCategories.length === 0) {
        alert(currentLang === 'fi' ? 'Valitse vähintään yksi kategoria' : 'Please select at least one category');
        return;
    }
    const includeCombined = document.getElementById('zipIncludeCombined')?.checked ?? true;
    const includeBookmarks = document.getElementById('zipIncludeBookmarks')?.checked ?? true;
    const includeAllLinks = document.getElementById('zipIncludeAllLinks')?.checked ?? false;
    closeExportModal('zip');
    downloadAllPDFsAsZip(selectedCategories, includeCombined, includeBookmarks, includeAllLinks);
}

function confirmBookmarkDownload() {
    const selectedCategories = getSelectedCategories('bookmark');
    if (selectedCategories.length === 0) {
        alert(currentLang === 'fi' ? 'Valitse vähintään yksi kategoria' : 'Please select at least one category');
        return;
    }
    closeExportModal('bookmark');
    downloadBookmarks(selectedCategories);
}

// Download combined PDF with all main tags
function downloadCombinedPDF(selectedCategories = null, includeAllLinks = false) {
    if (!window.contentData || !window.mainTagDefinitions) return;
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    const title = currentLang === 'fi' ? 'Kaikki Tiedot' : 'All Information';
    
    let y = 20;
    const pageHeight = 280;
    const leftMargin = 20;
    const rightMargin = 190;
    
    // Title
    doc.setFontSize(22);
    doc.setFont(undefined, 'bold');
    doc.text(title, leftMargin, y);
    y += 12;
    
    // Generation date
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`${currentLang === 'fi' ? 'Luotu' : 'Generated'}: ${new Date().toLocaleDateString()}`, leftMargin, y);
    y += 15;
    
    // Process each main tag (filtered if selectedCategories provided)
    const mainTagsToProcess = selectedCategories || Object.keys(window.mainTagDefinitions);
    mainTagsToProcess.forEach((mainTagId, mainIndex) => {
        const mainTagDef = window.mainTagDefinitions[mainTagId];
        const items = window.contentData.filter(item => item.mainTag === mainTagId);
        
        if (items.length === 0) return;
        
        // Add page break before new main tag (except first)
        if (mainIndex > 0) {
            doc.addPage();
            y = 20;
        }
        
        // Main tag title
        y = checkPageBreak(doc, y, 20, pageHeight);
        doc.setFontSize(18);
        doc.setFont(undefined, 'bold');
        doc.text(mainTagDef[currentLang], leftMargin, y);
        y += 8;
        
        // Thick separator line
        doc.setLineWidth(0.8);
        doc.setDrawColor(100, 100, 100);
        doc.line(leftMargin, y, rightMargin, y);
        doc.setLineWidth(0.2);
        y += 12;
        
        // Group items by first tag
        const groupedItems = new Map();
        items.forEach(item => {
            const firstTag = item.tags[0] || 'no-tag';
            if (!groupedItems.has(firstTag)) {
                groupedItems.set(firstTag, []);
            }
            groupedItems.get(firstTag).push(item);
        });
        
        let itemNumber = 0;
        groupedItems.forEach((groupItems, firstTag) => {
            const tagDef = window.tagDefinitions[firstTag];
            const tagLabel = tagDef ? tagDef[currentLang] : firstTag;
            
            // Add group heading
            y = checkPageBreak(doc, y, 15, pageHeight);
            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.text(tagLabel, leftMargin, y);
            y += 8;
            
            // Add separator line under heading
            doc.setDrawColor(150, 150, 150);
            doc.line(leftMargin, y, rightMargin, y);
            y += 8;
            
            // Add items in this group
            groupItems.forEach(item => {
                y = addItemToPDF(doc, item, itemNumber++, y, pageHeight, leftMargin, rightMargin);
            });
        });
    });
    
    // Add All Links section if requested
    if (includeAllLinks) {
        doc.addPage();
        y = 20;
        
        // Title
        const allLinksTitle = currentLang === 'fi' ? 'Kaikki Linkit' : 'All Links';
        doc.setFontSize(18);
        doc.setFont(undefined, 'bold');
        doc.text(allLinksTitle, leftMargin, y);
        y += 8;
        
        // Thick separator line
        doc.setLineWidth(0.8);
        doc.setDrawColor(100, 100, 100);
        doc.line(leftMargin, y, rightMargin, y);
        doc.setLineWidth(0.2);
        y += 12;
        
        // Collect all links
        const allLinks = [];
        window.contentData.forEach(item => {
            const mainTagDef = window.mainTagDefinitions[item.mainTag];
            const categoryName = mainTagDef ? mainTagDef[currentLang] : '';
            
            // Add primary URL if exists
            if (item.url) {
                allLinks.push({
                    category: categoryName,
                    itemTitle: item.title[currentLang],
                    name: item.title[currentLang],
                    description: item.description[currentLang] || '',
                    url: item.url
                });
            }
            
            // Add additional links
            let additionalLinks = [];
            if (item.links) additionalLinks = [...additionalLinks, ...item.links];
            if (currentLang === 'fi' && item.linksFI) additionalLinks = [...additionalLinks, ...item.linksFI];
            if (currentLang === 'en' && item.linksEN) additionalLinks = [...additionalLinks, ...item.linksEN];
            
            additionalLinks.forEach(link => {
                allLinks.push({
                    category: categoryName,
                    itemTitle: item.title[currentLang],
                    name: link.name || item.title[currentLang],
                    description: link.description || '',
                    url: link.url
                });
            });
        });
        
        // Headers
        const categoryLabel = currentLang === 'fi' ? 'Kategoria' : 'Category';
        const nameLabel = currentLang === 'fi' ? 'Nimi' : 'Name';
        const urlLabel = currentLang === 'fi' ? 'Linkki' : 'Link';
        
        // Add each link
        allLinks.forEach((link, index) => {
            y = checkPageBreak(doc, y, 20, pageHeight);
            
            // Category
            doc.setFontSize(9);
            doc.setFont(undefined, 'bold');
            doc.text(`${categoryLabel}:`, leftMargin, y);
            doc.setFont(undefined, 'normal');
            doc.setFontSize(8);
            const categoryLines = doc.splitTextToSize(link.category, rightMargin - leftMargin - 25);
            doc.text(categoryLines, leftMargin + 25, y);
            y += categoryLines.length * 4;
            
            // Name
            doc.setFontSize(9);
            doc.setFont(undefined, 'bold');
            doc.text(`${nameLabel}:`, leftMargin, y);
            doc.setFont(undefined, 'normal');
            doc.setFontSize(8);
            const nameLines = doc.splitTextToSize(link.name, rightMargin - leftMargin - 25);
            doc.text(nameLines, leftMargin + 25, y);
            y += nameLines.length * 4;
            
            // URL
            doc.setFontSize(9);
            doc.setFont(undefined, 'bold');
            doc.text(`${urlLabel}:`, leftMargin, y);
            doc.setFont(undefined, 'normal');
            doc.setFontSize(8);
            doc.setTextColor(0, 0, 255);
            const urlLines = doc.splitTextToSize(link.url, rightMargin - leftMargin - 25);
            doc.text(urlLines, leftMargin + 25, y);
            doc.setTextColor(0, 0, 0);
            y += urlLines.length * 4;
            
            // Description if exists
            if (link.description) {
                const descLabel = currentLang === 'fi' ? 'Kuvaus' : 'Description';
                doc.setFontSize(9);
                doc.setFont(undefined, 'bold');
                doc.text(`${descLabel}:`, leftMargin, y);
                doc.setFont(undefined, 'normal');
                doc.setFontSize(8);
                const descLines = doc.splitTextToSize(link.description, rightMargin - leftMargin - 25);
                doc.text(descLines, leftMargin + 25, y);
                y += descLines.length * 4;
            }
            
            y += 5; // spacing between entries
            
            // Divider line
            if (index < allLinks.length - 1) {
                y = checkPageBreak(doc, y, 5, pageHeight);
                doc.setDrawColor(200);
                doc.line(leftMargin, y, rightMargin, y);
                y += 5;
            }
        });
    }
    
    doc.save(`${title}.pdf`);
}

// Generate PDF for a specific main tag (returns the PDF document)
function generateMainTagPDF(mainTagId) {
    if (!window.contentData) return null;
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    const items = window.contentData.filter(item => item.mainTag === mainTagId);
    const mainTagDef = window.mainTagDefinitions[mainTagId];
    const title = mainTagDef[currentLang];
    
    let y = 20;
    const pageHeight = 280;
    const leftMargin = 20;
    const rightMargin = 190;
    
    // Title
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text(title, leftMargin, y);
    y += 15;
    
    // Generation date
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`${currentLang === 'fi' ? 'Luotu' : 'Generated'}: ${new Date().toLocaleDateString()}`, leftMargin, y);
    y += 10;
    
    // Group items by first tag
    const groupedItems = new Map();
    items.forEach(item => {
        const firstTag = item.tags[0] || 'no-tag';
        if (!groupedItems.has(firstTag)) {
            groupedItems.set(firstTag, []);
        }
        groupedItems.get(firstTag).push(item);
    });
    
    let itemNumber = 0;
    groupedItems.forEach((groupItems, firstTag) => {
        const tagDef = window.tagDefinitions[firstTag];
        const tagLabel = tagDef ? tagDef[currentLang] : firstTag;
        
        // Add group heading
        y = checkPageBreak(doc, y, 15, pageHeight);
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text(tagLabel, leftMargin, y);
        y += 10;
        
        // Add separator line under heading
        doc.setDrawColor(150, 150, 150);
        doc.line(leftMargin, y, rightMargin, y);
        y += 8;
        
        // Add items in this group
        groupItems.forEach(item => {
            y = addItemToPDF(doc, item, itemNumber++, y, pageHeight, leftMargin, rightMargin);
        });
    });
    
    return { doc, title };
}

// Download all PDFs as a ZIP file
async function downloadAllPDFsAsZip(selectedCategories = null, includeCombined = true, includeBookmarks = true, includeAllLinks = false) {
    if (!window.contentData || !window.mainTagDefinitions) return;
    
    const zip = new JSZip();
    
    // Generate a PDF for each main tag (filtered if selectedCategories provided)
    const mainTagsToProcess = selectedCategories || Object.keys(window.mainTagDefinitions);
    mainTagsToProcess.forEach(mainTagId => {
        const items = window.contentData.filter(item => 
            item.mainTag === mainTagId || (item.mainTags && item.mainTags.includes(mainTagId))
        );
        if (items.length === 0) return;
        
        const result = generateMainTagPDF(mainTagId);
        if (result) {
            const pdfBlob = result.doc.output('blob');
            zip.file(`${result.title}.pdf`, pdfBlob);
        }
    });
    
    // Generate the combined PDF only if includeCombined is true
    if (includeCombined) {
        const { jsPDF } = window.jspdf;
        const combinedDoc = new jsPDF();
        const combinedTitle = currentLang === 'fi' ? 'Kaikki Tiedot' : 'All Information';
        
        let y = 20;
        const pageHeight = 280;
        const leftMargin = 20;
        const rightMargin = 190;
        
        // Title
        combinedDoc.setFontSize(22);
        combinedDoc.setFont(undefined, 'bold');
        combinedDoc.text(combinedTitle, leftMargin, y);
        y += 12;
        
        // Generation date
        combinedDoc.setFontSize(10);
        combinedDoc.setFont(undefined, 'normal');
        combinedDoc.text(`${currentLang === 'fi' ? 'Luotu' : 'Generated'}: ${new Date().toLocaleDateString()}`, leftMargin, y);
        y += 15;
        
        // Process each main tag (use same filtered list)
        mainTagsToProcess.forEach((mainTagId, mainIndex) => {
        const mainTagDef = window.mainTagDefinitions[mainTagId];
        const items = window.contentData.filter(item => 
            item.mainTag === mainTagId || (item.mainTags && item.mainTags.includes(mainTagId))
        );
        
        if (items.length === 0) return;
        
        // Add page break before new main tag (except first)
        if (mainIndex > 0) {
            combinedDoc.addPage();
            y = 20;
        }
        
        // Main tag title
        y = checkPageBreak(combinedDoc, y, 20, pageHeight);
        combinedDoc.setFontSize(18);
        combinedDoc.setFont(undefined, 'bold');
        combinedDoc.text(mainTagDef[currentLang], leftMargin, y);
        y += 8;
        
        // Thick separator line
        combinedDoc.setLineWidth(0.8);
        combinedDoc.setDrawColor(100, 100, 100);
        combinedDoc.line(leftMargin, y, rightMargin, y);
        combinedDoc.setLineWidth(0.2);
        y += 12;
        
        // Group items by first tag
        const groupedItems = new Map();
        items.forEach(item => {
            const firstTag = item.tags[0] || 'no-tag';
            if (!groupedItems.has(firstTag)) {
                groupedItems.set(firstTag, []);
            }
            groupedItems.get(firstTag).push(item);
        });
        
        let itemNumber = 0;
        groupedItems.forEach((groupItems, firstTag) => {
            const tagDef = window.tagDefinitions[firstTag];
            const tagLabel = tagDef ? tagDef[currentLang] : firstTag;
            
            // Add group heading
            y = checkPageBreak(combinedDoc, y, 15, pageHeight);
            combinedDoc.setFontSize(14);
            combinedDoc.setFont(undefined, 'bold');
            combinedDoc.text(tagLabel, leftMargin, y);
            y += 8;
            
            // Add separator line under heading
            combinedDoc.setDrawColor(150, 150, 150);
            combinedDoc.line(leftMargin, y, rightMargin, y);
            y += 8;
            
            // Add items in this group
            groupItems.forEach(item => {
                y = addItemToPDF(combinedDoc, item, itemNumber++, y, pageHeight, leftMargin, rightMargin);
            });
        });
    });
    
        const combinedBlob = combinedDoc.output('blob');
        zip.file(`${combinedTitle}.pdf`, combinedBlob);
    }
    
    // Generate and add bookmark file if includeBookmarks is true
    if (includeBookmarks) {
        const timestamp = Math.floor(Date.now() / 1000);
        const bookmarkTitle = currentLang === 'fi' ? 'Päivää! Kirjanmerkit' : 'Päivää! Bookmarks';
        
        let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>${bookmarkTitle}</TITLE>
<H1>${bookmarkTitle}</H1>
<DL><p>
    <DT><A HREF="${SITE_URL}" ADD_DATE="${timestamp}">${SITE_NAME}</A>
`;
        
        mainTagsToProcess.forEach(mainTagId => {
            const mainTagDef = window.mainTagDefinitions[mainTagId];
            const items = window.contentData.filter(item => 
                item.mainTag === mainTagId || (item.mainTags && item.mainTags.includes(mainTagId))
            );
            
            if (items.length === 0) return;
            
            html += `    <DT><H3 ADD_DATE="${timestamp}" LAST_MODIFIED="${timestamp}">${mainTagDef[currentLang]}</H3>\n`;
            html += `    <DL><p>\n`;
            
            const groupedItems = new Map();
            items.forEach(item => {
                const firstTag = item.tags[0] || 'no-tag';
                if (!groupedItems.has(firstTag)) {
                    groupedItems.set(firstTag, []);
                }
                groupedItems.get(firstTag).push(item);
            });
            
            groupedItems.forEach((groupItems, firstTag) => {
                const tagDef = window.tagDefinitions[firstTag];
                const tagLabel = tagDef ? tagDef[currentLang] : firstTag;
                
                html += `        <DT><H3 ADD_DATE="${timestamp}" LAST_MODIFIED="${timestamp}">${tagLabel}</H3>\n`;
                html += `        <DL><p>\n`;
                
                groupItems.forEach(item => {
                    let allLinks = [];
                    
                    if (item.url) {
                        allLinks.push({
                            url: item.url,
                            title: item.title[currentLang],
                            description: item.description[currentLang]
                        });
                    }
                    
                    let additionalLinks = [];
                    if (item.links) additionalLinks = [...additionalLinks, ...item.links];
                    if (currentLang === 'fi' && item.linksFI) additionalLinks = [...additionalLinks, ...item.linksFI];
                    if (currentLang === 'en' && item.linksEN) additionalLinks = [...additionalLinks, ...item.linksEN];
                    
                    additionalLinks.forEach(link => {
                        allLinks.push({
                            url: link.url,
                            title: link.name || item.title[currentLang],
                            description: link.description || ''
                        });
                    });
                    
                    allLinks.forEach(link => {
                        const escapedTitle = link.title.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                        const escapedDesc = link.description.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                        html += `            <DT><A HREF="${link.url}" ADD_DATE="${timestamp}"`;
                        if (escapedDesc) {
                            html += ` DESCRIPTION="${escapedDesc}"`;
                        }
                        html += `>${escapedTitle}</A>\n`;
                    });
                });
                
                html += `        </DL><p>\n`;
            });
            
            html += `    </DL><p>\n`;
        });
        
        html += `</DL><p>\n`;
        
        const bookmarkBlob = new Blob([html], { type: 'text/html' });
        zip.file(`${bookmarkTitle}.html`, bookmarkBlob);
    }
    
    // Generate and add All Links PDF if includeAllLinks is true
    if (includeAllLinks) {
        const { jsPDF } = window.jspdf;
        const allLinksDoc = new jsPDF();
        const allLinksTitle = currentLang === 'fi' ? 'Kaikki Linkit' : 'All Links';
        const pageHeight = 280;
        const leftMargin = 14;
        const rightMargin = 196;
        let y = 20;
        
        // Title
        allLinksDoc.setFontSize(16);
        allLinksDoc.setFont(undefined, 'bold');
        allLinksDoc.text(allLinksTitle, leftMargin, y);
        y += 10;
        
        // Collect all links
        const allLinks = [];
        window.contentData.forEach(item => {
            const mainTagDef = window.mainTagDefinitions[item.mainTag];
            const categoryName = mainTagDef ? mainTagDef[currentLang] : '';
            
            // Add primary URL if exists
            if (item.url) {
                allLinks.push({
                    category: categoryName,
                    itemTitle: item.title[currentLang],
                    name: item.title[currentLang],
                    description: item.description[currentLang] || '',
                    url: item.url
                });
            }
            
            // Add additional links
            let additionalLinks = [];
            if (item.links) additionalLinks = [...additionalLinks, ...item.links];
            if (currentLang === 'fi' && item.linksFI) additionalLinks = [...additionalLinks, ...item.linksFI];
            if (currentLang === 'en' && item.linksEN) additionalLinks = [...additionalLinks, ...item.linksEN];
            
            additionalLinks.forEach(link => {
                allLinks.push({
                    category: categoryName,
                    itemTitle: item.title[currentLang],
                    name: link.name || item.title[currentLang],
                    description: link.description || '',
                    url: link.url
                });
            });
        });
        
        // Headers
        const categoryLabel = currentLang === 'fi' ? 'Kategoria' : 'Category';
        const nameLabel = currentLang === 'fi' ? 'Nimi' : 'Name';
        const urlLabel = currentLang === 'fi' ? 'Linkki' : 'Link';
        
        // Helper function to check if we need a new page
        function checkPageBreakAllLinks(requiredSpace) {
            if (y + requiredSpace > pageHeight) {
                allLinksDoc.addPage();
                y = 20;
                return true;
            }
            return false;
        }
        
        // Add each link
        allLinks.forEach((link, index) => {
            checkPageBreakAllLinks(20);
            
            // Category
            allLinksDoc.setFontSize(9);
            allLinksDoc.setFont(undefined, 'bold');
            allLinksDoc.text(`${categoryLabel}:`, leftMargin, y);
            allLinksDoc.setFont(undefined, 'normal');
            allLinksDoc.setFontSize(8);
            const categoryLines = allLinksDoc.splitTextToSize(link.category, rightMargin - leftMargin - 20);
            allLinksDoc.text(categoryLines, leftMargin + 22, y);
            y += categoryLines.length * 4;
            
            // Name
            allLinksDoc.setFontSize(9);
            allLinksDoc.setFont(undefined, 'bold');
            allLinksDoc.text(`${nameLabel}:`, leftMargin, y);
            allLinksDoc.setFont(undefined, 'normal');
            allLinksDoc.setFontSize(8);
            const nameLines = allLinksDoc.splitTextToSize(link.name, rightMargin - leftMargin - 20);
            allLinksDoc.text(nameLines, leftMargin + 22, y);
            y += nameLines.length * 4;
            
            // URL
            allLinksDoc.setFontSize(9);
            allLinksDoc.setFont(undefined, 'bold');
            allLinksDoc.text(`${urlLabel}:`, leftMargin, y);
            allLinksDoc.setFont(undefined, 'normal');
            allLinksDoc.setFontSize(8);
            allLinksDoc.setTextColor(0, 0, 255);
            const urlLines = allLinksDoc.splitTextToSize(link.url, rightMargin - leftMargin - 20);
            allLinksDoc.text(urlLines, leftMargin + 22, y);
            allLinksDoc.setTextColor(0, 0, 0);
            y += urlLines.length * 4;
            
            // Description if exists
            if (link.description) {
                const descLabel = currentLang === 'fi' ? 'Kuvaus' : 'Description';
                allLinksDoc.setFontSize(9);
                allLinksDoc.setFont(undefined, 'bold');
                allLinksDoc.text(`${descLabel}:`, leftMargin, y);
                allLinksDoc.setFont(undefined, 'normal');
                allLinksDoc.setFontSize(8);
                const descLines = allLinksDoc.splitTextToSize(link.description, rightMargin - leftMargin - 20);
                allLinksDoc.text(descLines, leftMargin + 22, y);
                y += descLines.length * 4;
            }
            
            y += 5; // spacing between entries
            
            // Divider line
            if (index < allLinks.length - 1) {
                checkPageBreakAllLinks(5);
                allLinksDoc.setDrawColor(200);
                allLinksDoc.line(leftMargin, y, rightMargin, y);
                y += 5;
            }
        });
        
        const allLinksBlob = allLinksDoc.output('blob');
        const allLinksPdfName = currentLang === 'fi' ? 'Kaikki_linkit.pdf' : 'All_Links.pdf';
        zip.file(allLinksPdfName, allLinksBlob);
    }
    
    // Generate and download the ZIP file
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentLang === 'fi' ? 'Kaikki_PDFit' : 'All_PDFs'}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Category page PDF download
function downloadCategoryPDF() {
    if (currentMainTag) {
        downloadMainTagPDF(currentMainTag);
    }
}

// Download bookmarks as HTML file (Netscape Bookmark format)
function downloadBookmarks(selectedCategories = null) {
    if (!window.contentData || !window.mainTagDefinitions) return;
    
    const timestamp = Math.floor(Date.now() / 1000);
    const title = currentLang === 'fi' ? 'Päivää! Kirjanmerkit' : 'Päivää! Bookmarks';
    
    let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>${title}</TITLE>
<H1>${title}</H1>
<DL><p>
    <DT><A HREF="${SITE_URL}" ADD_DATE="${timestamp}">${SITE_NAME}</A>
`;
    
    // Process each main tag (filtered if selectedCategories provided)
    const mainTagsToProcess = selectedCategories || Object.keys(window.mainTagDefinitions);
    mainTagsToProcess.forEach(mainTagId => {
        const mainTagDef = window.mainTagDefinitions[mainTagId];
        const items = window.contentData.filter(item => 
            item.mainTag === mainTagId || (item.mainTags && item.mainTags.includes(mainTagId))
        );
        
        if (items.length === 0) return;
        
        // Main category folder
        html += `    <DT><H3 ADD_DATE="${timestamp}" LAST_MODIFIED="${timestamp}">${mainTagDef[currentLang]}</H3>\n`;
        html += `    <DL><p>\n`;
        
        // Group items by first tag
        const groupedItems = new Map();
        items.forEach(item => {
            const firstTag = item.tags[0] || 'no-tag';
            if (!groupedItems.has(firstTag)) {
                groupedItems.set(firstTag, []);
            }
            groupedItems.get(firstTag).push(item);
        });
        
        // Process each tag group (subcategory)
        groupedItems.forEach((groupItems, firstTag) => {
            const tagDef = window.tagDefinitions[firstTag];
            const tagLabel = tagDef ? tagDef[currentLang] : firstTag;
            
            // Subcategory folder
            html += `        <DT><H3 ADD_DATE="${timestamp}" LAST_MODIFIED="${timestamp}">${tagLabel}</H3>\n`;
            html += `        <DL><p>\n`;
            
            // Add items (only those with URLs)
            groupItems.forEach(item => {
                // Get all links for this item
                let allLinks = [];
                
                // Primary URL
                if (item.url) {
                    allLinks.push({
                        url: item.url,
                        title: item.title[currentLang],
                        description: item.description[currentLang]
                    });
                }
                
                // Additional links
                let additionalLinks = [];
                if (item.links) additionalLinks = [...additionalLinks, ...item.links];
                if (currentLang === 'fi' && item.linksFI) additionalLinks = [...additionalLinks, ...item.linksFI];
                if (currentLang === 'en' && item.linksEN) additionalLinks = [...additionalLinks, ...item.linksEN];
                
                additionalLinks.forEach(link => {
                    allLinks.push({
                        url: link.url,
                        title: link.name || item.title[currentLang],
                        description: link.description || ''
                    });
                });
                
                // Add all links as bookmarks
                allLinks.forEach(link => {
                    const escapedTitle = link.title.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                    const escapedDesc = link.description.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                    html += `            <DT><A HREF="${link.url}" ADD_DATE="${timestamp}"`;
                    if (escapedDesc) {
                        html += ` DESCRIPTION="${escapedDesc}"`;
                    }
                    html += `>${escapedTitle}</A>\n`;
                });
            });
            
            html += `        </DL><p>\n`;
        });
        
        html += `    </DL><p>\n`;
    });
    
    html += `</DL><p>\n`;
    
    // Download the file
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Download bookmarks for specific category
function downloadCategoryBookmarks() {
    if (!window.contentData || !currentMainTag) return;
    
    const timestamp = Math.floor(Date.now() / 1000);
    const mainTagDef = window.mainTagDefinitions[currentMainTag];
    const title = mainTagDef[currentLang];
    
    let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>${title}</TITLE>
<H1>${title}</H1>
<DL><p>
    <DT><A HREF="${SITE_URL}/category.html?tag=${currentMainTag}" ADD_DATE="${timestamp}">${mainTagDef[currentLang]}</A>
`;
    
    const items = window.contentData.filter(item => item.mainTag === currentMainTag);
    
    // Group items by first tag
    const groupedItems = new Map();
    items.forEach(item => {
        const firstTag = item.tags[0] || 'no-tag';
        if (!groupedItems.has(firstTag)) {
            groupedItems.set(firstTag, []);
        }
        groupedItems.get(firstTag).push(item);
    });
    
    // Process each tag group (subcategory)
    groupedItems.forEach((groupItems, firstTag) => {
        const tagDef = window.tagDefinitions[firstTag];
        const tagLabel = tagDef ? tagDef[currentLang] : firstTag;
        
        // Subcategory folder
        html += `    <DT><H3 ADD_DATE="${timestamp}" LAST_MODIFIED="${timestamp}">${tagLabel}</H3>\n`;
        html += `    <DL><p>\n`;
        
        // Add items (only those with URLs)
        groupItems.forEach(item => {
            // Get all links for this item
            let allLinks = [];
            
            // Primary URL
            if (item.url) {
                allLinks.push({
                    url: item.url,
                    title: item.title[currentLang],
                    description: item.description[currentLang]
                });
            }
            
            // Additional links
            let additionalLinks = [];
            if (item.links) additionalLinks = [...additionalLinks, ...item.links];
            if (currentLang === 'fi' && item.linksFI) additionalLinks = [...additionalLinks, ...item.linksFI];
            if (currentLang === 'en' && item.linksEN) additionalLinks = [...additionalLinks, ...item.linksEN];
            
            additionalLinks.forEach(link => {
                allLinks.push({
                    url: link.url,
                    title: link.name || item.title[currentLang],
                    description: link.description || ''
                });
            });
            
            // Add all links as bookmarks
            allLinks.forEach(link => {
                const escapedTitle = link.title.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                const escapedDesc = link.description.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                html += `        <DT><A HREF="${link.url}" ADD_DATE="${timestamp}"`;
                if (escapedDesc) {
                    html += ` DESCRIPTION="${escapedDesc}"`;
                }
                html += `>${escapedTitle}</A>\n`;
            });
        });
        
        html += `    </DL><p>\n`;
    });
    
    html += `</DL><p>\n`;
    
    // Download the file
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title}_Bookmarks.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Expose functions globally for inline onclick handlers
window.showAllLinksModal = showAllLinksModal;
window.showExportModal = showExportModal;
window.closeExportModal = closeExportModal;
window.closeTipModal = closeTipModal;
window.confirmBookmarkDownload = confirmBookmarkDownload;
window.confirmPdfDownload = confirmPdfDownload;
window.confirmZipDownload = confirmZipDownload;
window.toggleSortMenu = toggleSortMenu;
window.changeSortMode = changeSortMode;
window.toggleTagFilters = toggleTagFilters;
window.downloadAllLinksPDF = downloadAllLinksPDF;
window.closeAllLinksModal = closeAllLinksModal;
window.toggleAllLinksFilter = toggleAllLinksFilter;
window.renderAllLinks = renderAllLinks;
window.showTipModal = showTipModal;
