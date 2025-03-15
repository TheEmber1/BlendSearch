document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const webSearchCheckbox = document.getElementById('enable-web-search');
    const popularTags = document.querySelectorAll('.tag');
    const recentSearchesContainer = document.getElementById('recent-searches-container');
    const recentSearchesDiv = document.getElementById('recent-searches');
    
    // Load recent searches from localStorage
    loadRecentSearches();
    
    // Check if we're returning from results page and populate the search input
    const returnSearch = sessionStorage.getItem('returnSearch');
    if (returnSearch) {
        searchInput.value = returnSearch;
        sessionStorage.removeItem('returnSearch'); // Clear after using
        
        // Check if this was an actual search and add it to recents
        // This handles the case where a user searched and then clicked back
        if (returnSearch.trim() !== '') {
            addToRecentSearches(returnSearch);
            loadRecentSearches(); // Refresh the display immediately
        }
    }
    
    // Handle search form submission
    function performSearch() {
        const query = searchInput.value.trim();
        if (query) {
            // Save search query to localStorage
            localStorage.setItem('searchQuery', query);
            localStorage.setItem('webSearchEnabled', webSearchCheckbox.checked);
            
            // Store in session storage to retrieve when returning
            sessionStorage.setItem('returnSearch', query);
            
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
    
    // Handle popular tag clicks
    popularTags.forEach(tag => {
        tag.addEventListener('click', function() {
            const searchTerm = this.getAttribute('data-search');
            searchInput.value = searchTerm;
            performSearch();
        });
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
});
