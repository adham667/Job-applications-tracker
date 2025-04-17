const { contextBridge, ipcRenderer } = require('electron')

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // Application operations
    createApplication: (application) => ipcRenderer.invoke('create-application', application),
    getApplications: () => ipcRenderer.invoke('get-applications'),
    updateApplicationStatus: (appId, status) => ipcRenderer.invoke('update-application-status', appId, status),
    deleteApplication: (appId) => ipcRenderer.invoke('delete-application', appId),
    
    // Template operations
    getCVTemplates: () => ipcRenderer.invoke('get-cv-templates'),
    copyCVTemplate: (templateName, appId) => 
        ipcRenderer.invoke('copy-cv-template', { templateName, appId }),
    openFile: (filePath) => ipcRenderer.invoke('open-file', filePath),
    
    // Add new template operations
    selectTemplateFile: () => ipcRenderer.invoke('select-template-file'),
    addNewTemplate: (filePath) => ipcRenderer.invoke('add-new-template', filePath),
    
    // Optional: Add event listener for template updates
    onTemplateAdded: (callback) => ipcRenderer.on('template-added', callback),
    getApplication: (appId) => ipcRenderer.invoke('get-application', appId),
    openCV: (path) => ipcRenderer.invoke('open-cv', path),
    deleteCVTemplate: (templateName) => ipcRenderer.invoke('delete-cv-template', templateName),
    editCVTemplate: (templateName) => ipcRenderer.invoke('edit-cv-template', templateName)
}) 