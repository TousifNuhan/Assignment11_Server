const express = require('express');
const cors = require('cors');
const multer = require('multer');
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { use } = require('react');
const app = express()
const port = process.env.PORT || 5000

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const originalName = file.originalname;
    const extension = originalName.split('.').pop();
    console.log('Saving file:', `${file.fieldname}-${uniqueSuffix}.${extension}`);  // Debug log
    cb(null, `${file.fieldname}-${uniqueSuffix}.${extension}`);
  }
});

const upload = multer({ storage: storage });

app.use(cors({
  origin: ['http://localhost:5173'],   //production a dewar age eta change krte hbe
  credentials: true
}))
app.use(express.json())
app.use('/uploads', express.static('uploads'));
app.use(cookieParser())


// own middleware --> we can use it in many places. It helps us not to repeat the same thing.

const verifyToken = async (req, res, next) => {
  const token = req?.cookies?.token
  if (!token) {
    return res.status(401).send({ message: 'Unauthorized' })
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      console.log(err)
      return res.status(401).send({ message: 'Unauthorized' })
    }
    console.log("dec", decoded)
    req.user = decoded;
    next()
  })
}

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

    //auth api's

    app.post('/jwt', async (req, res) => {
      const user = req.body
      // console.log(user)
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '5h'
      })
      // console.log(token)
      res
        .cookie('token', token, {
          httpOnly: true,
          secure: false,    //production a dewar age eta change krte hbe
          sameSite: 'lax'   // jkhn secure:true dbo tkhn samesite:none dbo
        })
        .send({ success: true })
    })

    app.post('/logout',async(req,res)=>{
      const user=req.body
      console.log(user)
      res
      .clearCookie('token')
      .send({success:true})
    })


    // assignment api's
    app.get('/createAssignments/:id',verifyToken, async (req, res) => {
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

    app.post('/createAssignments',verifyToken, async (req, res) => {
      const user = req.body
      console.log(user?.email)
      // console.log(req.cookies.token)
      console.log(req.user)
      if(user?.email !== req.user?.email){
        return res.status(403).send({message:'Forbidden access'})
      }
      // console.log(newAssignments)
      const result = await OnlineGroupStudyDB.insertOne(user)
      res.send(result)
    })

    app.put('/createAssignments/:id', async (req, res) => {
      const id = req.params.id
      const filter = { _id: new ObjectId(id) }
      const options = { upsert: true }
      const UpdatedData = req.body
      const data = {
        $set: {
          Title: UpdatedData.Title,
          Marks: UpdatedData.Marks,
          dueDate: UpdatedData.dueDate,
          photoURL: UpdatedData.photoURL,
          DifficultyLevel: UpdatedData.DifficultyLevel,
          description: UpdatedData.description
        }
      }
      const result = await OnlineGroupStudyDB.updateOne(filter, data, options)
      res.send(result)
    })

    // submittedAssignments
    app.post('/submittedAssignments', upload.single('File'), async (req, res) => {
      const { Name, Title, Marks, Email, TextArea, Status } = req.body
      const file = req.file
      // console.log(file)
      // console.log(file.filename)
      const FileURL = `/uploads/${file.filename}`
      const submittedFile = {
        Name, Title, Marks, Email, TextArea, Status, FileURL
      }

      const result = await OnlineGroupStudyDBs.insertOne(submittedFile)
      res.send(result)
    })

    app.patch('/submittedAssignments/:id', async (req, res) => {
      const id = req.params.id
      const filter = { _id: new ObjectId(id) }
      const updatedDoc = req.body
      console.log(updatedDoc)
      
      const docs = {
        $set: {
          Status: updatedDoc.Status,
          GetMarks: updatedDoc.GetMarks,
          Feedback: updatedDoc.Feedback

        }
      }
      const result = await OnlineGroupStudyDBs.updateOne(filter, docs)
      res.send(result)
    })

    // specific user's submitted assignments
    app.get('/mySubmittedAssignments',verifyToken, async (req, res) => {
      const email = req.query.email
      // console.log(email)
      const token = req.cookies.token
      // console.log(req.cookies.token)
      // console.log(req.user)
      if(email!==req.user.email){
        return res.status(403).send({message:'Forbidden Access'})
      }
      const query = { Email: email }
      const result = await OnlineGroupStudyDBs.find(query).toArray()
      res.send(result)
    })

    app.get('/allSubmittedAssignments',verifyToken, async (req, res) => {
      const query = { Status: 'Pending' }
      const result = await OnlineGroupStudyDBs.find(query).toArray()
      res.send(result)
    })

    // delete
    app.delete('/createAssignments/:id', async (req, res) => {
      const id = req.params.id
      console.log(id)
      const query = { _id: new ObjectId(id) }
      const result = await OnlineGroupStudyDB.deleteOne(query)
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

