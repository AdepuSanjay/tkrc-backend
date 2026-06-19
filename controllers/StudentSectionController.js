const Year = require("../models/studentSection");
const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken"); // Added JWT for secure authentication

// Get students in a section 
const getStudentsBySection = async (req, res) => {
  try {
    const { yearId, departmentId, sectionId } = req.params;

    const year = await Year.findOne({ year: yearId });  // Find Year by year string
    if (!year) return res.status(404).json({ message: "Year not found" });

    const department = year.departments.find(dept => dept.name === departmentId);  // Find department by name
    if (!department) return res.status(404).json({ message: "Department not found" });

    const section = department.sections.find(sec => sec.name === sectionId);  // Find section by name
    if (!section) return res.status(404).json({ message: "Section not found" });

    res.status(200).json({ students: section.students });
  } catch (error) {
    res.status(500).json({ message: "Error fetching students", error });
  }
};

const getSubjectsByDate = async (req, res) => {
  try {
    const { yearId, departmentId, sectionId, date } = req.params;

    // Validate the date format (YYYY-MM-DD)
    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ message: "Invalid date format. Please use YYYY-MM-DD." });
    }

    // Determine the day of the week (e.g., "Monday")
    const dayOfWeek = targetDate.toLocaleDateString('en-US', { weekday: 'long' });

    // Fetch the year document
    const yearData = await Year.findOne({ year: yearId });
    if (!yearData) return res.status(404).json({ message: "Year not found" });

    // Find the department within the year
    const deptData = yearData.departments.find(dept => dept.name === departmentId);
    if (!deptData) return res.status(404).json({ message: "Department not found" });

    // Find the section within the department
    const sectionData = deptData.sections.find(sec => sec.name === sectionId);
    if (!sectionData) return res.status(404).json({ message: "Section not found" });

    // Ensure the section has a timetable
    if (!sectionData.timetable || sectionData.timetable.length === 0) {
      return res.status(404).json({ message: "Timetable not found for this section" });
    }

    // Find the schedule for the specified day
    const daySchedule = sectionData.timetable.find(schedule => schedule.day === dayOfWeek);
    if (!daySchedule) {
      return res.status(404).json({ message: `No timetable found for ${dayOfWeek}` });
    }

    // Period Timings (Excluding Lunch Break)
    const periodTimings = {
      1: "9:40 - 10:40",
      2: "10:40 - 11:40",
      3: "11:40 - 12:40",
      4: "12:40 - 1:20", // Lunch Break (Excluded)
      5: "1:20 - 2:20",
      6: "2:20 - 3:20",
      7: "3:20 - 4:20"
    };

    // Respond with the subjects scheduled for the day (excluding lunch period)
    const periods = daySchedule.periods
      .filter(period => period.periodNumber !== 4) // Exclude Lunch
      .map(period => ({
        timing: periodTimings[period.periodNumber] || "Unknown",
        subject: period.subject,
        facultyName: period.facultyName || "Unknown",
        phoneNumber: period.phoneNumber || "N/A"
      }));

    res.status(200).json({
      success: true,
      date,
      day: dayOfWeek,
      periods
    });
  } catch (error) {
    console.error("Error fetching subjects by date:", error.message);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

// Add multiple students to a section
const addStudentsToSection = async (req, res) => {
  try {
    const { yearId, departmentId, sectionId } = req.params;
    let { students } = req.body;

    // ✅ Ensure students is parsed correctly
    if (typeof students === "string") {
      students = JSON.parse(students);
    }

    if (!Array.isArray(students)) {
      return res.status(400).json({ message: "Students must be an array" });
    }

    const year = await Year.findOne({ year: yearId });
    if (!year) return res.status(404).json({ message: "Year not found" });

    const department = year.departments.find((dept) => dept.name === departmentId);
    if (!department) return res.status(404).json({ message: "Department not found" });

    const section = department.sections.find((sec) => sec.name === sectionId);
    if (!section) return res.status(404).json({ message: "Section not found" });

    for (const student of students) {
      const { rollNumber, name, fatherName, password, role, mobileNumber, fatherMobileNumber } = student;

      if (!rollNumber || !name || !password || !mobileNumber) {
        console.error("Missing required fields in student:", student);
        return res.status(400).json({ message: "Each student must have a rollNumber, name, password, and mobile number." });
      }

      console.log("Adding student:", { rollNumber, name, mobileNumber }); // Debug log

      const hashedPassword = await bcrypt.hash(password, 10);
      const imagePath = req.file ? req.file.path : null;

      section.students.push({
        rollNumber,
        name,
        fatherName: fatherName || null,
        password: hashedPassword,
        role: role || "student",
        image: imagePath,
        mobileNumber: String(mobileNumber),  // ✅ Ensure it's a string
        fatherMobileNumber: fatherMobileNumber ? String(fatherMobileNumber) : null
      });
    }
    await year.save();
    res.status(201).json({ message: "Students added successfully", section });
  } catch (error) {
    console.error("Error adding students:", error.message);
    res.status(500).json({ message: "Error adding students", error: error.message });
  }
};

// Add or update a timetable for a section
const upsertSectionTimetable = async (req, res) => {
  try {
    const { yearId, departmentId, sectionId } = req.params;
    const timetable = req.body; // Now expecting an array directly

    console.log("Received yearId:", yearId);

    // Validate that the request body contains an array
    if (!Array.isArray(timetable)) {
      return res.status(400).json({ message: "Invalid timetable data, expected an array." });
    }

    const yearData = await Year.findOne({ year: yearId });
    if (!yearData) return res.status(404).json({ message: "Year not found" });

    console.log("Year found:", yearData.year);

    const deptData = yearData.departments.find(dept => dept.name === departmentId);
    if (!deptData) return res.status(404).json({ message: "Department not found" });

    const sectionData = deptData.sections.find(sec => sec.name === sectionId);
    if (!sectionData) return res.status(404).json({ message: "Section not found" });

    // Ensure each period has a facultyName and phoneNumber
    const validatedTimetable = timetable.map(day => ({
      day: day.day,
      periods: (day.periods || []).map(period => ({
        periodNumber: period.periodNumber,
        subject: period.subject,
        facultyName: period.facultyName || "Unknown", // Default faculty if missing
        phoneNumber: period.phoneNumber || "N/A", // Default phoneNumber if missing
      })),
    }));

    sectionData.timetable = validatedTimetable;
    await yearData.save();

    res.status(200).json({ message: "Timetable added/updated successfully", timetable: sectionData.timetable });
  } catch (error) {
    console.error("Error in upsertSectionTimetable:", error.message);
    res.status(500).json({ message: "Error upserting timetable", error: error.message });
  }
};

// Add a new year
const addYear = async (req, res) => {
  try {
    const { year } = req.body;

    const newYear = new Year({ year, departments: [] });
    await newYear.save();

    res.status(201).json({ message: "Year added successfully", newYear });
  } catch (error) {
    res.status(500).json({ message: "Error adding year", error });
  }
};

// Add a department to a year
const addDepartmentToYear = async (req, res) => {
  try {
    const { yearId } = req.params;  // Example: "B.Tech I"
    const { name } = req.body;  // Example: "CSE"

    const year = await Year.findOne({ year: yearId });  // Find Year by year string
    if (!year) return res.status(404).json({ message: "Year not found" });

    year.departments.push({ name, sections: [] });
    await year.save();

    res.status(201).json({ message: "Department added successfully", year });
  } catch (error) {
    res.status(500).json({ message: "Error adding department", error });
  }
};

// Add a section to a department
const addSectionToDepartment = async (req, res) => {
  try {
    const { yearId, departmentId } = req.params;  // Example: "B.Tech I", "CSE"
    const { name } = req.body;  // Example: "A"

    const year = await Year.findOne({ year: yearId });  // Find Year by year string
    if (!year) return res.status(404).json({ message: "Year not found" });

    const department = year.departments.find(dept => dept.name === departmentId);  // Find department by name
    if (!department) return res.status(404).json({ message: "Department not found" });

    department.sections.push({ name, timetable: [], students: [] });
    await year.save();

    res.status(201).json({ message: "Section added successfully", department });
  } catch (error) {
    res.status(500).json({ message: "Error adding section", error });
  }
};

// Login student (Updated to return a JWT Token)
const loginStudent = async (req, res) => {
  try {
    const { rollNumber, password } = req.body;

    // Validate input
    if (!rollNumber || !password) {
      return res.status(400).json({
        success: false,
        message: "Roll number and password are required",
      });
    }

    // Find the student by traversing the Year model
    const yearData = await Year.findOne({
      "departments.sections.students.rollNumber": rollNumber,
    });

    if (!yearData) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials: Student not found",
      });
    }

    // Locate the exact student within the nested structure
    let student = null;
    let year = null;
    let department = null;
    let section = null;

    for (const dept of yearData.departments) {
      for (const sec of dept.sections) {
        const foundStudent = sec.students.find(
          (stud) => stud.rollNumber === rollNumber
        );
        if (foundStudent) {
          student = foundStudent;
          year = yearData.year;
          department = dept.name;
          section = sec.name;
          break;
        }
      }
      if (student) break;
    }

    if (!student) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials: Student not found",
      });
    }

    // Compare the provided password with the hashed password
    const isMatch = await bcrypt.compare(password, student.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials: Incorrect password",
      });
    }

    // Generate JWT Token for Student
    const token = jwt.sign(
      { 
        id: student._id, 
        role: student.role || "student", 
        rollNumber: student.rollNumber 
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" } // Students get a 7-day token
    );

    // Successful login
    res.status(200).json({
      success: true,
      message: "Login successful",
      token, // Send token back to the frontend
      student: {
        id: student._id,
        name: student.name,
        rollNumber: student.rollNumber,
        year,
        department,
        section,
      },
    });
  } catch (error) {
    console.error("Error during student login:", error.message);
    res.status(500).json({
      success: false,
      message: "Error during login",
      error: error.message,
    });
  }
};

// Add timetable to a section
const addTimetable = async (req, res) => {
  try {
    const { year, department, section, timetable } = req.body;

    if (!year || !department || !section || !timetable) {
      return res.status(400).json({ message: "All fields are required" });
    }

    let parsedTimetable;
    try {
      parsedTimetable = JSON.parse(timetable);
      if (!Array.isArray(parsedTimetable) || parsedTimetable.length === 0) {
        return res.status(400).json({ message: "Timetable format is invalid" });
      }
    } catch (error) {
      return res.status(400).json({ message: "Invalid timetable JSON format" });
    }

    // Find the year, department, and section
    const yearData = await Year.findOne({ year });
    if (!yearData) return res.status(404).json({ message: "Year not found" });

    const deptData = yearData.departments.find((dept) => dept.name === department);
    if (!deptData) return res.status(404).json({ message: "Department not found" });

    const sectionData = deptData.sections.find((sec) => sec.name === section);
    if (!sectionData) return res.status(404).json({ message: "Section not found" });

    // Add the timetable
    sectionData.timetable = parsedTimetable;

    await yearData.save();
    res.status(200).json({ message: "Timetable added successfully", timetable: sectionData.timetable });

  } catch (error) {
    console.error("Error in addTimetable:", error.message);
    res.status(500).json({ message: "Error adding timetable", error: error.message });
  }
};

// Delete timetable for a section
const deleteTimetable = async (req, res) => {
  try {
    const { year, department, section } = req.params;

    const yearData = await Year.findOne({ year });
    if (!yearData) return res.status(404).json({ message: "Year not found" });

    const deptData = yearData.departments.find((dept) => dept.name === department);
    if (!deptData) return res.status(404).json({ message: "Department not found" });

    const sectionData = deptData.sections.find((sec) => sec.name === section);
    if (!sectionData) return res.status(404).json({ message: "Section not found" });

    // Remove the timetable
    sectionData.timetable = [];

    await yearData.save();
    res.status(200).json({ message: "Timetable deleted successfully" });

  } catch (error) {
    console.error("Error in deleteTimetable:", error.message);
    res.status(500).json({ message: "Error deleting timetable", error: error.message });
  }
};

const getSectionTimetable = async (req, res) => {
  try {
    const { yearId, departmentId, sectionId } = req.params;

    console.log("Fetching timetable for:", { yearId, departmentId, sectionId });

    const yearData = await Year.findOne({ year: new RegExp(`^${yearId}$`, "i") });
    if (!yearData) return res.status(404).json({ message: "Year not found" });

    const deptData = yearData.departments.find(dept => dept.name === departmentId);
    if (!deptData) return res.status(404).json({ message: "Department not found" });

    const sectionData = deptData.sections.find(sec => sec.name === sectionId);
    if (!sectionData) return res.status(404).json({ message: "Section not found" });

    res.status(200).json({ timetable: sectionData.timetable });
  } catch (error) {
    console.error("Error fetching timetable:", error.message);
    res.status(500).json({ message: "Error fetching timetable", error: error.message });
  }
};

const getStudentByRollNumber = async (req, res) => {
  try {
    const { rollNumber } = req.params;

    // Find the year data that contains the student
    const yearData = await Year.findOne({
      "departments.sections.students.rollNumber": rollNumber,
    });

    if (!yearData) {
      return res.status(404).json({ message: "Student not found" });
    }

    let student = null;
    let year = null;
    let department = null;
    let section = null;

    // Loop through departments and sections to find the student
    for (const dept of yearData.departments) {
      for (const sec of dept.sections) {
        const foundStudent = sec.students.find(
          (stud) => stud.rollNumber === rollNumber
        );
        if (foundStudent) {
          student = foundStudent;
          year = yearData.year;
          department = dept.name;
          section = sec.name;
          break;
        }
      }
      if (student) break;
    }

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.status(200).json({
      student: {
        id: student._id,
        name: student.name,
        rollNumber: student.rollNumber,
        fatherName: student.fatherName || null,
        role: student.role,
        year,
        department,
        section,
        image: student.image || null,
        mobileNumber: student.mobileNumber,
        fatherMobileNumber: student.fatherMobileNumber || null,
      },
    });
  } catch (error) {
    console.error("Error fetching student details:", error.message);
    res.status(500).json({ message: "Error fetching student details", error: error.message });
  }
};

// Delete a student from a section by roll number
const deleteStudentByRollNumber = async (req, res) => {
  try {
    const { rollNumber } = req.params;

    const years = await Year.find(); // Fetch all years

    let studentDeleted = false;

    for (const year of years) {
      for (const department of year.departments) {
        for (const section of department.sections) {
          const studentIndex = section.students.findIndex(student => student.rollNumber === rollNumber);

          if (studentIndex !== -1) {
            section.students.splice(studentIndex, 1); // Remove student
            await year.save(); // Save the modified year document
            studentDeleted = true;
            break;
          }
        }
        if (studentDeleted) break;
      }
      if (studentDeleted) break;
    }

    if (!studentDeleted) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.status(200).json({ message: "Student deleted successfully" });
  } catch (error) {
    console.error("Error deleting student:", error.message);
    res.status(500).json({ message: "Error deleting student", error: error.message });
  }
};

// Delete all students from a section
const deleteAllStudentsInSection = async (req, res) => {
  try {
    const { yearId, departmentId, sectionId } = req.params;

    const year = await Year.findOne({ year: yearId });
    if (!year) return res.status(404).json({ message: "Year not found" });

    const department = year.departments.find((dept) => dept.name === departmentId);
    if (!department) return res.status(404).json({ message: "Department not found" });

    const section = department.sections.find((sec) => sec.name === sectionId);
    if (!section) return res.status(404).json({ message: "Section not found" });

    section.students = []; // Remove all students
    await year.save();

    res.status(200).json({ message: "All students deleted successfully" });
  } catch (error) {
    console.error("Error deleting all students:", error.message);
    res.status(500).json({ message: "Error deleting all students", error: error.message });
  }
};


module.exports = {
  getStudentsBySection,
  addStudentsToSection,
  upsertSectionTimetable,
  addYear,
  addDepartmentToYear,
  addSectionToDepartment,
  getSubjectsByDate,
  deleteAllStudentsInSection,
  getSectionTimetable,
  deleteStudentByRollNumber,
  getStudentByRollNumber,
  loginStudent,
  addTimetable,
  deleteTimetable
};
