var app = require('express')();
var http = require('http').Server(app);
var passport = require('passport');
var FacebookStrategy = require('passport-facebook').Strategy;
var fbConfig = require('./fb.js');
var dbConfig = require('./db.js');
var mongoose = require('mongoose');
//var check = require('passport-login-check');
mongoose.Promise = global.Promise;
mongoose.connect(dbConfig.url);

var userData;

//database conn test
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log('database connected');
});

var User = require('./models/user.js');

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function(user, done) {
  done(null, user._id);
});
 
passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

// use http to start server
http.listen(3000, function() {
  console.log('listening on *:3000');
});

var userProfileId;

passport.use('facebook', new FacebookStrategy({
  clientID        : fbConfig.appID,
  clientSecret    : fbConfig.appSecret,
  callbackURL     : fbConfig.callbackUrl,
  enableProof     : true,
},
 
  // facebook will send back the tokens and profile
  function(access_token, refresh_token, profile, done) {
    // asynchronous
    process.nextTick(function() {
     
      // find the user in the database based on their facebook id
      User.findOne({ 'fbId' : profile.id }, function(err, user) {
 
        // if there is an error, stop everything and return that
        // ie an error connecting to the database
        if (err)
          return done(err);
 
          // if the user is found, then log them in
          if (user) {
            userProfileId = profile.id;
            return done(null, user); // user found, return that user
          } else {
            // if there is no user found with that facebook id, create them
            var newUser = new User();
 
            // set all of the facebook information in our user model
            newUser.fbId    = profile.id; // set the users facebook id                 
            newUser.token = access_token; // we will save the token that facebook provides to the user                    
            newUser.name  = profile.displayName;
            newUser.connectionsMade = 0;
              
            userProfileId = profile.id;
 
            // save our user to the database
            newUser.save(function(err) {
              if (err)
                throw err;
 
              // if successful, return the new user
              return done(null, newUser);
            });
         } 
      });
    });
}));

// route for facebook authentication and login
// different scopes while logging in
app.get('/login', 
  passport.authenticate('facebook', { scope : 'email' }
));
 
// handle the callback after facebook has authenticated the user
app.get('/login/callback',
  passport.authenticate('facebook', {
    successRedirect : '/',
    failureRedirect : '/login'
  })
);

app.get('/logout', function (req, res){
  req.logOut()  // <-- not req.logout();
  res.redirect('/')
});

//check.defaultRedirectUrl = '/login';
//check.defaultReturnUrl = '/';

//fireflychat (code)
//route to serve main app index page (html with p5 script)
app.get('/', function(req, res) {
  res.sendFile(__dirname + '/index.html');
    var query = {};
    User.find(query, function(err,data){
        userData = {
            users: data
        }
        //console.log(userData);
    });
});
// initialize socket.io
var io = require('socket.io')(http);


var people = 0;

//sockets
io.on('connection', function(socket){
    console.log('socket connected: '+socket.id+' by fb user: '+userProfileId);
    people += 1;
    
    socket.on('disconnect', function(){
        socket.broadcast.emit('disconnected: ', socket.id);
        console.log('disconnected: '+socket.id);
        User.findOne({ 'fbId' : userProfileId }, function(err, user) {
            user.connectionsMade += people;
            user.save();
        });
    });
    
    socket.on('send firefly', function(msg){
        //console.log(msg);
        socket.broadcast.emit('receive firefly', msg);
    });
});

//function isAuth(req, res, next) {
//    if (req.user) {
//        next();
//    } else {
//        res.redirect('/login');
//    }
//}
