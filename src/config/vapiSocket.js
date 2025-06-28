const VapiService = require('../service/VapiService');
const { Readable } = require('stream');

const vapiSocket = (io) => {
  // Namespace for Vapi-related communications
  const vapiIO = io.of('/vapi');

  vapiIO.on('connection', (socket) => {
    console.log('New Vapi connection established');
    let activeStream = null;

    // Handle joining a specific conversation room
    socket.on('join-conversation', (conversationId) => {
      socket.join(`conversation-${conversationId}`);
      console.log(`Joined conversation: ${conversationId}`);
    });

    // Handle voice notes (async/stored audio)
    socket.on('voice-note', async (data) => {
      try {
        const { conversationId, audioBlob, userId } = data;

        // Convert audio blob to stream
        const audioBuffer = Buffer.from(audioBlob);
        const audioStream = Readable.from(audioBuffer);

        // Send to Vapi and get response
        const response = await VapiService.sendVoiceMessage(
          conversationId,
          audioStream,
          userId
        );

        // Emit response back to the specific conversation room
        vapiIO.to(`conversation-${conversationId}`).emit('voice-note-response', {
          text: response.text,
          audioUrl: response.audioUrl,
          messageId: response.messageId
        });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Handle real-time voice streaming (live conversation)
    socket.on('start-stream', async (data) => {
      try {
        const { conversationId, userId } = data;

        // Initialize streaming session with Vapi
        activeStream = await VapiService.startVoiceStream(
          conversationId,
          userId,
          // Callback for receiving real-time responses
          (response) => {
            socket.emit('stream-response', {
              text: response.text,
              audioChunk: response.audioChunk,
              isFinal: response.isFinal
            });
          }
        );

        socket.emit('stream-ready');
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Handle incoming audio chunks for real-time streaming
    socket.on('stream-data', async (audioChunk) => {
      try {
        if (activeStream) {
          await activeStream.write(audioChunk);
        }
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Handle stream end
    socket.on('end-stream', async () => {
      try {
        if (activeStream) {
          await activeStream.end();
          activeStream = null;
        }
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      if (activeStream) {
        try {
          await activeStream.end();
        } catch (error) {
          console.error('Error ending stream:', error);
        }
      }
      console.log('Client disconnected from Vapi socket');
    });
  });

  return vapiIO;
};

module.exports = vapiSocket; 
