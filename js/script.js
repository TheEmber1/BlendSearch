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
    
    // Handle search form submission
    function performSearch() {
        const query = searchInput.value.trim();
        if (query) {
            // Save search query to localStorage
            localStorage.setItem('searchQuery', query);
            localStorage.setItem('webSearchEnabled', webSearchCheckbox.checked);
            
            // Add to recent searches
            addToRecentSearches(query);
            
            // Navigate to results page
            window.location.href = 'results.html';
        }
    }
    
    // Search when button is clicked
    searchButton.addEventListener('click', performSearch);
    
    // Search when Enter key is pressed in the input field
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
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
    
    // Enhanced theme functionality
    function initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateThemeIcon(savedTheme);
    }
    
    function toggleTheme(event) {
        // Add transition class to body
        document.body.classList.add('theme-transition');
        
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        updateThemeIcon(newTheme);
        
        // Remove the transition class after animation completes
        setTimeout(() => {
            document.body.classList.remove('theme-transition');
        }, 800); // Match this with the animation duration
    }
    
    function updateThemeIcon(theme) {
        // Clear existing icons first
        themeToggle.innerHTML = '';
        
        // Add only the appropriate icon based on the current theme
        if (theme === 'dark') {
            const sunIcon = document.createElement('i');
            sunIcon.className = 'fas fa-sun';
            themeToggle.appendChild(sunIcon);
        } else {
            const moonIcon = document.createElement('i');
            moonIcon.className = 'fas fa-moon';
            themeToggle.appendChild(moonIcon);
        }
    }

    // Fetch shortcuts with error handling and fallback to the new text file
    function fetchShortcuts() {
        return new Promise((resolve, reject) => {
            // Commented out the JSON fetch part
            /*
            fetch('blendershortcuts.json')
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Failed to fetch JSON: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    console.log('Successfully loaded JSON data');
                    // Mark that we're using the primary data source
                    sessionStorage.setItem('dataSource', 'json');
                    resolve(data);
                })
                .catch(jsonError => {
                    console.warn('JSON fetch failed, trying official text file instead:', jsonError);
            */
                    // Fallback to official text file
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
                            console.error('Official text fetch also failed:', officialTextError);
                            
                            // Last resort: use hardcoded basic shortcuts
                            const basicShortcuts = getBasicShortcuts();
                            console.log('Using hardcoded basic shortcuts');
                            // Mark that we're using the emergency data source
                            sessionStorage.setItem('dataSource', 'hardcoded');
                            resolve(basicShortcuts);
                        });
            // });
        });
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
});
