const cors = require("cors");
const express = require("express");
const httpstatustext = require("./utilities/httpstatustext");
const fs = require("fs");
const path = require("path");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
});

app.set("io", io);

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);
});

require('dotenv').config();

require('./models/userModel');
require('./models/departmentModel');
require('./models/doctorModel');
require('./models/studentModel');
require('./models/adminModel');
require('./models/courseModel');
require('./models/classModel');
require('./models/roomModel');
require('./models/lectureModel');
require('./models/materialModel');
require('./models/gradeModel');
require('./models/jusnctionModel');
require('./models/questionModel');
require('./models/answerModel');
require('./models/attendanceModel');
require('./models/notificationModel');
require('./models/userNotificationModel');
require('./models/classNotificationModel');
require('./models/academicLevelFeesModel');
require('./models/prerequisiteModel');
require('./models/studyOutputModel');





// const httpstatustext=require('./utilities/httpstatustext');
// const createuser = require("./controllers/test");
// createuser(); // ✅ كده هتشتغل

// allow for cors
app.use(cors());

const uploadsPath = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}

// static files for avater image
app.use("/uploads", express.static(uploadsPath));
app.use("/files", express.static(uploadsPath));

// parse json body
app.use(express.json());

// Log incoming requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

//routes - MUST be before app.all()
const authRouter = require("./routes/auth");
const studentRouter = require("./routes/student");
const lectureRouter = require("./routes/lecture");
const materialRouter = require("./routes/material");
const doctorRouter = require("./routes/doctor");
const gradeRouter = require("./routes/grade");
const coursesRouter = require("./routes/courses");
const departmentRouter = require("./routes/department");
const adminRouter = require("./routes/admin");
const roomRouter = require("./routes/roomRoutes");
const aiRouter = require("./routes/aiRoutes");
const internalAiRouter = require("./routes/internalAiRoutes");

// ============ ROUTES CONFIGURATION ============
// Auth Routes (Register, Login, Email Verification, Password Reset, Resend emails)
app.use("/api/auth", authRouter);


// Student Routes

const classesRouter = require('./routes/classes');
app.use('/api/classes', classesRouter);
app.use("/api/classes", aiRouter);
app.use("/api/internal/ai", internalAiRouter);

const attendanceRouter = require('./routes/attendance');
app.use('/api/attendance', attendanceRouter);

const questionsRouter = require('./routes/questions');
app.use('/api/questions', questionsRouter);

const notificationsRouter = require('./routes/notifications');
app.use('/api/notifications', notificationsRouter);

app.use("/api/students", studentRouter);

// Doctor Routes
app.use("/api/doctors", doctorRouter);

// Grade Routes
app.use("/api/grades", gradeRouter);

// Lecture/Classes Routes
app.use("/api/classes", lectureRouter);
app.use("/api/classes", materialRouter);
app.use("/api", materialRouter);

app.use("/api/courses", coursesRouter);
app.use("/api/departments", departmentRouter);
app.use("/api/admin", adminRouter);
app.use("/api/rooms", roomRouter);
// handling other routes by jsend
//and to handle unfound routes
app.all(/.*/, (req, res) => {
  res.status(404).json({
    success: httpstatustext.error,
    message: "route not found",
  });
});

// global error handling middleware
//we put err in the first parameter because we send it in asyncwrapper by next() method
app.use((err, req, res, next) => {
  res.status(err.statusCode || 500).json({
    success: httpstatustext.error,
    message: err.message,
  });
});

server.listen(process.env.PORT, () => {
  console.log("Server is running on port " + process.env.PORT);
  console.log(`http://localhost:${process.env.PORT}`);
  console.log("Serving static files from:", uploadsPath);
});

