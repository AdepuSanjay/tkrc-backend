const Faculty = require("../models/facultymodel");
const bcrypt = require("bcryptjs");
const path = require("path");
const jwt = require("jsonwebtoken"); 

const addFaculty = async (req, res) => {  
  try {
    const { 
      name, facultyId, role, department, subject, designation, password, 
      qualification, experience, areaOfInterest, jntuId, phoneNumber 
    } = req.body;

    // Removed 'timetable' from required validation
    if (!name || !facultyId || !role || !department || !subject || !designation || !password || 
        !qualification || !experience || !areaOfInterest || !jntuId || !phoneNumber) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const phoneRegex = /^[0-9]{10}$/; 
    if (!phoneRegex.test(phoneNumber)) {
      return res.status(400).json({ message: "Invalid phone number format" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const imagePath = req.file ? req.file.path : null;

    const newFaculty = new Faculty({
      name, facultyId, role, department, subject, designation, 
      password: hashedPassword, 
      timetable: [], // Initialize as empty array, waiting for section sync
      qualification, experience, areaOfInterest: areaOfInterest.split(","), 
      jntuId, phoneNumber, image: imagePath,
    });

    await newFaculty.save();

    res.status(201).json({ message: "Faculty added successfully", faculty: newFaculty });
  } catch (error) {
    console.error("Error in addFaculty:", error.message);
    res.status(500).json({ message: "Error adding faculty", error: error.message });
  }
};

const getFacultyUniqueCombinationsFor7Days = async (req, res) => {
  try {
    const { facultyId } = req.params;
    const faculty = await Faculty.findOne({ facultyId });

    if (!faculty) return res.status(404).json({ message: "Faculty not found" });

    const uniqueCombinations = new Set();

    faculty.timetable.forEach((entry) => {
      entry.periods.forEach((period) => {
        const combination = `${period.year}-${period.department}-${period.section}-${period.subject}`;
        uniqueCombinations.add(combination);
      });
    });

    const result = Array.from(uniqueCombinations).map((combination) => {
      const [year, department, section, subject] = combination.split("-");
      return { year, department, section, subject };
    });

    res.status(200).json({ uniqueCombinations: result });
  } catch (error) {
    console.error("Error fetching unique combinations:", error.message);
    res.status(500).json({ message: "Error fetching unique combinations", error: error.message });
  }
};

const getCurrentDay = () => {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const currentDate = new Date();
  return days[currentDate.getDay() - 1]; 
};

const getTodayTimetableByFacultyId = async (req, res) => {
  try {
    const { facultyId } = req.params;
    const faculty = await Faculty.findOne({ facultyId });

    if (!faculty) return res.status(404).json({ message: "Faculty not found" });

    const currentDay = getCurrentDay();
    const todayTimetable = faculty.timetable.find((entry) => entry.day === currentDay);

    if (!todayTimetable || !todayTimetable.periods.length) {
      return res.status(200).json({ classes: [], message: "No classes today" });
    }

    let filteredClasses = [];
    for (let i = 0; i < todayTimetable.periods.length; i++) {
      if (todayTimetable.periods[i].subject && todayTimetable.periods[i].subject.trim() !== "") {
        filteredClasses.push({
          programYear: `B.Tech ${todayTimetable.periods[i].year}`,
          department: todayTimetable.periods[i].department,
          section: todayTimetable.periods[i].section,
          subject: todayTimetable.periods[i].subject,
        });
      }
    }

    return res.status(200).json({
      classes: filteredClasses,
      message: filteredClasses.length ? undefined : "No valid classes today",
    });
  } catch (error) {
    console.error("Error fetching today's timetable:", error.message);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

const updateFaculty = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, facultyId, role, department, subject, designation, password, 
      qualification, experience, areaOfInterest, jntuId 
    } = req.body; // Removed timetable from updates

    const imagePath = req.file ? req.file.path : null;

    let updatedData = {
      name, facultyId, role, department, subject, designation, 
      qualification, experience, areaOfInterest: areaOfInterest ? areaOfInterest.split(",") : undefined, jntuId
    };

    if (password) updatedData.password = await bcrypt.hash(password, 10);
    if (imagePath) updatedData.image = imagePath;

    const updatedFaculty = await Faculty.findByIdAndUpdate(id, updatedData, { new: true });

    if (!updatedFaculty) return res.status(404).json({ message: "Faculty not found" });

    res.status(200).json({ message: "Faculty updated successfully", faculty: updatedFaculty });
  } catch (error) {
    console.error("Error in updateFaculty:", error.message);
    res.status(500).json({ message: "Error updating faculty", error: error.message });
  }
};

const loginFaculty = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: "Username and password are required" });
    }

    const faculty = await Faculty.findOne({ facultyId: username });

    if (!faculty) {
      return res.status(401).json({ success: false, message: "Invalid credentials: Faculty not found" });
    }

    const isMatch = await bcrypt.compare(password, faculty.password);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials: Incorrect password" });
    }

    const token = jwt.sign(
      { id: faculty._id, role: faculty.role || "faculty", facultyId: faculty.facultyId },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(200).json({
      success: true,
      message: "Login successful",
      token, 
      faculty: { id: faculty._id, name: faculty.name, role: faculty.role, department: faculty.department },
    });
  } catch (error) {
    console.error("Error during login:", error.message);
    res.status(500).json({ success: false, message: "Error during login", error: error.message });
  }
};

const getFacultyById = async (req, res) => {
  try {
    const { id } = req.params;
    const faculty = await Faculty.findById(id);
    if (!faculty) return res.status(404).json({ message: "Faculty not found" });
    res.status(200).json(faculty);
  } catch (error) {
    res.status(500).json({ message: "Error fetching faculty", error });
  }
};

const getAllFaculty = async (req, res) => {
  try {
    const facultyList = await Faculty.find();
    res.status(200).json(facultyList);
  } catch (error) {
    res.status(500).json({ message: "Error fetching faculty", error });
  }
};

const deleteFaculty = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedFaculty = await Faculty.findByIdAndDelete(id);
    if (!deletedFaculty) return res.status(404).json({ message: "Faculty not found" });
    res.status(200).json({ message: "Faculty deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting faculty", error });
  }
};

const getFacultyTimetable = async (req, res) => {
  try {
    const { id } = req.params;
    const faculty = await Faculty.findById(id);

    if (!faculty) return res.status(404).json({ message: "Faculty not found" });

    res.status(200).json({
      timetable: faculty.timetable,
      facultyDetails: { name: faculty.name, department: faculty.department, role: faculty.role },
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching timetable", error: error.message });
  }
};

const updateFacultyTimetable = async (req, res) => {
  try {
    const { id } = req.params;
    const { timetable } = req.body;

    if (!timetable) return res.status(400).json({ message: "Timetable is required" });

    let parsedTimetable;
    try {
      parsedTimetable = JSON.parse(timetable);
      if (!Array.isArray(parsedTimetable) || parsedTimetable.length === 0) {
        return res.status(400).json({ message: "Timetable format is invalid" });
      }
    } catch (error) {
      return res.status(400).json({ message: "Invalid timetable JSON format" });
    }

    const faculty = await Faculty.findById(id);
    if (!faculty) return res.status(404).json({ message: "Faculty not found" });

    faculty.timetable = parsedTimetable;
    await faculty.save();

    res.status(200).json({ message: "Faculty timetable updated successfully", faculty });
  } catch (error) {
    console.error("Error in updateFacultyTimetable:", error.message);
    res.status(500).json({ message: "Error updating timetable", error: error.message });
  }
};

const getExactPeriodsForSubject = async (req, res) => {
  try {
    const { facultyId, department, section, subject } = req.params;

    if (!facultyId || !department || !section || !subject) {
      return res.status(400).json({ message: "All parameters are required" });
    }

    const faculty = await Faculty.findOne({ facultyId });
    if (!faculty) return res.status(404).json({ message: "Faculty not found" });

    const currentDay = getCurrentDay();
    const todayTimetable = faculty.timetable.find((entry) => entry.day === currentDay);

    if (!todayTimetable || !todayTimetable.periods.length) {
      return res.status(200).json({ periods: [], message: "No classes scheduled today" });
    }

    const matchedPeriods = todayTimetable.periods
      .filter(
        (period) =>
          period.department === department &&
          period.section === section &&
          period.subject === subject
      )
      .map((period, index) => index + 1); 

    res.status(200).json({
      periods: matchedPeriods,
      message: matchedPeriods.length ? undefined : "No periods found for the specified subject today",
    });
  } catch (error) {
    console.error("Error fetching periods for subject:", error.message);
    res.status(500).json({ message: "Error fetching periods for subject", error: error.message });
  }
};

const getFacultiesByDepartment = async (req, res) => {
  try {
    const { department } = req.params;
    if (!department) return res.status(400).json({ message: "Department is required" });

    const faculties = await Faculty.find({ department: department });

    if (faculties.length === 0) return res.status(404).json({ message: "No faculty members found for this department" });

    res.status(200).json(faculties);
  } catch (error) {
    console.error("Error fetching faculties by department:", error.message);
    res.status(500).json({ message: "Error fetching faculties", error: error.message });
  }
};

const deleteFacultyByFacultyId = async (req, res) => {
  try {
    const { facultyId } = req.params;
    const deletedFaculty = await Faculty.findOneAndDelete({ facultyId });

    if (!deletedFaculty) return res.status(404).json({ message: "Faculty not found" });

    res.status(200).json({ message: "Faculty deleted successfully", faculty: deletedFaculty });
  } catch (error) {
    console.error("Error in deleteFacultyByFacultyId:", error.message);
    res.status(500).json({ message: "Error deleting faculty", error: error.message });
  }
};

const getFacultyByFacultyId = async (req, res) => {
  try {
    const { facultyId } = req.params;
    const faculty = await Faculty.findOne({ facultyId });

    if (!faculty) return res.status(404).json({ message: "Faculty not found" });

    res.status(200).json(faculty);
  } catch (error) {
    console.error("Error fetching faculty by facultyId:", error.message);
    res.status(500).json({ message: "Error fetching faculty", error: error.message });
  }
};

const getTimetableByFacultyId = async (req, res) => {
  try {
    const { facultyId } = req.params;
    const faculty = await Faculty.findOne({ facultyId });

    if (!faculty) return res.status(404).json({ message: "Faculty not found" });

    res.status(200).json({
      timetable: faculty.timetable,
      facultyDetails: { name: faculty.name, department: faculty.department, role: faculty.role },
    });
  } catch (error) {
    console.error("Error fetching timetable by facultyId:", error.message);
    res.status(500).json({ message: "Error fetching timetable", error: error.message });
  }
};

module.exports = {
  addFaculty, getAllFaculty, getFacultyById, updateFaculty, deleteFaculty,
  getFacultyTimetable, updateFacultyTimetable, loginFaculty, getFacultyUniqueCombinationsFor7Days,
  getExactPeriodsForSubject, getFacultiesByDepartment, deleteFacultyByFacultyId,
  getFacultyByFacultyId, getTimetableByFacultyId, getTodayTimetableByFacultyId
};
