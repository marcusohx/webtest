const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const net = require('net');
const expressValidator = require('express-validator')
const mysql = require('mysql')
const bcrypt = require('bcrypt');
const saltRounds = 10;

//authentication
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const MySQLStore = require('express-mysql-session')(session);

const app = express();

/*
var logger = function(req, res, next){
	console.log('logging');
	next();
}
app.use(logger);

*/


//view engine
app.set('view engine','ejs');
app.set('views',path.join(__dirname,'views'));

//body parser middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

// set static path
app.use(express.static(__dirname + '/public'));

var options = {
	host     : 'localhost',
	user     : 'root',
	password : '123456',
	database : 'nodemysql'
};

var sessionStore = new MySQLStore(options);

app.use(session({
  secret: 'vajndjacnjdancjj',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  // cookie: { secure: true }
}))
app.use(passport.initialize());
app.use(passport.session());


//Global vars
app.use(function(req,res,next){
	res.locals.errors = null;
	res.locals.isAuthenticated = req.isAuthenticated();
	next();
});
//expressvalidator middleware
app.use(expressValidator());

// create connection
const db = mysql.createConnection({
	host     : 'localhost',
	user     : 'root',
	password : '123456',
	database : 'nodemysql'
});

//connect

db.connect(function(err){
	if(err){
		throw err;
	}
	console.log("Mysql connected...")
});


// create database
app.get('/createdb',function(req,res){
	let sql = 'CREATE DATABASE nodemysql';
	db.query(sql,function(err,result){
		if(err) throw err;
		console.log(result);
		res.send('Database created...')
	});
});

/* sessions tables
CREATE TABLE IF NOT EXISTS `sessions` (
  `session_id` varchar(128) COLLATE utf8mb4_bin NOT NULL,
  `expires` int(11) unsigned NOT NULL,
  `data` text COLLATE utf8mb4_bin,
  PRIMARY KEY (`session_id`)
) ENGINE=InnoDB

let sql = 'CREATE TABLE users(id int AUTO_INCREMENT, username VARCHAR(255), password VARCHAR(255), email VARCHAR(255), PRIMARY KEY(id))';
let sql = 'CREATE TABLE device(DeviceID int NOT NULL,CloudKey VARCHAR(255) NOT NULL,id int,PRIMARY KEY (DeviceID),FOREIGN KEY (id) REFERENCES users(id))';
let sql = 'CREATE TABLE mapgroup(groupid int AUTO_INCREMENT,id int, PRIMARY KEY (groupid),FOREIGN KEY (id) REFERENCES users(id))';
*/

//create table

app.get('/createuserstable',function(req,res){
	let sql = 'CREATE TABLE device_mapgroup(gid int AUTO_INCREMENT,groupid int,DeviceID int,id int,CloudKey VARCHAR(255),groupname VARCHAR(255), PRIMARY KEY(gid),FOREIGN KEY (groupid) REFERENCES mapgroup(groupid),FOREIGN KEY (DeviceID) REFERENCES device(DeviceID),FOREIGN KEY (id) REFERENCES users(id))';
	db.query(sql,function(err,result){
		if(err) throw err;
		console.log(result);
		res.send('users table created')
	});
});

var server = net.createServer();
/*
var server = net.createServer(function(socket) {
	socket.write('Echo server\r\n');
	socket.pipe(socket);
	socket.on('error', function(err) {
   	console.log(err)
	})
});

*/


// SELECT * FROM device_mapgroup AS t1 WHERE EXISTS ( SELECT * FROM device_mapgroup AS t2 WHERE t2.groupid = t1.groupid AND t1.groupid = '27' )
let clients = {}

let clientCount = 0;

var deviceid = "";

var ck = "";

server.on('connection',function(connection){
	let clientname

	let message = [];


	function broadcast( msg ,deviceid){
		  //Loop through the active clients object
		  
		  db.query('SELECT groupid FROM device_mapgroup WHERE DeviceID = ?',[deviceid],function(err,result,fields){
		  	if(err) throw err;
		  	db.query('SELECT DeviceID FROM device_mapgroup AS t1 WHERE EXISTS ( SELECT * FROM device_mapgroup AS t2 WHERE t2.groupid = t1.groupid AND t1.groupid = ? )',[result[0].groupid],
		  		function(err,results,fields){
		  			if(err) throw err;
		  			console.log(results)
		  			for(i = 0;i < results.length;i++){
		  				 for( let user in clients ){
					    	// send to the client intended
					    	usersplit = user.split(",")
					    	console.log(usersplit);
					    	if(usersplit[0] == results[i].DeviceID){
					    		clients[ user ].write(msg,'hex');
					    	}
						}
		  			}
		  		})
		  })


		 
	}
	var remoteAddress = connection.remoteAddress + ":" + connection.remotePort;
	console.log("new client connection is made %s", remoteAddress)
	

	connection.setEncoding('hex');

	connection.on('data',function(data){
		message.push(data);
		
		
		let clientInput = hex2a(message.join('').replace('\r\n',''));

		

		
		if(!clientname){
			if(clients[clientInput]){
          	console.log("device already register")
          	//Discard of the previous keystrokes the client entered
         	message = [];
        	return;

			} else{
				clientname = clientInput;
				clientCount++;
				
				clients[clientInput] = connection;

				console.log(`- Welcome to the server, There are ${clientCount} active users\r\n`);
	          	//Discard the previous keystrokes the client entered
	          	message = [];

	          	}	
          	
          	} else {
				//the device that is sending

				clientNamesplit = clientname.split(",");
				console.log(clientNamesplit)
				


				if(clientNamesplit.length != 2){
					console.log("wrong client name")
					message = [];
				}
				else {
					db.query('SELECT DeviceID, CloudKey FROM device_mapgroup WHERE DeviceID = ?',[clientNamesplit[0]],function(err,results,fields){
						if(err){
							console.log("no such device")
						} else {
							deviceid = results[0].DeviceID
							ck = results[0].CloudKey

							
							if(clientNamesplit[0] == deviceid && clientNamesplit[1] == ck){
								console.log('data sent')
								broadcast(data,clientNamesplit[0]);
				        	//Discard the previous keystrokes the client entered
				        		message = [];
							}
							else{
								console.log('There is no such user with this cloud key')
								message = [];
							}
							

						}
					});
					

				}

	        }
	    
	});
	//A close event is emitted when a connection has disconnected from the server
	connection.on('close', () => {
	    //When a client disconnects, remove the name and connection
	    delete clients[clientname];
	    //Decrease the active client count
	    clientCount--;
	    //Send a message to every active client that someone just left the chat
	})

	//Handle error events
	connection.on('error', error => {
		console.log(`Error : ${error}`);
	})
})


function hex2a(hexx) {
    var hex = hexx.toString();//force conversion
    var str = '';
    for (var i = 0; (i < hex.length && hex.substr(i, 2) !== '00'); i += 2)
        str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    return str;
}


server.on('close',function(){
	 //When a client disconnects, remove the name and connection
	 delete clients[clientname];
    //Decrease the active client count
    clientCount--;
    //Send a message to every active client that someone just left the chat
    console.log(`server disconnected`);
});


app.get('/',function(req,res){
	console.log(req.user);
	console.log(req.isAuthenticated())
	if(req.isAuthenticated()){
		db.query('SELECT username FROM users WHERE id = ?',[req.user],
	  		function(err,results,fields){
	  			if(err) throw err;
	  			console.log(results[0].username)
	  		});
	}
	res.render('home');

});

app.get('/groupdevices', authenticationMiddleware(), function(req,res){

	db.query('SELECT groupid, groupname from mapgroup WHERE id = ?',[req.user],function(error,results){
		if(error) throw error;


		res.render('groupdevices',{data:results});
	})
});

app.get('/login',function(req,res){
	res.render('login');
});

app.post('/login', passport.authenticate(
	'local',{
	successRedirect: '/',
	failureRedirect: '/login'
}));

passport.use(new LocalStrategy(
  function(username, password, done) {
  	console.log(username);
  	console.log(password);
  	db.query('SELECT id, password FROM users WHERE username = ?',[username],
  		function(err,results,fields){
  			if (err) {done(err)};

  			if(results.length === 0){
  				done(null,false);
  			}else{

	  			const hash = results[0].password.toString();

	  			bcrypt.compare(password, hash, function(err, response){
	  				if(response === true){
	  					return done(null, results[0].id);
	  				} else{
	  					return done(null,false);
	  				}
	  			});
  			}


  			
  		})
      
  }
));

app.get('/logout',function(req,res){
	req.logout();
	req.session.destroy();
	res.redirect('/');
});

app.get('/register',function(req,res){
	res.render('register',{
		complete: 'Registration'
	});
});

app.post('/register',function(req,res){

	req.checkBody('username', 'Username field cannot be empty.').notEmpty();
	req.checkBody('username', 'Username must be between 4-15 characters long.').len(4, 15);
	req.checkBody('email', 'The email you entered is invalid, please try again.').isEmail();
	req.checkBody('email', 'Email address must be between 4-100 characters long, please try again.').len(4, 100);
	req.checkBody('password', 'Password must be between 8-100 characters long.').len(8, 100);
	req.checkBody("password", "Password must include one lowercase character, one uppercase character, a number, and a special character.").matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?!.* )(?=.*[^a-zA-Z0-9]).{8,}$/, "i");
	req.checkBody('passwordMatch', 'Re-enter Password must be between 8-100 characters long.').len(8, 100);
	req.checkBody('passwordMatch', 'Passwords do not match, please try again.').equals(req.body.password);
 

	var errors = req.validationErrors();

	if(errors){
		res.render('register',{
			errors: errors,
			complete: "Please check for errors"
		});
	} else {
		
		var username = req.body.username
		var password = req.body.password
		var email =  req.body.email
		  // Store hash in your password DB.
		bcrypt.hash(password, saltRounds, function(err, hash) {

			db.query('INSERT INTO users(username,password,email) VALUES(?,?,?)',[username,hash,email],
				function(error,results,fields){
					if(error){
						
						res.render('register',{complete: 'insert error'});	
					}
					else{
						db.query('SELECT LAST_INSERT_ID() as user_id',function(error,results,fields){
						if (error) throw error;

						const user_id = results[0]

						console.log(results[0]);
						req.login(user_id, function(err){
							res.redirect('/');
						});

						res.render('register',{complete: 'Registration complete'});	
					});

					}


				});
		});
	}


});

passport.serializeUser(function(user_id, done) {
  done(null, user_id);
});

passport.deserializeUser(function(user_id, done) {
    done(null, user_id);
 
});

function authenticationMiddleware () {  
	return (req, res, next) => {
		console.log(`req.session.passport.user: ${JSON.stringify(req.session.passport)}`);

	    if (req.isAuthenticated()) return next();
	    res.redirect('/login')
	}
}

app.get('/adddevice',authenticationMiddleware(),function(req,res){

	res.render('adddevice',{error: ''});
});

app.post('/adddevice',function(req,res){
	req.checkBody('deviceid', 'Device ID field cannot be empty.').notEmpty();
	req.checkBody('deviceid', 'Device ID field can only be numeric').isInt();
	req.checkBody('deviceid', 'Device ID must be between 10 characters long.').len(10);
	req.checkBody('cloudkey', 'cloudkey field cannot be empty.').notEmpty();
	req.checkBody('cloudkey', 'cloudkey must be between 6 characters long.').len(6);
	req.checkBody('devicename', 'devicename field cannot be empty.').notEmpty();
	req.checkBody('devicename', 'devicename must be between 4-15 characters long.').len(4, 15);

	var errors = req.validationErrors();

	if(errors){
		res.render('adddevice',{
			errors: errors,
			error: "Please check for errors"
		});
	} else {

		var deviceid = req.body.deviceid
		var cloudkey = req.body.cloudkey
		var username = req.body.devicename
		var userid = req.user
		var sql = 'INSERT INTO device(DeviceID,CloudKey,devicename,id) VALUES(?,?,?,?)'
		db.query(sql,[deviceid,cloudkey,username,userid],
			function(error,results,fields){
				if(error){
					res.render('adddevice',{error: 'insert error'});	
				}
				else{
					res.render('adddevice',{error: 'success'});	
					console.log("success")
				}
		})
	}
});

app.get('/mapdevice',authenticationMiddleware(),function(req,res){

	db.query('SELECT * from device WHERE id = ?',[req.user],function(error,results){
		if(error) throw error;


		res.render('mapdevice',{data:results,error:''});


	})
});
app.get('/mapdevice/:id',authenticationMiddleware(),function(req,res){

	db.query('SELECT * from device WHERE DeviceID = ?',[req.params.id],function(error,results){
		if(error) throw error;


		res.render('device',{data:results});
	})
	
});

app.post('/mapdevice',function(req,res){
	console.log(req.body.checkbox)

	var groupname = req.body.groupname
	var userid = req.user
	var devices = req.body.checkbox;
	if(devices == undefined || devices.length == 1){
		res.render('mapdevice',{data:results,error:'check at least 1 check box'});
		
	}
	else{
		db.query('INSERT INTO mapgroup(id,groupname) VALUES(?,?)',[userid,groupname],
			function(error,results,fields){
				if(error) throw	error;
				console.log("inserted into group")

		})

		db.query('SELECT groupid, groupname FROM mapgroup WHERE groupname = ? AND id = ?',[groupname,userid],
			function(error,results,fields){
				if(error) throw error;
				var gid = results[0].groupid
				var gn = results[0].groupname
				db.query('SELECT CloudKey FROM device WHERE id = ?',[userid],
					function(error,result,fields){
						if(error) throw error;
						var ck = result[0].CloudKey
						console.log(gid,gn)
						console.log(ck)
						for(i =0;i < devices.length; i++){
							db.query('INSERT INTO device_mapgroup(groupid,DeviceID,id,CloudKey,groupname) VALUES(?,?,?,?,?)',[gid,devices[i],userid,ck,gn],
								function(error,results,fields){
									if(error) throw error;
									
									console.log(' success')
								})
						}
				})
				
		})
		res.redirect('/groupdevices')
		
	}
	
});

server.listen(20000,function(){
	console.log("server listening to port 20000")
})


app.listen(3000,function(){
	console.log('Server started on port 3000....')
})

