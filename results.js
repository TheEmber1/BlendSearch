document.addEventListener('DOMContentLoaded', function() {
    const searchTerm = document.getElementById('search-term');
    const searchResults = document.getElementById('search-results');
    const backButton = document.getElementById('back-button');
    
    // Get the search query and preferences from localStorage
    const query = localStorage.getItem('searchQuery') || '';
    const webSearchEnabled = localStorage.getItem('webSearchEnabled') === 'true';
    searchTerm.textContent = query;
    
    // Load shortcuts from both local file and potentially from the Blender website
    fetch('blendershortcuts.json')
        .then(response => response.json())
        .then(data => {
            const shortcuts = data;
            
            // Add commonly searched shortcuts that might not be in the basic list
            addMissingCommonShortcuts(shortcuts);
            
            // Process the query to extract meaningful terms
            const processedQuery = processNaturalLanguageQuery(query);
            
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
            // Fallback to text file if JSON fails
            fetch('blendershortcuts.txt')
                .then(response => response.text())
                .then(text => {
                    const shortcuts = parseShortcutsText(text);
                    
                    // Add commonly searched shortcuts that might not be in the basic list
                    addMissingCommonShortcuts(shortcuts);
                    
                    // Process the query to extract meaningful terms
                    const processedQuery = processNaturalLanguageQuery(query);
                    
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
                .catch(err => {
                    console.error('Error loading shortcuts:', err);
                    searchResults.innerHTML = `<div class="no-results">Error loading shortcuts. Please try again later.</div>`;
                });
        });
    
    // Handle back button
    backButton.addEventListener('click', function() {
        // Store the current search query in session storage
        // This will allow the main page to access it when returning
        sessionStorage.setItem('returnSearch', query);
        window.location.href = 'index.html';
    });
    
    // NEW: Process natural language queries into search terms
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
        
        // Prioritize the Add menu shortcut for basic "add" queries
        if (processedQuery.trim() === 'add' || 
            processedQuery.trim() === 'add menu' || 
            processedQuery.trim() === 'create') {
            return 'add menu shift+a create new object priority-add-menu';
        }
        
        // Define common action mappings (e.g., "add" -> "add menu", "new" -> "add menu")
        const actionMappings = {
            'add': ['add menu', 'shift+a', 'create', 'new'],
            'new': ['add menu', 'shift+a', 'create', 'add'],
            'create': ['add menu', 'shift+a', 'new', 'add'],
            'cube': ['add mesh cube', 'primitive', 'box', 'shift+a add mesh cube'],
            'delete': ['delete', 'remove', 'x', 'del'],
            'remove': ['delete', 'x', 'del'],
            'move': ['grab', 'g', 'translate', 'position'],
            'grab': ['grab', 'g', 'move', 'translate', 'position'],
            'rotate': ['rotate', 'r', 'spin', 'turn'],
            'scale': ['scale', 's', 'resize', 'size'],
            'resize': ['scale', 's', 'size'],
            'select': ['select', 'box select', 'circle select', 'a', 'b', 'c'],
            'selection': ['select', 'box select', 'circle select', 'a', 'b', 'c'],
            'transform': ['grab', 'rotate', 'scale', 'g', 'r', 's', 'move'],
            'extrude': ['extrude', 'e', 'pull'],
            'copy': ['duplicate', 'shift+d', 'clone'],
            'duplicate': ['duplicate', 'shift+d', 'copy', 'clone'],
            'clone': ['duplicate', 'shift+d', 'copy'],
            'join': ['join', 'combine', 'merge', 'ctrl+j'],
            'combine': ['join', 'merge', 'ctrl+j'],
            'merge': ['join', 'combine', 'ctrl+j', 'merge vertices'],
            'save': ['save', 'ctrl+s', 'save as', 'save file'],
            'undo': ['undo', 'ctrl+z'],
            'redo': ['redo', 'ctrl+shift+z', 'ctrl+y'],
            'loop cut': ['loop cut', 'ctrl+r', 'edge loop'],
            'subdivide': ['subdivide', 'subdivision'],
            'render': ['render', 'f12', 'rendering', 'rendered view'],
            'uv': ['uv', 'unwrap', 'texture', 'mapping'],
            'view': ['view', 'viewport', 'camera', 'perspective', 'orthographic'],
            'camera': ['camera view', 'numpad 0', 'viewport', 'view'],
            'hide': ['hide', 'show', 'visible', 'invisible', 'h'],
            'edit mode': ['edit mode', 'tab', 'editing'],
            'object mode': ['object mode', 'tab', 'leave edit mode'],
            'wireframe': ['wireframe', 'toggle wireframe', 'z'],
            'material': ['material', 'shader', 'texture'],
            'parent': ['parent', 'ctrl+p', 'parenting'],
            'constraint': ['constraint', 'restrict', 'limit'],
        };
        
        // Expand the query with relevant terms from mappings
        let expandedTerms = [];
        const words = processedQuery.split(/\s+/).filter(w => w.trim().length > 0);
        
        for (const word of words) {
            expandedTerms.push(word); // Keep original word
            
            // Check each action mapping
            for (const [action, mappings] of Object.entries(actionMappings)) {
                // If word matches an action key, add all its mappings
                if (word === action || word.includes(action)) {
                    expandedTerms = expandedTerms.concat(mappings);
                }
                
                // If word is included in any mapping value, add the key and other mappings
                if (mappings.some(m => m.includes(word))) {
                    expandedTerms.push(action);
                    expandedTerms = expandedTerms.concat(mappings);
                }
            }
        }
        
        // Special cases for certain types of queries
        if (processedQuery.includes('cube') || 
            processedQuery.includes('object') || 
            processedQuery.includes('mesh') ||
            processedQuery.includes('primitive')) {
            
            if (processedQuery.includes('add') || 
                processedQuery.includes('create') || 
                processedQuery.includes('new')) {
                
                expandedTerms = expandedTerms.concat(['shift+a', 'add menu', 'shift a']);
            }
        }
        
        // Handle helpful phrase mappings
        const phraseMappings = {
            'add cube': ['shift+a', 'add mesh cube', 'shift a add mesh', 'add menu'],
            'create cube': ['shift+a', 'add mesh cube', 'shift a add mesh', 'add menu'],
            'new object': ['shift+a', 'add menu', 'add object'],
            'delete object': ['delete', 'x'],
            'move object': ['grab', 'g'],
            'rotate object': ['rotate', 'r'],
            'scale object': ['scale', 's'],
        };
        
        for (const [phrase, mappings] of Object.entries(phraseMappings)) {
            if (processedQuery.includes(phrase)) {
                expandedTerms = expandedTerms.concat(mappings);
            }
        }
        
        // Deduplicate expanded terms
        expandedTerms = [...new Set(expandedTerms)];
        
        return expandedTerms.join(' ');
    }
    
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
    
    function displayResults(shortcuts, query, processedQuery) {
        // Check if user is asking a general question rather than searching for a shortcut
        if (isInformationalQuery(query) && query.split(" ").length > 3 && !processedQuery) {
            // For informational queries, just show a simple message without suggestions
            searchResults.innerHTML = `
                <div class="no-results">
                    <p>No shortcuts found for "${query}"</p>
                </div>
            `;
            return;
        }
        
        const originalQuery = query.toLowerCase();
        const queryLower = processedQuery ? processedQuery.toLowerCase() : originalQuery;
        
        // Filter out common words from the search terms
        const searchWords = queryLower.split(/\s+/)
            .filter(word => word.trim().length > 0);  // Include all processed words
        
        // If no searchable words remain after filtering, show a message
        if (searchWords.length === 0 && query.length > 0) {
            searchResults.innerHTML = `
                <div class="no-results">
                    <p>No shortcuts found for "${query}"</p>
                </div>
            `;
            return;
        }
        
        // Enhanced scoring algorithm with more precise relevance calculation
        const scoredShortcuts = shortcuts.map(shortcut => {
            let score = 0;
            let exactMatchBonus = 0;
            let keywordMatchCount = 0;
            let keywordImportanceScore = 0;
            
            // STEP 1: DIRECT MATCHES - Highest priority
            
            // Exact key match (highest priority)
            if (shortcut.keys.toLowerCase().replace(/\s+/g, '') === originalQuery.replace(/\s+/g, '')) {
                score += 1000;
                exactMatchBonus += 500;
            }
            
            // Exact action match (very high priority)
            if (shortcut.action.toLowerCase() === originalQuery.toLowerCase()) {
                score += 900;
                exactMatchBonus += 400;
            }
            
            // STEP 2: KEYWORD ANALYSIS
            
            // Get important keywords from the query based on common Blender terms
            const importantKeywords = getImportantKeywords(originalQuery);
            
            // Check for complete important keyword matches
            for (const keyword of importantKeywords) {
                // Full keyword match in keys (highest value)
                if (shortcut.keys.toLowerCase().includes(keyword)) {
                    keywordMatchCount++;
                    keywordImportanceScore += 75;
                    
                    // Perfect match for shorter keywords like commands
                    if (shortcut.keys.toLowerCase() === keyword || 
                        shortcut.keys.toLowerCase().replace(/\+/g, '') === keyword) {
                        score += 300;
                    }
                }
                
                // Full keyword match in action (high value)
                if (shortcut.action.toLowerCase().includes(keyword)) {
                    keywordMatchCount++;
                    keywordImportanceScore += 50;
                    
                    // Perfect match for action
                    if (shortcut.action.toLowerCase() === keyword) {
                        score += 200;
                    }
                    
                    // Keyword at start of action (very relevant)
                    if (shortcut.action.toLowerCase().startsWith(keyword)) {
                        score += 100;
                    }
                }
                
                // Full keyword match in category (medium value)
                if (shortcut.category && shortcut.category.toLowerCase().includes(keyword)) {
                    keywordMatchCount++;
                    keywordImportanceScore += 25;
                }
                
                // Full keyword match in search terms (lower but still valuable)
                if (shortcut.searchTerms && shortcut.searchTerms.toLowerCase().includes(keyword)) {
                    keywordMatchCount++;
                    keywordImportanceScore += 20;
                }
            }
            
            // STEP 3: SPECIAL CASES - Handle specific high-priority shortcuts
            
            // Special case for Add Menu when searching for "add" related terms
            if ((originalQuery === 'add' || originalQuery.startsWith('add ') ||
                 originalQuery === 'create' || originalQuery.startsWith('create ') ||
                 originalQuery.includes('new object')) && 
                shortcut.keys.toLowerCase().includes('shift+a') && 
                (shortcut.action.toLowerCase().includes('add menu') || 
                 shortcut.action.toLowerCase().includes('create new'))) {
                
                score += 2000; // Make absolutely sure Add Menu comes first for basic add queries
            }
            
            // Special case for specific lookups like "add cube" etc.
            if (shortcut.action.toLowerCase().includes('add menu') && 
                shortcut.keys.toLowerCase().includes('shift+a')) {
                
                // Check if looking for specific object types
                const objectTypes = ['cube', 'sphere', 'plane', 'mesh', 'light', 'camera', 'curve'];
                for (const objType of objectTypes) {
                    if (originalQuery.includes(objType)) {
                        score += 750;
                    }
                }
            }
            
            // Special case for delete/remove when searching for those terms
            if ((originalQuery === 'delete' || originalQuery === 'remove') && 
                shortcut.keys.toLowerCase() === 'x' && 
                shortcut.action.toLowerCase().includes('delete')) {
                
                score += 1500;
            }
            
            // Special case for commonly searched operations
            const commonOperationMap = {
                'grab': ['g'],
                'move': ['g'],
                'rotate': ['r'],
                'scale': ['s'],
                'extrude': ['e'],
                'select all': ['a'],
                'deselect': ['a'],
                'select': ['a', 'b', 'c'],
                'box select': ['b'],
                'circle select': ['c'],
                'duplicate': ['shift+d'],
                'join': ['ctrl+j'],
                'parent': ['ctrl+p'],
                'search': ['f3'],
                'undo': ['ctrl+z'],
                'save': ['ctrl+s']
            };
            
            // Check for common operations in query
            for (const [operation, keys] of Object.entries(commonOperationMap)) {
                if (originalQuery.includes(operation)) {
                    // Check if this shortcut is for this operation
                    if (keys.some(k => shortcut.keys.toLowerCase().includes(k)) && 
                        shortcut.action.toLowerCase().includes(operation)) {
                        score += 800;
                    }
                }
            }
            
            // STEP 4: NATURAL LANGUAGE PROCESSING
            
            // Handle "how to" and similar queries
            if (query.toLowerCase().startsWith("how to") || 
                query.toLowerCase().startsWith("how do i")) {
                
                const actionPart = query.toLowerCase()
                    .replace("how to", "")
                    .replace("how do i", "")
                    .trim();
                
                // Check direct match on the action part
                if (shortcut.action.toLowerCase().includes(actionPart)) {
                    score += 500;
                }
                
                // Handle specific action verbs
                const actionVerbs = [
                    { verb: "add", keys: ["shift+a"] },
                    { verb: "create", keys: ["shift+a"] },
                    { verb: "delete", keys: ["x"] },
                    { verb: "remove", keys: ["x"] },
                    { verb: "move", keys: ["g"] },
                    { verb: "grab", keys: ["g"] },
                    { verb: "rotate", keys: ["r"] },
                    { verb: "scale", keys: ["s"] },
                    { verb: "select", keys: ["a", "b", "c"] },
                    { verb: "extrude", keys: ["e"] },
                    { verb: "duplicate", keys: ["shift+d"] },
                    { verb: "copy", keys: ["shift+d"] },
                    { verb: "join", keys: ["ctrl+j"] },
                    { verb: "connect", keys: ["j", "f"] }
                ];
                
                for (const { verb, keys } of actionVerbs) {
                    if (actionPart.includes(verb) && 
                        keys.some(k => shortcut.keys.toLowerCase().includes(k))) {
                        score += 600;
                    }
                }
            }
            
            // STEP 5: PRIORITY MARKERS
            
            // Check for priority flag in processed query
            if (processedQuery && processedQuery.includes('priority-add-menu') && 
                shortcut.keys.toLowerCase().includes('shift+a') && 
                shortcut.action.toLowerCase().includes('add menu')) {
                score += 1000;
            }
            
            // Check for high priority flag
            if (shortcut.highPriority === true) {
                score += 300;
            }
            
            // STEP 6: SECONDARY WORD MATCHING
            
            // Word-by-word matching for each search word
            for (const word of searchWords) {
                if (word.length <= 1) continue; // Skip very short terms
                
                // Direct key match
                if (shortcut.keys.toLowerCase() === word) {
                    score += 120;
                } else if (shortcut.keys.toLowerCase().includes(word)) {
                    score += 80;
                }
                
                // Action match
                if (shortcut.action.toLowerCase().includes(word)) {
                    score += 70;
                }
                
                // Category match
                if (shortcut.category && shortcut.category.toLowerCase().includes(word)) {
                    score += 40;
                }
                
                // Search terms match
                if (shortcut.searchTerms && shortcut.searchTerms.includes(word)) {
                    score += 30;
                }
            }
            
            // STEP 7: APPLY MATCH QUALITY FACTORS
            
            // Apply a multiplier based on how many keywords matched (increases relevance)
            if (importantKeywords.length > 0) {
                // Calculate match percentage (1.0 = 100% match)
                const matchPercentage = keywordMatchCount / importantKeywords.length;
                
                // Apply match percentage multiplier
                if (matchPercentage >= 0.75) {
                    score *= 1.5; // 75% or more keywords matched = 50% boost
                } else if (matchPercentage >= 0.5) {
                    score *= 1.25; // 50-74% keywords matched = 25% boost
                }
            }
            
            // Exact matches get additional boost
            score += exactMatchBonus;
            
            // Add keyword importance score
            score += keywordImportanceScore;
            
            // Record debugging info
            const debugInfo = {
                action: shortcut.action,
                keys: shortcut.keys,
                score: score,
                keywordMatches: keywordMatchCount,
                importantKeywords: importantKeywords.join(', ')
            };
            
            return { shortcut, score, debugInfo };
        });
        
        // Log top 5 scoring results for debugging (can be removed in production)
        const topDebugResults = scoredShortcuts
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);
        
        console.log(`Debug: Top 5 results for "${query}":`);
        topDebugResults.forEach((item, i) => {
            console.log(`${i+1}. ${item.shortcut.action} (${item.shortcut.keys}) - Score: ${item.score}`);
        });
        
        // Filter shortcuts that have a positive score and sort by score (highest first)
        const filteredShortcuts = scoredShortcuts
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .map(item => item.shortcut);
        
        // Deduplicate shortcuts - if we have multiples with same keys and action, keep only one
        const uniqueShortcuts = deduplicateShortcuts(filteredShortcuts);
        
        // Display the results or a "no results" message
        if (uniqueShortcuts.length === 0) {
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
                // Try to suggest some related shortcuts based on query analysis
                const suggestedShortcuts = findSuggestedShortcuts(shortcuts, query);
                
                if (suggestedShortcuts.length > 0) {
                    displayShortcutResults(suggestedShortcuts);
                    
                    // Add a note that these are suggested matches
                    const noteDiv = document.createElement('div');
                    noteDiv.className = 'partial-match-note';
                    noteDiv.textContent = 'No exact matches found. Here are some shortcuts that might help:';
                    searchResults.insertBefore(noteDiv, searchResults.firstChild);
                } else {
                    searchResults.innerHTML = `
                        <div class="no-results">
                            <p>No shortcuts found for "${query}"</p>
                        </div>
                    `;
                }
            }
            return;
        }
        
        displayShortcutResults(uniqueShortcuts);
    }
    
    // Helper function: Extract important keywords from a query
    function getImportantKeywords(query) {
        // Clean the query
        const cleanedQuery = query.toLowerCase().replace(/[^\w\s]/g, ' ').trim();
        
        // Split into words
        const words = cleanedQuery.split(/\s+/);
        
        // Remove very common words and keep only meaningful terms
        const stopWords = [
            'how', 'to', 'do', 'i', 'can', 'the', 'in', 'blender', 'shortcut', 'shortcuts',
            'keyboard', 'key', 'keys', 'what', 'is', 'for', 'with', 'using', 'a', 'an',
            'want', 'need', 'get', 'make', 'use', 'used', 'way', 'show', 'me', 'please',
            'help', 'tell', 'where', 'when', 'which', 'button', 'press'
        ];
        
        // List of high-value keywords in Blender context
        const highValueKeywords = [
            'add', 'create', 'new', 'delete', 'remove', 'move', 'grab', 'translate', 
            'rotate', 'scale', 'extrude', 'select', 'deselect', 'loop', 'cut', 'join',
            'separate', 'merge', 'split', 'duplicate', 'copy', 'paste', 'undo', 'redo',
            'save', 'load', 'render', 'animate', 'keyframe', 'curve', 'mesh', 'object',
            'face', 'edge', 'vertex', 'point', 'camera', 'light', 'material', 'texture',
            'uv', 'unwrap', 'mode', 'edit', 'sculpt', 'paint', 'draw', 'render', 'view',
            'hide', 'show', 'wireframe', 'solid', 'shade', 'smooth', 'flat', 'parent',
            'child', 'constraint', 'modifier', 'apply', 'transform', 'tab', 'menu',
            'pie', 'panel', 'properties', 'preferences', 'settings'
        ];
        
        // Extract all important keywords
        const keywords = [];
        
        // First get any direct command keys that might be in the query
        const potentialKeys = ['a', 'b', 'c', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 
                               'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
                               'tab', 'space', 'shift+a', 'ctrl+j', 'ctrl+z', 'shift+d'];
                               
        // Check for direct key references
        for (const key of potentialKeys) {
            if (cleanedQuery === key || cleanedQuery.includes(' ' + key + ' ') || 
                cleanedQuery.endsWith(' ' + key) || cleanedQuery.startsWith(key + ' ')) {
                keywords.push(key);
            }
        }
        
        // Check for high-value keywords
        for (const keyword of highValueKeywords) {
            // Only add the keyword if it's in the query as a whole word
            if (cleanedQuery === keyword || cleanedQuery.includes(' ' + keyword + ' ') || 
                cleanedQuery.endsWith(' ' + keyword) || cleanedQuery.startsWith(keyword + ' ')) {
                keywords.push(keyword);
            }
        }
        
        // Add remaining words that aren't stop words and are at least 3 characters
        for (const word of words) {
            if (!stopWords.includes(word) && word.length >= 3 && !keywords.includes(word)) {
                keywords.push(word);
            }
        }
        
        // Special case for compound terms that should be considered together
        const compoundTerms = [
            'add menu', 'loop cut', 'box select', 'circle select', 'edge loop',
            'face select', 'vertex select', 'edit mode', 'object mode', 'texture paint',
            'weight paint', 'vertex paint', 'uv mapping', 'vertex group'
        ];
        
        for (const term of compoundTerms) {
            if (cleanedQuery.includes(term)) {
                keywords.push(term);
            }
        }
        
        return keywords;
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
        // First check if Shift+A (Add Menu) shortcut exists
        const hasAddMenu = shortcuts.some(s => 
            s.keys.toLowerCase().includes('shift+a') && 
            s.action.toLowerCase().includes('add menu')
        );
        
        // If not, add it as the highest priority
        if (!hasAddMenu) {
            shortcuts.unshift({
                category: "General Shortcuts",
                action: "Add Menu (Create New Objects)",
                keys: "Shift + A",
                searchTerms: "add menu create new object mesh cube sphere plane light camera shift+a primary add create",
                highPriority: true  // Mark this as a high priority shortcut
            });
        } else {
            // If it does exist, move it to the top of the array for better indexing and
            // update its search terms and mark it as high priority
            for (let i = 0; i < shortcuts.length; i++) {
                if (shortcuts[i].keys.toLowerCase().includes('shift+a') && 
                    shortcuts[i].action.toLowerCase().includes('add menu')) {
                    
                    // Update the shortcut
                    shortcuts[i].searchTerms = (shortcuts[i].searchTerms || "") + 
                        " primary add create new object mesh cube sphere add cube add object";
                    shortcuts[i].highPriority = true;
                    
                    // Remove it from its current position
                    const shortcut = shortcuts.splice(i, 1)[0];
                    
                    // Add it to the beginning of the array
                    shortcuts.unshift(shortcut);
                    break;
                }
            }
        }
        
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
                category: "General Shortcuts",
                action: "Search Menu",
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
            },
            {
                category: "General Shortcuts",
                action: "Add Menu (Create New Objects)",
                keys: "Shift + A",
                searchTerms: "add menu create new object mesh curve light camera add cube add sphere add plane shift+a"
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
