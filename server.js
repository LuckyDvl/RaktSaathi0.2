// server.js
const express = require('express');
const multer  = require('multer');
const app = express();
const port = process.env.PORT || 3000;

// In-memory storage arrays for demo purposes
let donors = [];
let requests = [];

// Configure multer for file uploads (ensure the "uploads" folder exists)
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

// Middleware to parse form data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ----------------- API Endpoints -----------------

// GET /api/donors - Return all donors
app.get('/api/donors', (req, res) => {
  console.log(`GET /api/donors - returning ${donors.length} donors`);
  res.json(donors);
});

// GET /api/requests - Return all blood requests
app.get('/api/requests', (req, res) => {
  res.json(requests);
});

// POST /api/donors - Add a new donor with profile picture upload
app.post('/api/donors', upload.single('profilePic'), (req, res) => {
  const { 
    name, fatherName, age, gender, mobile, email, bloodGroup, 
    street, district, state, pinCode, altMobile, previouslyDonated, healthIssues 
  } = req.body;
  
  // Validate required fields
  if (!name || !fatherName || !age || !gender || !mobile || !bloodGroup 
      || !street || !district || !state || !pinCode || !previouslyDonated) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  const newDonor = {
    id: donors.length + 1,
    name,
    fatherName,
    age,
    gender,
    mobile,
    email: email || "",
    bloodGroup,
    address: { 
      street, 
      district, 
      state, 
      pinCode, 
      altMobile: altMobile || "" 
    },
    previouslyDonated,
    healthIssues: healthIssues || "",
    // Save path of uploaded profile pic (if any)
    profilePic: req.file ? req.file.path : ""
  };
  
  donors.push(newDonor);
  console.log('Donor added:', newDonor);
  res.status(201).json(newDonor);
});

// POST /api/requests - Add a new blood request with file uploads
app.post('/api/requests', upload.fields([
  { name: 'reportsImages', maxCount: 5 },
  { name: 'video', maxCount: 1 }
]), (req, res) => {
  const { 
    name, fatherName, age, gender, bloodGroup, mobile, email, 
    street, district, state, pinCode, altMobile, emergency 
  } = req.body;
  
  // Validate required fields
  if (!name || !fatherName || !age || !gender || !mobile || !bloodGroup 
      || !street || !district || !state || !pinCode || !emergency) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  let reportsImages = [];
  if (req.files['reportsImages']) {
    reportsImages = req.files['reportsImages'].map(file => file.path);
  }
  
  let video = "";
  if (req.files['video'] && req.files['video'][0]) {
    video = req.files['video'][0].path;
  }
  
  const newRequest = {
    id: requests.length + 1,
    name,
    fatherName,
    age,
    gender,
    bloodGroup,
    mobile,
    email: email || "",
    address: { 
      street, 
      district, 
      state, 
      pinCode, 
      altMobile: altMobile || "" 
    },
    emergency,
    reportsImages,
    video
  };
  
  requests.push(newRequest);
  console.log('Blood request added:', newRequest);
  res.status(201).json(newRequest);
});

// Serve static files from "public"
app.use(express.static('public'));

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
