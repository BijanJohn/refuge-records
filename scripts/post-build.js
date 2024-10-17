const fs = require('fs');
const path = require('path');

// Define the file path and content
const filePath = path.join(__dirname, '../public/page-data/sq/d/1181966677.json');
const fileContent = JSON.stringify({
  message: '{"data":{"emiliaConfig":{"name":"RefugeRecords","location":"Austin","socialMedia":[{"href":"https://www.instagram.com/lindseyjeremys/","title":"Instagram"},{"href":"https://www.discogs.com/user/jeremyslindsey","title":"Discogs"}],"showThemeAuthor":true,"assetsPath":"content/assets"}}}'
}, null, 2);

// Ensure the directory exists
const dirPath = path.dirname(filePath);
if (!fs.existsSync(dirPath)) {
  fs.mkdirSync(dirPath, { recursive: true });
}

// Write the file
fs.writeFileSync(filePath, fileContent, 'utf8');

console.log(`File ${filePath} has been created/updated.`);
