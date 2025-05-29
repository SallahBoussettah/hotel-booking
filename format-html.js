const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Check if prettier is installed
exec('npx prettier --version', (error) => {
  if (error) {
    console.log('Prettier is not installed. Installing prettier...');
    exec('npm install --save-dev prettier', (err, stdout, stderr) => {
      if (err) {
        console.error('Error installing prettier:', stderr);
        return;
      }
      console.log('Prettier installed successfully!');
      formatHtmlFiles();
    });
  } else {
    formatHtmlFiles();
  }
});

function formatHtmlFiles() {
  // Define directories to search for HTML files
  const directories = ['client', 'Design'];
  let allHtmlFiles = [];
  
  // Process each directory
  directories.forEach(dirName => {
    const dirPath = path.join(__dirname, dirName);
    
    // Check if directory exists
    if (!fs.existsSync(dirPath)) {
      console.log(`Directory ${dirName} does not exist, skipping.`);
      return;
    }
    
    try {
      // Read all files in the directory
      const files = fs.readdirSync(dirPath);
      
      // Filter out HTML files
      const htmlFiles = files
        .filter(file => path.extname(file).toLowerCase() === '.html')
        .map(file => path.join(dirName, file));
      
      allHtmlFiles = allHtmlFiles.concat(htmlFiles);
    } catch (err) {
      console.error(`Error reading directory ${dirName}:`, err);
    }
  });
  
  if (allHtmlFiles.length === 0) {
    console.log('No HTML files found in the specified directories.');
    return;
  }
  
  console.log(`Found ${allHtmlFiles.length} HTML files. Formatting...`);
  
  // Format each HTML file using Prettier with specific options
  const filePaths = allHtmlFiles.join(' ');
  
  // Using --loglevel=error to only show errors
  exec(`npx prettier --write --loglevel=error ${filePaths}`, (err, stdout, stderr) => {
    if (err) {
      console.error('Error formatting HTML files:', stderr);
      return;
    }
    console.log('HTML files formatted successfully!');
    console.log('Formatted files:');
    allHtmlFiles.forEach(file => console.log(`- ${file}`));
  });
} 