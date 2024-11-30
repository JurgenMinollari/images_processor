# Image Processing API

This project provides an API for processing images. The API accepts a list of image URLs and performs various image transformations, such as resizing and converting to grayscale, using the `sharp` library. The API processes images asynchronously, stores the results, and tracks the status of each image task.

## Features

- **Image Processing:** Resize and grayscale images using the sharp library.
- **Task Management:** Tasks are stored in a MongoDB database to track the status of each image processing job.
- **Retries:** Retries failed downloads of images with configurable retry attempts and delay.
- **Summary Endpoint:** Provides a summary of the processed tasks, including successful and failed tasks within a specified date range.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)
  - [POST /process-images](#post-process-images)
  - [POST /summary](#post-summary)
- [Running the Application](#running-the-application)
- [Task Processing](#task-processing)
  - [Worker Process (worker.js)](#worker-process-workerjs)
- [Database](#database)

## Prerequisites

- Node.js (>= 14.x)
- MongoDB (local or cloud instance like MongoDB Atlas)
- NPM (Node Package Manager)

## Installation

1. Clone the repository:
   npm install
Set up MongoDB:

Ensure MongoDB is running locally or configure a MongoDB URI for a remote instance in your.
MONGODB_URI=mongodb://localhost:27017/image-processing
Install any other dependencies that are required for your environment, such as sharp, axios, and express.

## POST /process-images
- Description:
    This endpoint accepts a list of image URLs and starts processing the images based on optional parameters (resize and grayscale). The images are processed asynchronously by a worker process running in the background. Once the tasks are added to the queue, the processing starts automatically.

- Request Body:
    json
    Copy code
    {
    "imageUrls": [
        "https://example.com/image1.jpg",
        "https://example.com/image2.jpg"
    ],
    "resizeWidth": 800,
    "resizeHeight": 600,
    "grayscale": true
    }

- Response:json
    {
    "message": "Tasks added and processing started",
    "taskIds": ["60c6c3f8f53f51001f4d7bfa", "60c6c3f8f53f51001f4d7bfb"]
    }

- Notes:
    imageUrls: Array of image URLs to process.
    resizeWidth and resizeHeight: Optional. Specify dimensions to resize the image.
    grayscale: Optional. If true, the image will be converted to grayscale.
- How the POST /process-images works:
    Receive Requests: When a POST request is made to /process-images, the API receives a list of image URLs along with optional transformation parameters (resizeWidth, resizeHeight, grayscale).
    Store Tasks in Database: Each URL is inserted as a task in the MongoDB ImageTask collection with an initial status of pending.

- Process Tasks Asynchronously:

    After saving the tasks to the database, the server triggers the processing of each task asynchronously.
    The background processing happens in a separate worker process (worker.js), which constantly listens for tasks with the status pending, fetches the image, performs transformations, and updates the task status to success or failed.

    Response: The API responds with a message indicating the tasks were added and processing has started. The task IDs are returned to allow users to track individual tasks.

## Worker Process (worker.js)

The worker process is responsible for handling image processing tasks in the background. Instead of processing images synchronously during the HTTP request-response cycle, the heavy lifting is offloaded to a worker to keep the API fast and responsive.

- Key Tasks of worker.js:
    Task Fetching: The worker constantly monitors the database for tasks that have a pending status.
    Image Processing: Once a task is fetched, the worker downloads the image from the URL, processes it (resize and/or grayscale), and stores the result.

    Retries: If the image download fails, the worker retries the download with a specified number of retries and delay between each attempt.

    Status Updates: After processing the image, the worker updates the task status in the database (either to success or failed).

    Continuous Processing: The worker runs in an infinite loop, processing tasks in batches. It can be configured to handle a certain number of tasks per batch (e.g., 5 tasks at a time).

- Key Features of the Worker:
    Retry Logic: Handles network failures and retries the image download a specified number of times before marking the task as failed.

    Batch Processing: The worker processes tasks in batches (e.g., 5 at a time), ensuring the system doesn't overload and can efficiently handle
    multiple tasks concurrently.

    Continuous Loop: The worker is designed to run continuously, fetching new tasks and processing them as they are added to the database

## POST /summary
- Description:
    This endpoint retrieves a summary of image processing tasks based on a date range. It returns the total number of tasks, along with the number of successful and failed tasks.

- Request Body:
    json
    {
    "dateFrom": "2024-11-01",
    "dateTo": "2024-11-30"
    }
- Response:
    json
    {
    "total": 10,
    "successes": 7,
    "failures": 3
    }
- Notes:
    dateFrom: Optional. Start date of the range (format: YYYY-MM-DD).
    dateTo: Optional. End date of the range (format: YYYY-MM-DD).

## Running the Application
- Start the server:
    npm start
    The application will start listening on `http://localhost:300