const connectDB = require('./config/mongoose.config');
const ImageTask = require('./models/ImageTask');
const axios = require('axios');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'output');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);
connectDB();

async function fetchImageWithRetry(url, retries = 3, delay = 1000) {
    try {
        return await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
    } catch (error) {
        if (retries > 0) {
            console.log(`Retrying download for ${url}, attempts left: ${retries}`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return fetchImageWithRetry(url, retries - 1, delay);
        } else {
            throw error;
        }
    }
}

async function processTask(task) {
    try {
        console.log(`Attempting to download image from: ${task.url}`);
        const response = await fetchImageWithRetry(task.url, 3, 2000);

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

        console.error(`Error processing task: ${task.url} - ${error.message}`);
    }
}


async function processQueue(batchSize) {
    while (true) {
        const tasks = await ImageTask.find({ status: 'pending' }).limit(batchSize);

        if (tasks.length === 0) {
            console.log('No tasks. Waiting...');
            await new Promise((resolve) => setTimeout(resolve, 5000));
            continue;
        }

        for (const task of tasks) {
            await processTask(task);
        }
    }
}

processQueue(5);


