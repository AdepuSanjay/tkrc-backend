const express = require('express');
const router = express.Router();

const studentController = require('../controllers/StudentSectionController');
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../cloudnaryConfig.js");
const { verifyToken } = require("../middleware/authMiddleware"); // Import auth middleware

// Set up Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "Students",
    allowed_formats: ["jpg", "jpeg", "png"],
  },
});

const upload = multer({ storage });

// Public Route
router.post('/login', studentController.loginStudent);

// Admin Only Routes (Structure Creation & Deletion)
router.post('/years', verifyToken(["admin"]), studentController.addYear);
router.post('/:yearId/departments', verifyToken(["admin"]), studentController.addDepartmentToYear);
router.post('/:yearId/:departmentId/sections', verifyToken(["admin"]), studentController.addSectionToDepartment);
router.post('/:yearId/:departmentId/:sectionId/students', verifyToken(["admin"]), upload.single("image"), studentController.addStudentsToSection);
router.delete('/students/:rollNumber', verifyToken(["admin"]), studentController.deleteStudentByRollNumber);
router.delete('/:yearId/:departmentId/:sectionId/students', verifyToken(["admin"]), studentController.deleteAllStudentsInSection);

// Admin & Faculty Routes
router.post('/:yearId/:departmentId/:sectionId/timetable', verifyToken(["admin", "faculty"]), studentController.upsertSectionTimetable);

// General Authenticated Routes (Admins, Faculty, and Students)
router.get('/subjects-day/:yearId/:departmentId/:sectionId/:date', verifyToken(), studentController.getSubjectsByDate);
router.get('/:rollNumber', verifyToken(), studentController.getStudentByRollNumber);
router.get('/:yearId/:departmentId/:sectionId/students', verifyToken(), studentController.getStudentsBySection);
router.get("/:yearId/:departmentId/:sectionId/timetable", verifyToken(), studentController.getSectionTimetable);

module.exports = router;
