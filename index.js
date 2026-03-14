const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const admin = require('firebase-admin');

// ==========================================
// FIREBASE ADMIN SDK INITIALIZATION
// ==========================================
const serviceAccount = JSON.parse(
    Buffer.from(process.env.FB_SERVICE_KEY, 'base64').toString('utf8')
);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const app = express();
const port = process.env.PORT || 3000;

// ==========================================
// MIDDLEWARE CONFIGURATION
// ==========================================
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.3l2kzzv.mongodb.net/bloodConnectDB?retryWrites=true&w=majority&authSource=admin`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        const db = client.db('bloodConnectDB');
        const usersCollection = db.collection('users');
        const donationRequestsCollection = db.collection('donationRequests');
        const blogsCollection = db.collection('blogs');

        // ==========================================
        // JWT & VERIFICATION MIDDLEWARES
        // ==========================================

        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.send({ token });
        });

        const verifyToken = (req, res, next) => {
            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'unauthorized access' });
            }
            const token = req.headers.authorization.split(' ')[1];
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'unauthorized access' });
                }
                req.decoded = decoded;
                next();
            });
        };

        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded?.email;
            const user = await usersCollection.findOne({ email });
            if (user?.role !== 'admin') {
                return res.status(403).send({ message: 'forbidden access' });
            }
            next();
        };

        const verifyStaff = async (req, res, next) => {
            const email = req.decoded?.email;
            const user = await usersCollection.findOne({ email });
            const isStaff = user?.role === 'admin' || user?.role === 'volunteer';
            if (!isStaff) {
                return res.status(403).send({ message: 'forbidden access' });
            }
            next();
        };

        // ==========================================
        // API ROUTES: USERS
        // ==========================================

        app.post('/users', async (req, res) => {
            const user = req.body;
            const existingUser = await usersCollection.findOne({ email: user.email });
            if (existingUser) return res.send({ message: 'User exists', insertedId: null });
            const result = await usersCollection.insertOne(user);
            res.send(result);
        });

        app.get('/all-users', verifyToken, verifyAdmin, async (req, res) => {
            const result = await usersCollection.find().toArray();
            res.send(result);
        });

        app.get('/users/role/:email', async (req, res) => {
            const user = await usersCollection.findOne({ email: req.params.email });
            res.send({ role: user?.role || 'donor' });
        });

        // ⭐ RESTORED: Fetch single user profile (For My Profile Page)
        app.get('/users/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            if (email !== req.decoded?.email) {
                return res.status(403).send({ message: 'forbidden access' });
            }
            const result = await usersCollection.findOne({ email });
            res.send(result);
        });

        app.patch('/users/update-role/:id', verifyToken, verifyAdmin, async (req, res) => {
            const result = await usersCollection.updateOne(
                { _id: new ObjectId(req.params.id) },
                { $set: { role: req.body.role } }
            );
            res.send(result);
        });

        app.patch('/users/update-status/:id', verifyToken, verifyAdmin, async (req, res) => {
            const result = await usersCollection.updateOne(
                { _id: new ObjectId(req.params.id) },
                { $set: { status: req.body.status } }
            );
            res.send(result);
        });

        // ==========================================
        // API ROUTES: DONATION REQUESTS
        // ==========================================

        app.get('/public-donation-requests', async (req, res) => {
            const result = await donationRequestsCollection
                .find({ status: 'pending' })
                .sort({ _id: -1 })
                .toArray();
            res.send(result);
        });

        app.get('/all-donation-requests', verifyToken, verifyStaff, async (req, res) => {
            const result = await donationRequestsCollection.find().sort({ _id: -1 }).toArray();
            res.send(result);
        });

        // ⭐ RESTORED: Fetch requests created by a specific user (For Dashboard Page)
        app.get('/donation-requests/requester/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            if (email !== req.decoded?.email) {
                return res.status(403).send({ message: 'forbidden access' });
            }
            const result = await donationRequestsCollection
                .find({ requesterEmail: email })
                .sort({ _id: -1 })
                .toArray();
            res.send(result);
        });

        app.get('/donation-requests/:id', async (req, res) => {
            const result = await donationRequestsCollection.findOne({ _id: new ObjectId(req.params.id) });
            res.send(result);
        });

        app.patch('/donation-requests/accept/:id', verifyToken, async (req, res) => {
            const result = await donationRequestsCollection.updateOne(
                { _id: new ObjectId(req.params.id) },
                { $set: { 
                    donorName: req.body.donorName, 
                    donorEmail: req.body.donorEmail, 
                    status: 'inprogress' 
                } }
            );
            res.send(result);
        });

        app.patch('/donation-requests/status/:id', verifyToken, verifyStaff, async (req, res) => {
            const result = await donationRequestsCollection.updateOne(
                { _id: new ObjectId(req.params.id) },
                { $set: { status: req.body.status } }
            );
            res.send(result);
        });

        app.delete('/donation-requests/:id', verifyToken, verifyAdmin, async (req, res) => {
            const result = await donationRequestsCollection.deleteOne({ _id: new ObjectId(req.params.id) });
            res.send(result);
        });

        // ==========================================
        // API ROUTES: BLOGS
        // ==========================================

        app.get('/all-blogs', verifyToken, verifyStaff, async (req, res) => {
            const result = await blogsCollection.find().sort({ _id: -1 }).toArray();
            res.send(result);
        });

        app.get('/blogs/:id', verifyToken, verifyStaff, async (req, res) => {
            const result = await blogsCollection.findOne({ _id: new ObjectId(req.params.id) });
            res.send(result);
        });

        app.patch('/blogs/:id', verifyToken, verifyStaff, async (req, res) => {
            const result = await blogsCollection.updateOne(
                { _id: new ObjectId(req.params.id) },
                { $set: { 
                    title: req.body.title, 
                    thumbnail: req.body.thumbnail, 
                    content: req.body.content 
                } }
            );
            res.send(result);
        });

        app.patch('/blogs/status/:id', verifyToken, verifyStaff, async (req, res) => {
            const result = await blogsCollection.updateOne(
                { _id: new ObjectId(req.params.id) },
                { $set: { status: req.body.status } }
            );
            res.send(result);
        });

        app.delete('/blogs/:id', verifyToken, verifyStaff, async (req, res) => {
            const result = await blogsCollection.deleteOne({ _id: new ObjectId(req.params.id) });
            res.send(result);
        });

        // ==========================================
        // STATS
        // ==========================================

        // ==========================================
        // USER / DONOR DASHBOARD ROUTES
        // ==========================================

        // 1. Fetch requests created by the logged-in user (My Requests)
        app.get('/donation-requests/requester/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            // Security check
            if (email !== req.decoded?.email) {
                return res.status(403).send({ message: 'forbidden access' });
            }
            const result = await donationRequestsCollection
                .find({ requesterEmail: email })
                .sort({ _id: -1 })
                .toArray();
            res.send(result);
        });

        // 2. Fetch requests the user has accepted as a donor (My Donations)
        app.get('/my-donations/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            // Security check
            if (email !== req.decoded?.email) {
                return res.status(403).send({ message: 'forbidden access' });
            }
            const result = await donationRequestsCollection
                .find({ donorEmail: email })
                .sort({ _id: -1 })
                .toArray();
            res.send(result);
        });

        // ==========================================
        // STATS & DASHBOARD DATA
        // ==========================================

        
        
        // 1. Dashboard Charts & Summary (Staff/Admin)
        app.get('/admin-dashboard-stats', verifyToken, verifyStaff, async (req, res) => {
            try {
                const bloodGroupData = await usersCollection.aggregate([
                    { $group: { _id: "$bloodGroup", count: { $sum: 1 } } }
                ]).toArray();

                const statusData = await donationRequestsCollection.aggregate([
                    { $group: { _id: "$status", value: { $sum: 1 } } }
                ]).toArray();

                const totalDonors = await usersCollection.countDocuments({ role: 'donor' });
                const totalVolunteers = await usersCollection.countDocuments({ role: 'volunteer' });
                const pendingRequests = await donationRequestsCollection.countDocuments({ status: 'pending' });

                res.send({
                    bloodGroupData: bloodGroupData.map(item => ({ name: item._id, count: item.count })),
                    statusData: statusData.map(item => ({ name: item._id, value: item.value })),
                    summary: { totalDonors, totalVolunteers, pendingRequests }
                });
            } catch (error) {
                res.status(500).send({ message: "Failed to fetch dashboard stats" });
            }
        });

        // 2. Public / General Admin Stats
        app.get('/admin-stats', async (req, res) => {
            const totalUsers = await usersCollection.estimatedDocumentCount();
            const totalRequests = await donationRequestsCollection.estimatedDocumentCount();
            const doneDonations = await donationRequestsCollection.countDocuments({ status: 'done' });
            const districts = await usersCollection.distinct("district", { status: 'active' });
            res.send({ totalUsers, totalRequests, doneDonations, totalDistricts: districts.length });
        });
        
        app.get('/admin-stats', async (req, res) => {
            const totalUsers = await usersCollection.estimatedDocumentCount();
            const totalRequests = await donationRequestsCollection.estimatedDocumentCount();
            const doneDonations = await donationRequestsCollection.countDocuments({ status: 'done' });
            const districts = await usersCollection.distinct("district", { status: 'active' });
            res.send({ totalUsers, totalRequests, doneDonations, totalDistricts: districts.length });
        });

        // ==========================================
        // API ROUTES: BLOGS
        // ==========================================

        // ⭐ NEW: Public route to fetch only published blogs for the Navbar page
        app.get('/published-blogs', async (req, res) => {
            try {
                const result = await blogsCollection
                    .find({ status: 'published' })
                    .sort({ _id: -1 })
                    .toArray();
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: "Failed to fetch blogs" });
            }
        });

        // ... (keep your existing /all-blogs and other routes below this)

        app.get('/', (req, res) => res.send('BloodConnect Server Active'));

        console.log("MongoDB Connected Successfully!");
    } finally { }
}
run().catch(console.dir);

app.listen(port, () => console.log(`Listening on port ${port}`));