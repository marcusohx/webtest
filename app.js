var express = require('express');
var bodyParser = require('body-parser');
var path = require('path');
var net = require('net');

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




var server = net.createServer();

let clients = {}

let clientCount = 0;

let deviceid = "1234";

server.on('connection',function(connection){
	let clientname

	let message = [];

	function broadcast( msg ){
		  //Loop through the active clients object
		  for( let user in clients ){
		    //Send message to all active clients except yourself 
		    if( clients[ user ] !== connection ){

		    	clients[ user ].write(msg);
		    }
		}
	}
	var remoteAddress = connection.remoteAddress + ":" + connection.remotePort;
	console.log("new client connection is made %s", remoteAddress)
	connection.setEncoding('utf-8');

	connection.on('data',function(data){
		console.log(data)
		message.push(data);
		
		let clientInput = message.join('').replace('\r\n','');
		
		if(!clientname){
			
			if( clients[clientInput]){
				console.log("device added")
				message = [];
				return;
			} else {
				clientname = clientInput;
				clientCount++;
				clients[clientInput] = connection;
				console.log(`- Welcome to the Chatbox, There are ${clientCount} active users\r\n`);
          		//Discard the previous keystrokes the client entered
          		message = [];


          	}
          	} else {
				//Send the message received to every client
				if(clientname === deviceid){
					broadcast(`${clientInput}`);
	        	//Discard the previous keystrokes the client entered
	        		message = [];
				}
				else{
					console.log('This device is for recieving')
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
		console.log(error);
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

function hex2a(hexx) {
    var hex = hexx.toString();//force conversion
    var str = '';
    for (var i = 0; (i < hex.length && hex.substr(i, 2) !== '00'); i += 2)
        str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    return str;
}

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

app.get('/',function(req,res){
	res.render('index',{
		title: 'Tcp server/client'

	});
});


server.listen(20000,function(){
	console.log("server listening to port 20000")
})


app.listen(3000,function(){
	console.log('Server started on port 3000....')
})

