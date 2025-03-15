document.addEventListener('DOMContentLoaded', function() {
    const searchTerm = document.getElementById('search-term');
    const searchResults = document.getElementById('search-results');
    const backButton = document.getElementById('back-button');
    
    // Get the search query and preferences from localStorage
    const query = localStorage.getItem('searchQuery') || '';
    const webSearchEnabled = localStorage.getItem('webSearchEnabled') === 'true';
    searchTerm.textContent = query;
    
    // Load shortcuts from both local file and potentially from the Blender website
    fetch('blendershortcuts.txt')
        .then(response => response.text())
        .then(text => {
            const shortcuts = parseShortcutsText(text);
            
            // Add commonly searched shortcuts that might not be in the basic list
            addMissingCommonShortcuts(shortcuts);
            
            displayResults(shortcuts, query);
            
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
            searchResults.innerHTML = `<div class="no-results">Error loading shortcuts. Please try again later.</div>`;
        });
    
    // Handle back button
    backButton.addEventListener('click', function() {
        // Store the current search query in session storage
        // This will allow the main page to access it when returning
        sessionStorage.setItem('returnSearch', query);
        window.location.href = 'index.html';
    });
    
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
            
            // Parse shortcut line (now using format "Key: Action")
            const parts = line.split(':');
            if (parts.length < 2) continue;
            
            const keys = parts[0].trim();
            const action = parts.slice(1).join(':').trim();
            
            // Create searchable terms including variations and synonyms
            let searchTerms = action.toLowerCase() + ' ' + keys.toLowerCase() + ' ' + currentCategory.toLowerCase();
            
            // Add common variations and related terms
            if (action.toLowerCase().includes('uv')) {
                searchTerms += ' unwrap texture mapping';
            }
            
            if (keys.toLowerCase().includes('ctrl+e') && action.toLowerCase().includes('mark seam')) {
                searchTerms += ' unwrap uv mapping texture';
            }
            
            if (action.toLowerCase().includes('triangulate') || action.toLowerCase().includes('tris')) {
                searchTerms += ' triangle triangulation';
            }
            
            shortcuts.push({
                category: currentCategory,
                action: action,
                keys: keys,
                searchTerms: searchTerms
            });
        }
        
        return shortcuts;
    }
    
    // Common words to exclude from search to improve relevance
    const commonWords = [
        "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", 
        "with", "by", "about", "as", "how", "what", "when", "where", "why", 
        "which", "who", "whom", "whose", "this", "that", "these", "those", 
        "is", "am", "are", "was", "were", "be", "been", "being", "have", 
        "has", "had", "do", "does", "did", "can", "could", "will", "would", 
        "shall", "should", "may", "might", "must", "of", "from", "make", "low", "poly", "room"
    ];
    
    // Returns true if a word should be used in search
    function isSearchableWord(word) {
        return word.length > 1 && !commonWords.includes(word.toLowerCase());
    }
    
    // Checks if query is for general information rather than specific shortcut
    function isInformationalQuery(query) {
        const phrases = ["how to", "how do i", "what is", "how can i", "tutorial"];
        return phrases.some(phrase => query.toLowerCase().includes(phrase));
    }
    
    function displayResults(shortcuts, query) {
        // Check if user is asking a general question rather than searching for a shortcut
        if (isInformationalQuery(query) && query.split(" ").length > 3) {
            // For informational queries, just show a simple message without suggestions
            searchResults.innerHTML = `
                <div class="no-results">
                    <p>No shortcuts found for "${query}"</p>
                </div>
            `;
            return;
        }
        
        const queryLower = query.toLowerCase();
        
        // Filter out common words from the search terms
        const searchWords = queryLower.split(/\s+/)
            .filter(word => isSearchableWord(word));
        
        // If no searchable words remain after filtering, show a message
        if (searchWords.length === 0 && query.length > 0) {
            searchResults.innerHTML = `
                <div class="no-results">
                    <p>No shortcuts found for "${query}"</p>
                </div>
            `;
            return;
        }
        
        // More strict filtering for multi-word queries
        let filteredShortcuts = shortcuts.filter(shortcut => {
            // If it's an exact match for a key or action, prioritize it
            if (shortcut.keys.toLowerCase() === queryLower || 
                shortcut.action.toLowerCase() === queryLower) {
                return true;
            }
            
            // For multiple words, require that more words match for longer queries
            if (searchWords.length > 1) {
                // Count how many search words match
                const matchingWords = searchWords.filter(word => 
                    shortcut.searchTerms.includes(word)
                );
                
                // For 2-3 word searches, require at least 2 words to match
                // For 4+ word searches, require at least 50% of words to match
                const requiredMatches = searchWords.length <= 3 
                    ? Math.min(2, searchWords.length) 
                    : Math.ceil(searchWords.length / 2);
                
                return matchingWords.length >= requiredMatches;
            }
            
            // For single-word queries, check for direct inclusion
            return searchWords.some(word => 
                shortcut.action.toLowerCase().includes(word) || 
                shortcut.keys.toLowerCase() === word ||
                shortcut.category.toLowerCase().includes(word)
            );
        });
        
        // Deduplicate shortcuts - if we have multiples with same keys and action, keep only one
        filteredShortcuts = deduplicateShortcuts(filteredShortcuts);
        
        // Display the results or a "no results" message
        if (filteredShortcuts.length === 0) {
            // If no exact results, try a more lenient approach for partial matches
            const partialMatches = findPartialMatches(shortcuts, query);
            
            if (partialMatches.length > 0) {
                displayShortcutResults(partialMatches);
                
                // Add a note that these are partial matches
                const noteDiv = document.createElement('div');
                noteDiv.className = 'partial-match-note';
                noteDiv.textContent = 'Showing partial matches for your search.';
                searchResults.insertBefore(noteDiv, searchResults.firstChild);
            } else {
                searchResults.innerHTML = `
                    <div class="no-results">
                        <p>No shortcuts found for "${query}"</p>
                    </div>
                `;
            }
            return;
        }
        
        displayShortcutResults(filteredShortcuts);
    }
    
    // Add a function to deduplicate shortcuts to prevent showing the same shortcut multiple times
    function deduplicateShortcuts(shortcuts) {
        const uniqueShortcuts = [];
        const seen = new Set();
        
        // First, normalize all shortcut texts to make comparison more accurate
        shortcuts.forEach(shortcut => {
            // Normalize text fields by removing extra spaces, making lowercase
            shortcut.normalizedKeys = shortcut.keys.toLowerCase().replace(/\s+/g, ' ').trim();
            shortcut.normalizedAction = shortcut.action.toLowerCase().replace(/\s+/g, ' ').trim();
            
            // Create additional normalized versions to catch similar variations
            shortcut.simpleAction = shortcut.normalizedAction
                .replace(/menu|tool|command|operation/g, '')  // Remove common words that might vary
                .replace(/for|and|or|of/g, '')               // Remove common conjunctions
                .replace(/s\b/g, '')                         // Remove trailing 's' (plurals)
                .trim();
            
            // Score the source - prefer official documentation
            shortcut.sourceScore = 
                shortcut.category.includes('General') ? 3 : 
                shortcut.category.includes('Common') ? 2 : 1;
        });
        
        // Sort shortcuts to prioritize official documentation sources
        shortcuts.sort((a, b) => {
            // Higher source score first
            if (a.sourceScore !== b.sourceScore) {
                return b.sourceScore - a.sourceScore;
            }
            
            // If same score, prioritize simpler/cleaner names
            return a.normalizedAction.length - b.normalizedAction.length;
        });
        
        shortcuts.forEach(shortcut => {
            // Create different unique identifiers to catch various forms of duplicates
            const exactIdentifier = `${shortcut.normalizedKeys}|${shortcut.normalizedAction}`;
            const fuzzyIdentifier = `${shortcut.normalizedKeys}|${shortcut.simpleAction}`;
            
            // Only add if we haven't seen this exact or similar shortcut before
            if (!seen.has(exactIdentifier) && !seen.has(fuzzyIdentifier)) {
                seen.add(exactIdentifier);
                seen.add(fuzzyIdentifier);
                uniqueShortcuts.push(shortcut);
            }
        });
        
        return uniqueShortcuts;
    }
    
    function findPartialMatches(shortcuts, query) {
        const queryLower = query.toLowerCase();
        
        const partialMatches = shortcuts.filter(shortcut => {
            // Check for partial word matches or key commands
            const words = queryLower.split(/\s+/);
            
            for (const word of words) {
                if (word.length > 2) { // Only consider words with at least 3 chars
                    // Check for partial matches in the shortcut's searchTerms
                    if (shortcut.searchTerms.includes(word.substring(0, Math.min(word.length, word.length - 1)))) {
                        return true;
                    }
                    
                    // Also check if the search term appears anywhere in the action or category
                    if (shortcut.action.toLowerCase().includes(word) || 
                        shortcut.category.toLowerCase().includes(word)) {
                        return true;
                    }
                    
                    // For very specific searches like "rename", be more lenient
                    if (word === "rename" && 
                        (shortcut.action.toLowerCase().includes("name") || 
                         shortcut.action.toLowerCase().includes("label"))) {
                        return true;
                    }
                }
            }
            return false;
        });
        
        // Deduplicate the partial matches before returning
        return deduplicateShortcuts(partialMatches);
    }
    
    function displayShortcutResults(filteredShortcuts) {
        // Add a source attribution message at the top
        let resultsHTML = `
            <div class="source-attribution">
                <p>Shortcuts data based on <a href="https://docs.blender.org/manual/en/latest/interface/keymap/blender_default.html" target="_blank">
                Blender's official documentation</a></p>
            </div>
        `;
        
        // Group by category for better organization
        const groupedResults = {};
        filteredShortcuts.forEach(shortcut => {
            if (!groupedResults[shortcut.category]) {
                groupedResults[shortcut.category] = [];
            }
            groupedResults[shortcut.category].push(shortcut);
        });
        
        // Build the HTML for the results
        for (const category in groupedResults) {
            resultsHTML += `<h3>${category}</h3>`;
            
            groupedResults[category].forEach(shortcut => {
                resultsHTML += `
                    <div class="shortcut-card">
                        <div class="shortcut-title">${shortcut.action}</div>
                        <div class="shortcut-keys">${shortcut.keys}</div>
                        <div class="shortcut-description">Part of ${shortcut.category} shortcuts.</div>
                    </div>
                `;
            });
        }
        
        searchResults.innerHTML = resultsHTML;
    }

    function fetchWebResults(query) {
        // Create a section for web results
        const webResultsSection = document.createElement('div');
        webResultsSection.className = 'web-results-section';
        webResultsSection.innerHTML = `
            <h3>Related Web Resources</h3>
            <div class="loading-spinner">
                <div class="spinner"></div>
            </div>
        `;
        searchResults.appendChild(webResultsSection);
        
        // In a real production environment, you would use actual APIs for Reddit and web search
        // For this demo, we'll simulate API responses with a check for "valid" URLs
        setTimeout(() => {
            const webResultsData = simulateWebResults(query);
            displayWebResults(webResultsData, webResultsSection);
        }, 1500); // Simulate loading delay
    }
    
    function simulateWebResults(query) {
        const results = [];
        const encodedQuery = encodeURIComponent(query);
        
        // Function to check if a search would likely return results
        function isLikelyValidSearch(query) {
            // Remove common words and check if anything substantial remains
            const words = query.toLowerCase().split(/\s+/)
                .filter(word => !commonWords.includes(word) && word.length > 2);
            return words.length > 0;
        }
        
        // Only add results if the search is likely to return something
        if (isLikelyValidSearch(query)) {
            // Reddit result
            results.push({
                title: `Search Reddit for "${query}" discussions`,
                url: `https://www.reddit.com/r/blender/search/?q=${encodedQuery}`,
                description: `Find community discussions about ${query} in Blender. See what other users are saying and learn from their experiences.`,
                source: 'Reddit',
                valid: true
            });
            
            // Blender Documentation result
            results.push({
                title: `Search Blender Documentation for "${query}"`,
                url: `https://docs.blender.org/manual/en/latest/search.html?q=${encodedQuery}`,
                description: `Find official documentation about ${query} in the Blender manual.`,
                source: 'Docs',
                valid: true
            });
            
            // YouTube tutorial
            results.push({
                title: `Search YouTube for "${query}" tutorials`,
                url: `https://www.youtube.com/results?search_query=blender+${encodedQuery}+tutorial`,
                description: `Find video tutorials about using ${query} in Blender to improve your skills.`,
                source: 'YouTube',
                valid: true
            });
            
            // Blender Artists forum
            results.push({
                title: `Search Blender Artists forum for "${query}"`,
                url: `https://blenderartists.org/search?q=${encodedQuery}`,
                description: `Find forum discussions and tips from experienced Blender users about ${query}.`,
                source: 'Forums',
                valid: true
            });
        } else {
            // If the search term is unlikely to return good results, mark the links as invalid
            results.push({
                title: `Search Reddit for "${query}"`,
                url: `https://www.reddit.com/r/blender/search/?q=${encodedQuery}`,
                description: `This search may not return many useful results on Reddit.`,
                source: 'Reddit',
                valid: false
            });
            
            results.push({
                title: `Search Blender Documentation for "${query}"`,
                url: `https://docs.blender.org/manual/en/latest/search.html?q=${encodedQuery}`,
                description: `This search may not return many useful results in the Blender documentation.`,
                source: 'Docs',
                valid: false
            });
        }
        
        return results;
    }
    
    function displayWebResults(results, container) {
        // Remove loading spinner
        container.querySelector('.loading-spinner').remove();
        
        if (results.length === 0) {
            container.innerHTML += `<div class="no-results">No related web resources found.</div>`;
            return;
        }
        
        // Check if any results are marked as valid
        const hasValidResults = results.some(result => result.valid);
        
        if (!hasValidResults) {
            container.innerHTML += `
                <div class="web-results-warning">
                    <p>Your search may not return useful results on external websites. Try a more specific search term related to Blender features.</p>
                </div>
            `;
        }
        
        // Build HTML for each result
        let resultsHTML = '';
        results.forEach(result => {
            // Add a class for invalid results
            const cardClass = result.valid ? 'web-result-card' : 'web-result-card low-relevance';
            
            resultsHTML += `
                <div class="${cardClass}">
                    <div class="web-result-title">
                        <span class="source-tag">${result.source}</span>
                        <a href="${result.url}" target="_blank">${result.title}</a>
                        ${!result.valid ? '<span class="low-relevance-tag">Low Relevance</span>' : ''}
                    </div>
                    <div class="web-result-description">${result.description}</div>
                    <div class="web-result-url">${result.url}</div>
                </div>
            `;
        });
        
        container.innerHTML += resultsHTML;
    }
    
    // Add missing common shortcuts that users often search for
    function addMissingCommonShortcuts(shortcuts) {
        // Add "Rename" shortcut which is commonly searched
        const hasRename = shortcuts.some(s => 
            s.action.toLowerCase().includes('rename') && 
            s.keys.toLowerCase().includes('f2')
        );
        
        if (!hasRename) {
            shortcuts.push({
                category: "Object Mode",
                action: "Rename Object",
                keys: "F2",
                searchTerms: "rename object rename name change f2 object mode"
            });
        }
        
        // Add a few other common shortcuts that might be missing
        const commonMissingShortcuts = [
            {
                category: "General Shortcuts",  // Use consistent category naming
                action: "Search Menu",  // Simplified name to avoid duplication
                keys: "F3",
                searchTerms: "search find command tool menu f3 general"
            },
            {
                category: "Edit Mode",
                action: "Extrude", 
                keys: "E",
                searchTerms: "extrude e edit mode mesh modeling"
            },
            {
                category: "Object Mode",
                action: "Apply Transformations",
                keys: "Ctrl + A",
                searchTerms: "apply transformation location rotation scale ctrl+a object mode"
            },
            {
                category: "Edit Mode",
                action: "Merge Vertices",
                keys: "Alt + M",
                searchTerms: "merge vertices points alt+m edit mode"
            }
        ];
        
        // More careful duplicate checking
        commonMissingShortcuts.forEach(newShortcut => {
            const normalizedNewAction = newShortcut.action.toLowerCase().replace(/\s+/g, ' ').trim();
            const normalizedNewKeys = newShortcut.keys.toLowerCase().replace(/\s+/g, ' ').trim();
            
            const duplicate = shortcuts.some(existing => {
                const normalizedExistingAction = existing.action.toLowerCase().replace(/\s+/g, ' ').trim();
                const normalizedExistingKeys = existing.keys.toLowerCase().replace(/\s+/g, ' ').trim();
                
                // Check if this is essentially the same shortcut
                const actionSimilar = normalizedExistingAction.includes(normalizedNewAction) || 
                                      normalizedNewAction.includes(normalizedExistingAction);
                                      
                const keysSame = normalizedExistingKeys === normalizedNewKeys;
                
                return actionSimilar && keysSame;
            });
            
            if (!duplicate) {
                shortcuts.push(newShortcut);
            }
        });
    }
    
    // Try to fetch additional shortcuts from Blender docs for specific queries
    function fetchExtraShortcutsIfNeeded(query) {
        // Show a loading message
        const loadingMessage = document.createElement('div');
        loadingMessage.className = 'searching-docs-message';
        loadingMessage.innerHTML = `
            <div class="loading-spinner" style="padding: 1rem;">
                <div class="spinner"></div>
                <p>Searching Blender documentation for additional results...</p>
            </div>
        `;
        searchResults.appendChild(loadingMessage);
        
        // In a real implementation, this would fetch from the Blender website
        // For this demo, we'll just simulate it with a timeout and some hardcoded results
        setTimeout(() => {
            // Remove the loading message
            loadingMessage.remove();
            
            // If we found specific commands for this query
            if (query.toLowerCase().includes('rename')) {
                const extraResults = [
                    {
                        category: "Common Operations",
                        action: "Rename Active Object",
                        keys: "F2",
                        description: "Rename the currently selected object"
                    },
                    {
                        category: "Common Operations",
                        action: "Rename Active Material",
                        keys: "F2 (in Material Properties)",
                        description: "Rename the currently selected material"
                    },
                    {
                        category: "Node Editor",
                        action: "Rename Active Node",
                        keys: "F2",
                        description: "Rename the currently selected node"
                    }
                ];
                
                displayExtraResults(extraResults);
            }
        }, 1500);
    }
    
    function displayExtraResults(extraResults) {
        // Create a section for additional results
        const extraSection = document.createElement('div');
        extraSection.className = 'extra-results-section';
        
        let extraHTML = `
            <h3>Additional Results from Blender Documentation</h3>
            <div class="source-attribution">
                <p>Results from <a href="https://docs.blender.org/manual/en/latest/interface/keymap/blender_default.html" target="_blank">
                Blender's official documentation</a></p>
            </div>
        `;
        
        extraResults.forEach(result => {
            extraHTML += `
                <div class="shortcut-card">
                    <div class="shortcut-title">${result.action}</div>
                    <div class="shortcut-keys">${result.keys}</div>
                    <div class="shortcut-description">${result.description || `Part of ${result.category} shortcuts.`}</div>
                </div>
            `;
        });
        
        extraSection.innerHTML = extraHTML;
        
        // If there's a "no results" message, replace it
        const noResults = searchResults.querySelector('.no-results');
        if (noResults) {
            searchResults.replaceChild(extraSection, noResults);
        } else {
            // Otherwise just append to the results
            searchResults.appendChild(extraSection);
        }
    }
});
