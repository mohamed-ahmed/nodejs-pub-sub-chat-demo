var app = require('http').createServer(handler)
	, io = require('socket.io').listen(app)
	, fs = require('fs')
	
	app.listen(80, "192.168.178.34");
	
	function handler(req, res) {
		fs.readFile(__dirname + '/index.html',
			function (err, data) {
				if (err) {
					res.writeHead(500);
					return res.end('Error loading index.html');
				}
				
				res.writeHead(200);
				res.end(data);
			});
	}
	
	io.sockets.on('connection', function (socket) {
		socket.on('chat', function (data) {
			var msg = JSON.parse(data);
			switch (msg.action) {
				case 'join': var reply = JSON.stringify({action: 'control', user: msg.user, msg: ' joined the channel' });
							 socket.emit('chat', reply);
							 socket.broadcast.emit('chat', reply);
							 break;
				case 'message': var reply = JSON.stringify({action: 'message', user: msg.user, msg: msg.msg });
								socket.emit('chat', reply);
								socket.broadcast.emit('chat', reply);
								break;
				
			}
			console.log(data);
		});
	});