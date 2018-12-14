const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const net = require('net');
const expressValidator = require('express-validator')
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const randomstring = require("randomstring");
const SqlString = require('sqlstring');
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

app.get('/',function(req,res){
	console.log(req.user);
	console.log(req.isAuthenticated())
	if(req.isAuthenticated()){
		db.query(SqlString.format('SELECT username FROM users WHERE id = ?',[req.user]),
	  		function(err,results,fields){
	  			if(err) throw err;
	  			console.log(results[0].username)
	  		});
	}
	res.render('home');

});

/*
app.get('/db',function(req,res){
	console.log(req.user);
	console.log(req.isAuthenticated())
	if(req.isAuthenticated()){
		db.query('SELECT username FROM users WHERE id = ?',[req.user],
	  		function(err,results,fields){
	  			if(err) throw err;
	  			console.log(results[0].username)
	  		});
	}
	res.render('dashboard');

});
*/
app.get('/groupdevices', authenticationMiddleware(), function(req,res){

	db.query(SqlString.format('SELECT groupid, groupname from mapgroup WHERE id = ?',[req.user]),function(error,results){
		if(error) throw error;


		res.render('groupdevices',{data:results});
	})
});

app.get('/groupdevices/info/:id', authenticationMiddleware(), function(req,res){

	db.query(SqlString.format('SELECT deviceid, groupid, groupname,devicename from device_mapgroup WHERE groupid = ?',[req.params.id]),function(error,results){
		if(error) throw error;


		res.render('groupdevicesinfo',{data:results});
	})
});

app.get('/login',function(req,res){
	res.render('login');
});

app.post('/login', passport.authenticate(
	'local',{
	successRedirect: '/index2',
	failureRedirect: '/login'
}));

passport.use(new LocalStrategy(
  function(username, password, done) {
  	console.log(username);
  	console.log(password);
  	db.query(SqlString.format('SELECT id, password FROM users WHERE username = ?',[username]),
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
		complete: ''
	});
});

app.post('/register',function(req,res){

	req.checkBody('username', 'Username field cannot be empty.').notEmpty();
	req.checkBody('username', 'Username must be between 4-15 characters long.').len(4, 15);
	req.checkBody('email', 'The email you entered is invalid, please try again.').isEmail();
	req.checkBody('email', 'Email field cannot be empty').notEmpty();
	req.checkBody('password', 'Password must be at 8-16 character').len(8, 16);
	//req.checkBody("password", "Password must include one lowercase character, one uppercase character, a number, and a special character.").matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?!.* )(?=.*[^a-zA-Z0-9]).{8,}$/, "i");
	//req.checkBody('passwordMatch', 'Re-enter Password must be notEmpty').notEmpty();
	req.checkBody('passwordMatch', 'Passwords do not match, please try again.').equals(req.body.password);
 

	var errors = req.validationErrors();

	if(errors){
		res.render('register',{
			errors: errors,
			complete: ''
		});
	} else {
		
		var username = req.body.username
		var password = req.body.password
		var email =  req.body.email
		var nck = randomstring.generate(6);
		  // Store hash in your password DB.
		var sql1 = SqlString.format('SELECT COUNT(*) AS countuser FROM users WHERE username = ?',[username]);
		db.query(sql1,
			function(error,result){
				console.log(result[0].countuser);
				if(result[0].countuser > 0){
					res.render('register',{complete: 'username already in use'});	
				} 
				else{

					bcrypt.hash(password, saltRounds, function(err, hash) {
						
						db.query(SqlString.format('INSERT INTO users(username,password,email,Cloudkey) VALUES(?,?,?,?)',[username,hash,email,nck]),
							function(error,results,fields){
								if(error){
									
									res.render('register',{complete: 'Check email again'});	
								}
								else{
									res.render('register',{complete: 'Registration Successful'});	

								}


							});
					});
				}
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
	var sql1 = SqlString.format('SELECT Cloudkey FROM users WHERE id = ?',[req.user]);
	db.query(sql1,function(err,results){
		if(err) throw err;
		res.render('adddevice',{error: '',uck:results[0].Cloudkey});
	})
	
});

app.post('/adddevice',function(req,res){
	//req.checkBody('deviceid', 'Device ID field cannot be empty.').notEmpty();
	//req.checkBody('deviceid', 'Device ID field can only be numeric').isInt();
	//req.checkBody('deviceid', 'Device ID must be between 10 characters long.').len(10);
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

		//var deviceid = req.body.deviceid
		var cloudkey = req.body.cloudkey
		var username = req.body.devicename
		var userid = req.user

		var sql1 = SqlString.format('SELECT COUNT(*) AS countdevice FROM device WHERE devicename = ? AND id = ?',[username,userid]);
		db.query(sql1,
			function(error,result){
				console.log(result[0].countdevice);
				if(result[0].countdevice > 0){
					console.log(result[0].countdevice);
					var sql3 = SqlString.format('SELECT Cloudkey FROM users WHERE id = ?',[req.user])
						db.query(sql3,function(err,results3){
							if(err) throw err;
							res.render('adddevice',{
								error: "DeviceName already exist",uck:results3[0].Cloudkey
							});
						})
					
				} 
				else{
					var sql = SqlString.format('INSERT INTO device(CloudKey,devicename,id) VALUES(?,?,?)',[cloudkey,username,userid]);
					db.query(sql,
						function(error,results,fields){
							if(error){
								res.render('adddevice',{error: 'insert error'});	
							}
							else{
								res.redirect('/devices')	
								console.log("success")
							}
					})
				}
			})

	}

});
/*
					if(cloudkey.length == 0){
						var sql2 = 'SELECT Cloudkey FROM users WHERE id = ?'
						db.query(sql2,[userid],function(error,results1){
								var sql = 'INSERT INTO device(CloudKey,devicename,id) VALUES(?,?,?)'
									db.query(sql,[results1[0].Cloudkey,username,userid],
										function(error,results,fields){
											if(error){
												res.render('adddevice',{error: 'insert error'});	
											}
											else{
												res.render('adddevice',{error: 'success'});	
												console.log("success")
											}
							})
						})

					}
*/


app.get('/device/edit/:id',authenticationMiddleware(),function(req,res){
	
	db.query(SqlString.format('SELECT * from device WHERE DeviceID = ?',[req.params.id]),function(error,results){
		if(error) throw error;
		res.render('editdevice',{data:results,error:''});
	})
	
});

app.post('/device/edit/:id',authenticationMiddleware(),function(req,res){

	var editdn = req.body.Editdevicename
	var editck = req.body.Editcloudkey
	var sql = SqlString.format('UPDATE device SET Cloudkey = ?, devicename = ? WHERE	DeviceID = ?',[editck,editdn,req.params.id]);
	var sql2 = SqlString.format('UPDATE device_mapgroup SET Cloudkey = ?, devicename = ? WHERE	DeviceID = ?',[editck,editdn,req.params.id]);
	db.query(sql,async function(error,results){
		if(error) throw error;
		if(results.affectedRows)
		{
			res.redirect('/devices')
		}
	})
	db.query(sql2,async function(error,results){
		if(error) throw error;
		if(results.affectedRows)
		{
			res.redirect('/devices')
		}
	})
	
});

app.get('/device/delete/:id',authenticationMiddleware(),function(req,res){
	var sql = SqlString.format('DELETE FROM device WHERE DeviceID = ?',[req.params.id]);
	db.query(sql,function(error,results){
		if(error){
			res.redirect('/devices')
		}
		else if(results.affectedRows)
		{
			res.redirect('/devices')
		}
	})
});

app.get('/mapdevice',authenticationMiddleware(),function(req,res){

	db.query(SqlString.format('SELECT * from device WHERE id = ?',[req.user]),function(error,results){
		if(error) throw error;


		res.render('mapdevice',{data:results,error:''});


	})
});

app.post('/mapdevice', authenticationMiddleware(),function(req,res){
	console.log(req.body.checkbox)

	var groupname = req.body.groupname
	var userid = req.user
	var devices = req.body.checkbox;
	if(devices == undefined || devices.length == 1){
		res.render('mapdevice',{data:results,error:'check at least 2 check box'});
		
	}
	else{
		db.query(SqlString.format('INSERT INTO mapgroup(id,groupname) VALUES(?,?)',[userid,groupname]),
			function(error,results,fields){
				if(error) throw	error;
				console.log("inserted into group")

		})

		db.query(SqlString.format('SELECT groupid, groupname FROM mapgroup WHERE groupname = ? AND id = ?',[groupname,userid]),
			function(error,results,fields){
				if(error) throw error;
				var gid = results[0].groupid
				var gn = results[0].groupname

				for(i =0;i < devices.length; i++){
					db.query(SqlString.format('SELECT CloudKey,devicename,DeviceID FROM device WHERE DeviceID = ?',[devices[i]]),
						function(error,result,fields){
							if(error) throw error;
							var ck = result[0].CloudKey
							console.log(gid,gn)
							console.log(ck)
							
							db.query(SqlString.format('INSERT INTO device_mapgroup(groupid,DeviceID,id,CloudKey,groupname,devicename) VALUES(?,?,?,?,?,?)',[gid,result[0].DeviceID,userid,ck,gn,result[0].devicename]),
								function(error,results,fields){
									if(error) throw error;
									
									console.log(' success')
								})
						
					})
				}
				
		})
		res.redirect('/groupdevices')
		
	}
	
});

app.get('/groupdevice/delete/:id',authenticationMiddleware(),function(req,res){
	var sql = SqlString.format('DELETE FROM device_mapgroup WHERE groupid = ?',[req.params.id]);
	var sql1 = SqlString.format('DELETE FROM mapgroup WHERE groupid = ?',[req.params.id]);
	var sql2 = SqlString.format('DELETE FROM rules WHERE groupid = ?',[req.params.id]);
	var sql3 = SqlString.format('SELECT COUNT(*) AS countuser FROM rules WHERE groupid= ?',[req.params.id]);

	db.query(sql,function(error,results){
		if(error) throw error;
			db.query(sql3,function(error,results){
			if(results[0].countuser > 0 ){
				db.query(sql2,function(error,results){
					if(error) throw error;
					db.query(sql1,function(error,results){
						if(error) throw error;
						if(results.affectedRows)
							{
								res.redirect('/groupdevices')
							}
						})
					})
				}
				else{
					res.redirect('/groupdevices')
				}
			})
			
		
	})
	

});

app.get('/groupdevice/edit/:id',authenticationMiddleware(),function(req,res){
	db.query(SqlString.format('SELECT deviceid, groupid, groupname,devicename from device_mapgroup WHERE groupid = ?',[req.params.id]),function(error,results2){
		if(error) throw error;

		db.query(SqlString.format('SELECT * from device WHERE id = ?',[req.user]),function(error,results){
		if(error) throw error;


		res.render('editmapdevice',{data:results,data2:results2,error:''});


		})

	})
	
	
});

app.post('/groupdevice/edit/:id', authenticationMiddleware(),function(req,res){
	console.log(req.body.checkbox)

	var userid = req.user
	var devices = req.body.checkbox;
	if(devices == undefined || devices.length == 1){
		res.render('mapdevice',{data:results,error:'check at least 2 check box'});
		
	}
	else{
		var sql = SqlString.format('DELETE FROM device_mapgroup WHERE groupid = ?',[req.params.id]);

		db.query(sql,function(error,result){
			if(error) throw error;
		})

		db.query(SqlString.format('SELECT groupid, groupname FROM mapgroup WHERE groupid = ? AND id = ?',[req.params.id,userid]),
			function(error,results,fields){
				if(error) throw error;
				var gid = results[0].groupid
				var gn = results[0].groupname
				db.query(SqlString.format('SELECT CloudKey,devicename FROM device WHERE id = ?',[userid]),
					function(error,result,fields){
						if(error) throw error;
						var ck = result[0].CloudKey
						console.log(gid,gn)
						console.log(ck)
						for(i =0;i < devices.length; i++){
							db.query(SqlString.format('INSERT INTO device_mapgroup(groupid,DeviceID,id,CloudKey,groupname,devicename) VALUES(?,?,?,?,?,?)',[gid,devices[i],userid,ck,gn,result[i].devicename]),
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

app.get('/devices',authenticationMiddleware(),function(req,res){

	db.query(SqlString.format('SELECT * from device WHERE id = ?',[req.user]),function(error,results){
		if(error) throw error;


		res.render('devices',{data:results,error:''});


	})
});

app.get('/api/devices',authenticationMiddleware(),function(req,res){
	db.query(SqlString.format('SELECT * from device_mapgroup WHERE id = ?',[req.user]),function(error,results,fields){
		if(error) throw error;


		res.send(JSON.stringify({"status": 200, "error": null, "response": results}));


	})
});

app.get('/index2',authenticationMiddleware(),function(req,res){
	db.query(SqlString.format('SELECT * from device WHERE id = ?',[req.user]),function(error,results){
		if(error) throw error;


		res.render('index2',{data:results});


	})
});
app.get('/profile',function(req,res){
	var sql = SqlString.format('SELECT COUNT(*) AS countuser FROM profile WHERE id = ?',[req.user]);
	db.query(sql,function(error,results){
		if(results[0].countuser < 1){
			res.redirect('/createnewprofile')
		}
		else{
			var sql1 = SqlString.format('SELECT * FROM profile WHERE id = ?',[req.user]);
			db.query(sql1,function(err,results1){	
				res.render("profile",{fname: results1[0].FIRST_NAME,lname: results1[0].LAST_NAME,uemail: results1[0].email ,ucompany: results1[0].company})
			})
		}
	})
});

app.post('/updateprofile',function(req,res){
	var first_name = req.body.firstname
	var last_name = req.body.lastname
	var email = req.body.email
	var company = req.body.company
	var sql = SqlString.format('UPDATE profile SET FIRST_NAME = ? ,LAST_NAME = ? , email = ? , company = ? WHERE id = ?',[first_name,last_name,email,company,req.user]);
	var sql1 = SqlString.format('UPDATE users SET email = ? WHERE id = ?',[email,req.user]);
	db.query(sql,async function(err,result){
		if(err) throw err;

	});
	db.query(sql1,async function(err,results1){
		if(err) throw err;

		res.redirect('/profile')
	});
});

app.get('/createnewprofile',function(req,res){
	res.render('createnewprofile')
});

app.post('/createnewprofile',function(req,res){
	var first_name = req.body.firstname
	var last_name = req.body.lastname
	var company = req.body.company

	sql = SqlString.format('SELECT email FROM users WHERE id = ?',[req.user]);
	db.query(sql,function(err,result){
		if(err) throw err;
		sql1 = SqlString.format('INSERT INTO profile(FIRST_NAME,LAST_NAME,email,company,id) VALUES(?,?,?,?,?)',[first_name,last_name,result[0].email,company,req.user]);

		db.query(sql1,function(err,result){
			if(err) throw err;

			res.redirect('/profile');

		});
	})
	

});

app.get('/rulestable',function(req,res){
	sql  = SqlString.format('SELECT * FROM rules WHERE id = ?',[req.user]);

	db.query(sql,function(err,results){
		if(err) throw error;

		res.render('rulestable',{data:results})
	})
})

app.get('/rules',function(req,res){
	db.query(SqlString.format('SELECT groupid, groupname from mapgroup WHERE id = ?',[req.user]),function(error,results){
			if(error) throw error;
			//db.query(SqlString.format('SELECT deviceid from '))
			res.render('rules',{data:results,error: ''});
	})


});

app.post('/rules',function(req,res){
	req.checkBody('input', 'cloudkey field cannot be empty.').notEmpty();
	req.checkBody('output', 'devicename field cannot be empty.').notEmpty();

	var errors = req.validationErrors();

	if(errors){
			db.query(SqlString.format('SELECT groupid, groupname from mapgroup WHERE id = ?',[req.user]),function(error,results){
			if(error) throw error;
			res.render('rules',{
				errors: errors,
				error: "Please check for errors",
				data:results
			});
		})
		
	} else {

		var selectpick = req.body.selectpicker;
		var myselect = req.body.mySelect;
		var input = req.body.input;
		var output = req.body.output;

		sql = SqlString.format('INSERT INTO rules(deviceid,input,output,groupid,id) VALUES(?,?,?,?,?)',[myselect,input,output,selectpick,req.user]);

		db.query(sql,function(err,result){
			if(err) throw err;

			res.redirect('/rulestable');
		});
	}
})



app.get('/basictable',function(req,res){
	res.render('basic-table');
});
app.get('/fontawesome',function(req,res){
	res.render('fontawesome');
});
app.get('/mapgoogle',function(req,res){
	res.render('map-google');
});
app.get('/blank',function(req,res){
	res.render('blank');
});
app.get('/404',function(req,res){
	res.render('404');
});
app.get('/gmap',function(req,res){
	res.render('gmap');
});

app.listen(3000,function(){
	console.log('Server started on port 3000....')
})

/*
var server = net.createServer();

var server = net.createServer(function(socket) {
	socket.write('Echo server\r\n');
	socket.pipe(socket);
	socket.on('error', function(err) {
   	console.log(err)
	})
});




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
		  		function(err,result,fields){
		  			if(err) throw err;
		  			
		  			for(var h  = 0;h < result.length;h++){
		  				 for( let user in clients ){
					    	// send to the client intended
					    	//var usersplitted = user.split(",")
					    	
							var rows = JSON.parse(JSON.stringify(results[h]));
							let cln = rows.DeviceID + "," + rows.Cloudkey;
					    	if(user === cln){
					    		if(clientname != user){
					    			clients[ user ].write(msg,'hex');
					    		}
					    	}
						}
		  			}
		  		});
		  });


		 
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
				

				db.query('SELECT DeviceID, CloudKey FROM device_mapgroup WHERE DeviceID = ?',[clientNamesplit[0]],function(err,results,fields){
					if(err) throw err;
					
					var rows = JSON.parse(JSON.stringify(results[0]));
					let cnn = rows.DeviceID + "," + rows.Cloudkey;
					if(!results.length){
						console.log("no such device");

					}
					else{
						var rows = JSON.parse(JSON.stringify(results[0]));
						let cnn = rows.DeviceID + "," + rows.Cloudkey;
						
						if(clientname === ccn){
							broadcast(data,results[0].DeviceID);
							console.log("data sent");
						}
						else{
							console.log("wrong cloud key"); 
						}
					}
				});
					

				

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

server.listen(20000,function(){
	console.log("server listening to port 20000")
})

*/