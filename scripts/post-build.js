const fs = require('fs');
const path = require('path');

// Define the file path and content
const filePath = path.join(__dirname, '../public/page-data/sq/d/1181966677.json');
const fileContent = {
    data: {
      emiliaConfig: {
        name: "RecordRefuge",
        location: "Austin",
        socialMedia: [
          {
            href: "https://www.instagram.com/lindseyjeremys/",
            title: "Instagram"
          },
          {
            href: "https://www.discogs.com/user/jeremyslindsey",
            title: "Discogs"
          }
        ],
        showThemeAuthor: true,
        assetsPath: "content/assets"
      }
    }
  };

// Ensure the directory exists
const dirPath = path.dirname(filePath);
if (!fs.existsSync(dirPath)) {
  fs.mkdirSync(dirPath, { recursive: true });
}

// Convert the content to a JSON string
const jsonString = JSON.stringify(fileContent, null, 2);


// Write the file (ensuring it is a string)
fs.writeFileSync(filePath, jsonString, 'utf8');

console.log(`File ${filePath} has been created/updated.`);

