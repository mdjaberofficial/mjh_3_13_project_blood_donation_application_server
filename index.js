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

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.3l2kzzv.mongodb.net/bloodConnectDB?retryWrites=true&w=majority&authSource=admin`;


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

    // -----------------------------------------------------------------
    // 👇 NEW CHANGES: ADMIN USER MANAGEMENT 👇
    // -----------------------------------------------------------------

    // GET: Fetch all users (For Admin Dashboard)
    app.get('/users', async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    // PATCH: Update user role (Admin / Volunteer / Donor)
    app.patch('/users/role/:id', async (req, res) => {
      const id = req.params.id;
      const { role } = req.body;
      const query = { _id: new ObjectId(id) };
      const updateDoc = { $set: { role: role } };
      const result = await usersCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    // PATCH: Update user status (Active / Blocked)
    app.patch('/users/status/:id', async (req, res) => {
      const id = req.params.id;
      const { status } = req.body;
      const query = { _id: new ObjectId(id) };
      const updateDoc = { $set: { status: status } };
      const result = await usersCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    // -----------------------------------------------------------------
    // 👆 NEW CHANGES END HERE 👆
    // -----------------------------------------------------------------

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
    // API ROUTES: DONATION REQUESTS 
    // ==========================================
    
    // -----------------------------------------------------------------
    // 👇 NEW CHANGES: FETCH SINGLE REQUEST & UPDATE 👇
    // -----------------------------------------------------------------

    // GET: Fetch a single donation request by ID
    app.get('/donation-requests/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await donationRequestsCollection.findOne(query);
      res.send(result);
    });

    // PATCH: Update an existing donation request
    app.patch('/donation-requests/update/:id', async (req, res) => {
      const id = req.params.id;
      const updatedData = req.body;
      const query = { _id: new ObjectId(id) };
      
      const updateDoc = {
        $set: {
          recipientName: updatedData.recipientName,
          recipientDistrict: updatedData.recipientDistrict,
          recipientUpazila: updatedData.recipientUpazila,
          hospitalName: updatedData.hospitalName,
          fullAddress: updatedData.fullAddress,
          bloodGroup: updatedData.bloodGroup,
          donationDate: updatedData.donationDate,
          donationTime: updatedData.donationTime,
          requestMessage: updatedData.requestMessage,
        }
      };

      const result = await donationRequestsCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    // -----------------------------------------------------------------
    // 👆 NEW CHANGES END HERE 👆
    // -----------------------------------------------------------------

    // -----------------------------------------------------------------
    // 👇 NEW CHANGES: ADMIN/VOLUNTEER REQUEST MANAGEMENT 👇
    // -----------------------------------------------------------------

    // GET: Fetch all donation requests
    app.get('/donation-requests', async (req, res) => {
      // Sorting by newest first
      const result = await donationRequestsCollection.find().sort({ _id: -1 }).toArray();
      res.send(result);
    });

    // PATCH: Update donation request status
    app.patch('/donation-requests/status/:id', async (req, res) => {
      const id = req.params.id;
      const { status } = req.body;
      const query = { _id: new ObjectId(id) };
      const updateDoc = { $set: { status: status } };
      const result = await donationRequestsCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    // -----------------------------------------------------------------
    // 👆 NEW CHANGES END HERE 👆
    // -----------------------------------------------------------------

    // -----------------------------------------------------------------
    // 👇 NEW CHANGES: CREATE DONATION REQUEST 👇
    // -----------------------------------------------------------------

    // POST: Create a new blood donation request
    app.post('/donation-requests', async (req, res) => {
      const requestData = req.body;
      
      // Ensure the default status is 'pending' as per requirements
      if (!requestData.status) {
        requestData.status = 'pending';
      }

      const result = await donationRequestsCollection.insertOne(requestData);
      res.send(result);
    });

    // -----------------------------------------------------------------
    // 👆 NEW CHANGES END HERE 👆
    // -----------------------------------------------------------------

    // -----------------------------------------------------------------
    // 👇 NEW CHANGES: MY DONATION REQUESTS (GET & DELETE) 👇
    // -----------------------------------------------------------------

    // GET: Fetch donation requests by requester email
    app.get('/donation-requests/requester/:email', async (req, res) => {
      const email = req.params.email;
      const query = { requesterEmail: email };
      // Sort by newest first (optional but good practice)
      const result = await donationRequestsCollection.find(query).sort({ _id: -1 }).toArray();
      res.send(result);
    });

    // DELETE: Remove a specific donation request
    app.delete('/donation-requests/:id', async (req, res) => {
      const id = req.params.id;
      // We must use ObjectId to match MongoDB's _id format
      const query = { _id: new ObjectId(id) };
      const result = await donationRequestsCollection.deleteOne(query);
      res.send(result);
    });

    // -----------------------------------------------------------------
    // 👆 NEW CHANGES END HERE 👆
    // -----------------------------------------------------------------


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