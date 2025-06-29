
const { Server } = require('socket.io');
const logger = require('../config/logger');

class SocketService {
  constructor(server) {
    if (!SocketService.instance) {
      this.io = new Server(server, {
        cors: {
          origin: '*', // Allow all origins
        },
      });
      this.initialize();
      SocketService.instance = this;
    }
    return SocketService.instance;
  }

  initialize() {
    this.io.on('connection', (socket) => {
      logger.info('New client connected');

      socket.on('join_chat', (chatId) => {
        socket.join(chatId);
        logger.info(`Client joined chat room: ${chatId}`);
      });

      socket.on('leave_chat', (chatId) => {
        socket.leave(chatId);
        logger.info(`Client left chat room: ${chatId}`);
      });

      socket.on('disconnect', () => {
        logger.info('Client disconnected');
      });
    });
  }

  sendMessage(chatId, message) {
    this.io.to(chatId).emit('new_message', message);
  }

  static getInstance(server) {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService(server);
    }
    return SocketService.instance;
  }
}

module.exports = SocketService;
