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


app.get('/',function(req,res){
	res.render('index',{
		title: 'Customers',
		users: users
	});
});



app.listen(3000,function(){
	console.log('Server started on port 3000....')
})

