document.addEventListener('DOMContentLoaded', function() {
    const searchTerm = document.getElementById('search-term');
    const searchResults = document.getElementById('search-results');
    const backButton = document.getElementById('back-button');
    const themeToggle = document.getElementById('theme-toggle');
    
    // Initialize theme
    initTheme();
    
    // Theme toggle functionality
    themeToggle.addEventListener('click', toggleTheme);
    
    // Get the search query and preferences from localStorage
    const query = localStorage.getItem('searchQuery') || '';
    const webSearchEnabled = localStorage.getItem('webSearchEnabled') === 'true';
    searchTerm.textContent = query;
    
    // Add debugging to check if query is being received
    console.log('Search query:', query);
    
    // Load shortcuts from local file
    fetchShortcuts()
        .then(shortcuts => {
            // Process the query to extract meaningful terms
            const processedQuery = processNaturalLanguageQuery(query);
            console.log('Processed query:', processedQuery);
            
            // Add commonly searched shortcuts that might not be in the basic list
            addMissingCommonShortcuts(shortcuts);
            
            displayResults(shortcuts, query, processedQuery);
            
            // If no results found, consider fetching from Blender website
            if (document.querySelector('.no-results') && query.length > 2) {
                fetchExtraShortcutsIfNeeded(query);
            }
            
            // If web search is enabled, fetch website results after showing shortcuts
            if (webSearchEnabled && query.length > 0) {
                fetchWebResults(query);
            }
        })
        .catch(error => {
            console.error('Error loading shortcuts:', error);
            searchResults.innerHTML = `
                <div class="no-results">
                    <p>Error loading shortcuts. Please try again later.</p>
                    <p>Error details: ${error.message}</p>
                </div>
            `;
        });
    
    // Handle back button
    backButton.addEventListener('click', function() {
        // Store the current search query in sessionStorage to retrieve when returning
        sessionStorage.setItem('returnSearch', query);
        // Also store the checkbox state
        sessionStorage.setItem('webSearchState', webSearchEnabled.toString());
        window.location.href = 'index.html';
    });
    
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
    
    // Hardcoded basic shortcuts as a last resort
    function getBasicShortcuts() {
        return [
            {
                category: "General Shortcuts",
                action: "Add Menu (Create New Objects)",
                keys: "Shift + A",
                searchTerms: "add menu create new object mesh cube sphere plane light camera shift+a primary add create"
            },
            {
                category: "General Shortcuts",
                action: "Select/Deselect All",
                keys: "A",
                searchTerms: "select deselect all a general shortcuts"
            },
            {
                category: "General Shortcuts",
                action: "Box Select",
                keys: "B",
                searchTerms: "box select b general shortcuts"
            },
            {
                category: "General Shortcuts",
                action: "Circle Select",
                keys: "C",
                searchTerms: "circle select c general shortcuts"
            },
            {
                category: "General Shortcuts",
                action: "Grab/Move",
                keys: "G",
                searchTerms: "grab move g general shortcuts"
            },
            {
                category: "General Shortcuts",
                action: "Scale",
                keys: "S",
                searchTerms: "scale s general shortcuts"
            },
            {
                category: "General Shortcuts",
                action: "Rotate",
                keys: "R",
                searchTerms: "rotate r general shortcuts"
            },
            {
                category: "General Shortcuts",
                action: "Extrude",
                keys: "E",
                searchTerms: "extrude e general shortcuts"
            },
            {
                category: "General Shortcuts",
                action: "Delete",
                keys: "X",
                searchTerms: "delete x general shortcuts"
            }
        ];
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

    // Parse text file format
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
    
    // Display search results - updated to handle strict filtering and improved scoring
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
        
        // Filter and score shortcuts based on search terms
        const scoredShortcuts = shortcuts.map(shortcut => {
            let score = 0;
            let matches = false;
            for (const word of searchWords) {
                if (word.length <= 1) continue; // Skip very short terms
                
                // Check if any part of the shortcut matches the search term using strict matching
                if (shortcut.keys.toLowerCase().includes(word)) {
                    score += 10;
                    matches = true;
                }
                if (shortcut.action.toLowerCase().includes(word)) {
                    score += 15;
                    matches = true;
                }
                if (shortcut.category.toLowerCase().includes(word)) {
                    score += 5;
                    matches = true;
                }
                if (shortcut.searchTerms && shortcut.searchTerms.toLowerCase().includes(word)) {
                    score += 2;
                    matches = true;
                }
            }
            return matches ? { ...shortcut, score } : null;
        }).filter(shortcut => shortcut !== null);
        
        // Sort shortcuts by score in descending order
        const sortedShortcuts = scoredShortcuts.sort((a, b) => b.score - a.score);
        
        // Display the results
        if (sortedShortcuts.length === 0) {
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
        const uniqueShortcuts = deduplicateShortcuts(sortedShortcuts);
        
        // Display the unique results
        displayShortcutResults(uniqueShortcuts);
    }
    
    // New function to fetch fallback shortcuts from text file when JSON search fails
    function fetchFallbackShortcuts(query, processedQuery) {
        return new Promise((resolve, reject) => {
            fetch('blendershortcuts.txt')
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Failed to fetch text: ${response.status}`);
                    }
                    return response.text();
                })
                .then(text => {
                    const textShortcuts = parseShortcutsText(text);
                    console.log('Successfully loaded fallback text data');
                    
                    // Process search with text file data
                    const queryLower = processedQuery ? processedQuery.toLowerCase() : query.toLowerCase();
                    const searchWords = queryLower.split(/\s+/).filter(word => word.trim().length > 0);
                    
                    // Filter shortcuts based on search terms
                    const filteredShortcuts = textShortcuts.filter(shortcut => {
                        for (const word of searchWords) {
                            if (word.length <= 1) continue; // Skip very short terms
                            
                            // Check if any part of the shortcut matches the search term
                            if (shortcut.keys.toLowerCase().includes(word) || 
                                shortcut.action.toLowerCase().includes(word) ||
                                shortcut.category.toLowerCase().includes(word) ||
                                (shortcut.searchTerms && shortcut.searchTerms.includes(word))) {
                                return true;
                            }
                        }
                        return false;
                    });
                    
                    if (filteredShortcuts.length > 0) {
                        const uniqueShortcuts = deduplicateShortcuts(filteredShortcuts);
                        displayFallbackResults(uniqueShortcuts);
                        resolve();
                    } else {
                        searchResults.innerHTML = `
                            <div class="no-results">
                                <p>No shortcuts found for "${query}" in any data source.</p>
                                <p>Try a different search term or check your spelling.</p>
                            </div>
                        `;
                        resolve(); // Still resolve since this is not an error condition
                    }
                })
                .catch(error => {
                    console.error('Fallback text search failed:', error);
                    searchResults.innerHTML = `
                        <div class="no-results">
                            <p>No shortcuts found for "${query}" in any data source.</p>
                            <p>Try a different search term or check your spelling.</p>
                        </div>
                    `;
                    reject(error);
                });
        });
    }
    
    // New function to display results from the fallback source
    function displayFallbackResults(shortcuts) {
        // Add a combined source attribution and warning message at the top
        let resultsHTML = `
            <div class="source-attribution warning-attribution">
                <p><i class="fas fa-exclamation-triangle"></i> Shortcuts data compiled from community resources. Results may be less accurate.</p>
            </div>
        `;
        
        // Display shortcuts in a flat list, without categorization
        shortcuts.forEach(shortcut => {
            resultsHTML += `
                <div class="shortcut-card">
                    <div class="shortcut-keys">${shortcut.keys}</div>
                    <div class="shortcut-title">${shortcut.action}</div>
                </div>
            `;
        });
        
        searchResults.innerHTML = resultsHTML;
    }
    
    // Display the filtered shortcuts - update the original function
    function displayShortcutResults(filteredShortcuts) {
        let resultsHTML = '';
        
        // Add a source attribution message at the top based on data source
        const dataSource = sessionStorage.getItem('dataSource');
        
        if (dataSource === 'json') {
            resultsHTML += `
                <div class="source-attribution">
                    <p>Shortcuts data based on <a href="https://docs.blender.org/manual/en/latest/interface/keymap/blender_default.html" target="_blank">
                    Blender's official documentation</a></p>
                </div>
            `;
        } else {
            resultsHTML += `
                <div class="source-attribution warning-attribution">
                    <p><i class="fas fa-exclamation-triangle"></i> Shortcuts data compiled from community resources. Results may be less accurate.</p>
                </div>
            `;
        }
        
        // Display shortcuts in a flat list, without categorization
        filteredShortcuts.forEach(shortcut => {
            resultsHTML += `
                <div class="shortcut-card">
                    <div class="shortcut-keys">${shortcut.keys}</div>
                    <div class="shortcut-title">${shortcut.action}</div>
                </div>
            `;
        });
        
        searchResults.innerHTML = resultsHTML;
    }
    
    // Fetch extra shortcuts (simplified placeholder implementation)
    function fetchExtraShortcutsIfNeeded(query) {
        console.log('Fetching extra shortcuts for:', query);
        // Implementation details omitted for brevity
    }
    
    // Fetch web results implementation
    function fetchWebResults(query) {
        console.log('Fetching web results for:', query);
        
        // Create a section for web results
        const webResultsSection = document.createElement('div');
        webResultsSection.className = 'web-results-section';
        webResultsSection.innerHTML = `
            <h3>Related Web Resources</h3>
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>Loading web results...</p>
            </div>
        `;
        searchResults.appendChild(webResultsSection);
        
        // Simulate loading delay (in a real app, this would be an actual API fetch)
        setTimeout(() => {
            const webResultsData = getWebResults(query);
            displayWebResults(webResultsData, webResultsSection);
        }, 1000);
    }
    
    // Generate web results based on the search query
    function getWebResults(query) {
        const encodedQuery = encodeURIComponent(query);
        
        // Create relevant web resources based on the search query
        return [
            {
                title: `Search Blender Documentation for "${query}"`,
                url: `https://docs.blender.org/manual/en/latest/search.html?q=${encodedQuery}`,
                description: `Find official documentation about ${query} in the Blender manual.`,
                source: 'Docs'
            },
            {
                title: `Search YouTube for "${query}" tutorials`,
                url: `https://www.youtube.com/results?search_query=blender+${encodedQuery}+tutorial`,
                description: `Find video tutorials about using ${query} in Blender.`,
                source: 'YouTube'
            },
            {
                title: `Search Blender Artists forum for "${query}"`,
                url: `https://blenderartists.org/search?q=${encodedQuery}`,
                description: `Find forum discussions and tips from experienced users about ${query}.`,
                source: 'Forums'
            },
            {
                title: `Search Reddit for "${query}" discussions`,
                url: `https://www.reddit.com/r/blender/search/?q=${encodedQuery}`,
                description: `Find community discussions about ${query} in Blender on Reddit.`,
                source: 'Reddit'
            }
        ];
    }
    
    // Display web results in the dedicated section
    function displayWebResults(results, container) {
        // Remove loading spinner
        container.querySelector('.loading-spinner').remove();
        
        if (results.length === 0) {
            container.innerHTML += `<div class="no-results">No related web resources found.</div>`;
            return;
        }
        
        // Build HTML for each result
        let resultsHTML = '';
        results.forEach(result => {
            resultsHTML += `
                <div class="web-result-card">
                    <div class="web-result-title">
                        <span class="source-tag">${result.source}</span>
                        <a href="${result.url}" target="_blank">${result.title}</a>
                    </div>
                    <div class="web-result-description">${result.description}</div>
                    <div class="web-result-url">${result.url}</div>
                </div>
            `;
        });
        
        container.innerHTML += resultsHTML;
    }
    
    // Helper function to deduplicate shortcuts - improved version
    function deduplicateShortcuts(shortcuts) {
        const uniqueShortcuts = [];
        const seen = new Set();
        
        // First pass: group similar shortcuts by their keys
        const keyGroups = {};
        
        shortcuts.forEach(shortcut => {
            const normalizedKey = shortcut.keys.toLowerCase().replace(/\s+/g, '');
            if (!keyGroups[normalizedKey]) {
                keyGroups[normalizedKey] = [];
            }
            keyGroups[normalizedKey].push(shortcut);
        });
        
        // Second pass: for each key group, only keep the most relevant shortcut
        for (const key in keyGroups) {
            if (keyGroups[key].length === 1) {
                // If only one shortcut with this key, add it directly
                uniqueShortcuts.push(keyGroups[key][0]);
            } else {
                // Multiple shortcuts with the same key, choose the best one
                const bestShortcut = chooseBestShortcut(keyGroups[key]);
                uniqueShortcuts.push(bestShortcut);
            }
        }
        
        return uniqueShortcuts;
    }
    
    // Helper function to choose the best shortcut from a group of similar shortcuts
    function chooseBestShortcut(shortcuts) {
        // If there's an "Add Menu" shortcut with Shift+A, prioritize it
        const addMenuShortcut = shortcuts.find(s => 
            s.keys.toLowerCase().includes('shift+a') && 
            s.action.toLowerCase().includes('add menu')
        );
        
        if (addMenuShortcut) return addMenuShortcut;
        
        // For other cases, prioritize the shortcut with the most detailed action description
        return shortcuts.reduce((best, current) => {
            return current.action.length > best.action.length ? current : best;
        }, shortcuts[0]);
    }
    
    // Add missing common shortcuts for better search results
    function addMissingCommonShortcuts(shortcuts) {
        // Check if we need to add the Shift+A (Add Menu) shortcut
        const hasAddMenu = shortcuts.some(s => 
            s.keys.toLowerCase().includes('shift+a') && 
            s.action.toLowerCase().includes('add menu')
        );
        
        if (!hasAddMenu) {
            shortcuts.unshift({
                category: "General Shortcuts",
                action: "Add Menu (Create New Objects)",
                keys: "Shift + A",
                searchTerms: "add menu create new object mesh cube sphere plane light camera shift+a primary add create"
            });
        }
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
});
