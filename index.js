const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
// const jwt = require('jsonwebtoken');
// const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const port = process.env.PORT || 3000;

// ==========================================
// MIDDLEWARE CONFIGURATION
// ==========================================
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
    
    // ==========================================
    // DATABASE & COLLECTIONS SETUP
    // ==========================================
    const db = client.db('bloodConnectDB');
    const usersCollection = db.collection('users');
    const donationRequestsCollection = db.collection('donationRequests');
    const blogsCollection = db.collection('blogs');

    // ==========================================
    // JWT & ADMIN VERIFICATION MIDDLEWARES
    // ==========================================
    // We will build verifyToken and verifyAdmin here later


    // ==========================================
    // API ROUTES: USERS
    // ==========================================
  
    // POST: Create a new user (Registration / Google Login)
    app.post('/users', async (req, res) => {
      const user = req.body;
      
      // Check if user already exists in the database
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'User already exists', insertedId: null });
      }

      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // GET: Fetch user role by email (For Role-Based Access Control)
    app.get('/users/role/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      
      let role = 'donor'; // Fallback default
      if (user?.role) {
        role = user.role;
      }
      res.send({ role });
    });

    // -----------------------------------------------------------------
    // 👇 NEW CHANGES ADDED BELOW: PROFILE FETCHING & UPDATING 👇
    // -----------------------------------------------------------------

    // GET: Fetch specific user details by email (For Dashboard Profile)
    app.get('/users/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await usersCollection.findOne(query);
      res.send(result);
    });

    // PATCH: Update specific user profile details
    app.patch('/users/:email', async (req, res) => {
      const email = req.params.email;
      const updatedData = req.body;
      const query = { email: email };
      
      const updateDoc = {
        $set: {
          name: updatedData.name,
          bloodGroup: updatedData.bloodGroup,
          district: updatedData.district,
          upazila: updatedData.upazila,
          avatar: updatedData.avatar // Allows avatar updates if needed later
        }
      };
      
      const result = await usersCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    // -----------------------------------------------------------------
    // 👆 NEW CHANGES END HERE 👆
    // -----------------------------------------------------------------


    // ==========================================
    // API ROUTES: DONATION REQUESTS (Coming Soon)
    // ==========================================


    // ==========================================
    // API ROUTES: BLOGS (Coming Soon)
    // ==========================================


    // ==========================================
    // ROOT SERVER ROUTE
    // ==========================================
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

// ==========================================
// START SERVER
// ==========================================
app.listen(port, () => {
  console.log(`BloodConnect is listening on port ${port}`);
});