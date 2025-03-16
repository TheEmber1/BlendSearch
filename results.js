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
            // Debugging: Log the loaded shortcuts
            console.log('Loaded shortcuts:', shortcuts);
            
            displayResults(shortcuts, query);
            
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
    
    // Fetch shortcuts with error handling
    function fetchShortcuts() {
        return fetch('blender_4.3_hotkey_sheet_print.txt')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to fetch text: ${response.status}`);
                }
                return response.text();
            })
            .then(text => {
                const shortcuts = parseShortcutsText(text);
                console.log('Successfully loaded text data');
                return shortcuts;
            })
            .catch(error => {
                console.error('Failed to fetch text:', error);
                throw error;
            });
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
    
    // Display search results - simplified to match search term in action, keys, or searchTerms
    function displayResults(shortcuts, query) {
        if (!query) {
            searchResults.innerHTML = `
                <div class="no-results">
                    <p>Please enter a search query.</p>
                </div>
            `;
            return;
        }
        
        const queryLower = query.toLowerCase();
        
        // Debugging: Log the query
        console.log('Query:', query);
        
        // Filter shortcuts based on search term in action, keys, or searchTerms
        const filteredShortcuts = shortcuts.filter(shortcut => 
            shortcut.action.toLowerCase().includes(queryLower) ||
            shortcut.keys.toLowerCase().includes(queryLower) ||
            shortcut.searchTerms.toLowerCase().includes(queryLower)
        );
        
        // Debugging: Log the filtered shortcuts
        console.log('Filtered Shortcuts:', filteredShortcuts);
        
        // Display the results
        if (filteredShortcuts.length === 0) {
            searchResults.innerHTML = `
                <div class="no-results">
                    <p>No shortcuts found for "${query}"</p>
                </div>
            `;
            return;
        }
        
        // Display the unique results
        displayShortcutResults(filteredShortcuts);
    }
    
    // Display the filtered shortcuts
    function displayShortcutResults(filteredShortcuts) {
        let resultsHTML = '';
        
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
