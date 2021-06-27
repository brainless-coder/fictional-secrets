require('dotenv').config()
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
// const encrypt = require('mongoose-encryption');
// const md5 = require('md5');
// const bcrypt = require('bcrypt');
// const saltRounds = 10;
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');


const port = 8081;
const app = express();

app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

// setting up express-session in the project
app.use(session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false
}));

// tell our app to use passport
app.use(passport.initialize());
app.use(passport.session());


mongoose.connect("mongodb://localhost:27017/secretsDB", { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.set('useCreateIndex', true);

// This schema is just a JS object, and it works as long as we are not doing anything fancy with the schema
// const userSchema = {
//     email: String, 
//     password: String
// }; 

// alsi mongoose schema define karne ka tarika
const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    // required for OAuth
    googleId: String,
    secret: String
});


// Level 2 security: uses a secret key to encrypt the password
// userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ["password"] });


// using the passport-local-mongoose plugin 
userSchema.plugin(passportLocalMongoose);
// using the mongoose-findOrCreate plugin
userSchema.plugin(findOrCreate);

// making a model or collection
const User = new mongoose.model("User", userSchema);

// Configure Passport Local in this project
// createStrategy local user create karta h, and authenticate them, taaki wo apna id pw se login ye sab karle
passport.use(User.createStrategy());

// ye simpe waala serialize/deserialize works only for local strategy
// information ko ek cookie me pack karke daal deta hai ye taaki session me use kiya jaa saaake wo
// passport.serializeUser(User.serializeUser());
// // uss cookie se infomation nikalne ke liye apan usse deserialize karte hai
// passport.deserializeUser(User.deserializeUser());


// this serialize/deserialize will work for all strategies
passport.serializeUser(function(user, done) {
    done(null, user.id);
});
  
passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
});

// Google OAuth2.0
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:8081/auth/google/secrets"
},
    function (accessToken, refreshToken, profile, cb) {
        // console.log(profile);

        User.findOrCreate({ googleId: profile.id }, function (err, user) {
            return cb(err, user);
        });
    }
));


app.get('/', function (req, res) {
    res.render("home");
});

// route for google OAuth
app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile'] })
);

app.get('/auth/google/secrets',
    passport.authenticate('google', { failureRedirect: '/login' }),
    function (req, res) {
        // Successful authentication, redirect to secrets page.
        res.redirect('/secrets');
    }
);


app.get('/login', function (req, res) {
    res.render("login");
});

app.get('/register', function (req, res) {
    res.render("register");
});

// login and register using bcrypt to hash and salt the password
// app.post('/register', function (req, res) {

//     bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
//         const newUser = new User({
//             email: req.body.username,
//             password: hash
//         });

//         newUser.save((err) => {
//             if(err) {
//                 console.log(err);
//             } else {
//                 res.render("secrets");
//             }
//         });

//     });
// });

// app.post('/login', function (req, res) {
//     const username = req.body.username;
//     const password = req.body.password;

//     User.findOne({email: username}, function(err, foundUser) {
//         if (err) {
//             console.log(err);
//         } else {
//             if (foundUser) {
//                 bcrypt.compare(password, foundUser.password, function(err, result) {
//                     if (result == true) {
//                         res.render("secrets");
//                     } else {
//                         res.send("<h1>Wrong password</h1>")
//                     }
//                 });
//             }
//         }
//     })
// });



// accessing secrets page using passport
app.get('/secrets', function (req, res) {
    User.find({"secret": {$ne: null}}, function(err, foundUsers) {
        if(err) {
            console.log(err);
        } else {
            if (foundUsers) {
                res.render("secrets", {usersWithSecrets: foundUsers});
            }
        }
    });
});

app.get('/submit', function(req, res) {
    if(req.isAuthenticated()) {
        res.render("submit");
    } else {
        res.redirect("/login");
    }
});

app.post('/submit', function(req, res) {
    const submittedSecret = req.body.secret;

    User.findById(req.user._id, function(err, foundUser) {
        if (err){
            console.log(err);
        } else {
            if (foundUser) {
                foundUser.secret = submittedSecret;
                foundUser.save(function() {
                    res.redirect("/secrets");
                });
            }
        }
    })
})

// register using passport
app.post('/register', function (req, res) {
    User.register({ username: req.body.username }, req.body.password, function (err, user) {
        if (err) {
            console.log(err);
            res.redirect('/register');
        } else {
            passport.authenticate("local")(req, res, function () {
                res.redirect('/secrets');
            });
        }
    });
});

// login using passport
app.post('/login', function (req, res) {
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, function (err) {
        if (err) {
            console.log(err);
        } else {
            passport.authenticate("local")(req, res, function () {
                res.redirect('/secrets');
            });
        }
    });
});

app.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/');
})


app.listen(port, function () {
    console.log(`Server is running on port ${port}`);
});
