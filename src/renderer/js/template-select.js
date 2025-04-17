// const { log } = require('console')

let currentApplication = null

document.addEventListener('DOMContentLoaded', async () => {
    // Get application data from localStorage
    const appData = JSON.parse(localStorage.getItem('currentApplication'))
    currentApplication = appData
    
    displayApplicationDetails(appData)
    await loadTemplates()
    
    // Listen for template additions
    window.electronAPI.onTemplateAdded((event, fileName) => {
        addTemplateToList(fileName)
    })
})

// Add skip template function
async function skipTemplate() {
    try {
        // Create application without CV
        const result = await window.electronAPI.createApplication(currentApplication)
        
        if (result.success) {
            // Clear stored application data
            localStorage.removeItem('currentApplication')
            
            // Navigate back to home page
            window.location.href = 'home.html'
        } else {
            alert('Error creating application')
        }
    } catch (error) {
        alert('Error creating application')
    }
}

function displayApplicationDetails(application) {
    const detailsDiv = document.getElementById('applicationDetails')
    detailsDiv.innerHTML = `
        <p><strong>Company:</strong> ${application.companyName}</p>
        <p><strong>Role:</strong> ${application.role}</p>
        <p><strong>Applied Date:</strong> ${application.appliedDate}</p>
        <p><strong>Job Type:</strong> ${application.jobType}</p>
        <p><strong>Status:</strong> ${application.status}</p>
    `
}

async function loadTemplates() {
    const templates = await window.electronAPI.getCVTemplates()
    const templatesDiv = document.getElementById('templatesList')
    templatesDiv.innerHTML = ''

    templates.forEach(template => {
        const templateCard = document.createElement('div')
        templateCard.className = 'template-card'
        templateCard.innerHTML = `
            <div class="template-icon">
                <i class="fas fa-file-word"></i>
            </div>
            <h4>${template}</h4>
            <div class="template-actions">
                <button onclick="selectTemplate('${template}')" class="select-btn">
                    <i class="fas fa-check"></i> Select
                </button>
                <button onclick="editTemplate('${template}')" class="edit-btn">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button onclick="deleteTemplate('${template}')" class="delete-btn">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        `
        templatesDiv.appendChild(templateCard)
    })
}

function addTemplateToList(template) {
    const templatesDiv = document.getElementById('templatesList')
    const templateCard = document.createElement('div')
    templateCard.className = 'template-card'
    templateCard.innerHTML = `
        <div class="template-icon">
                <i class="fas fa-file-word"></i>
            </div>
            <h4>${template}</h4>
            <div class="template-actions">
                <button onclick="selectTemplate('${template}')" class="select-btn">
                    <i class="fas fa-check"></i> Select
                </button>
                <button onclick="editTemplate('${template}')" class="edit-btn">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button onclick="deleteTemplate('${template}')" class="delete-btn">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `
    templatesDiv.appendChild(templateCard)
}

async function addNewTemplate() {
    try {
        // Open file dialog
        const filePath = await window.electronAPI.selectTemplateFile()
        
        if (filePath) {
            // Add template to templates folder
            const result = await window.electronAPI.addNewTemplate(filePath)
            
            if (result.success) {
                // Template will be added to the list via the onTemplateAdded event
                showNotification('Template added successfully!')
            } else {
                showNotification('Error adding template: ' + result.error, 'error')
            }
        }
    } catch (error) {
        console.error('Error:', error)
        showNotification('Error adding template', 'error')
    }
}

function showNotification(message, type = 'success') {
    // You can implement this function to show notifications
    // For now, we'll use alert
    alert(message)
}

async function selectTemplate(templateName) {
    try {
        // Create application first
        const result = await window.electronAPI.createApplication(currentApplication)
        
        if (result.success) {
            // Copy template to application folder
            const copyResult = await window.electronAPI.copyCVTemplate(
                templateName, 
                result.appId
            )
            
            if (copyResult.success) {
                // Open the CV file
                await window.electronAPI.openCV(copyResult.cvPath)
                
                // Clear stored application data
                localStorage.removeItem('currentApplication')
                
                // Navigate back to home page
                window.location.href = 'home.html'
            } else {
                alert('Error copying template: ' + copyResult.error)
            }
        } else {
            alert('Error creating application')
        }
    } catch (error) {
        alert('Error processing template')
    }
}

function showCustomConfirm(message) {
    return new Promise((resolve) => {
        const confirmDialog = document.createElement('div')
        confirmDialog.className = 'custom-confirm'
        confirmDialog.innerHTML = `
            <div class="confirm-content">
                <p>${message}</p>
                <div class="confirm-buttons">
                    <button class="confirm-yes">Yes</button>
                    <button class="confirm-no">No</button>
                </div>
            </div>
        `
        
        document.body.appendChild(confirmDialog)
        
        confirmDialog.querySelector('.confirm-yes').onclick = () => {
            confirmDialog.remove()
            resolve(true)
        }
        
        confirmDialog.querySelector('.confirm-no').onclick = () => {
            confirmDialog.remove()
            resolve(false)
        }
    })
}

async function deleteTemplate(templateName) {
    try {
        const shouldDelete = await showCustomConfirm(`Are you sure you want to delete the template "${templateName}"?`)
        
        if (shouldDelete) {
            const result = await window.electronAPI.deleteCVTemplate(templateName)
            if (result.success) {
                await loadTemplates()
                showCustomNotification('Template deleted successfully')
            } else {
                showCustomNotification('Error deleting template', 'error')
            }
        }
    } catch (error) {
        console.error('Error in deleteTemplate:', error)
        showCustomNotification('Error deleting template', 'error')
    }
}

async function editTemplate(templateName) {
    try {
        const result = await window.electronAPI.editCVTemplate(templateName)
        if (result.success) {
            showCustomNotification('Template opened for editing')
        } else {
            showCustomNotification('Error opening template', 'error')
        }
    } catch (error) {
        showCustomNotification('Error opening template', 'error')
    }
} 