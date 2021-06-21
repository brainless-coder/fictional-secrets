require('dotenv').config()
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
// const encrypt = require('mongoose-encryption');
// const md5 = require('md5');
const bcrypt = require('bcrypt');
const saltRounds = 10;


const port = 8081;
const app = express();

app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));

mongoose.connect("mongodb://localhost:27017/secretsDB", {useNewUrlParser: true, useUnifiedTopology: true});

// This schema is just a JS object, and it works as long as we are not doing anything fancy with the schema
// const userSchema = {
//     email: String, 
//     password: String
// }; 

// alsi mongoose schema define karne ka tarika
const userSchema = new mongoose.Schema ({
    email: String, 
    password: String
});

// Level 2 security: uses a secret key to encrypt the password
// userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ["password"] });


// making a model or collection
const User =  new mongoose.model("User", userSchema);


app.get('/', function (req, res) {
    res.render("home");
});

app.get('/login', function (req, res) {
    res.render("login");
});

app.get('/register', function (req, res) {
    res.render("register");
});

app.post('/register', function (req, res) {

    bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
        const newUser = new User({
            email: req.body.username,
            password: hash
        });
    
        newUser.save((err) => {
            if(err) {
                console.log(err);
            } else {
                res.render("secrets");
            }
        });
        
    });
});

app.post('/login', function (req, res) {
    const username = req.body.username;
    const password = req.body.password;
    

    User.findOne({email: username}, function(err, foundUser) {
        if (err) {
            console.log(err);
        } else {
            if (foundUser) {
                bcrypt.compare(password, foundUser.password, function(err, result) {
                    if (result == true) {
                        res.render("secrets");
                    } else {
                        res.send("<h1>Wrong password</h1>")
                    }
                });
            }
        }
    })
});


app.listen(port, function() {
    console.log(`Server is running on port ${port}`);
});
