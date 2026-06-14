# 13. Viva Preparation Guide

This document contains expected questions from external examiners during your final project Viva, along with professional answers.

## Section 1: Architecture & Design

**Q1: Why did you build this as an Electron Desktop App instead of a normal website?**
**Answer:** "Medical data is highly sensitive. By building a desktop application, we ensure the interface feels native and secure for doctors. Furthermore, in the future, a desktop app allows us to process heavy image normalization locally on the doctor's GPU, reducing server costs, rather than uploading massive raw histopathology slides over a slow hospital network."

**Q2: What is the difference between your Main Backend and your ML Engine? Why use two different ports?**
**Answer:** "We adopted a microservices architecture. The Main Backend (Port 5099) handles user authentication, JWT tokens, and database CRUD operations. The ML Engine (Port 5001) is strictly responsible for TensorFlow inference. By decoupling them, we prevent the heavy ML processing from blocking or slowing down routine database queries. It also allows us to scale them independently in the cloud."

**Q3: How are you managing the database in the cloud?**
**Answer:** "We use PostgreSQL hosted on Neon.tech. Neon is a serverless database that separates compute and storage, making it incredibly fast and scalable. Our backend connects to it via a `DATABASE_URL` environment variable configured on Render."

## Section 2: Artificial Intelligence & Machine Learning

**Q4: What is the purpose of Macenko Normalization in your pipeline?**
**Answer:** "Histopathology slides are stained using Hematoxylin and Eosin (H&E). However, different hospitals use different concentrations of dye, resulting in inconsistent colors. Macenko normalization mathematically isolates the stain vectors and standardizes the color profile. This prevents our CNN from learning 'color biases' and forces it to focus purely on cellular structure."

**Q5: What happens if a user uploads a picture of a car instead of a medical slide?**
**Answer:** "We implemented an 'H&E Gatekeeper' algorithm before the ML inference phase. It analyzes the RGB pixel distribution of the uploaded image. If it doesn't detect the specific biological pink and purple signatures of H&E tissue, it rejects the image with a 422 Error, saving server RAM and preventing junk data from entering our database."

**Q6: Why did you use TensorFlow-CPU on Render instead of full TensorFlow?**
**Answer:** "Render's free tier provides CPU-only containers with 512MB of RAM. The full `tensorflow` package includes CUDA and cuDNN libraries for GPU processing, which are useless on Render and consume an extra 80MB of RAM. By explicitly using `tensorflow-cpu`, we optimized our RAM footprint and prevented Out-Of-Memory (OOM) crashes."

## Section 3: Security & Database

**Q7: How are passwords secured in your database?**
**Answer:** "We never store plain-text passwords. We use the `bcrypt` algorithm with salt to hash the passwords 12 times. Even if our Neon database was compromised, the passwords cannot be reverse-engineered."

**Q8: What is a JWT and how do you use it?**
**Answer:** "JSON Web Tokens (JWT) allow stateless authentication. When a doctor logs in, the backend signs a token containing their User ID and Role. The frontend stores this token and attaches it to every API request header. Our Python middleware validates the cryptographic signature of the token before allowing access to protected routes like `/api/patients`."

**Q9: If I look at your database, how are the medical images stored?**
**Answer:** "Instead of setting up a complex AWS S3 bucket, we convert the slide images into Base64 encoded strings and store them directly in a `TEXT` column in the PostgreSQL database. Since the images are resized to 500px before saving, each image only takes about 75KB, making this a highly efficient and self-contained storage method for our academic project scope."
