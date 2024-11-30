
const express = require('express');
const connectDB = require('./config/mongoose.config');
const ImageTask = require('./models/ImageTask');
const axios = require('axios');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

connectDB();
app.use(express.json());
const OUTPUT_DIR = path.join(__dirname, 'output');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

async function processTask(task) {
    try {
        console.log(`Attempting to download image from: ${task.url}`);
        
        const response = await axios.get(task.url, { responseType: 'arraybuffer', timeout: 30000 });
        if (response.status !== 200) {
            throw new Error(`Failed to download image. Status: ${response.status}`);
        }

        const imageBuffer = Buffer.from(response.data);
        const outputFilePath = path.join(OUTPUT_DIR, `${task._id}.jpg`);
        let image = sharp(imageBuffer);

        if (task.resizeWidth && task.resizeHeight) {
            image = image.resize(task.resizeWidth, task.resizeHeight);
        }
        if (task.grayscale) {
            image = image.grayscale();
        }

        await image.toFile(outputFilePath);

    
        task.status = 'success';
        task.outputPath = outputFilePath;
        task.updatedAt = new Date();
        await task.save();

        console.log(`Processed: ${task.url}`);
    } catch (error) {
        task.status = 'failed';
        task.errorMessage = error.message;
        task.updatedAt = new Date();
        await task.save();
        console.error(`Failed to process: ${task.url} - ${error.message}`);
    }
}

app.post('/process-images', async (req, res) => {
    const { imageUrls, resizeWidth, resizeHeight, grayscale } = req.body;

    if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
        return res.status(400).json({ error: 'Provide an array of image URLs' });
    }

    try {
    
        const tasks = imageUrls.map((url) => ({
            url,
            resizeWidth: resizeWidth || null,
            resizeHeight: resizeHeight || null,
            grayscale: grayscale || false, 
        }));

        const result = await ImageTask.insertMany(tasks);


        result.forEach(task => processTask(task));

        res.status(200).json({ message: 'Tasks added and processing started', taskIds: result.map((t) => t._id) });
    } catch (error) {
        res.status(500).json({ error: 'Failed to add tasks', details: error.message });
    }
});

app.post('/summary', async (req, res) => {
    const { dateFrom, dateTo } = req.body;

    try {
        const filter = {};
        console.log('Received Dates:', { dateFrom, dateTo });

        if (dateFrom || dateTo) {
            filter.createdAt = {};

            if (dateFrom) {
                const startDate = new Date(dateFrom);
                console.log('Parsed Start Date:', startDate);
                if (isNaN(startDate)) {
                    return res.status(400).json({ error: 'Invalid dateFrom format' });
                }
    
                startDate.setUTCHours(0, 0, 0, 0);
                filter.createdAt.$gte = startDate;
                console.log('Start Date (UTC):', startDate);
            }

            if (dateTo) {
                const endDate = new Date(dateTo);
                console.log('Parsed End Date:', endDate);
                if (isNaN(endDate)) {
                    return res.status(400).json({ error: 'Invalid dateTo format' });
                }
                endDate.setUTCHours(23, 59, 59, 999);
                filter.createdAt.$lte = endDate;
                console.log('End Date (UTC):', endDate);
            }
        }

        console.log('Final Filter:', filter);
        const total = await ImageTask.countDocuments(filter);
        const successes = await ImageTask.countDocuments({ ...filter, status: 'success' });
        const failures = await ImageTask.countDocuments({ ...filter, status: 'failed' });

        res.status(200).json({ total, successes, failures });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to fetch summary' });
    }
});




app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
 });
