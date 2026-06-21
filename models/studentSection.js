const mongoose = require("mongoose");   

const StudentSchema = new mongoose.Schema({  
  rollNumber: { type: String, required: true }, 
  name: { type: String, required: true }, 
  fatherName: { type: String, required: false }, 
  password: { type: String, required: false }, 
  role: { type: String, enum: ["student", "admin", "teacher"], default: "student" }, 
  image: { type: String, required: false }, 
  mobileNumber: { type: String, required: false }, 
  fatherMobileNumber: { type: String, required: false }, 
});  

const SectionTimetableSchema = new mongoose.Schema({  
  day: { type: String, required: true }, 
  periods: [  
    {  
      periodNumber: { type: Number, required: true },  
      subject: { type: String, required: true },  
      facultyId: { type: String, required: false }, // <-- ADDED THIS: Used for auto-syncing
      facultyName: { type: String, required: false }, 
      phoneNumber: { type: String, required: false }, 
    },  
  ],  
});  

const SectionSchema = new mongoose.Schema({  
  name: { type: String, required: true },  
  timetable: [SectionTimetableSchema], 
  students: [StudentSchema], 
});  

const DepartmentSchema = new mongoose.Schema({  
  name: { type: String, required: true }, 
  sections: [SectionSchema], 
});  

const YearSchema = new mongoose.Schema({  
  year: { type: String, required: true }, 
  departments: [DepartmentSchema], 
});  

const Year = mongoose.model("SectionData", YearSchema);  
module.exports = Year;
