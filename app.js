 
var express = require('express');
var bodyParser = require('body-parser');
var path = require('path');
var net = require('net');
var mysql = require('mysql');
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
      host     :'localhost',
      user     :'root',
      password :'123456',
      database :'nodemysql'
});

db.connect(function(err){
	if(err) throw err;
	console.log("mysql connected")
});

var server = net.createServer();

let clients = {}

let clientCount = 0;

let deviceid = "31323334";

server.on('connection',function(connection){
	let clientname

	let message = [];


	function broadcast( msg,Did){
		  //Loop through the active clients object
		var sql = 'SELECT groupid FROM device_mapgroup WHERE DeviceID = ?';
		db.query(sql,[Did],function(err,result){
			if(err) throw err;
			var sql2 ='SELECT DeviceID, Cloudkey FROM device_mapgroup AS t1 WHERE EXISTS ( SELECT * FROM device_mapgroup AS t2 WHERE t2.groupid = t1.groupid and t1.groupid = ?)';
			var thegid = result[0].groupid;
			db.query(sql2,[thegid],function(err,result){
				if(err) throw err;
				
				
				for(var h = 0;h < result.length;h++){

					for(let user in clients ){
			    	// send to the client intended
		   			 	//var usersplitted = user.split(",");
						var rows = JSON.parse(JSON.stringify(result[h]));
						let cln = rows.DeviceID + "," + rows.Cloudkey;
						if(user === cln){
							if(clientname !=  user){
								message.push(msg);
								let cip = hex2a(message.join('').replace('\r\n',''));
								console.log(cip)
								var sql3 ='SELECT COUNT(*) AS countrules FROM rules WHERE groupid = ?'
								db.query(sql3,[thegid],function(err,results){
									if(results[0].countrules > 0){ 
										clients[ user ].write(msg,'hex');
										var sql4 = 'SELECT * FROM rules WHERE groupid = ?'
										db.query(sql4,[thegid],function(err,results){
											for(var i = 0;i < results.length;i++){
												var rs = results[i].output.replace(/\s+/g,'');
												
												if(cip === results[i].input.replace(/\s+/g,'')){
													console.log(rs);

													setTimeout(function() {clients[ user ].write(rs,'hex')},5000);
												}
												
											}
										});
										
										
									}
									else{
										clients[ user ].write(msg,'hex');
									}
								})
								
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

			clientname = clientInput;
			clientCount++;
			
			clients[clientInput] = connection;

			console.log(`- Welcome to the server, There are ${clientCount} active users\r\n`);
          	//Discard the previous keystrokes the client entered
	          	message = [];


          	
          	} else {
			//the device that is sending
                        var clientNamesplit = clientname.split(",");
	
			var ddid = "";
			db.query('SELECT DeviceID, Cloudkey FROM device_mapgroup WHERE DeviceId = ?',[clientNamesplit[0]],function(err,results){
				if(err) throw err;
				console.log(results);
				if(!results.length){
					console.log("no such device");
				}
				else{
					var rows = JSON.parse(JSON.stringify(results[0]));
					let ccn = rows.DeviceID + "," + rows.Cloudkey;
					console.log(ccn);
					//cn = results[0].Cloudkey + "," + results[0].DeviceID;
					if(clientname === ccn){
						broadcast(data,rows.DeviceID);
						console.log("data sent");
					}
					else{
						console.log("cloud key not valid");
					}
				}
				//if(clientname === "12345,5SDAFQ"){
					//broadcast(data,"12345");
				//}
				
			});
			//console.log(ccn);
			//if(clientname === ccn){
			//	broadcast(data,"12345");
			//}
	
				//else{
			
				//	console.log("Wrong cloud key");
					
				//}
				
					
				
					//broadcast(data);
	        	//Discard the previous keystrokes the client entered
	        	message = [];
				
				
				
				


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






server.on('close',function(){
	 //When a client disconnects, remove the name and connection
	 delete clients[clientname];
    //Decrease the active client count
    clientCount--;
    //Send a message to every active client that someone just left the chat
    console.log(`server disconnected`);
});

function hex2a(hexx){
	var hex = hexx.toString();
	var str = '';
	for (var i = 0; (i <hex.length && hex.substr(i,2) !== '00'); i +=2)
	     str += String.fromCharCode(parseInt(hex.substr(i,2),16));
	return str;
}

/*
var server = net.createServer(function(socket) {
	socket.write('Echo server\r\n');
	socket.pipe(socket);
	socket.on('error', function(err) {
   	console.log(err)
	})
});



var data = ""
var remAdd = ""

var deviceid = "1234"
var deviceid2 = "5678"
var correctdevice1 = ""
var correctdevice2 = ""

var clients = [];

server.on("connection",function(socket){

	var remoteAddress = socket.remoteAddress + ":" + socket.remotePort;
	console.log("new client connection is made %s", remoteAddress)
	
	clients.push(socket);

	console.log(clients);

	socket.on("data",function(d){
		
		console.log("Data from %s: %s",remoteAddress,d)
		console.log(d)
		if(correctdevice1 == "send" && correctdevice2=="send"){
			console.log("success connection of both device");
			data = d.toString('utf8');
			socket.write(data);
			console.log(data); 
		}else{
			verifydevice1(d,deviceid)
			verifydevice2(d,deviceid2)
			console.log("connection unsuccessful")
			
		}

	});
	socket.once("close",function(){
		console.log("connection closing %s",remoteAddress)
	});
})

//hexx convertion


function verifydevice1(connectiondata,device){
	if(connectiondata.toString('utf8') === device){
			console.log("success connection 1");
			correctdevice1 = "send";
			
		}
		else{
			console.log("invalid device 1");
		}
}
function verifydevice2(connectiondata,device){
	if(connectiondata.toString('utf8') === device){
			console.log("success connection 2");
			correctdevice2 = "send";
			
		}
		else{
			console.log("invalid device 2");
		}
}
*/



server.listen(20000,function(){
	console.log("server listening to port 20000")
})

