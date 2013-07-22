$(document).ready(function(){

	// show join box
	$('#ask').show();
	$('#ask input').focus();

	// join on enter
	$('#ask input').keydown(function(event) {
		if (event.keyCode == 13) {
			$('#ask a').click();
		}
	})

	// join on click
	$('#ask a').click(function() {
		join($('#ask input').val());
		$('#ask').hide();
		$('#channel').show();
		$('input#message').focus();
	});

	function join(name) {
		var host = window.location.host.split(':')[0];
		var socket = io.connect('http://' + host);
		
		// send join message
		socket.emit('join', $.toJSON({ user: name }));
		
		var container = $('div#msgs');
		
		// handler for callback
		socket.on('chat', function (msg) {
			var message = $.evalJSON(msg);
			
			var action = message.action;
			var struct = container.find('li.' + action + ':first');
			
			if (struct.length < 1) {
				console.log("Could not handle: " + message);
				return;
			}
			
			// get a new message view from struct template
			var messageView = struct.clone();
			
			// set time
			messageView.find('.time').text((new Date()).toString("HH:mm:ss"));
			
			switch (action) {
				case 'message': var matches;
								// someone starts chat with /me ... 
								if (matches = message.msg.match(/^\s*[\/\\]me\s(.*)/)) {
									messageView.find('.user').text(message.user + ' ' + matches[1]);
									messageView.find('.user').css('font-weight', 'bold');
								// normal chat message								
								} else {
									messageView.find('.user').text(message.user);
									messageView.find('.message').text(': ' + message.msg);									
								}
								break;
				case 'control': messageView.find('.user').text(message.user);
								messageView.find('.message').text(message.msg);
								messageView.addClass('control');
								break;
			}
			
			// color own user:
			if (message.user == name) messageView.find('.user').addClass('self');
			
			// append to container and scroll
			container.find('ul').append(messageView.show());
			container.scrollTop(container.find('ul').innerHeight());
		});

    // new message is send in the input box
    $('#channel form').submit(function(event) {
      event.preventDefault();
      var input = $(this).find(':input');
      var msg = input.val();
      socket.emit('chat', $.toJSON({action: 'message', user: name, msg: msg}));
      input.val('');
    }); 

	}
});