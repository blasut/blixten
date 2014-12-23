// Requires
var http = require('http');
var fs = require('fs');
var io = require('socket.io');

// Globals
var clients = [];
var currentMessage = " ";
var currentSessionId = "";

var server = http.createServer(function (request, response) {
	getIndex(request, response);
})
sio = io.listen(server);
server.listen(8000);


setInterval(function() {
//	console.log(clients);
}, 1000);


/*
	Note:
	
	When the user attempts to connect to the same window with the same sessionID, the user shouldn't be prompted with a new username. And the client should "share" the sockets with eachother.
	
	In the check that the user exists we might want to get a socketId, so we can broadcast to that as well.
	
	For now, you can do the check if the user exists and do a 404 or something.
	
	Example:
	
	User A enters and get socketid 1.
	User A enters again, using the same sessionId cookie and gets socketid 2.
	
	When sockid 1 or socketid 2 emits anything, the update must happen in both places.
*/
sio.sockets.on('connection', function (socket, userName) {

	console.log(socket);

	var check = checkUserExists();
	if(check == false) {
		// No need for a new username.
	}
	socket.on('setUserName', function(userName, fn) {

		// Add the new client to the clients array.
		clients.push({
			"userName" : userName, 
			"sessionId" : currentSessionId,
			"socketId" : socket.id
		});
		
		// Makes sure the new user has the current version of the document
		sio.sockets.emit('updateNewUser', currentMessage, userName);
		// Shows the "someone has connected message"
		socket.broadcast.emit('someone connected');
	});
	
	// when the user writes, we have to update.
	// this is local to every socket.
	socket.on('writing', function(message, fn) {
		/*console.log("writing");
		currentMessage = message;
		// this is global, to all sockets except for the socket actually broadcasting
		sio.sockets.emit('updateMessage', { text: message });*/
		currentMessage = currentMessage + message;
		console.log("Currentmessage: " + currentMessage);
		console.log("Character typed: " + message);
	});
	
	socket.on('getClients', function() {
		sio.sockets.emit('showClients', { clients : clients  });
	});
	
	socket.on('disconnect', function() {
		// Find the client with the matching socket.id and remove him/her from the clients array.
		for(var i = 0; i < clients.length; i++) {
			if(clients[i].socketId == socket.id) {
				clients.splice(i, 1);
				sio.sockets.emit('showClients', { clients : clients  });
			}
		}
	});
	
});

/* Session specific function. */

// Check if the user who is connecting got a sessionId cookie already.
// If the user do, then it should not get a new cookie!
function checkSessionIdCookie(request, response) {
	// get the cookies from the request object.
	var cookies = request.headers.cookie;
	
	console.log(cookies);
	
	// If no cookies are present.
	if(cookies !== undefined) {
		// cookies are a string, so we look for sessionId in it.
		var regexp = new RegExp('sessionId=([0-9]*)');
		var exists = cookies.match(regexp);
		
		console.log(clients);

		// check if the sessionId exists
		if(exists !== null && exists[1] !== 0) {
			// make sure the client gets added with the old cookie
			currentSessionId = exists[1];

			return true;
		}
	}

	// create a new cookie, becuase the person doesn't have a sessionId cookie.
	currentSessionId = Math.floor(Math.random() * 0x100000000);
	return false;
}

function checkUserExists () {
	/*
	NOTE:
	 add a check to make sure that every session is unique!
	 If the sessionId already exists could you make the socketid the same as the other socketid?
	 Basically check if the user already is logged in and writing!
	Share sessions over multiple tabs, based on the sessionId cookie value.
	*/
	for (var i=0; i < clients.length; i++) {
		if(clients[i].sessionId == currentSessionId) {
			// Do not prompt the user for a username, and do not add the client to the clients array!
			return true;
		}
	};
	return false;
}


/* Set headers */
function setHeaders(request, response, content) {
	// the the sessionId cookie already exists, then we don't want to override it.
	var check = checkSessionIdCookie(request, response);
	
	// deafult header
	header = { 'Content-type' : 'text/html; charset=utf-8' };
	if(check === false) {
		header['Set-Cookie'] = 'sessionId = ' + currentSessionId;
	}
	
	console.log("header:");
	console.log(header);
	
	response.writeHead(200, header);
	response.end(content);
}


/* View specific functions. */
function getIndex(request, response) {
	var index = fs.readFileSync('public/index.html');
	
	setHeaders(request, response, index);
}

function getView(request, response) {
	// Look in the public directory for the specified filename + html.
}


console.log('Server running at http://127.0.0.1:8000/');