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


var users = [
	{
		id:'1',
		first_name: 'john',
		last_name:'doe',
		email:'johndoe@gmail.com',
	},
	{
		id:'2',
		first_name: 'Bob',
		last_name:'smith',
		email:'bobsmith@gmail.com',
	},
	{
		id:'3',
		first_name: 'jill',
		last_name:'jackson',
		email:'jilljackson@gmail.com',
	}
]




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

var data = ""
var remAdd = ""

server.on("connection",function(socket){

	var remoteAddress = socket.remoteAddress + ":" + socket.remotePort;
	console.log("new client connection is made %s", remoteAddress)
	
	socket.on("data",function(d){
		console.log("Data from %s: %s",remoteAddress,d)
		data = d
		remAdd = remoteAddress
	});
	socket.once("close",function(){
		console.log("connection closing %s",remoteAddress)
	});
})

app.get('/',function(req,res){
	res.render('index',{
		title: 'Tcp server/client',
		DATA: data,
		RA: remAdd

	});
});


server.listen(20000,function(){
	console.log("server listening to port 20000")
})


app.listen(3000,function(){
	console.log('Server started on port 3000....')
})

