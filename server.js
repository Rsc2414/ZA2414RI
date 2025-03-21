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

// Password-protected dashboard
app.get('/dashboard', (req, res) => {
    const password = req.query.password;
    if (password !== '2414') {
        return res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Login</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        background-color: #f4f4f4;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        margin: 0;
                    }
                    .login-box {
                        background-color: #fff;
                        padding: 20px;
                        border-radius: 10px;
                        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                        text-align: center;
                    }
                    .login-box input {
                        padding: 10px;
                        margin: 10px 0;
                        width: 100%;
                        border: 1px solid #ccc;
                        border-radius: 5px;
                    }
                    .login-box button {
                        padding: 10px 20px;
                        background-color: #007bff;
                        color: #fff;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                    }
                    .login-box button:hover {
                        background-color: #0056b3;
                    }
                </style>
            </head>
            <body>
                <div class="login-box">
                    <h2>Enter Password</h2>
                    <input type="password" id="password" placeholder="Password" />
                    <button onclick="checkPassword()">Submit</button>
                </div>
                <script>
                    function checkPassword() {
                        const password = document.getElementById('password').value;
                        window.location.href = '/dashboard?password=' + password;
                    }
                </script>
            </body>
            </html>
        `);
    }

    // If password is correct, show the dashboard
    fs.readdir(dir, (err, files) => {
        if (err) {
            return res.status(500).send('Unable to scan files.');
        }
        const fileUrls = files.map(file => ({
            url: `${req.protocol}://${req.get('host')}/uploads/${file}`,
            filename: file
        }));
        const html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Image Dashboard</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        background-color: #f4f4f4;
                        margin: 0;
                        padding: 20px;
                    }
                    h1 {
                        color: #333;
                    }
                    .image-container {
                        display: flex;
                        flex-wrap: wrap;
                        gap: 10px;
                    }
                    .image-card {
                        border: 1px solid #ccc;
                        border-radius: 5px;
                        padding: 10px;
                        background-color: #fff;
                        width: 200px;
                        text-align: center;
                        cursor: pointer;
                    }
                    .image-card img {
                        max-width: 100%;
                        height: auto;
                        border-radius: 5px;
                    }
                    .image-card input[type="checkbox"] {
                        margin-top: 10px;
                    }
                    .actions {
                        margin-top: 20px;
                    }
                    .actions button {
                        padding: 10px 20px;
                        background-color: #ff4d4d;
                        color: #fff;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                    }
                    .actions button:hover {
                        background-color: #ff1a1a;
                    }
                </style>
            </head>
            <body>
                <h1>Uploaded Images</h1>
                <div class="image-container">
                    ${fileUrls.map(file => `
                        <div class="image-card" onclick="toggleCheckbox('${file.filename}')">
                            <a href="${file.url}" target="_blank">
                                <img src="${file.url}" alt="${file.filename}" />
                            </a>
                            <input type="checkbox" id="${file.filename}" name="selectedImages" value="${file.filename}" />
                        </div>
                    `).join('')}
                </div>
                <div class="actions">
                    <button onclick="deleteSelectedImages()">Delete Selected</button>
                </div>
                <script>
                    function toggleCheckbox(filename) {
                        const checkbox = document.getElementById(filename);
                        checkbox.checked = !checkbox.checked;
                    }

                    function deleteSelectedImages() {
                        const selectedImages = Array.from(document.querySelectorAll('input[name="selectedImages"]:checked'))
                            .map(checkbox => checkbox.value);
                        if (selectedImages.length === 0) {
                            alert('Please select at least one image to delete.');
                            return;
                        }
                        fetch('/delete', {
                            method: 'DELETE',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ filenames: selectedImages })
                        })
                        .then(response => {
                            if (response.ok) {
                                alert('Selected images deleted successfully!');
                                location.reload(); // Refresh the page
                            } else {
                                alert('Failed to delete images.');
                            }
                        });
                    }
                </script>
            </body>
            </html>
        `;
        res.send(html);
    });
});

// Define the delete endpoint
app.delete('/delete', express.json(), (req, res) => {
    const filenames = req.body.filenames;
    if (!filenames || !Array.isArray(filenames)) {
        return res.status(400).send('Invalid request.');
    }
    filenames.forEach(filename => {
        const filePath = path.join(dir, filename);
        fs.unlink(filePath, (err) => {
            if (err) {
                console.error(`Failed to delete ${filename}:`, err);
            }
        });
    });
    res.send('Selected images deleted successfully!');
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});