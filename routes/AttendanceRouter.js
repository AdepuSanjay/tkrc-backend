const express = require("express");
const { verifyToken } = require("../middleware/authMiddleware"); // Import auth middleware
const {  
  markAttendance,
  fetchAttendance,
  checkAttendance,
  fetchAttendanceByDate,
  fetchAttendanceBySubject,
  getMarkedSubjects,
  getStudentAttendance, 
  getSectionOverallAttendance,
  grantEditPermission,
  checkEditPermission,
  getStudentAttendanceWithSubjects,
  fetchAllEditPermissions,
  deleteEditPermission,
  getAbsentStudentsForToday,
  getSectionAttendanceSummaryForAllDates,
  fetchAttendanceByFilters
} = require("../controllers/AttendanceController");

const router = express.Router();

// Admin Only Routes
router.post("/grantEditPermission", verifyToken(["admin"]), grantEditPermission);
router.delete('/permissions/:id', verifyToken(["admin"]), deleteEditPermission);
router.get('/edit-permissions', verifyToken(["admin"]), fetchAllEditPermissions);

// Faculty & Admin Routes
router.post("/mark-attendance", verifyToken(["admin", "faculty"]), markAttendance);
router.get("/checkEditPermission", verifyToken(["admin", "faculty"]), checkEditPermission);

// General Authenticated Routes (Admins, Faculty, and Students viewing their own data)
router.get("/absentees-today", verifyToken(), getAbsentStudentsForToday);
router.get("/section-summary-all", verifyToken(), getSectionAttendanceSummaryForAllDates);
router.get("/fetch-attendance", verifyToken(), fetchAttendance);
router.get("/date", verifyToken(), fetchAttendanceByDate);
router.get("/subjects/:studentId", verifyToken(), getStudentAttendanceWithSubjects);
router.get("/check", verifyToken(), checkAttendance);
router.get("/filters", verifyToken(), fetchAttendanceByFilters);
router.get("/fetch-records", verifyToken(), fetchAttendanceBySubject);
router.get("/marked-subjects", verifyToken(), getMarkedSubjects);
router.get("/student-record", verifyToken(), getStudentAttendance);
router.get("/section-record", verifyToken(), getSectionOverallAttendance);

module.exports = router;
