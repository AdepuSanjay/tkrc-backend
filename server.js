require("dotenv").config(); // IMPORTANT: Load environment variables

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const sendAbsentNotifications = require("./Twilio.js");
const multer = require('multer');
const cloudinary = require('./cloudnaryConfig.js'); 
const { CloudinaryStorage } = require('multer-storage-cloudinary');
 
// Import your route files (Make sure AdminRoute is here!)
const AdminRoute = require("./routes/AdminRouter"); 
const facultyroutes = require("./routes/FacultyRouter");
const AttendanceRoute = require("./routes/AttendanceRouter");
const SectionRoute = require("./routes/StudentSectionRouter");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware to parse JSON and URL-encoded requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS settings
const corsOptions = {
  origin: [
    "https://tkrcet.vercel.app", 
    "https://tkrc-admin.vercel.app",
    "http://localhost:5173",
    "http://localhost:8081",
    "https://tkrc-frontend.vercel.app"
  ], // Allowed origins
  methods: ["GET", "POST", "PUT", "DELETE"], 
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Serve static files from the "uploads" directory
app.use(
  "/uploads",
  (req, res, next) => {
    console.log(`Static file requested: ${req.path}`); 
    next();
  },
  express.static(path.join(__dirname, "uploads"))
);

// Set up Cloudinary storage using multer-storage-cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'uploads', 
    resource_type: 'auto', 
    allowed_formats: ['jpg', 'png', 'jpeg', 'mp4','webp'], 
  },
});

const upload = multer({ storage: storage });

// Endpoint to upload a file (image or video)
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file || !req.file.path) {
    return res.status(400).json({ error: 'File upload failed' });
  }

  res.json({
    message: 'File uploaded successfully',
    url: req.file.path,
  });
});

// MongoDB connection (Secured with environment variable)
mongoose
  .connect(process.env.MONGO_URI || "mongodb+srv://tkrcet:abc1234@cluster0.y4apc.mongodb.net/tkrcet")
  .then(() => console.log("MongoDB connected successfully"))
  .catch((error) => console.error("MongoDB connection failed:", error.message));

// Define API routes (THIS FIXES YOUR "ROUTE NOT FOUND" ERROR)
app.use("/admin", AdminRoute); 
app.use("/faculty", facultyroutes);
app.use("/Attendance", AttendanceRoute);
app.use("/Section", SectionRoute);

// Default route to check API status
app.get("/", (req, res) => {
  res.status(200).send("Welcome to the TKRCET Attendance API!");
});

app.get("/test-sms", async (req, res) => {
  try {
    await sendAbsentNotifications();
    res.status(200).json({ message: "Test SMS sent successfully" });
  } catch (error) {
    res.status(500).json({ message: "SMS sending failed", error: error.message });
  }
});

// Get all uploaded images
app.get('/images', async (req, res) => {
  try {
    const result = await cloudinary.search
      .expression('folder:uploads')
      .sort_by('created_at', 'desc')
      .max_results(30) 
      .execute();

    const images = result.resources.map(file => ({
      url: file.secure_url,
      public_id: file.public_id,
    }));

    res.json(images);
  } catch (error) {
    console.error('Error fetching images:', error);
    res.status(500).json({ error: 'Failed to fetch images' });
  }
});

// Handle 404 errors for undefined routes
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error("Global error handler:", err.message);
  res.status(500).json({ message: "Internal server error" });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
