const express = require("express");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../cloudnaryConfig.js");
const { verifyToken } = require("../middleware/authMiddleware"); // Import auth middleware

const {
  addFaculty,
  updateFaculty,
  getTodayTimetableByFacultyId,
  getAllFaculty,
  getFacultyById,
  deleteFaculty,
  getFacultyTimetable,
  updateFacultyTimetable,
  getExactPeriodsForSubject,
  getFacultiesByDepartment,
  getFacultyUniqueCombinationsFor7Days,
  loginFaculty,
  getFacultyByFacultyId,
  getTimetableByFacultyId,
  deleteFacultyByFacultyId
} = require("../controllers/FacultyController");

const router = express.Router();

// Set up Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "faculty-images",
    allowed_formats: ["jpg", "jpeg", "png"],
  },
});

const upload = multer({ storage });

// Public Route
router.post("/login", loginFaculty);

// Admin Only Routes
router.post("/addfaculty", verifyToken(["admin"]), upload.single("image"), addFaculty);
router.put("/update/:id", verifyToken(["admin"]), upload.single("image"), updateFaculty);
router.delete("/:id", verifyToken(["admin"]), deleteFaculty);
router.delete("/delete/:facultyId", verifyToken(["admin"]), deleteFacultyByFacultyId);

// Admin & Faculty Routes
router.put("/:id/timetable", verifyToken(["admin", "faculty"]), updateFacultyTimetable);

// General Authenticated Routes (Admins, Faculty, Students)
router.get("/:facultyId/timetable-today", verifyToken(), getTodayTimetableByFacultyId);
router.get("/getfaculty", verifyToken(), getAllFaculty);
router.get("/:id", verifyToken(), getFacultyById);
router.get("/:id/timetable", verifyToken(), getFacultyTimetable);
router.get("/department/:department", verifyToken(), getFacultiesByDepartment);
router.get("/:facultyId/unique", verifyToken(), getFacultyUniqueCombinationsFor7Days);
router.get('/facultyId/:facultyId', verifyToken(), getFacultyByFacultyId);
router.get("/:facultyId/:department/:section/:subject", verifyToken(), getExactPeriodsForSubject);
router.get("/facultyId/:facultyId/timetable", verifyToken(), getTimetableByFacultyId);

module.exports = router;

