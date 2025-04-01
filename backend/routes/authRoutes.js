const express = require('express');
const { registerUser, loginUser, updateProfile, upload } = require('../controllers/authController'); // Add updateProfile here
const { body } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');

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

router.put(
    '/profile',
    authMiddleware,
    [
        body('name').optional().notEmpty().withMessage('Name cannot be empty'),
        body('email').optional().isEmail().withMessage('Valid email is required'),
        body('phone').optional().isMobilePhone().withMessage('Valid phone number is required'),
    ],
    upload.single('profilePic'),
    updateProfile
);

module.exports = router;