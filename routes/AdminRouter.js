const express = require("express");
const router = express.Router();
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../cloudnaryConfig.js"); // Ensure this path matches your structure
const { verifyToken } = require("../middleware/authMiddleware");
const { 
  loginAdmin, 
  addFacultyProfile, 
  getAllFacultyProfiles, 
  getFacultyProfileByLoginId 
} = require("../controllers/AdminController");

// Set up Cloudinary storage for Admin uploads
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "admin-profiles", // Folder in your Cloudinary account
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
  },
});

// Configure Multer
const upload = multer({ storage });

// Routes
router.post("/login", loginAdmin); // Public route
router.post("/addfacultyprofile", verifyToken(["admin"]), upload.single("image"), addFacultyProfile); // Protected
router.get("/facultyprofiles", verifyToken(["admin"]), getAllFacultyProfiles); // Protected
router.get("/facultyprofile/:loginId", verifyToken(["admin"]), getFacultyProfileByLoginId); // Protected

module.exports = router;
