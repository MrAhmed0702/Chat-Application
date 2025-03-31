const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    match: [/^\d{10}$/, 'Phone number must be 10 digits'],
  },
  password: {
    type: String,
    required: true,
  },
  profilePic: {
    type: String,
    default: "https://icon-library.com/images/default-user-icon/default-user-icon-8.jpg",
  },
},
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);