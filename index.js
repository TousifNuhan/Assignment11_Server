const express = require('express');
const cors = require('cors');
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
const port = process.env.PORT || 5000

app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.l6latif.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });


    const OnlineGroupStudyDB = client.db('OnlineGpDB').collection('GroupStudy')
    const OnlineGroupStudyDBs = client.db('OnlineGpDB').collection('SubmittedAssignments')

    app.get('/createAssignments/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await OnlineGroupStudyDB.findOne(query)
      res.send(result)
    })

    app.get('/createAssignments', async (req, res) => {
      const cursor = OnlineGroupStudyDB.find()
      const result = await cursor.toArray()
      res.send(result)
    })

    app.post('/createAssignments', async (req, res) => {
      const newAssignments = req.body
      console.log(newAssignments)
      const result = await OnlineGroupStudyDB.insertOne(newAssignments)
      res.send(result)
    })

    // submittedAssignments
    app.post('/submittedAssignments', async (req, res) => {
      const data = req.body
      console.log(data)
      const result = await OnlineGroupStudyDBs.insertOne(data)
      res.send(result)
    })

    // specific user's submitted assignments
    app.get('/mySubmittedAssignments', async (req, res) => {
      const email = req.query.email
      // console.log(email)
      const query = { Email: email }
      const result = await OnlineGroupStudyDBs.find(query).toArray()
      res.send(result)
    })

    app.get('/allSubmittedAssignments', async (req, res) => {
      const query = { Status: 'Pending' }
      const result= await OnlineGroupStudyDBs.find(query).toArray()
      res.send(result)
    })

    console.log("Pinged your deployment. You successfully connected to MongoDB!");

  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('running')
})

app.listen(port, () => {
  console.log(`server ${port}`)
})

