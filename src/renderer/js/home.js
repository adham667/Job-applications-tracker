// Global variables
let applications = []

// Initialize the page
document.addEventListener('DOMContentLoaded', async () => {
    await loadApplications()
    setDefaultDate()
    setupEventListeners()
})

function setDefaultDate() {
    const today = new Date()
    const formattedDate = today.toISOString().split('T')[0]
    document.getElementById('appliedDate').value = formattedDate
    
    // Set default status
    document.getElementById('status').value = 'No Answer Yet'
}

async function loadApplications() {
    try {
        applications = await window.electronAPI.getApplications()
        renderApplicationsTable()
    } catch (error) {
        console.error('Error loading applications:', error)
        showNotification('Error loading applications', 'error')
    }
}

function renderApplicationsTable() {
    const tbody = document.getElementById('applicationsBody')
    tbody.innerHTML = ''
    
    if (applications.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7">
                    <div class="empty-state">
                        <p>No applications yet. Click the "Add Application" button to get started!</p>
                    </div>
                </td>
            </tr>
        `
        return
    }
    
    applications.forEach(app => {
        const row = document.createElement('tr')
        
        // Escape backslashes in the path for proper string handling
        const cvPath = app.cvPath ? app.cvPath.replace(/\\/g, '\\\\') : ''
        
        row.innerHTML = `
            <td>${app.companyName}</td>
            <td>${new Date(app.appliedDate).toLocaleDateString()}</td>
            <td>${app.role}</td>
            <td>${app.jobType}</td>
            <td>
                <select class="status-select" onchange="updateStatus('${app.id}', this.value)">
                    <option value="No Answer Yet" ${app.status === 'No Answer Yet' ? 'selected' : ''}>No Answer Yet</option>
                    <option value="Applied" ${app.status === 'Applied' ? 'selected' : ''}>Applied</option>
                    <option value="Interview Scheduled" ${app.status === 'Interview Scheduled' ? 'selected' : ''}>Interview Scheduled</option>
                    <option value="Under Review" ${app.status === 'Under Review' ? 'selected' : ''}>Under Review</option>
                    <option value="Rejected" ${app.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
                    <option value="Offer Received" ${app.status === 'Offer Received' ? 'selected' : ''}>Offer Received</option>
                    <option value="Accepted" ${app.status === 'Accepted' ? 'selected' : ''}>Accepted</option>
                </select>
            </td>
            <td>
                <button onclick="deleteApplication('${app.id}')" class="cv-button">Delete</button>
                ${app.cvPath ? `
                    <button onclick="openCV('${cvPath}')" class="cv-button">View CV</button>
                ` : ''}
            </td>
        `
        tbody.appendChild(row)
    })

    // Update applications count
    updateApplicationsCount()
}

function updateApplicationsCount() {
    const countElement = document.getElementById('applicationsCount')
    if (countElement) {
        countElement.textContent = applications.length
    }
}

// Modal handling
function showAddApplicationModal() {
    const modal = document.getElementById('addModal')
    const form = document.getElementById('applicationForm')
    // Clear the form and set defaults
    form.reset()
    setDefaultDate()
    modal.style.display = 'block'
}

// Open CV file
async function openCV(cvPath) {
    if (!cvPath) {
        showNotification('No CV file found', 'error')
        return
    }

    try {
        const result = await window.electronAPI.openCV(cvPath)
        if (!result.success) {
            showNotification('Error opening CV: ' + result.error, 'error')
        }
    } catch (error) {
        showNotification('Error opening CV', 'error')
    }
}

// Update application status
async function updateStatus(appId, newStatus) {
    try {
        const result = await window.electronAPI.updateApplicationStatus(appId, newStatus)
        if (result.success) {
            // Update local applications array
            const app = applications.find(a => a.id === appId)
            if (app) {
                app.status = newStatus
            }
        } else {
            showNotification('Error updating status', 'error')
        }
    } catch (error) {
        showNotification('Error updating status', 'error')
    }
}

// Form submission handling
function setupEventListeners() {
    const form = document.getElementById('applicationForm')
    const modal = document.getElementById('addModal')
    
    // Handle form submission
    form.addEventListener('submit', (e) => {
        e.preventDefault()
        
        const application = {
            companyName: document.getElementById('companyName').value,
            appliedDate: document.getElementById('appliedDate').value,
            role: document.getElementById('role').value,
            jobType: document.getElementById('jobType').value,
            status: document.getElementById('status').value
        }

        localStorage.setItem('currentApplication', JSON.stringify(application))
        modal.style.display = 'none'
        window.location.href = 'template-select.html'
    })

    // Handle modal close
    document.querySelector('.close').addEventListener('click', () => {
        modal.style.display = 'none'
        form.reset()
    })
}

// Add this function for custom notifications
function showCustomNotification(message, type = 'success') {
    const notification = document.createElement('div')
    notification.className = `custom-notification ${type}`
    notification.textContent = message
    
    document.body.appendChild(notification)
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.remove()
    }, 3000)
}

// Add custom confirm dialog
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

// Update delete function to use custom dialogs
async function deleteApplication(appId) {
    const shouldDelete = await showCustomConfirm('Are you sure you want to delete this application?')
    
    if (shouldDelete) {
        try {
            const result = await window.electronAPI.deleteApplication(appId)
            if (result.success) {
                applications = applications.filter(app => app.id !== appId)
                renderApplicationsTable()
                showCustomNotification('Application deleted successfully')
            } else {
                showCustomNotification('Error deleting application', 'error')
            }
        } catch (error) {
            showCustomNotification('Error deleting application', 'error')
        }
    }
}

function showNotification(message, type = 'success') {
    alert(message)
} 