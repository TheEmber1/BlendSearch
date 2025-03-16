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
    searchTerm.textContent = query;
    
    // Add debugging to check if query is being received
    console.log('Search query:', query);
    
    // Load shortcuts from local file
    fetchShortcuts()
        .then(shortcuts => {
            // Debugging: Log the loaded shortcuts
            console.log('Loaded shortcuts:', shortcuts);
            
            displayResults(shortcuts, query);
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
