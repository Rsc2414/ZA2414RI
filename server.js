const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS
app.use(cors());

// Set up storage for uploaded files
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Save files in the 'uploads' folder
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname); // Rename file to avoid conflicts
    }
});

const upload = multer({ storage });

// Create the 'uploads' directory if it doesn't exist
const dir = './uploads';
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
}

// Serve static files from the 'uploads' folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Define the upload endpoint
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.send(`File uploaded: <a href="${fileUrl}">${fileUrl}</a>`);
});

// Define the dashboard endpoint
app.get('/dashboard', (req, res) => {
    fs.readdir(dir, (err, files) => {
        if (err) {
            return res.status(500).send('Unable to scan files.');
        }
        const fileUrls = files.map(file => `${req.protocol}://${req.get('host')}/uploads/${file}`);
        const html = `
            <h1>Uploaded Images</h1>
            <ul>
                ${fileUrls.map(url => `<li><a href="${url}" target="_blank"><img src="${url}" width="200" /></a></li>`).join('')}
            </ul>
        `;
        res.send(html);
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});