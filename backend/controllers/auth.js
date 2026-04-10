const httpStatus = require('../utilities/httpstatustext');
const genericQueries = require('../utilities/genericQueries');
const userQueries = genericQueries('User', {
  primaryKey: 'User_ID',
  emailField: 'Email'
});
const studentQueries = genericQueries('Student', {
  primaryKey: 'User_ID'
});
const asyncWrapper = require("../middleware/asyncWrapper");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// REGISTER - Create new student account
const register = asyncWrapper(async (req, res, next) => {
    const { f_name, l_name, email, password, ssn, academic_level, department_id } = req.body;

    // Validate required fields
    if (!f_name || !l_name || !email || !password) {
        const error = new Error("Missing required fields");
        error.statusCode = 400;
        return next(error);
    }

    // Check if email already exists
    const existingUser = await userQueries.getByEmail(email);
    if (existingUser) {
        const error = new Error("Email already exists");
        error.statusCode = 400;
        return next(error);
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user with "pending" status for students
    const userResult = await userQueries.create({
        F_Name: f_name,
        L_Name: l_name,
        Email: email,
        Password: hashedPassword,
        Role: 'Student',
        Account_Status: 'Suspended'
    });

    const userId = userResult.lastID;

    // Create student record with SSN, academic level, and department
    if (ssn && academic_level && department_id) {
        await studentQueries.create({
            User_ID: userId,
            SSN: ssn,
            Academic_Level: academic_level,
            Dept_ID: department_id,
            Payment_Status: 'Unpaid'
        });
    }

    // Create JWT token
    const token = jwt.sign(
        { 
            user_id: userId, 
            f_name: f_name, 
            l_name: l_name, 
            email: email,
            role: 'Student'
        }, 
        process.env.JWT_SECRET_KEY, 
        { expiresIn: '5h' }
    );

    // Return response with user data
    res.status(201).json({ 
        success: true, 
        data: {
            token,
            user: {
                user_id: userId,
                f_name: f_name,
                l_name: l_name,
                email: email,
                role: 'Student',
                account_status: 'pending',
                ssn: ssn,
                academic_level: academic_level,
                department_id: department_id,
                total_hours: 0,
                total_gpa: 0,
                payment_status: 'unpaid'
            }
        }
    });
});

// LOGIN - Authenticate user and return token
const login = asyncWrapper(async (req, res, next) => {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
        const error = new Error("Email and password are required");
        error.statusCode = 400;
        return next(error);
    }

    // Get user by email
    const user = await userQueries.getByEmail(email);
    if (!user) {
        const error = new Error("Invalid credentials");
        error.statusCode = 401;
        return next(error);
    }

    // Check account status
    if (user.Account_Status === 'Suspended') {
        const error = new Error("Account is suspended");
        error.statusCode = 403;
        return next(error);
    }

    if (user.Account_Status === 'pending' && user.Role === 'Student') {
        const error = new Error("Account pending approval");
        error.statusCode = 403;
        return next(error);
    }

    // Validate password
    const isValidPassword = await bcrypt.compare(password, user.Password);
    if (!isValidPassword) {
        const error = new Error("Invalid credentials");
        error.statusCode = 401;
        return next(error);
    }

    // Create JWT token
    const token = jwt.sign(
        { 
            user_id: user.User_ID,
            f_name: user.F_Name,
            l_name: user.L_Name,
            email: user.Email,
            role: user.Role
        }, 
        process.env.JWT_SECRET_KEY, 
        { expiresIn: '5h' }
    );

    // Get additional student/doctor data if applicable
    let additionalData = {};
    if (user.Role === 'Student') {
        const student = await studentQueries.getById(user.User_ID);
        if (student) {
            additionalData = {
                ssn: student.SSN,
                academic_level: student.Academic_Level,
                department_id: student.Dept_ID,
                total_hours: student.Total_Hours,
                total_gpa: student.Total_GPA,
                payment_status: student.Payment_Status
            };
        }
    }

    // Return response with token and user data
    res.status(200).json({ 
        success: true, 
        data: {
            token,
            user: {
                user_id: user.User_ID,
                f_name: user.F_Name,
                l_name: user.L_Name,
                email: user.Email,
                role: user.Role,
                account_status: user.Account_Status,
                image_url: user.Image_Url,
                created_at: new Date().toISOString(),
                ...additionalData
            }
        }
    });
});

module.exports = {
    register,
    login
};