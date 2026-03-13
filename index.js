const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
// const jwt = require('jsonwebtoken');
// const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json()); // Parses incoming JSON requests

// MongoDB Connection URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server (optional starting in v4.7)
    // await client.connect();
    
    // Database & Collections
    const db = client.db('bloodConnectDB');
    const usersCollection = db.collection('users');
    const donationRequestsCollection = db.collection('donationRequests');
    const blogsCollection = db.collection('blogs');

    // ==========================================
    // Middlewares for JWT & Admin Verification
    // ==========================================
    // We will build verifyToken and verifyAdmin here later


    // ==========================================
    // API Routes go here
    // ==========================================
    
    // Basic root route for testing
    app.get('/', (req, res) => {
      res.send('BloodConnect Server is running..');
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`BloodConnect is listening on port ${port}`);
});