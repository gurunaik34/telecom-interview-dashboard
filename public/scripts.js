// --- Global function for loading content into display pages ---
async function loadContent(slug, targetElementId) {
    const targetElement = document.getElementById(targetElementId);
    if (!targetElement) {
        console.error(`Target element with ID '${targetElementId}' not found.`);
        return;
    }

    targetElement.innerHTML = '<p>Loading content...</p>'; // Show loading message

    try {
        const response = await fetch(`/api/content/${slug}`);
        if (!response.ok) {
            // Check if it's a 404 and handle specifically
            if (response.status === 404) {
                targetElement.innerHTML = `<section class="dashboard-section"><h2 style="color: var(--danger-color);"><i class="fas fa-exclamation-triangle"></i> Content Not Found</h2><p>The content for slug "<strong>${slug}</strong>" could not be loaded. Please ensure it exists in the <a href="/admin">Admin Panel</a>.</p></section>`;
            } else {
                targetElement.innerHTML = `<p style="color: red;">Error loading content: ${response.statusText}</p>`;
            }
            return;
        }
        const data = await response.json();
        targetElement.innerHTML = data.htmlContent;

        // Re-attach event listeners for accordions after content is loaded
        attachAccordionListeners();

    } catch (error) {
        console.error('Error fetching content:', error);
        targetElement.innerHTML = `<p style="color: red;">Failed to load content. Please check server and network.</p>`;
    }
}

// --- Accordion functionality (moved to a function for reusability) ---
function attachAccordionListeners() {
    const accordionHeaders = document.querySelectorAll('.accordion-header');
    accordionHeaders.forEach(header => {
        // Remove existing listener to prevent duplicates if content is reloaded
        header.removeEventListener('click', toggleAccordion);
        // Add new listener
        header.addEventListener('click', toggleAccordion);
    });
}

function toggleAccordion(event) {
    const header = event.currentTarget;
    const content = header.nextElementSibling;
    const icon = header.querySelector('.accordion-icon');

    header.classList.toggle('active');

    if (content.style.display === 'block') {
        content.style.display = 'none';
    } else {
        content.style.display = 'block';
    }

    if (icon) {
        icon.classList.toggle('active');
    }
}

// --- Admin Panel specific functions ---

// Function to display messages (defined in admin.html script block for global access)
// It's passed as a global function reference in admin.html

async function loadContentList() {
    const contentListElement = document.getElementById('content-list');
    contentListElement.innerHTML = '<li>Loading content list...</li>';
    try {
        const response = await fetch('/api/content');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const contents = await response.json();

        contentListElement.innerHTML = ''; // Clear loading message

        if (contents.length === 0) {
            contentListElement.innerHTML = '<li>No content found. Add some using the form above!</li>';
            return;
        }

        contents.forEach(content => {
            const li = document.createElement('li');
            li.innerHTML = `
                <div class="content-info">
                    <strong>${content.title}</strong> (Slug: <code>${content.slug}</code>)<br>
                    <small>Category: ${content.category || 'N/A'} | Last Modified: ${new Date(content.lastModified).toLocaleString()}</small>
                </div>
                <div class="content-actions">
                    <button class="edit-btn" onclick="editContent('${content.slug}')"><i class="fas fa-edit"></i> Edit</button>
                    <button class="delete-btn" onclick="deleteContent('${content.slug}')"><i class="fas fa-trash-alt"></i> Delete</button>
                </div>
            `;
            contentListElement.appendChild(li);
        });

    } catch (error) {
        console.error('Error loading content list:', error);
        contentListElement.innerHTML = `<li><p style="color: red;">Error loading content list: ${error.message}</p></li>`;
        window.displayMessage('Failed to load content list. Check server.', 'error');
    }
}

async function editContent(slug) {
    try {
        const response = await fetch(`/api/content/${slug}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const content = await response.json();

        document.getElementById('content-id').value = content._id; // Store NeDB's internal _id
        document.getElementById('title').value = content.title;
        document.getElementById('slug').value = content.slug;
        document.getElementById('slug').readOnly = true; // Prevent changing slug during edit
        document.getElementById('category').value = content.category || '';
        tinymce.activeEditor.setContent(content.htmlContent); // Set TinyMCE content

        window.displayMessage(`Editing content: "${content.title}"`, 'info');
    } catch (error) {
        console.error('Error editing content:', error);
        window.displayMessage(`Failed to load content for editing: ${error.message}`, 'error');
    }
}

async function saveContent() {
    const _id = document.getElementById('content-id').value;
    const title = document.getElementById('title').value;
    const slug = document.getElementById('slug').value;
    const category = document.getElementById('category').value;
    const htmlContent = tinymce.activeEditor.getContent(); // Get content from TinyMCE

    if (!title || !slug || !htmlContent) {
        window.displayMessage('Title, Slug, and Content are required!', 'error');
        return;
    }

    const data = { title, slug, category, htmlContent };
    let response;

    try {
        if (_id) { // If _id exists, it's an update (PUT)
            response = await fetch(`/api/content/${slug}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } else { // Otherwise, it's a new content (POST)
            response = await fetch('/api/content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        }

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! Status: ${response.status}, Details: ${errorText}`);
        }

        window.displayMessage('Content saved successfully!', 'success');
        document.getElementById('content-form').reset();
        document.getElementById('content-id').value = '';
        document.getElementById('slug').readOnly = false;
        tinymce.activeEditor.setContent(''); // Clear editor
        loadContentList(); // Reload the list of content

    } catch (error) {
        console.error('Error saving content:', error);
        window.displayMessage(`Failed to save content: ${error.message}`, 'error');
    }
}

async function deleteContent(slug) {
    if (!confirm(`Are you sure you want to delete content with slug: ${slug}?`)) {
        return;
    }

    try {
        const response = await fetch(`/api/content/${slug}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        window.displayMessage('Content deleted successfully!', 'success');
        loadContentList(); // Reload the list

        // If the current form is editing the deleted item, clear it
        if (document.getElementById('slug').value === slug) {
            document.getElementById('content-form').reset();
            document.getElementById('content-id').value = '';
            document.getElementById('slug').readOnly = false;
            tinymce.activeEditor.setContent('');
        }

    } catch (error) {
        console.error('Error deleting content:', error);
        window.displayMessage(`Failed to delete content: ${error.message}`, 'error');
    }
}