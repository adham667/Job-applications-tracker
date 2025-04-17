const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const fs = require('fs').promises
const fsSync = require('fs')
const { log } = require('console')

let mainWindow
let applications = []

function getAppPath() {
    // Get the project root directory by going up from the electron dist folder
    const projectRoot = path.join(__dirname, '..')
    return projectRoot
}

// Update paths to use project root
const APP_DATA_PATH = path.join(getAppPath(), 'app-data')
const TEMPLATES_PATH = path.join(APP_DATA_PATH, 'cv-templates')
const APPLICATIONS_PATH = path.join(APP_DATA_PATH, 'applications')



// Ensure directories exist
async function initializeDirectories() {
    try {
        // Create main directories if they don't exist
        await fs.mkdir(APP_DATA_PATH, { recursive: true })
        await fs.mkdir(TEMPLATES_PATH, { recursive: true })
        await fs.mkdir(APPLICATIONS_PATH, { recursive: true })
        
        console.log('Directories initialized successfully at:', APP_DATA_PATH)
    } catch (error) {
        console.error('Error initializing directories:', error)
    }
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    })

    mainWindow.loadFile(path.join(__dirname, 'renderer', 'pages', 'home.html'))
}

app.whenReady().then(async () => {

    await initializeDirectories()
    createWindow()
})

// Handle CRUD operations
ipcMain.handle('add-application', async (event, application) => {
  application.id = Date.now() // Simple ID generation
  applications.push(application)
  return application
})

ipcMain.handle('get-applications', async () => {
    try {
        const appFolders = await fs.readdir(APPLICATIONS_PATH)
        const applications = []

        for (const folderId of appFolders) {
            const infoPath = path.join(APPLICATIONS_PATH, folderId, 'info.json')
            
            if (fsSync.existsSync(infoPath)) {
                const infoData = await fs.readFile(infoPath, 'utf8')
                const appInfo = JSON.parse(infoData)
                appInfo.id = folderId

                const folderContents = await fs.readdir(path.join(APPLICATIONS_PATH, folderId))
                const cvFile = folderContents.find(file => file.startsWith('CV_'))
                if (cvFile) {
                    appInfo.cvPath = path.join(APPLICATIONS_PATH, folderId, cvFile)
                }
                
                applications.push(appInfo)
            }
        }

        return applications
    } catch (error) {
        return []
    }
})

ipcMain.handle('update-status', async (event, id, status) => {
  const application = applications.find(app => app.id === id)
  if (application) {
    application.status = status
    return true
  }
  return false
})

// Handle template listing
ipcMain.handle('get-cv-templates', async () => {
    try {
        const files = await fs.readdir(TEMPLATES_PATH)
        return files.filter(file => file.endsWith('.docx') || file.endsWith('.pdf'))
    } catch (error) {
        console.error('Error reading templates:', error)
        return []
    }
})

// Handle application creation with CV
ipcMain.handle('create-application', async (event, application) => {
    try {
        const appId = Date.now()
        const appFolderPath = path.join(APPLICATIONS_PATH, appId.toString())
        
        // Create application folder
        await fs.mkdir(appFolderPath)
        
        // Save application info
        await fs.writeFile(
            path.join(appFolderPath, 'info.json'),
            JSON.stringify(application, null, 2)
        )
        
        return {
            success: true,
            appId: appId,
            folderPath: appFolderPath
        }
    } catch (error) {
        console.error('Error creating application:', error)
        return { success: false, error: error.message }
    }
})

// Handle template copying
ipcMain.handle('copy-cv-template', async (event, { templateName, appId }) => {
    try {
        const templatePath = path.join(TEMPLATES_PATH, templateName)
        const appFolderPath = path.join(APPLICATIONS_PATH, appId.toString())
        const newCVPath = path.join(appFolderPath, `CV_${templateName}`)
        
        await fs.copyFile(templatePath, newCVPath)
        return { 
            success: true, 
            cvPath: newCVPath  // Make sure this is returned
        }
    } catch (error) {
        return { 
            success: false, 
            error: error.message 
        }
    }
})

// Handle opening files
ipcMain.handle('open-file', async (event, filePath) => {
    try {
        await shell.openPath(filePath)
        return { success: true }
    } catch (error) {
        console.error('Error opening file:', error)
        return { success: false, error: error.message }
    }
})

// Handle template file selection
ipcMain.handle('select-template-file', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [
            { name: 'Word Documents', extensions: ['doc', 'docx'] }
        ],
        title: 'Select CV Template'
    })
    
    if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0]
    }
    return null
})

// Handle adding new template
ipcMain.handle('add-new-template', async (event, sourcePath) => {
    try {
        // Get file name and ensure it's unique
        let fileName = path.basename(sourcePath)
        let targetPath = path.join(TEMPLATES_PATH, fileName)
        
        // If file already exists, add number to filename
        let counter = 1
        while (fsSync.existsSync(targetPath)) {
            const nameWithoutExt = path.basename(fileName, path.extname(fileName))
            const ext = path.extname(fileName)
            fileName = `${nameWithoutExt}_${counter}${ext}`
            targetPath = path.join(TEMPLATES_PATH, fileName)
            counter++
        }
        
        // Copy file to templates directory
        await fs.copyFile(sourcePath, targetPath)
        
        // Notify renderer about new template
        mainWindow.webContents.send('template-added', fileName)
        
        return {
            success: true,
            fileName: fileName
        }
    } catch (error) {
        console.error('Error adding template:', error)
        return {
            success: false,
            error: error.message
        }
    }
})

// Add handler to get single application details
ipcMain.handle('get-application', async (event, appId) => {
    try {
        const infoPath = path.join(APPLICATIONS_PATH, appId.toString(), 'info.json')
        const infoData = await fs.readFile(infoPath, 'utf8')
        const appInfo = JSON.parse(infoData)
        appInfo.id = appId

        // Get CV file info if it exists
        const folderContents = await fs.readdir(path.join(APPLICATIONS_PATH, appId.toString()))
        const cvFile = folderContents.find(file => file.startsWith('CV_'))
        if (cvFile) {
            appInfo.cvPath = path.join(APPLICATIONS_PATH, appId.toString(), cvFile)
        }

        return appInfo
    } catch (error) {
        console.error('Error loading application:', error)
        return null
    }
})

// Add update handler
ipcMain.handle('updateApplication', async (event, appId, updatedInfo) => {
    try {
        const infoPath = path.join(APPLICATIONS_PATH, appId.toString(), 'info.json')
        await fs.writeFile(infoPath, JSON.stringify(updatedInfo, null, 2))
        return { success: true }
    } catch (error) {
        console.error('Error updating application:', error)
        return { success: false, error: error.message }
    }
})

// Add delete handler
ipcMain.handle('delete-application', async (event, appId) => {
    try {
        const appPath = path.join(APPLICATIONS_PATH, appId.toString())
        await fs.rm(appPath, { recursive: true, force: true })
        return { success: true }
    } catch (error) {
        return { success: false, error: error.message }
    }
})

// Add this handler
ipcMain.handle('open-cv', async (event, cvPath) => {
    try {
        await shell.openPath(cvPath)
        return { success: true }
    } catch (error) {
        return { success: false, error: error.message }
    }
})

// Add this handler
ipcMain.handle('update-application-status', async (event, appId, newStatus) => {
    try {
        const infoPath = path.join(APPLICATIONS_PATH, appId.toString(), 'info.json')
        
        // Read existing application data
        const infoData = await fs.readFile(infoPath, 'utf8')
        const appInfo = JSON.parse(infoData)
        
        // Update status
        appInfo.status = newStatus
        
        // Write updated data back to file
        await fs.writeFile(infoPath, JSON.stringify(appInfo, null, 2))
        
        return { success: true }
    } catch (error) {
        return { success: false, error: error.message }
    }
})

ipcMain.handle('delete-cv-template', async (event, templateName) => {
    try {
        const templatePath = path.join(TEMPLATES_PATH, templateName)
        await fs.rm(templatePath, { recursive: true, force: true })
        return { success: true }
    } catch (error) {
        console.error('Error deleting template:', error)
        return { success: false, error: error.message }
    }
})

ipcMain.handle('edit-cv-template', async (event, templateName) => {
    try {
        const templatePath = path.join(TEMPLATES_PATH, templateName)
        await shell.openPath(templatePath)
        return { success: true }
    } catch (error) {
        console.error('Error opening template:', error)
        return { success: false, error: error.message }
    }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
}) 