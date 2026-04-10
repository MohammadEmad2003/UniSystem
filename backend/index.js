const cors=require('cors'); 
const express = require("express");
const path=require('path');
const app = express();
require('dotenv').config();// import database to create tables if not exist
require('./models/userModel');
require('./models/departmentModel');
require('./models/doctorModel');
require('./models/studentModel');
require('./models/adminModel');
require('./models/courseModel');       // مش coursesModel
require('./models/classModel');
require('./models/lectureModel');
require('./models/materialModel');
require('./models/gradeModel');        // مش gradesModel
require('./models/jusnctionModel');    // مش junctionTablesModel
require('./models/lectureModel');
require('./models/materialModel');
require('./models/questionModel');     // مش questionsModel
require('./models/answerModel');
require('./models/attendanceModel'); 


const httpstatustext=require('./utilities/httpstatustext');
const createuser = require("./controllers/test");
createuser(); // ✅ كده هتشتغل

// allow for cors
app.use(cors());

// static files for avater image
app.use("/uploads",express.static(path.join(__dirname,'uploads')));

// parse json body
app.use(express.json());

// make any route for testing
app.get("/test",(req,res)=>{
    res.status(200).json({success:true,data:"Test route"});
});

// handling other routes by jsend
//and to handle unfound routes
app.all(/.*/, (req, res) => {
    res.status(404).json({
        success: httpstatustext.error,
        message: { msg: "route not found" }
    });
});


// global error handling middleware
//we put err in the first parameter because we send it in asyncwrapper by next() method
app.use((err, req, res, next) => {
    res.status(err.statusCode||500).json({
        success: httpstatustext.error,
        message: { msg: err.message }
    });
});


app.listen(process.env.PORT, () => {
    console.log("Server is running on port " + process.env.PORT);
    console.log(`http://localhost:${process.env.PORT}`);

});