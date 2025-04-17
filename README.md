# Job Application Tracking System (JATS)

A modern desktop application built with Electron for tracking job applications, managing CV templates, and organizing your job search process.

![Application Screenshot](screenshots/app-screenshot.png)

## Features

- 📝 **Application Management**
  - Add, edit, and delete job applications
  - Track application status (Applied, Interview Scheduled, Under Review, etc.)
  - Store company details, role, and application dates
  - View application history in a clean table format

- 📄 **CV Template Management**
  - Upload and manage multiple CV templates
  - Select templates for new applications
  - Edit and delete existing templates
  - Option to proceed without a CV

- 📊 **Statistics & Insights**
  - View total applications count
  - Track applications by status
  - Monitor job type distribution
  - View recent applications

- 🎨 **Modern UI**
  - Clean and intuitive interface
  - Responsive design
  - Custom notifications and confirmations
  - Font Awesome icons integration

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/job-application-tracker.git
cd job-application-tracker
```

2. Install dependencies:
```bash
npm install
```

3. Start the application:
```bash
npm start
```

## Usage

### Adding a New Application
1. Click the "Add Application" button
2. Fill in the application details:
   - Company Name
   - Applied Date
   - Role
   - Job Type
   - Status
3. Choose to either:
   - Select a CV template
   - Continue without a CV
4. The application will be added to your tracking list

### Managing CV Templates
1. Navigate to the template selection page
2. Add new templates using the "Add Template" button
3. Select, edit, or delete existing templates
4. Templates are stored in the application's data directory

### Tracking Applications
- View all applications in the main table
- Update application status using the dropdown menu
- Delete applications when needed
- View application statistics in the dashboard

## Project Structure

```
job-application-tracker/
├── src/
│   ├── main/           # Main process files
│   ├── renderer/       # Renderer process files
│   │   ├── css/        # Stylesheets
│   │   ├── js/         # JavaScript files
│   │   └── pages/      # HTML pages
│   └── preload.js      # Preload script
├── package.json        # Project configuration
└── README.md          # Project documentation
```

## Data Storage

The application stores data in the following locations:

- **Windows**: `%APPDATA%/app-data/`
- **macOS**: `~/Library/Application Support/app-data/`
- **Linux**: `~/.config/app-data/`

This includes:
- Application data
- CV templates
- User preferences

## Development

### Prerequisites
- Node.js (v14 or higher)
- npm (v6 or higher)

### Building for Production
```bash
npm run build
```

### Running Tests
```bash
npm test
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Electron](https://www.electronjs.org/) - For the framework
- [Font Awesome](https://fontawesome.com/) - For the icons
- All contributors who have helped shape this project

## Support

If you encounter any issues or have suggestions, please [open an issue](https://github.com/yourusername/job-application-tracker/issues) on GitHub. 