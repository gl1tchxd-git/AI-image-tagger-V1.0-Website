const API_BASE_URL = `http://${window.location.hostname}:5000/api`;

let dropArea = document.getElementById('drop-area');
let fileList = document.getElementById('file-list');
let submitBtn = document.getElementById('submit-btn');
let processFolderBtn = document.getElementById('process-folder-btn');
let imageGallery = document.getElementById('image-gallery');
let filesToUpload = new Map();

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, highlight, false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, unhighlight, false);
});

function highlight(e) {
    dropArea.classList.add('highlight');
}

function unhighlight(e) {
    dropArea.classList.remove('highlight');
}

dropArea.addEventListener('drop', handleDrop, false);

function fetchAndDisplayImages() {
    fetch(`${API_BASE_URL}/search`)
        .then(response => response.json())
        .then(data => {
            imageGallery.innerHTML = '';
            data.forEach(image => {
                let galleryItem = document.createElement('div');
                galleryItem.className = 'gallery-item';
                
                let img = document.createElement('img');
                img.src = `${API_BASE_URL}/image/${encodeURIComponent(image.path)}`;
                img.alt = image.path;
                
                let fileName = document.createElement('span');
                fileName.textContent = image.path.split('/').pop();
                
                // galleryItem.appendChild(img);
                // galleryItem.appendChild(fileName);
                // imageGallery.appendChild(galleryItem);
            });
        })
        .catch(error => {
            console.error('Error fetching images:', error);
        });
}


function handleDrop(e) {
    let dt = e.dataTransfer;
    let files = dt.files;
    handleFiles(files);
}

function handleFiles(files) {
    [...files].forEach(previewFile);
}

function previewFile(file) {
    let reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = function() {
        let fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        
        let img = document.createElement('img');
        img.src = reader.result;
        img.className = 'preview';
        
        let fileName = document.createElement('span');
        fileName.textContent = file.name;
        
        let removeBtn = document.createElement('button');
        removeBtn.className = 'button';
        removeBtn.innerHTML = `
            <svg viewBox="0 0 448 512" class="svgIcon">
                <path d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z"></path>
            </svg>
        `;
        removeBtn.onclick = function() {
            filesToUpload.delete(file.name);
            fileList.removeChild(fileItem);
            updateSubmitButton();
        };
        
        fileItem.appendChild(img);
        fileItem.appendChild(fileName);
        fileItem.appendChild(removeBtn);
        fileList.appendChild(fileItem);
        
        filesToUpload.set(file.name, file);
        updateSubmitButton();
    }
}

function updateSubmitButton() {
    if (filesToUpload.size > 0) {
        submitBtn.style.display = 'block';
    } else {
        submitBtn.style.display = 'none';
    }
}

let fileInput = document.getElementById('file');
fileInput.addEventListener('change', function(e) {
    handleFiles(this.files);
});

submitBtn.addEventListener('click', uploadFiles);

function uploadFiles() {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Uploading...';
    
    let uploadPromises = Array.from(filesToUpload.values()).map(uploadFile);
    
    Promise.all(uploadPromises)
        .then(results => {
            let successCount = results.filter(result => result.success).length;
            alert(`Successfully uploaded ${successCount} out of ${results.length} files.`);
            filesToUpload.clear();
            fileList.innerHTML = '';
            updateSubmitButton();
            fetchAndDisplayImages();
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred during upload');
        })
        .finally(() => {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Upload Files';
        });
}

function uploadFile(file) {
    return new Promise((resolve, reject) => {
        let formData = new FormData();
        formData.append('file', file);
        formData.append('folder', 'images');

        fetch(`${API_BASE_URL}/upload`, {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => {
                    throw new Error(`HTTP error! status: ${response.status}, message: ${text}`);
                });
            }
            return response.json();
        })
        .then(data => {
            console.log('Upload successful:', data);
            resolve({success: true, data: data});
        })
        .catch(error => {
            console.error('Upload error:', error);
            resolve({success: false, error: error.message});
        });
    });
}



processFolderBtn.addEventListener('click', processFolder);

function processFolder() {
    processFolderBtn.disabled = true;
    processFolderBtn.textContent = 'Processing...';

    fetch(`${API_BASE_URL}/process-folder`, { method: 'POST' })
        .then(response => response.json())
        .then(data => {
            alert(data.message);
            fetchAndDisplayImages();
        })
        .catch(error => {
            console.error('Error processing folder:', error);
            alert('Small error occurred while processing the folder, not important');
        })
        .finally(() => {
            processFolderBtn.disabled = false;
            processFolderBtn.textContent = 'Process Folder';
        });
}

fetchAndDisplayImages();
updateSubmitButton();