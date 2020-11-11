// Google auth 2.0 Steps
// passport se google auth 2.0 Strategy

//Paste the config code go to developer console make a new project define value get clientID and Secret
// note the callback redirect url

 
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const { Strategy } = require("passport");
// google auth
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const findOrCreate = require("mongoose-findorcreate");


const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

app.use(
  session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());

app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB", { useNewUrlParser: true });
mongoose.set("useCreateIndex", true);
// stackoverflow.com/questions/61091800/setting-up-facebook-authentication-with-mongodb-atlas-and-passport-js
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    unique: false,
    sparse: true,
  },
  password: String,
  googleId: String,
  facebookId: String,
  secret:String,
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate); // for findandCreate

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

// passport.serializeUser(User.serializeUser()); these are applicable only for passport local mongoose
// passport.deserializeUser(User.deserializeUser()); so we dont use them
//
passport.serializeUser(function (user, done) {
   
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    
    done(err, user);
  });
});

//d
// for googleauth
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/secrets",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    function (accessToken, refreshToken, profile, cb) {
      // this is a callback function
      
      console.log(profile);// logs their profile

      // now we install npm mongoose-findorcreate package to use findOrCreate() provided by passportJS


//create of find this user on our database
      User.findOrCreate({ googleId: profile.id}, function (err, user) {

        
        return cb(err, user);
      });
    }
  )
);

// for facebook
passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: "http://localhost:3000/auth/facebook/secrets",
    },
    function (accessToken, refreshToken, profile, cb) {

         console.log(profile);
      User.findOrCreate({ facebookId: profile.id }, function (err, user) {
        return cb(err, user);
      });
    }
  )
);

// for google
app.get("/auth/google", passport.authenticate("google", { scope: ["profile"] }));//  if this is successfull then google makes request to the route below



// /auth/google/callback is actually the same url you give in developer console for redirecting
app.get(
  "/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function (req, res) {
    // here we will authenticate locally and then save the session of the user
    // Successful authentication, redirect secrets.
    res.redirect("/secrets");
  }
);

//


// for facebook
app.get("/auth/facebook",  passport.authenticate("facebook", { scope:["email"]}));

app.get(
  "/auth/facebook/secrets",
  passport.authenticate("facebook", { failureRedirect: "/login" }),
  function (req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
  }
);
///

app.get("/", function (req, res) {
  res.render("home");
});
app.get("/login", function (req, res) {
  res.render("login");
});

app.get("/register", function (req, res) {
  res.render("register");
});

app.get("/submit", function (req, res) {
  
  if (req.isAuthenticated()) {
    res.render("submit");
  } else {
    console.log("not auth");
    res.redirect("/login");
  }
});
app.post("/register", function (req, res) {
  User.register({ username: req.body.username }, req.body.password, function (
    err,
    user
  ) {
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/secrets");
      });
    }
  });
});

app.get("/secrets", function (req, res) {
  

  User.find({ "secret": { $ne: null } }, function (err, foundSecret) {
    
    if (err) {
      console.log(err);
    }

    else {
      if (foundSecret) {
        res.render("secrets", { usersWithSecrets: foundSecret });
      }
    }
  });


});
app.get("/logout", function (req, res) {
  req.logout();
  res.redirect("/");
});

app.post("/login", function (req, res) {
  const user = new User({
    username: req.body.username,
    password: req.body.password,
  });
  req.login(user, function (err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/secrets");
      });
    }
  });
});


app.post("/submit", function (req, res) {
  
  console.log(req.body);
  console.log("seperration");
  console.log(req.user);
  const submittedSecret = req.body.secret;

  User.findById(req.user.id, function (err, foundUser) {
    if (err) {
      console.log(err);
    }
    else {
      if (foundUser) {
        foundUser.secret = submittedSecret;
        foundUser.save(function () {
          res.redirect("/secrets");

        })
      }
    }
  
})


 
})

app.listen(3000, function () {
  console.log("Server started on port 3000.");


  
});
