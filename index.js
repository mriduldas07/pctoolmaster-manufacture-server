const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
const app = express();

//middleware
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.p6vqe.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'UnAuthorized access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' })
        }
        req.decoded = decoded;
        next();
    });
}


async function run() {
    try {
        await client.connect();
        const toolsCollection = client.db("PcToolMaster").collection("tools");
        const ordersCollection = client.db("PcToolMaster").collection("orders");
        const usersCollection = client.db("PcToolMaster").collection("user");
        const reviewsCollection = client.db("PcToolMaster").collection("review");

        // load data for home page
        app.get('/tools', async (req, res) => {
            const query = {};
            const tools = (await toolsCollection.find(query).limit(6).toArray()).reverse();
            res.send(tools)
        })

        // add tools by admin
        app.post("/addTool", async (req, res) => {
            const tool = req.body;
            const result = await toolsCollection.insertOne(tool);
            res.send(result)
        })

        // load data for id
        app.get("/tools/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const toolDetail = await toolsCollection.findOne(query);
            res.send(toolDetail)
        });

        // load tools for admin panel
        app.get("/tools", async (req, res) => {
            const tools = await toolsCollection.find({}).toArray();
            res.send(tools);
        });
        //post  data
        app.post('/tools', async (req, res) => {
            const order = req.body;
            const quantity = parseInt(order.quantity);
            const id = order.productId;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const productCursor = await toolsCollection.findOne(filter);
            const newAvailableQuantity = productCursor.availableQuantity - quantity;
            const updateTool = {
                $set: { availableQuantity: newAvailableQuantity }
            };
            await toolsCollection.updateOne(filter, updateTool, options);
            const result = await ordersCollection.insertOne(order);
            res.send(result);
        });

        // customer all orders (for admin)
        app.get("/allOrders", async (req, res) => {
            const result = await ordersCollection.find().toArray();
            res.send(result)
        });
        //order delevery by admin (delete)
        app.delete("/orderDelivery/:id", async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await ordersCollection.deleteOne(filter);
            res.send(result);
        });

        //customer orders showing Dashboard for user
        app.get("/orders/:email", async (req, res) => {
            const email = req.params.email;
            const query = { customer_email: email };
            const result = await ordersCollection.find(query).toArray();
            res.send(result);
        })

        // order cancel by user
        app.delete("/orderCancel/:id", async (req, res) => {
            const id = req.params.id;
            const query = { productId: id };
            const result = await ordersCollection.deleteOne(query);
            res.send(result);
        })
        //get reeview for home
        app.get("/review", async (req, res) => {
            const reviews = await reviewsCollection.find().toArray();
            res.send(reviews);
        })
        // submit customer review
        app.post("/review", async (req, res) => {
            const review = req.body;
            const result = await reviewsCollection.insertOne(review);
            res.send(result);
        });
        //get customer review
        app.get("/review/:email", async (req, res) => {
            const email = req.params.email;
            const filter = { reviewEmail: email };
            const result = await reviewsCollection.find(filter).toArray();
            res.send(result);
        });

        // delete customer review
        app.delete("/review/:id", async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await reviewsCollection.deleteOne(filter);
            res.send(result);
        })

        // get all user
        app.get("/user", async (req, res) => {
            const result = await usersCollection.find().toArray();
            res.send(result);
        })

        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await usersCollection.findOne({ email: email });
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin })
        })
        //admin pannel
        app.put("/user/admin/:email", async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const updateDoc = {
                $set: { role: 'admin' },
            };
            const result = await usersCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        // remove admin
        app.put("/user/removeAdmin/:email", async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const updatedDoc = {
                $set: {
                    role: ''
                }
            };
            const result = await usersCollection.updateOne(filter, updatedDoc);
            res.send(result);
        })
        // put all user
        app.put("/user/:email", async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN, { expiresIn: '1h' });
            res.send({ result, token });
        })
    }
    finally {

    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send("data for PCtools Master")
});
app.listen(port, () => {
    console.log('running...', port);
})