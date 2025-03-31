const express = require('express');
const { registerUser, loginUser, upload } = require('../controllers/authController');
const { body } = require('express-validator');

const router = express.Router();

router.post(
    '/register',
    [
        body('name').notEmpty().withMessage('Name is required'),
        body('email').isEmail().withMessage('Valid email is required'),
        body('phone').isMobilePhone().withMessage('Valid phone number is required'),
        body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    ],
    upload.single('profilePic'),
    registerUser
);

router.post(
    '/login',
    [
        body('email').isEmail().withMessage('Valid email is required'),
        body('password').notEmpty().withMessage('Password is required'),
    ],
    loginUser
);

module.exports = router;