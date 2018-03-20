// -- setting up dependencies -- //
import { log, logError } from './utils.js';
import randomString from 'randomstring';
import Room from './room';

export default (server) => {
  // -- setting up socket -- //
  const ioServer = require('socket.io')(server);

  // ioServer.all is map of all the rooms
  ioServer.all = {};

  ioServer.on('connection', socket => {
    log('__CLIENT_CONNECTED__', socket.id);

    socket.on('CREATE_ROOM', (game, instance) => {
      // generating room code for users
      let roomCode = randomString.generate({
        charset: 'alphabetic',
        length: 4,
      }).toUpperCase();
      // generate a new room code if it already exists
      while (ioServer.all[roomCode]) {
        roomCode = randomString.generate({
          charset: 'alphabetic',
          length: 4,
        }).toUpperCase();
      }
      //creating new room with code generated
      log('__ROOM_CREATED__', roomCode);
      // where is this getting broadcasted to?
      socket.broadcast.to(socket.id).emit('You created a room.');
      ioServer.all[roomCode] = new Room(socket, roomCode);
      let room = ioServer.all[roomCode];room.game = game;
      room.instance = instance;
      // attaching the room created to the host's socket object
      socket.room = roomCode;

      let data = {'roomCode': roomCode, 'game': game};
      ioServer.emit('SEND_ROOM', JSON.stringify(data));
    });

    socket.on('JOIN_ROOM', (roomCode, nickname) => {
      let room = ioServer.all[roomCode];
      if (room) {
        // if game has already started in the room, can't join
        if (room.gameStarted) {
          socket.emit('ERROR_JOIN_ROOM', `A game has already started in this room.`);
          return;
        }

        // if nickname is already in the room, can't join
        let duplicateNick = false;
        room.players.forEach(player => {
          if (player.nickname === nickname) duplicateNick = true;
        });
        if (duplicateNick) {
          socket.emit('ERROR_JOIN_ROOM', `This nickname is already being used in the room.`);
          return;
        }

        console.log(`${nickname} joined ${roomCode}`);
        socket.emit('JOINED_ROOM', room.game, room.instance);

        socket.nickname = nickname;
        socket.roomJoined = roomCode;
        room.players.push(socket);
        socket.join(roomCode);
        socket.broadcast.to(roomCode).emit(`${nickname} has joined the room.`);
      }
      else {
        // if room doesn't exist
        socket.emit('ERROR_JOIN_ROOM', `This room does not exist.`);
      }
    });

    socket.on('START_GAME', data => {
      let {game, instance, roomCode} = data;
      let room = ioServer.all[roomCode];

      // start the game
      room.startGame(game, socket, ioServer, instance);
      log(`__GAME_STARTED__: [${game}: ${roomCode}]`);
    });

    socket.on('END_GAME', socket => {
      let roomCode = socket.room;
      let room = ioServer.all[roomCode];
      room.players.map(player => {
        let destination = process.env.CLIENT_URL;
        player.emit('REDIRECT', destination);
        player.leave(roomCode);
        socket.broadcast.to(player.id).emit(`You have left the game.`);
      });
      let destination = `${process.env.CLIENT_URL}/choosegame`;
      socket.emit('REDIRECT', destination);
      socket.leave(roomCode);
      socket.broadcast.to(socket.id).emit('You have ended the game.');
      delete ioServer.all[roomCode];
    });

    socket.on('LEAVE_ROOM', socket => {
      let roomCode = socket.roomJoined;
      let room = ioServer.all[roomCode];
      room.players = room.players.filter(player => player.id !== socket.id);
      let destination = process.env.CLIENT_URL;
      socket.emit('REDIRECT', destination);
      socket.broadcast.to(roomCode).emit(`${socket.nickname} has left the room.`);
      socket.leave(roomCode);
    });
  });

  ioServer.on('disconnect', () => {
    log('__SERVER_DISCONNECTED__', ioServer.id);
  });

  ioServer.on('error', error => {
    logError('ERROR', error);
  });
};
