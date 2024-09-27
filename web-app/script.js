const API_BASE_URL = `http://${window.location.hostname}:5000/api`;
const IMAGES_PER_PAGE = 100;
let currentResults = [];
let currentPage = 0;
let allTags = [];

const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const resultsFrame = document.getElementById('results-frame');
const loadMoreButton = document.getElementById('load-more');
const indexButton = document.getElementById('index-button');
const resultsNumber = document.getElementById('results-number');
const loadingIndicator = document.createElement('p');
loadingIndicator.textContent = 'Loading...';

// Create and add sort dropdown
const sortDropdown = document.createElement('select');
sortDropdown.id = 'sort-dropdown';

const sortOptions = [
    { value: 'random', text: 'Random' },
    { value: 'newest', text: 'Newest to Oldest' },
    { value: 'oldest', text: 'Oldest to Newest' },
    { value: 'a-z', text: 'A-Z' },
    { value: 'z-a', text: 'Z-A' }
];

sortOptions.forEach(option => {
    const optionElement = document.createElement('option');
    optionElement.value = option.value;
    optionElement.textContent = option.text;
    sortDropdown.appendChild(optionElement);
});

document.querySelector('.search-frame').appendChild(sortDropdown);
window.addEventListener('load', searchImages);

// Event Listeners
searchButton.addEventListener('click', searchImages);
searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        searchImages();
    }
});
loadMoreButton.addEventListener('click', loadMore);
indexButton.addEventListener('click', indexImages);
sortDropdown.addEventListener('change', () => {
    currentPage = 0;
    sortResults();
    displayResults();
});


async function fetchAllTags() {
    try {
        const response = await fetch(`${API_BASE_URL}/all-tags`);
        allTags = await response.json();
    } catch (error) {
        console.error('Error fetching tags:', error);
    }
}


function populateSortDropdown() {
    sortDropdown.innerHTML = ''; // Clear existing options
    sortOptions.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option.value;
        optionElement.textContent = option.text;
        sortDropdown.appendChild(optionElement);
    });
}

// Call this function when the page loads
window.addEventListener('load', () => {
    populateSortDropdown();
    searchImages();
});



fetchAllTags();

function autocomplete(inp) {
    let currentFocus;
    inp.addEventListener("input", function(e) {
        let a, b, i, val = this.value;
        closeAllLists();
        
        let tags = val.split(',');
        let currentTag = tags[tags.length - 1].trim();
        
        if (!currentTag) { return false; }
        currentFocus = -1;
        a = document.createElement("DIV");
        a.setAttribute("id", this.id + "autocomplete-list");
        a.setAttribute("class", "autocomplete-items");
        this.parentNode.appendChild(a);
        for (i = 0; i < allTags.length; i++) {
            if (allTags[i].substr(0, currentTag.length).toUpperCase() == currentTag.toUpperCase()) {
                b = document.createElement("DIV");
                b.innerHTML = tags.slice(0, -1).join(', ') + (tags.length > 1 ? ', ' : '');
                b.innerHTML += "<strong>" + allTags[i].substr(0, currentTag.length) + "</strong>";
                b.innerHTML += allTags[i].substr(currentTag.length);
                b.innerHTML += "<input type='hidden' value='" + allTags[i] + "'>";
                b.addEventListener("click", function(e) {
                    let selectedTag = this.getElementsByTagName("input")[0].value;
                    tags[tags.length - 1] = selectedTag;
                    inp.value = tags.join(', ') + ', ';
                    closeAllLists();
                    inp.focus();
                });
                a.appendChild(b);
            }
        }
    });

    inp.addEventListener("keydown", function(e) {
        let x = document.getElementById(this.id + "autocomplete-list");
        if (x) x = x.getElementsByTagName("div");
        if (e.keyCode == 40) {
            currentFocus++;
            addActive(x);
        } else if (e.keyCode == 38) {
            currentFocus--;
            addActive(x);
        } else if (e.keyCode == 13) {
            e.preventDefault();
            if (currentFocus > -1) {
                if (x) x[currentFocus].click();
            }
        } else if (e.keyCode == 9) {
            e.preventDefault();
            if (x && x.length > 0) {
                x[0].click();
            }
        }
    });

    function addActive(x) {
        if (!x) return false;
        removeActive(x);
        if (currentFocus >= x.length) currentFocus = 0;
        if (currentFocus < 0) currentFocus = (x.length - 1);
        x[currentFocus].classList.add("autocomplete-active");
    }

    function removeActive(x) {
        for (let i = 0; i < x.length; i++) {
            x[i].classList.remove("autocomplete-active");
        }
    }

    function closeAllLists(elmnt) {
        let x = document.getElementsByClassName("autocomplete-items");
        for (let i = 0; i < x.length; i++) {
            if (elmnt != x[i] && elmnt != inp) {
                x[i].parentNode.removeChild(x[i]);
            }
        }
    }

    document.addEventListener("click", function (e) {
        closeAllLists(e.target);
    });
}

autocomplete(document.getElementById("search-input"));

async function searchImages() {
    const tags = searchInput.value;
    console.log('Searching for tags:', tags);
    showLoading();
    
    try {
        const response = await fetch(`${API_BASE_URL}/search?tags=${encodeURIComponent(tags)}`);
        const data = await response.json();
        console.log('Search results:', data);
        
        currentResults = data;
        currentPage = 0;
        sortResults();
        
        await displayResults();
    } catch (error) {
        console.error('Error searching images:', error);
    } finally {
        hideLoading();
    }
}

async function displayResults() {
    console.log('Displaying results, page:', currentPage);
    clearResults();
    const start = currentPage * IMAGES_PER_PAGE;
    const end = Math.min(start + IMAGES_PER_PAGE, currentResults.length);
    const pageResults = currentResults.slice(start, end);

    if (pageResults.length === 0) {
        resultsFrame.innerHTML = '<p>No matching images found.</p>';
    } else {
        for (const result of pageResults) {
            const card = await createImageCard(result);
            resultsFrame.appendChild(card);
        }
    }

    loadMoreButton.style.display = end < currentResults.length ? 'block' : 'none';
    console.log('Results displayed');
}

async function createImageCard(result) {
    const card = document.createElement('div');
    card.className = 'image-card';

    const imageContainer = document.createElement('div');
    imageContainer.className = 'image-container';

    const img = document.createElement('img');
    img.src = `${API_BASE_URL}/image/${encodeURIComponent(result.path)}`;
    img.alt = 'Image';
    img.addEventListener('click', () => openImage(result.path));

    await new Promise((resolve, reject) => {
        img.onload = () => {
            const aspectRatio = (img.naturalHeight / img.naturalWidth) * 100;
            imageContainer.style.paddingTop = `${aspectRatio}%`;
            imageContainer.style.setProperty('--background-image', `url(${img.src})`);
            resolve();
        };
        img.onerror = reject;
    });

    imageContainer.appendChild(img);
    card.appendChild(imageContainer);

    const tags = document.createElement('div');
    tags.className = 'tags';
    tags.textContent = `Tags: ${truncateTags(result.tags)}`;
    tags.addEventListener('click', () => toggleTags(tags, result.tags));

    card.appendChild(tags);

    const dateElement = document.createElement('div');
    dateElement.className = 'image-date';
    dateElement.textContent = `Date: ${new Date(result.date).toLocaleString()}`;
    card.appendChild(dateElement);

    // Add edit button
    const editButton = document.createElement('button');
    editButton.className = 'edit-button';
    editButton.innerHTML = `
        <svg class="edit-svgIcon" viewBox="0 0 512 512">
            <path d="M410.3 231l11.3-11.3-33.9-33.9-62.1-62.1L291.7 89.8l-11.3 11.3-22.6 22.6L58.6 322.9c-10.4 10.4-18 23.3-22.2 37.4L1 480.7c-2.5 8.4-.2 17.5 6.1 23.7s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L387.7 253.7 410.3 231zM160 399.4l-9.1 22.7c-4 3.1-8.5 5.4-13.3 6.9L59.4 452l23-78.1c1.4-4.9 3.8-9.4 6.9-13.3l22.7-9.1v32c0 8.8 7.2 16 16 16h32zM362.7 18.7L348.3 33.2 325.7 55.8 314.3 67.1l33.9 33.9 62.1 62.1 33.9 33.9 11.3-11.3 22.6-22.6 14.5-14.5c25-25 25-65.5 0-90.5L453.3 18.7c-25-25-65.5-25-90.5 0zm-47.4 168l-144 144c-6.2 6.2-16.4 6.2-22.6 0s-6.2-16.4 0-22.6l144-144c6.2-6.2 16.4-6.2 22.6 0s6.2 16.4 0 22.6z"></path>
        </svg>
    `;
    editButton.style.position = 'absolute';
    editButton.style.bottom = '10px';
    editButton.style.right = '10px';
    editButton.addEventListener('click', (e) => {
        e.stopPropagation();
        openEditModal(result);
    });
    imageContainer.appendChild(editButton);

    return card;
}


function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}



function openEditModal(image) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close">&times;</span>
            <h2>Edit Tags</h2>
            <textarea id="edit-tags" rows="4" cols="50">${image.tags}</textarea>
            <button id="save-tags">Save</button>
        </div>
    `;
    document.body.appendChild(modal);

    modal.style.display = 'block';

    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = () => {
        document.body.removeChild(modal);
    };

    window.onclick = (event) => {
        if (event.target == modal) {
            document.body.removeChild(modal);
        }
    };

    const saveBtn = modal.querySelector('#save-tags');
    saveBtn.onclick = () => {
        const newTags = modal.querySelector('#edit-tags').value;
        saveTags(image.path, newTags);
        document.body.removeChild(modal);
    };
}

async function saveTags(imagePath, newTags) {
    try {
        const response = await fetch(`${API_BASE_URL}/update-tags`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ path: imagePath, tags: newTags }),
        });
        const data = await response.json();
        if (data.success) {
            alert('Tags updated successfully');
            // Refresh the search results
            searchImages();
        } else {
            alert('Failed to update tags');
        }
    } catch (error) {
        console.error('Error updating tags:', error);
        alert('An error occurred while updating tags');
    }
}






function truncateTags(tags) {
    return tags.length > 20 ? tags.substring(0, 25) + '...' : tags;
}

function toggleTags(element, fullTags) {
    element.textContent = element.textContent.endsWith('...')
        ? `Tags: ${fullTags}`
        : `Tags: ${truncateTags(fullTags)}`;
}

function openImage(path) {
    window.open(`${API_BASE_URL}/image/${encodeURIComponent(path)}`, '_blank');
}

function loadMore() {
    currentPage++;
    displayResults();
}

async function indexImages() {
    indexButton.disabled = true;
    indexButton.textContent = 'Indexing...';

    try {
        const response = await fetch(`${API_BASE_URL}/index`, { method: 'POST' });
        const data = await response.json();
        console.log(data.message);
        await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
        console.error('Error indexing images:', error);
    } finally {
        indexButton.disabled = false;
        indexButton.textContent = 'Completed ✔️';
        await new Promise(resolve => setTimeout(resolve, 3000));
        indexButton.textContent = 'Index images';
    }
}

const processFolderButton = document.getElementById('process-folder-button');

processFolderButton.addEventListener('click', processFolder);

async function processFolder() {
    processFolderButton.disabled = true;
    processFolderButton.textContent = 'Processing...';

    try {
        const response = await fetch(`${API_BASE_URL}/process-folder`, { method: 'POST' });
        const data = await response.json();
        console.log(data.message);
        alert('Folder processing complete');
    } catch (error) {
        console.error('Error processing folder:', error);
        alert('An error occurred while processing the folder. Please try again.');
    } finally {
        processFolderButton.disabled = false;
        processFolderButton.textContent = 'Process Folder';
    }
}


function showLoading() {
    resultsFrame.appendChild(loadingIndicator);
}

function hideLoading() {
    if (loadingIndicator.parentNode === resultsFrame) {
        resultsFrame.removeChild(loadingIndicator);
    }
}

function clearResults() {
    while (resultsFrame.firstChild) {
        resultsFrame.removeChild(resultsFrame.firstChild);
    }
}

function getFirstTag(tags) {
    const tagList = tags.split(',');
    return tagList[0].trim().toLowerCase().replace(/^(a|an|the)\s+/, '');
}

function sortResults() {
    const sortOrder = sortDropdown.value;
    if (sortOrder === 'random') {
        // Shuffle the array using Fisher-Yates algorithm
        for (let i = currentResults.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [currentResults[i], currentResults[j]] = [currentResults[j], currentResults[i]];
        }
    } else {
        currentResults.sort((a, b) => {
            switch (sortOrder) {
                case 'newest':
                    return new Date(b.date) - new Date(a.date);
                case 'oldest':
                    return new Date(a.date) - new Date(b.date);
                case 'a-z':
                    return getFirstTag(a.tags).localeCompare(getFirstTag(b.tags));
                case 'z-a':
                    return getFirstTag(b.tags).localeCompare(getFirstTag(a.tags));
                default:
                    return 0;
            }
        });
    }
}

console.log('Script loaded and ready');
