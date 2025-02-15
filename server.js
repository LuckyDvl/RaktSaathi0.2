// server.js
const express = require('express');
const multer  = require('multer');
const crypto = require('crypto'); // For token generation
const app = express();
const port = process.env.PORT || 3000;

// In-memory storage arrays
let donors = [];
let requests = [];
let users = [];      // user objects: { id, username, password, role }
let messages = [];   // message objects: { id, senderId, receiverId, content, timestamp }
let sessions = {};   // token -> userId mapping

// Pre-populate default user: errorTeam / 123
users.push({
  id: 1,
  username: "errorTeam",
  password: "123", // In production, use hashed passwords!
  role: "donor"    // Adjust as needed
});

// Configure multer for file uploads
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

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

/* 
  IMPORTANT: API endpoints must be defined before the static middleware.
*/

// ----- API Endpoints -----

// GET /api/donors - Return all donors
app.get('/api/donors', (req, res) => {
  console.log(`GET /api/donors - returning ${donors.length} donors`);
  res.json(donors);
});

// GET /api/requests - Return all blood requests
app.get('/api/requests', (req, res) => {
  res.json(requests);
});

// POST /api/donors - Add a new donor (with profilePic upload)
// We expect an extra field "userId" from the donor form.
app.post('/api/donors', upload.single('profilePic'), (req, res) => {
  const { name, fatherName, age, gender, mobile, email, bloodGroup, street, district, state, pinCode, altMobile, previouslyDonated, healthIssues, userId } = req.body;
  
  if (!name || !fatherName || !age || !gender || !mobile || !bloodGroup || !street || !district || !state || !pinCode || !previouslyDonated) {
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
    address: { street, district, state, pinCode, altMobile: altMobile || "" },
    previouslyDonated,
    healthIssues: healthIssues || "",
    profilePic: req.file ? req.file.path : "",
    createdBy: userId || null  // new field for messaging
  };
  
  donors.push(newDonor);
  console.log('Donor added:', newDonor);
  res.status(201).json(newDonor);
});

// POST /api/requests - Add a new blood request (with media uploads)
// We expect an extra field "userId" from the request form.
app.post('/api/requests', upload.fields([
  { name: 'reportsImages', maxCount: 5 },
  { name: 'video', maxCount: 1 }
]), (req, res) => {
  const { name, fatherName, age, gender, bloodGroup, mobile, email, street, district, state, pinCode, altMobile, emergency, userId } = req.body;
  
  if (!name || !fatherName || !age || !gender || !mobile || !bloodGroup || !street || !district || !state || !pinCode || !emergency) {
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
    address: { street, district, state, pinCode, altMobile: altMobile || "" },
    emergency,
    reportsImages,
    video,
    createdBy: userId || null  // new field for messaging
  };
  
  requests.push(newRequest);
  console.log('Blood request added:', newRequest);
  res.status(201).json(newRequest);
});

// ----- Messaging Endpoints -----

// POST /api/signup - Register a new user
app.post('/api/signup', (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password || !role) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const existing = users.find(u => u.username === username);
  if (existing) {
    return res.status(400).json({ error: 'Username already exists' });
  }
  const newUser = {
    id: users.length + 1,
    username,
    password, // In production, hash the password!
    role
  };
  users.push(newUser);
  console.log('User signed up:', newUser);
  res.status(201).json({ message: "Signup successful", user: newUser });
});

// POST /api/login - Log in a user and return a token
app.post('/api/login', (req, res) => {
  console.log("Login request body:", req.body); // Debug log
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Missing username or password' });
  }
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = crypto.randomBytes(16).toString('hex');
  sessions[token] = user.id;
  console.log('User logged in:', user);
  res.json({ message: "Login successful", token, user });
});

// Middleware to authenticate requests using the token
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  const token = authHeader.split(' ')[1];
  if (!token || !sessions[token]) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  req.userId = sessions[token];
  next();
}

// POST /api/messages - Send a message (requires authentication)
app.post('/api/messages', authenticate, (req, res) => {
  const { receiverId, content } = req.body;
  if (!receiverId || !content) {
    return res.status(400).json({ error: 'Missing receiverId or content' });
  }
  const newMessage = {
    id: messages.length + 1,
    senderId: req.userId,
    receiverId: parseInt(receiverId),
    content,
    timestamp: new Date()
  };
  messages.push(newMessage);
  console.log('Message sent:', newMessage);
  res.status(201).json(newMessage);
});

// GET /api/messages - Get conversation messages (requires authentication)
app.get('/api/messages', authenticate, (req, res) => {
  const { withUserId } = req.query;
  if (!withUserId) {
    return res.status(400).json({ error: 'Missing withUserId parameter' });
  }
  const conversation = messages.filter(msg =>
    (msg.senderId === req.userId && msg.receiverId === parseInt(withUserId)) ||
    (msg.senderId === parseInt(withUserId) && msg.receiverId === req.userId)
  );
  res.json(conversation);
});

// ----------------- End Messaging Endpoints -----------------

// Serve static files from the "public" folder AFTER API endpoints
app.use(express.static('public'));

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
