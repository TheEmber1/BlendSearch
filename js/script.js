// Fix issue where page transitions don't work

// Create and add the page transition overlay
const pageTransitionOverlay = document.createElement('div');
pageTransitionOverlay.className = 'page-transition-overlay';
document.body.appendChild(pageTransitionOverlay);

// Define handlePageTransition function in global scope
function handlePageTransition(targetUrl) {
    console.log("Starting page transition to:", targetUrl);
    // Activate the overlay
    pageTransitionOverlay.classList.add('active');
    
    // Wait for the fade-out to complete
    setTimeout(() => {
        window.location.href = targetUrl;
    }, 400); // Match this with the CSS transition time
}

document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const webSearchCheckbox = document.getElementById('enable-web-search');
    const recentSearchesContainer = document.getElementById('recent-searches-container');
    const recentSearchesDiv = document.getElementById('recent-searches');
    const themeToggle = document.getElementById('theme-toggle');
    const searchTip = document.getElementById('search-tip');
    const charLimitNotification = document.getElementById('char-limit-notification');
    
    // Configurable values
    const MAX_QUERY_LENGTH = 35;
    const MAX_WORDS_BEFORE_TIP = 3;
    
    // Initialize theme from localStorage or default to light
    initTheme();
    
    // Theme toggle functionality
    themeToggle.addEventListener('click', toggleTheme);
    
    // Load recent searches from localStorage
    loadRecentSearches();
    
    // Check if we're returning from results page and restore state
    const returnSearch = sessionStorage.getItem('returnSearch');
    const webSearchState = sessionStorage.getItem('webSearchState');
    
    if (returnSearch) {
        searchInput.value = returnSearch;
        sessionStorage.removeItem('returnSearch'); // Clear after using
        
        // Check if this was an actual search and add it to recents
        if (returnSearch.trim() !== '') {
            addToRecentSearches(returnSearch);
            loadRecentSearches(); // Refresh the display immediately
        }
    }
    
    // Restore checkbox state if it was set
    if (webSearchState === 'true') {
        webSearchCheckbox.checked = true;
    } else {
        webSearchCheckbox.checked = false;
    }
    
    // Fix page transition by ensuring we start with full opacity
    document.body.style.opacity = '1';
    
    // Handle search form submission with smooth transition
    function performSearch() {
        const query = searchInput.value.trim();
        if (query) {
            console.log("Performing search for:", query);
            
            // Save search query to localStorage
            localStorage.setItem('searchQuery', query);
            localStorage.setItem('webSearchEnabled', webSearchCheckbox.checked);
            
            // Add to recent searches
            addToRecentSearches(query);
            
            // Explicitly call the global function
            handlePageTransition('results.html');
        }
    }
    
    // Search when button is clicked
    searchButton.addEventListener('click', function(e) {
        console.log("Search button clicked");
        e.preventDefault();
        e.stopPropagation();
        performSearch();
        return false;
    });
    
    // Search when Enter key is pressed in the input field
    searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            console.log("Enter key pressed in search");
            e.preventDefault();
            performSearch();
        }
    });
    
    // Show search tip for long sentences
    searchInput.addEventListener('input', function() {
        const query = searchInput.value.trim();
        if (query.split(/\s+/).length > MAX_WORDS_BEFORE_TIP) {
            searchTip.style.display = 'block';
        } else {
            searchTip.style.display = 'none';
        }
        
        // Limit input to MAX_QUERY_LENGTH characters
        if (query.length > MAX_QUERY_LENGTH) {
            searchInput.value = query.substring(0, MAX_QUERY_LENGTH);
            charLimitNotification.style.display = 'flex';
        } else {
            charLimitNotification.style.display = 'none';
        }
    });
    
    // Recent searches functionality
    function loadRecentSearches() {
        const recentSearches = getRecentSearches();
        
        // Always show the container - either with searches or a message
        recentSearchesContainer.style.display = 'block';
        
        // Clear existing searches
        recentSearchesDiv.innerHTML = '';
        
        if (recentSearches.length === 0) {
            // Show a message when no recent searches exist
            const noRecents = document.createElement('div');
            noRecents.className = 'no-recents';
            noRecents.textContent = 'No recent searches yet';
            recentSearchesDiv.appendChild(noRecents);
            return;
        }
        
        // Add each recent search as a tag
        recentSearches.forEach(search => {
            const tag = document.createElement('span');
            tag.className = 'tag recent-tag';
            tag.textContent = search;
            tag.addEventListener('click', function() {
                searchInput.value = search;
                performSearch();
            });
            recentSearchesDiv.appendChild(tag);
        });
    }
    
    function getRecentSearches() {
        // Get recent searches from localStorage, or initialize empty array
        const recentSearches = localStorage.getItem('recentSearches');
        return recentSearches ? JSON.parse(recentSearches) : [];
    }
    
    function addToRecentSearches(query) {
        const recentSearches = getRecentSearches();
        
        // Remove existing instance of this query if present
        const index = recentSearches.indexOf(query);
        if (index !== -1) {
            recentSearches.splice(index, 1);
        }
        
        // Add to the beginning of the array
        recentSearches.unshift(query);
        
        // Keep only the latest 5 searches
        const trimmedSearches = recentSearches.slice(0, 5);
        
        // Save back to localStorage
        localStorage.setItem('recentSearches', JSON.stringify(trimmedSearches));
    }
    
    // Theme functionality
    function initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateThemeIcon(savedTheme);
    }
    
    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        updateThemeIcon(newTheme);
    }
    
    function updateThemeIcon(theme) {
        const icon = themeToggle.querySelector('i');
        if (theme === 'dark') {
            icon.className = 'fas fa-sun';
        } else {
            icon.className = 'fas fa-moon';
        }
    }

    // Update the fetchShortcuts function to handle direct file access limitations

    function fetchShortcuts() {
        return new Promise((resolve, reject) => {
            fetch('blender_4.3_hotkey_sheet_print.txt')
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Failed to fetch official text: ${response.status}`);
                    }
                    return response.text();
                })
                .then(text => {
                    const shortcuts = parseShortcutsText(text);
                    console.log('Successfully loaded official text data');
                    // Mark that we're using the secondary data source
                    sessionStorage.setItem('dataSource', 'official_text');
                    resolve(shortcuts);
                })
                .catch(officialTextError => {
                    console.error('Official text fetch failed:', officialTextError);
                    
                    // Use hardcoded shortcuts if we're on file:// protocol
                    if (window.location.protocol === 'file:') {
                        console.log('Using hardcoded shortcuts due to file:// protocol limitations');
                        const basicShortcuts = getBasicShortcuts();
                        sessionStorage.setItem('dataSource', 'hardcoded');
                        resolve(basicShortcuts);
                    } else {
                        reject(officialTextError);
                    }
                });
        });
    }

    // Add function to get basic shortcuts as a fallback
    function getBasicShortcuts() {
        return [
            {
                category: "View",
                action: "Rotate 3D view",
                keys: "MMB + Drag",
                searchTerms: "rotate 3d view mmb + drag view"
            },
            {
                category: "View",
                action: "Zoom",
                keys: "Mousewheel",
                searchTerms: "zoom mousewheel view"
            },
            {
                category: "View",
                action: "Pan",
                keys: "Shift + MMB + Drag",
                searchTerms: "pan shift + mmb + drag view"
            },
            {
                category: "General",
                action: "Delete",
                keys: "X",
                searchTerms: "delete x general"
            },
            {
                category: "General",
                action: "Undo",
                keys: "Ctrl + Z",
                searchTerms: "undo ctrl + z general"
            },
            {
                category: "General",
                action: "Redo",
                keys: "Shift + Ctrl + Z",
                searchTerms: "redo shift + ctrl + z general"
            },
            {
                category: "Transform",
                action: "Move (Grab)",
                keys: "G",
                searchTerms: "move grab g transform"
            },
            {
                category: "Transform",
                action: "Rotate",
                keys: "R",
                searchTerms: "rotate r transform"
            },
            {
                category: "Transform",
                action: "Scale",
                keys: "S",
                searchTerms: "scale s transform"
            },
            {
                category: "Edit Mode",
                action: "Extrude",
                keys: "E",
                searchTerms: "extrude e edit mode"
            }
            // You can add more common shortcuts here
        ];
    }

    // You will also need to implement the parseShortcutsText function in script.js
    // if it's not already there:
    function parseShortcutsText(text) {
        const lines = text.split('\n');
        let currentCategory = '';
        const shortcuts = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Skip empty lines and comment lines
            if (!line || line.startsWith('//')) continue;
            
            // Check if it's a category header (doesn't contain a colon)
            if (!line.includes(':')) {
                currentCategory = line;
                continue;
            }
            
            // Parse shortcut line
            const parts = line.split(':');
            if (parts.length < 2) continue;
            
            const keys = parts[0].trim();
            const action = parts.slice(1).join(':').trim();
            
            shortcuts.push({
                category: currentCategory,
                action: action,
                keys: keys,
                searchTerms: action.toLowerCase() + ' ' + keys.toLowerCase() + ' ' + currentCategory.toLowerCase()
            });
        }
        
        return shortcuts;
    }

    // Process natural language queries into search terms
    function processNaturalLanguageQuery(query) {
        if (!query) return '';
        
        // Convert to lowercase
        let processedQuery = query.toLowerCase();
        
        // Remove common words that don't contribute to meaning
        const removeWords = [
            'how', 'to', 'do', 'i', 'can', 'the', 'in', 'blender', 'shortcut', 'shortcuts',
            'keyboard', 'key', 'keys', 'what', 'is', 'for', 'with', 'using', 'a', 'an',
            'where', 'when', 'which', 'button', 'press', 'need', 'want', 'would', 'should'
        ];
        
        // Create regex pattern for word boundaries
        const pattern = new RegExp('\\b(' + removeWords.join('|') + ')\\b', 'gi');
        processedQuery = processedQuery.replace(pattern, '');
        
        // Add synonyms and related terms
        const synonyms = {
            'duplicate': ['copy', 'clone'],
            'delete': ['remove', 'erase'],
            'select': ['choose', 'pick'],
            'move': ['grab', 'drag'],
            'rotate': ['turn', 'spin'],
            'scale': ['resize', 'stretch'],
            'extrude': ['extend', 'pull']
        };
        
        for (const [key, values] of Object.entries(synonyms)) {
            if (processedQuery.includes(key)) {
                processedQuery += ' ' + values.join(' ');
            }
        }
        
        return processedQuery;
    }

    // Fuzzy search algorithm
    function fuzzySearch(term, query) {
        const termLower = term.toLowerCase();
        const queryLower = query.toLowerCase();
        let tIndex = 0;
        let qIndex = 0;
        
        while (tIndex < termLower.length && qIndex < queryLower.length) {
            if (termLower[tIndex] === queryLower[qIndex]) {
                qIndex++;
            }
            tIndex++;
        }
        
        return qIndex === queryLower.length;
    }

    // Display search results - updated to handle fuzzy search
    function displayResults(shortcuts, query, processedQuery) {
        if (!query) {
            searchResults.innerHTML = `
                <div class="no-results">
                    <p>Please enter a search query.</p>
                </div>
            `;
            return;
        }
        
        const queryLower = processedQuery ? processedQuery.toLowerCase() : query.toLowerCase();
        const searchWords = queryLower.split(/\s+/).filter(word => word.trim().length > 0);
        
        // If no searchable words remain after filtering
        if (searchWords.length === 0) {
            searchResults.innerHTML = `
                <div class="no-results">
                    <p>No shortcuts found for "${query}"</p>
                </div>
            `;
            return;
        }
        
        // Filter shortcuts based on search terms
        const filteredShortcuts = shortcuts.filter(shortcut => {
            for (const word of searchWords) {
                if (word.length <= 1) continue; // Skip very short terms
                
                // Check if any part of the shortcut matches the search term using fuzzy search
                if (fuzzySearch(shortcut.keys, word) || 
                    fuzzySearch(shortcut.action, word) ||
                    fuzzySearch(shortcut.category, word) ||
                    (shortcut.searchTerms && fuzzySearch(shortcut.searchTerms, word))) {
                    return true;
                }
            }
            return false;
        });
        
        // Display the results
        if (filteredShortcuts.length === 0) {
            searchResults.innerHTML = `
                <div class="no-results">
                    <p>No shortcuts found for "${query}"</p>
                    <div class="searching-docs-message">
                        <p>Looking for shortcuts in alternative sources...</p>
                        <div class="spinner"></div>
                    </div>
                </div>
            `;
            
            // If no results found in JSON, try searching in the text file
            if (sessionStorage.getItem('dataSource') === 'json') {
                // Add timeout to prevent infinite loading state
                const fallbackTimeout = setTimeout(() => {
                    if (document.querySelector('.searching-docs-message')) {
                        searchResults.innerHTML = `
                            <div class="no-results">
                                <p>No shortcuts found for "${query}" in any data source.</p>
                                <p>Try a different search term or check your spelling.</p>
                            </div>
                        `;
                    }
                }, 5000); // 5 seconds timeout
                
                fetchFallbackShortcuts(query, processedQuery)
                    .then(() => {
                        clearTimeout(fallbackTimeout); // Clear timeout if fetch completes normally
                    })
                    .catch(error => {
                        clearTimeout(fallbackTimeout); // Clear timeout if fetch fails
                        console.error('Fallback fetch error:', error);
                        searchResults.innerHTML = `
                            <div class="no-results">
                                <p>No shortcuts found for "${query}" in any data source.</p>
                                <p>Try a different search term or check your spelling.</p>
                            </div>
                        `;
                    });
            }
            return;
        }
        
        // Apply improved deduplication before displaying
        const uniqueShortcuts = deduplicateShortcuts(filteredShortcuts);
        
        // Display the unique results
        displayShortcutResults(uniqueShortcuts);
    }

    // Add functionality for collapsible search box
    const searchBox = document.querySelector('.search-box');
    
    // Start with collapsed state
    searchBox.classList.add('collapsed');
    
    // Expand on focus
    searchInput.addEventListener('focus', function() {
        searchBox.classList.remove('collapsed');
        searchBox.classList.add('expanded');
    });
    
    // Collapse when focus is lost and input is empty
    searchInput.addEventListener('blur', function() {
        // Only collapse if the search input is empty
        if (searchInput.value.trim() === '') {
            searchBox.classList.remove('expanded');
            searchBox.classList.add('collapsed');
        }
    });
    
    // If there's a value in the search input (like when returning from results),
    // make sure it's expanded
    if (searchInput.value.trim() !== '') {
        searchBox.classList.remove('collapsed');
        searchBox.classList.add('expanded');
        // Explicitly enable the search button
        searchButton.style.pointerEvents = 'auto';
        searchButton.style.opacity = '1';
    }
    
    // Ensure search button becomes clickable on focus
    searchInput.addEventListener('focus', function() {
        searchBox.classList.remove('collapsed');
        searchBox.classList.add('expanded');
        // Explicitly enable the search button
        searchButton.style.pointerEvents = 'auto';
        searchButton.style.opacity = '1';
    });
    
    // Directly attach click handler to search button with debugging
    searchButton.addEventListener('click', function(e) {
        console.log("Search button clicked");
        e.preventDefault();
        performSearch();
    });

    // Fade in the page once loaded
    setTimeout(() => {
        document.body.classList.add('loaded');
    }, 50);
});
