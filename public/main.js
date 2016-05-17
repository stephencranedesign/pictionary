var pictionary = function(socket) {
    var cavas, context;

    var draw = function(position) {
        context.beginPath();
        context.arc(position.x, position.y, 6, 0, 2 * Math.PI);
        context.fill();
        context.closePath();
    };

    canvas = $('canvas');

    var mouseup = true;
    canvas.on('mousedown', function() {
        mouseup = false;
    });
    canvas.on('mouseup', function() {
        mouseup = true;
    });

    context = canvas[0].getContext('2d');
    canvas[0].width = canvas[0].offsetWidth;
    canvas[0].height = canvas[0].offsetHeight;
    canvas.on('mousemove', function(event) {
        if (mouseup) return;
        console.log('mousemove', role);
        if(role === 'guesser') return;
        var offset = canvas.offset();
        var position = {
            x: event.pageX - offset.left,
            y: event.pageY - offset.top
        };

        socket.emit('draw', position);
        draw(position);
    });

    var socketId;
    var role = 'guesser';
    
    socket.on('connected', function(id) { 
        var prevUserId = sessionStorage.getItem('pictionaryId');
        var prevUserRole = sessionStorage.getItem(('pictionaryRole'));
    
        
        if(prevUserId === null) {
            socket.emit('user::new');
        }
        else {
            socket.emit('user::returning', {prevUserId: prevUserId, role: prevUserRole});
            setRole(prevUserRole);
            socketId = prevUserId;
            console.log('user::returning', socketId);
        }
    });
    socket.on('newId')
    socket.on('user::established', function(o) { 
        sessionStorage.setItem('pictionaryId', o.id); 
        socketId = o.id;
        console.log('user:established', o, socketId);
        if( o.hasOwnProperty('currDrawer') && o.currDrawer !== socketId && o.currDrawer !== null ) setRole('guesser');
        o.prevDrawHistory.forEach(function(position) {
            draw(position);
        });
    });
    socket.on('draw', draw);
    
    var guessBox;
    var onKeyDown = function(event) {
        if (event.keyCode != 13) { // Enter
            return;
        }

        var val = guessBox.val();
        
        console.log(val);
        socket.emit('guess', val);
        guessBox.val('');
    };
    
    guess = $('#guess');
    guessBox = $('#guess input');
    guessBox.on('keydown', onKeyDown);
    
    var lastGuess = $('#last-guess');
    socket.on('guess', function(guess) {
        console.log('guess', guess);
        lastGuess.text(guess);
        if(role === 'drawer') guessResponse.show();
    });
    
    var roleDiv = $('#role');
    socket.on('drawer::findNew', function(o) {
        if(o == null) takeTurn.show();
        else if( o.msg === 'guessRight') { 
            lastGuess.text('drawing found by: ' + o.id); 
            takeTurn.show(); 
            lastGuess.text('');
            guess.hide();
            roleDiv.hide();
            if(role === 'drawer') guessResponse.hide();
            
            context.canvas.width = context.canvas.width;
        }
        else takeTurn.show();
    });
    
    var takeTurn = $('#take-a-turn');
    takeTurn.on('click', function() {
        console.log('click', socketId);
       socket.emit('drawer::thisGuyWantsATurn', socketId);
       takeTurn.hide();
    });
    
    socket.on('drawer::newFound', function(o) {
       console.log('newFound', o.id, socketId);
       if(o.id===socketId) setRole('drawer', o.word);
       else setRole('guesser');
    });
    
    socket.on('drawer::tooSlowJoe', function(id) {
        alert('too slow man');
    });
    
    function setRole(newRole, word) {
        if(newRole === null) return;
        
        role = newRole;
        console.log('newRole; ', newRole);
        if(newRole === 'drawer') {
            guess.hide();
            roleDiv.text('role: '+newRole+ ' | word to draw: ' +word).show();
        }
        else {
            guess.show();
            roleDiv.text('role: '+newRole).show();
        }
        
        sessionStorage.setItem('pictionaryRole', newRole);
        takeTurn.hide();
    }
    
    var guessResponse = $('#guess-response'),
        guessRight = $('#guess-right'),
        guessWrong = $('#guess-wrong');
        
    guessResponse.hide();
    guessRight.on('click', function() {
        socket.emit('guess::right', socketId);
    });
    guessWrong.on('click', function() {
        socket.emit('guess::wrong', socketId);
    });

    socket.on('loneDrawer::true', function() {
         takeTurn.hide();
         roleDiv.show();
         roleDiv.text('sorry buddy, everyone left you..');
         context.canvas.width = context.canvas.width;
    });
    
    socket.on('loneDrawer::false', function() {
        roleDiv.text('');
        takeTurn.show();
    });
};

$(document).ready(function() {
    var socket = io.connect('https://pictionary-stephenrusselcrane.c9users.io/');
    pictionary(socket);
});