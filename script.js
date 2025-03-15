document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const webSearchCheckbox = document.getElementById('enable-web-search');
    const recentSearchesContainer = document.getElementById('recent-searches-container');
    const recentSearchesDiv = document.getElementById('recent-searches');
    const themeToggle = document.getElementById('theme-toggle');
    
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
        sessionStorage.removeItem('webSearchState'); // Clear after using
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
});
