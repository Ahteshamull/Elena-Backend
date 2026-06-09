import mongoose from "mongoose";
import conversations from "../../conversition/schema/conversition.modal.js";
import ConversationService from "../../conversition/service/conversition.service.js";
import MessageService from "../../message/service/message.service.js";
import { handleSingleSendMessage } from "./message.handler.js";

const handleChatEvents = async (io, socket, currentUserId) => {
  // Join conversation
  socket.on("join-conversation", async (data) => {
    const { conversationId } = data;

    const isExistConversation = await conversations.exists({
      _id: new mongoose.Types.ObjectId(conversationId),
      participants: currentUserId,
    });

    if (!isExistConversation) {
      socket.emit("auth-error", { message: "Conversation not found" });
      return;
    }

    socket.join(conversationId);
  });

  // Get conversation list
  socket.on("get-conversations", async (query) => {
    try {
      // use ConversationService to fetch conversations
      const conversationsList = await ConversationService.getConversation(
        currentUserId,
        query
      );
      socket.emit("conversation-list", conversationsList);
    } catch (err) {
      socket.emit("socket-error", { errorMessage: err.message });
    }
  });

  // Get message page (paginated messages for a conversation)
  socket.on("message-page", async (data) => {
    try {
      const { conversationId, page, limit, sort } = data || {};
      const query = { page, limit, sort };
      const result = await MessageService.findBySpecificConversationInDb(
        conversationId,
        query
      );
      socket.emit("message-page-result", { conversationId, ...result });
    } catch (err) {
      socket.emit("socket-error", { errorMessage: err.message });
    }
  });

  // Typing indicators
  socket.on("typing", ({ conversationId, userId }) => {
    socket.to(conversationId).emit("user-typing", { conversationId, userId });
  });

  socket.on("stop-typing", ({ conversationId, userId }) => {
    socket
      .to(conversationId)
      .emit("user-stop-typing", { conversationId, userId });
  });

  // Mark messages as read
  socket.on("mark-messages-read", async (data) => {
    try {
      const { conversationId } = data;
      if (!conversationId) return;

      await MessageService.markMessagesAsRead(conversationId, currentUserId);
      
      // Notify the other user in the conversation that messages were read
      socket.to(conversationId).emit("messages-marked-read", {
        conversationId,
        readByUserId: currentUserId
      });
    } catch (err) {
      console.error("Error marking messages as read:", err);
    }
  });

  socket.on("single-chat-send-message", (data) =>
    handleSingleSendMessage(io, socket, currentUserId, data)
  );
};

export default handleChatEvents;
