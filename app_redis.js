var app = require('http').createServer(handler),
	io = require('socket.io').listen(app),
	fs = require('fs'),
	redis = require('redis');

app.listen(8080);

function handler(req, res) {
	
	console.log("waiting on: " + req.url);
	if((req.url.indexOf('.html') != -1) || req.url === ("/")) { //req.url has the pathname, check if it conatins '.html'

      fs.readFile(__dirname + '/index.html', function (err, data) {
        if (err) console.log(err);
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.write(data);
        res.end();
      });

    }

    if(req.url.indexOf('.js') != -1){ //req.url has the pathname, check if it conatins '.js'

      fs.readFile(__dirname + '/script.js', function (err, data) {
        if (err) console.log(err);
        res.writeHead(200, {'Content-Type': 'text/javascript'});
        res.write(data);
        res.end();
      });

    }

    if(req.url.indexOf('.css') != -1){ //req.url has the pathname, check if it conatins '.css'

      fs.readFile(__dirname + '/style.css', function (err, data) {
        if (err) console.log(err);
        res.writeHead(200, {'Content-Type': 'text/css'});
        res.write(data);
        res.end();
      });

    }

    if(req.url.indexOf('.ico') != -1){ //req.url has the pathname, check if it conatins '.css'

      fs.readFile(__dirname + '/icon.ico', function (err, data) {
        if (err) console.log(err);
        res.writeHead(200, {'Content-Type': 'text/css'});
        res.write(data);
        res.end();
      });

    }
}

io.configure( function() {
	io.set('close timeout', 60*60*24); // 24h time out
});

function SessionController (user) {
	// session controller class for storing redis connections
	// this is more a workaround for the proof-of-concept
	// in "real" applications session handling should NOT
	// be done like this
	this.sub = redis.createClient();
	this.pub = redis.createClient();
	
	this.user = user;
}

SessionController.prototype.subscribe = function(socket) {
	console.log("called with SessionController.prototype.subscribe: " + socket);
	this.sub.on('message', function(channel, message) {
		socket.emit(channel, message);
	});
	var current = this;
	this.sub.on('subscribe', function(channel, count) {
		var joinMessage = JSON.stringify({action: 'control', user: current.user, msg: ' joined the channel' });
		current.publish(joinMessage);
	});
	this.sub.subscribe('chat');
	this.sub.subscribe('ball');

};

SessionController.prototype.rejoin = function(socket, message) {
	this.sub.on('message', function(channel, message) {
		socket.emit(channel, message);
	});
	var current = this;
	this.sub.on('subscribe', function(channel, count) {
		var rejoin = JSON.stringify({action: 'control', user: current.user, msg: ' rejoined the channel' });
		current.publish(rejoin);
		var reply = JSON.stringify({action: 'message', user: message.user, msg: message.msg });
		current.publish(reply);
	});
	this.sub.subscribe('chat');
	this.sub.subscribe('ball');

};

SessionController.prototype.unsubscribe = function() {
	this.sub.unsubscribe('chat');
	this.sub.unsubscribe('ball');

};

SessionController.prototype.publish = function(message) {
	console.log("SessionController.prototype.publish called with message: " + message)
	this.pub.publish('chat', message);
	//this.pub.publish('ball', message);

};

SessionController.prototype.destroyRedis = function() {
	if (this.sub !== null) this.sub.quit();
	if (this.pub !== null) this.pub.quit();
};

io.sockets.on('connection', function (socket) { // the actual socket callback
	console.log("socket on connection");
	console.log(socket.id);
	socket.on('chat', function (data) { // receiving chat messages
		var msg = JSON.parse(data);
		socket.get('sessionController', function(err, sessionController) {
			if (sessionController === null) {
				// implicit login - socket can be timed out or disconnected
				var newSessionController = new SessionController(msg.user);
				socket.set('sessionController', newSessionController);
				newSessionController.rejoin(socket, msg);
			} else {
				var reply = JSON.stringify({action: 'message', user: msg.user, msg: msg.msg });
				sessionController.publish(reply);
			}
		});
		// just some logging to trace the chat data
		console.log(data);
	});

	socket.on('ball', function (data) { // receiving ball messages
		var ball = JSON.parse(data);
		// just some logging to trace the ball data
		console.log(data);
	});


	socket.on('join', function(data) {
		var msg = JSON.parse(data);
		var sessionController = new SessionController(msg.user);
		socket.set('sessionController', sessionController);
		sessionController.subscribe(socket);
		// just some logging to trace the chat data
		console.log(data);
	});

	socket.on('disconnect', function() { // disconnect from a socket - might happen quite frequently depending on network quality
		socket.get('sessionController', function(err, sessionController) {
			if (sessionController === null) return;
			sessionController.unsubscribe();
			var leaveMessage = JSON.stringify({action: 'control', user: sessionController.user, msg: ' left the channel' });
			sessionController.publish(leaveMessage);
			sessionController.destroyRedis();
		});
	});
});