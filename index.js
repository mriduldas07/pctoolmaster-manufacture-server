const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const port = process.env.PORT || 5000;
const app = express();

//middleware
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.p6vqe.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run() {
    try {
        await client.connect();
        const toolsCollection = client.db("PcToolMaster").collection("tools");
        const ordersCollection = client.db("PcToolMaster").collection("orders");
        const usersCollection = client.db("PcToolMaster").collection("user");
        const reviewsCollection = client.db("PcToolMaster").collection("review");

        // load data

        app.get('/tools', async (req, res) => {
            const query = {};
            const tools = await toolsCollection.find(query).toArray();
            res.send(tools)
        })


        // load data for id
        app.get("/tools/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const toolDetail = await toolsCollection.findOne(query);
            res.send(toolDetail)
        })

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

        // submit customer review
        app.post("/review", async (req, res) => {
            const review = req.body;
            const result = await reviewsCollection.insertOne(review);
            res.send(result);
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