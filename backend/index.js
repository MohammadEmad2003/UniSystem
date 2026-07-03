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
    origin: process.env.FRONTEND_URL || "*",
    methods: ["GET", "POST"]
  },
});

app.set("io", io);

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);
});

require('dotenv').config();

// Import error handler and validator
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { sanitizeInput } = require('./middleware/validator');

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
// createuser(); 

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

// Sanitize all inputs to prevent XSS
app.use(sanitizeInput);

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
const paymentRouter = require("./routes/payment");

// ============ ROUTES CONFIGURATION ============
// Auth Routes (Register, Login, Email Verification, Password Reset, Resend emails)
app.use("/api/auth", authRouter);


// Student Routes

const classesRouter = require('./routes/classes');
app.use('/api/classes', classesRouter);
app.use("/api/classes", aiRouter);
app.use("/api/internal/ai", internalAiRouter);
app.use("/api/payment", paymentRouter);

const attendanceRouter = require('./routes/attendance');
app.use('/api/attendance', attendanceRouter);

// Direct top-level NFC routes for ESP32 hardware compatibility
const { scanCardOnly, readCardInfo } = require('./controllers/attendanceController');
app.post('/api/nfc/scan', scanCardOnly);
app.post('/api/nfc/read-only', scanCardOnly);
app.post('/api/nfc/read-info', readCardInfo);

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
app.use(notFoundHandler);

// global error handling middleware
app.use(errorHandler);

server.listen(process.env.PORT, () => {
  console.log("Server is running on port " + process.env.PORT);
  console.log(`http://localhost:${process.env.PORT}`);
  console.log("Serving static files from:", uploadsPath);
});

