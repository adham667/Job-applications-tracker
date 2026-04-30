// const { log } = require('console')

let currentApplication = null

window.addEventListener('error', (event) => {
    console.error('Template Select Error:', event.message, event.error)
    alert(`Template Select Error: ${event.message}`)
})

window.addEventListener('unhandledrejection', (event) => {
    console.error('Template Select Promise Rejection:', event.reason)
    alert(`Template Select Promise Rejection: ${event.reason}`)
})

document.addEventListener('DOMContentLoaded', async () => {
    console.log('template-select DOMContentLoaded')
    // Get application data from localStorage
    const appData = JSON.parse(localStorage.getItem('currentApplication'))
    console.log('loaded currentApplication', appData)
    currentApplication = appData

    if (!appData) {
        alert('Application information is missing. Please add a new application from the main page first.')
        window.location.href = 'home.html'
        return
    }

    displayApplicationDetails(appData)
    await loadTemplates()

    const templatesDiv = document.getElementById('templatesList')
    if (!templatesDiv) {
        console.error('templatesList element not found')
        alert('Template list container not found in the page.')
        return
    }

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
        <p><strong>Job Description:</strong> ${application.jobDescription ? "Provided" : "Not provided"}</p>
    `
}

async function loadTemplates() {
    const templates = await window.electronAPI.getCVTemplates()
    const templatesDiv = document.getElementById('templatesList')
    templatesDiv.innerHTML = ''

    templates.forEach(template => {
        const templateCard = createTemplateCard(template)
        templatesDiv.appendChild(templateCard)
    })
}

function addTemplateToList(template) {
    const templatesDiv = document.getElementById('templatesList')
    const templateCard = createTemplateCard(template)
    templatesDiv.appendChild(templateCard)
}

function createTemplateCard(template) {
    const templateCard = document.createElement('div')
    templateCard.className = 'template-card'
    templateCard.dataset.template = template

    const icon = document.createElement('div')
    icon.className = 'template-icon'
    icon.innerHTML = '<i class="fas fa-file-word"></i>'

    const title = document.createElement('h4')
    title.textContent = template

    const actions = document.createElement('div')
    actions.className = 'template-actions'

    const selectButton = document.createElement('button')
    selectButton.className = 'select-btn'
    selectButton.type = 'button'
    selectButton.dataset.action = 'select'
    selectButton.innerHTML = '<i class="fas fa-check"></i> Select'
    selectButton.addEventListener('click', () => selectTemplate(template))

    const editButton = document.createElement('button')
    editButton.className = 'edit-btn'
    editButton.type = 'button'
    editButton.dataset.action = 'edit'
    editButton.innerHTML = '<i class="fas fa-edit"></i> Edit'
    editButton.addEventListener('click', () => editTemplate(template))

    const deleteButton = document.createElement('button')
    deleteButton.className = 'delete-btn'
    deleteButton.type = 'button'
    deleteButton.dataset.action = 'delete'
    deleteButton.innerHTML = '<i class="fas fa-trash"></i> Delete'
    deleteButton.addEventListener('click', () => deleteTemplate(template))

    actions.appendChild(selectButton)
    actions.appendChild(editButton)
    actions.appendChild(deleteButton)

    templateCard.appendChild(icon)
    templateCard.appendChild(title)
    templateCard.appendChild(actions)

    return templateCard
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

function showCustomNotification(message, type = 'success') {
    console.log('notification:', type, message)
    if (type === 'error') {
        alert(message)
    } else {
        // For now, use alert for success notifications as well
        alert(message)
    }
}

async function selectTemplate(templateName) {
    try {
        console.log('selectTemplate called for', templateName)
        if (!templateName) {
            throw new Error('No template name provided to selectTemplate')
        }
        showCustomNotification('Creating application and copying CV...')
        // Create application first
        const result = await window.electronAPI.createApplication(currentApplication)
        console.log('createApplication result', result)
        
        if (result.success) {
            // Copy template to application folder
            const copyResult = await window.electronAPI.copyCVTemplate(
                templateName, 
                result.appId
            )
            console.log('copyCVTemplate result', copyResult)
            
            if (copyResult.success) {
                localStorage.removeItem('currentApplication')
                window.location.href = 'home.html'
            } else {
                showCustomNotification('Error copying template: ' + copyResult.error, 'error')
            }
        } else {
            showCustomNotification('Error creating application: ' + result.error, 'error')
        }
    } catch (error) {
        console.error('Error processing template selection:', error)
        alert(`Error processing template selection: ${error.message}`)
        window.electronAPI.logClientError?.({
            source: "template-select.selectTemplate",
            message: error.message,
            stack: error.stack
        })
        showCustomNotification('Error processing template', 'error')
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
        const result = await window.electronAPI.openTemplateEditor({
            templateName,
            application: currentApplication || null,
            jobDescription: currentApplication?.jobDescription || ""
        })
        if (result.success) {
            showCustomNotification('Opening CV editor...')
        } else {
            showCustomNotification(result.error || 'Error opening template editor', 'error')
        }
    } catch (error) {
        showCustomNotification('Error opening template editor', 'error')
    }
} 