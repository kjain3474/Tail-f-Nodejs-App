var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var fs = require('fs')

app.get('/', function(req, res){
	  res.writeHead(302, {
		'Location': '/log'
	  });
	  res.end();
})


app.get('/log', function (req, res) {
  fs.readFile(__dirname + '/log/index.html',
		function (err, data) {
			if (err) {
				res.writeHead(500);
				return res.end('Error loading html file');
			}
			res.writeHead(200);
			res.end(data);
		});
});


io.sockets.on('connection', function(socket)
{

  //successfully connected
  socket.emit('connected')

  var FileSize;
  
  var file = 'test.txt';

  //reading file
  socket.on('openFile', () => {
    console.log("open file")
    fs.stat(file, function(err, stat)
    {
			if(err) {
				console.log(err);
				socket.emit('error', err.toString());
				return;
			}

	  //setting file size to initial file size data
	  FileSize = stat.size;
	  
      var stream = fs.createReadStream(file,{start:0, end:stat.size});
	
      stream.addListener("data", function(filedata){
				filedata = filedata.toString('utf-8').trim();

				//splitting data on new line to array
				var lines = filedata.split("\n");
				   
				//checking if file has less than 10 lines or not
			    if(lines.size <= 10){
				  socket.emit('initialFileData',{text : lines});
				}else{
				  //slicing to get last 10 lines
				  socket.emit('initialFileData',{text : lines.splice(-10)});
				}

				stream.close();

				//watching for file changes
				startWatching(file, socket);

				console.log('started watching '+ file);
				 
			});
	})
	
	function startWatching(filename, socket) {

		fs.watch(filename, function(event){
			fs.stat(filename, function(err,stat){
				if(err) {
					console.log(err);
					socket.emit('error', err.toString());
					return;
				}
				
				//reading file from previous file size to end of file
				//the new data would be the bytes added after the previous file size
				var stream = fs.createReadStream(filename, { start: FileSize, end: stat.size});
				stream.addListener("error",function(err){
					socket.emit('error', err.toString());
				});

				stream.addListener("data", function(filedata) {
					filedata = filedata.toString('utf-8').trim();

					var lines = filedata.split("\n");

		
					socket.emit('continuousFileData',{text : lines});
					
					//setting new file size
					FileSize = stat.size;
				});
			});
		});
	}

  });

  socket.on('disconnect', () => {
    console.log('disconnected');
  });


});

server.listen(3000, function () {
  console.log('listening on port 3000!');
});


