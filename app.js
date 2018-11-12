var express = require('express');
var bodyParser = require('body-parser');
var path = require('path');
var net = require('net');
const mysql = require('mysql');
var app = express();

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
app.use(express.static(path.join(__dirname,'public')))


const db = mysql.createConnection({
	host     : 'localhost',
	user     : 'root',
	password : '123456',
	database : 'nodemysql'
});

db.connect(function(err){
	if(err){
		throw err;
	}
	console.log("Mysql connected...")
});

var server = net.createServer();

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
		  			
		  			for(i = 0;i < results.length;i++){
		  				 for( let user in clients ){
					    	// send to the client intended
					    	usersplit = user.split(",")
					    	
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
				        		return
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




server.listen(20000,function(){
	console.log("server listening to port 20000")
})



