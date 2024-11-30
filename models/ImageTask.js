const mongoose = require('mongoose');

const ImageTaskSchema = new mongoose.Schema({
    url: { type: String, required: true }, 
    status: { type: String, default: 'pending' },
    outputPath: { type: String, default: null }, 
    errorMessage: { type: String, default: null }, 
    resizeWidth: { type: Number, default: null }, 
    resizeHeight: { type: Number, default: null }, 
    grayscale: { type: Boolean, default: false }, 
    createdAt: { type: Date, default: Date.now }, 
    updatedAt: { type: Date, default: Date.now },  
});

module.exports = mongoose.model('ImageTask', ImageTaskSchema);