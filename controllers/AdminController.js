const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const FacultyProfile = require("../models/admin"); // Assuming this is your admin model

const loginAdmin = async (req, res) => {
  try {
    const { loginId, password } = req.body;

    if (!loginId || !password) {
      return res.status(400).json({ success: false, message: "Login ID and password are required" });
    }

    const admin = await FacultyProfile.findOne({ loginId });

    if (!admin) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    // Generate JWT Token
    const token = jwt.sign(
      { id: admin._id, role: admin.role, loginId: admin.loginId },
      process.env.JWT_SECRET,
      { expiresIn: "1d" } // Token expires in 1 day
    );

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      admin: { id: admin._id, name: admin.name, role: admin.role, department: admin.department },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error during login", error: error.message });
  }
};

const addFacultyProfile = async (req, res) => {    
  try {  
    const { loginId, password, role, designation, department, name, qualification, areaOfInterest, jntuId, yearsOfExperience } = req.body;  

    if (!loginId || !password || !role || !designation || !department || !name || !qualification || !areaOfInterest || !jntuId || !yearsOfExperience) {  
      return res.status(400).json({ message: "All fields are required" });  
    }  

    const hashedPassword = await bcrypt.hash(password, 10);  
    const imagePath = req.file ? req.file.path : null;  

    const newFaculty = new FacultyProfile({  
      loginId, password: hashedPassword, role, designation, department, name, qualification, areaOfInterest, jntuId, yearsOfExperience, image: imagePath  
    });  

    await newFaculty.save();  
    res.status(201).json({ message: "Faculty profile added successfully", faculty: newFaculty });  
  } catch (error) {  
    res.status(500).json({ message: "Error adding faculty profile", error: error.message });  
  }  
};  

const getAllFacultyProfiles = async (req, res) => {
  try {
    const facultyProfiles = await FacultyProfile.find().select("-password"); // Hide passwords
    res.status(200).json(facultyProfiles);
  } catch (error) {
    res.status(500).json({ message: "Error fetching faculty profiles", error: error.message });
  }
};

const getFacultyProfileByLoginId = async (req, res) => {
  try {
    const { loginId } = req.params;
    const facultyProfile = await FacultyProfile.findOne({ loginId }).select("-password");
    if (!facultyProfile) return res.status(404).json({ message: "Faculty profile not found" });
    res.status(200).json(facultyProfile);
  } catch (error) {
    res.status(500).json({ message: "Error fetching faculty profile", error: error.message });
  }
};

module.exports = { loginAdmin, addFacultyProfile, getAllFacultyProfiles, getFacultyProfileByLoginId };
           
