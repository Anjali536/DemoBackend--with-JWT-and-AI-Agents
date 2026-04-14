const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require("jsonwebtoken");
const app = express();
app.use(express.json());

const genAI = new GoogleGenerativeAI("AIzaSyD_F2dVX6EqoPfsoO9lvvxcqvH99DttBAE");
const model = genAI.getGenerativeModel({model : "gemini-2.5-flash"});
app.post(`/ai`, async (req,res) => {
    try{
        const prompt = req.body.prompt;
        const result = await model.generateContent(prompt);
        const response = result.response.text();
        res.json({
            reply : response
        });
    }catch(err){
        res.json({ error: "AI error" });
    }
});

app.post(`/agent`, authMiddleware, async(req,res) => {
    try{
        const userInput = req.body.text;
        const fullPrompt = `${systemPrompt}\nUser Input: ${userInput}`;
        const result = await model.generateContent(fullPrompt);
        const aiResponse = result.response.text();
        const newEntry = new History ({
            userEmail : req.user.email,
            query : userInput,
            response : aiResponse
        });
        await newEntry.save();
        res.json({ reply : aiResponse})
    }catch(err){
        res.status(500).json({ error:"AI Agent Error"});
    }
});

const systemPrompt = `
You are an AI fact-checking assistant.

Return response in this format:
Result: REAL or FAKE
Reason: short explanation
Confidence: %
`;

app.get(`/history`, authMiddleware, async(req, res) =>{
    try{
        const data = await History.find({
            userEmail: req.user.email })
            .sort({ createdAt: -1 });
        res.json({ history : data});
    }catch(err){
        res.status(500).json({ error: "Error Fetching "});
    }
});

mongoose.connect("mongodb://sarojini46k_db_user:vxQAJ8jvIH0XZV1u@ac-yjnobyx-shard-00-00.qiorcb9.mongodb.net:27017,ac-yjnobyx-shard-00-01.qiorcb9.mongodb.net:27017,ac-yjnobyx-shard-00-02.qiorcb9.mongodb.net:27017/mydb?ssl=true&replicaSet=atlas-t5da8r-shard-0&authSource=admin&appName=Practice")
    .then(() => console.log("DB connected"))
    .catch((err) => console.log(err));

const userSchema = new mongoose.Schema({
    email: String,
    password: String
});

const User = mongoose.model("User", userSchema);

const historySchema = new mongoose.Schema({
    userEmail : String,
    query: String,
    response: String,
    createdAt : {
        type : Date,
        default : Date.now
    }
});
const History = mongoose.model("History", historySchema);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("server running");
});

app.get('/get-user', (req,res) => {
    res.json({ 
        name:"Anjali Thakur",
        role : "AI Product developer"
    });
});

app.get('/user/:name', (req,res) => {
    const name = req.params.name;
    res.json({
        message : `hello ${name}`
    });
});

app.get('/search' , (req,res) => {
    const keyword = req.query.q;
    res.json({
        search : keyword
    });
});

app.post('/add-user', (req,res) => {
    const data = req.body;
    res.json({
        message:"User added",
        user: data
    });
});


app.post(`/signup`, async(req,res) => {
    try{
    const {email, password} = req.body;
    //check if user exists
    const existingUser = await User.findOne({ email });
    if(existingUser){
        return res.status(400).json({
            message :"User already exists"
        });
    }
    //hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
        email,
        password: hashedPassword
    });
    await newUser.save();
    res.json({
        message:"Signup successful"
    });
    }catch(err){
        res.status(500).json({
            error: "Error in signup"
        });
    }
});

app.post(`/login`, async(req,res) => {
    try{
        const {email, password} =req.body;
        const user = await User.findOne({ email });
        if(!user){
            return res.status(400).json({message :"User not found"});
        }
        const isMatch = await bcrypt.compare(password , user.password);
        if(!isMatch){
            return res.status(400).json({message : "Wrong Password"});
        }
        //create token
        const token = jwt.sign(
            {email : user.email}, 
            "secretkey",
            {expiresIn: "1h"}
        );
        res.json({
            message: "Login Successful",
            token,
             user: {
                email: user.email
            }
        });
    }catch(err){
        res.status(500).json({error:"Error in login"});
    }
})

function authMiddleware(req,res,next){
    const token = req.headers.authorization;
    if(!token){
        return res.status(401).json({message:"No token "});
    }
    try{
        const decoded = jwt.verify(token, "secretkey");
        req.user = decoded;
        next();
    }catch(err){
        return res.status(401).json({message:"Invalid token"});
    }
}
app.get(`/dashboard`, authMiddleware, (req,res) =>{
        res.json({
            message:"welcome",
            user : req.user
        });
});