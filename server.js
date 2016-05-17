var http = require("http");
var express = require("express");
var socket_io = require("socket.io");

var app = express();
app.use(express.static('public'));

var server = http.Server(app);
var io = socket_io(server);

var prevDrawHistory = [];

var uId = 0;
var Player = function(role, socket) {
  this.id = uId;
  this.role = role || 'guesser';
  this.socket = socket;
  players[uId] = this;
  uId++;
};

var players = {};
var playerLength = 0;

var currDrawer = null;
function setDrawer(id) { currDrawer = id; };
function needNewDrawer() { return currDrawer === null ? true : false; }
function findNewDrawer(o) {
  lastWord = null;
  prevDrawHistory = [];
  setDrawer(null);
  io.emit('drawer::findNew', o);
};

var WORDS = [
    "word", "letter", "number", "person", "pen", "class", "people",
    "sound", "water", "side", "place", "man", "men", "woman", "women", "boy",
    "girl", "year", "day", "week", "month", "name", "sentence", "line", "air",
    "land", "home", "hand", "house", "picture", "animal", "mother", "father",
    "brother", "sister", "world", "head", "page", "country", "question",
    "answer", "school", "plant", "food", "sun", "state", "eye", "city", "tree",
    "farm", "story", "sea", "night", "day", "life", "north", "south", "east",
    "west", "child", "children", "example", "paper", "music", "river", "car",
    "foot", "feet", "book", "science", "room", "friend", "idea", "fish",
    "mountain", "horse", "watch", "color", "face", "wood", "list", "bird",
    "body", "dog", "family", "song", "door", "product", "wind", "ship", "area",
    "rock", "order", "fire", "problem", "piece", "top", "bottom", "king",
    "space"
];
var lastWord = null;
function randomIntFromInterval(min,max) {
    return Math.floor(Math.random()*(max-min+1)+min);
}
function getNewWord() {
  var randomNum = randomIntFromInterval(0, WORDS.length-1);
  if( lastWord === WORDS[randomNum] ) randomNum = getNewWord();
  lastWord = WORDS[randomNum];
  console.log('lastWord: ', lastWord);
  return lastWord;
}

var loneDrawer = false;

io.on('connection', function (socket) {
  var player = null;
  playerLength++;
  socket.emit('connected');
  
  if(loneDrawer) { io.emit('loneDrawer::false'); loneDrawer = false; }
  
  function newUser() {
    console.log('user::new');
    player = new Player('guesser', socket);
    socket.emit('user::established', {id:player.id, prevDrawHistory: prevDrawHistory, currDrawer: currDrawer });
    if(needNewDrawer()) findNewDrawer();
  };
  
  socket.on('user::new', newUser);
  
  socket.on('user::returning', function(o) {
    console.log('user::returning', o);
    player = players[parseInt(o.prevUserId)];
    if(player === undefined) newUser();
    else {
      player.socket = socket;
      socket.emit('user::established', {id:player.id, prevDrawHistory: prevDrawHistory});
      if(needNewDrawer()) findNewDrawer(); 
    }
  });
  
  socket.on('draw', function(position) {
      if(player === null) return;
      prevDrawHistory.push(position);
      socket.broadcast.emit('draw', position);
  });
  socket.on('guess', function(guess) {
     if(player === null) return;
     io.emit('guess', guess); 
  });
  
  socket.on('disconnect', function() {
    if(player.id == currDrawer) findNewDrawer();
    playerLength--;
    console.log('disconnect: ', playerLength);
    if(playerLength === 1) { 
      io.emit('loneDrawer::true'); 
      loneDrawer = true; 
      currDrawer = null;
      prevDrawHistory = [];
    }
    
  });
  
  socket.on('drawer::thisGuyWantsATurn', function(id) {
    console.log('drawer::thisGuyWantsATurn', id);
    if(currDrawer !== null) socket.emit('drawer::tooSlowJoe');
    else {
      currDrawer = id;
      var word = getNewWord();
      io.emit('drawer::newFound', {id:id, word: word});
    }
  });
  
  socket.on('guess::right', function(id) {
    if(currDrawer !== id) return;
    
    currDrawer = null;
    prevDrawHistory = [];
    findNewDrawer({ msg: 'guessRight', id: id });
  });


});

server.listen(8080);