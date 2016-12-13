var mongoose = require('mongoose');
 
var User = mongoose.model('User',{

        fbId           : String,
        token        : String,
        email        : String,
        name         : String,
    connectionsMade : Number
});

module.exports = User;