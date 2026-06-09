import Message from "../schema/message.modal.js";
import Conversation from "../../conversition/schema/conversition.modal.js";

class MessageService {
  static async findBySpecificConversationInDb(conversationId, query) {
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const messages = await Message.find({ conversationId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Message.countDocuments({ conversationId });

    return {
      data: messages.reverse(), // chronologically for UI
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
  
  static async single_new_message_IntoDb(senderData, data) {
    const { id: senderId } = senderData;
    const { receiverId, text, message } = data;
    const messageText = text || message;

    // 1. Check if conversation already exists between these two users
    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, receiverId] },
    });

    // 2. If not, create a new conversation
    if (!conversation) {
      conversation = await Conversation.create({
        participants: [senderId, receiverId],
        unreadCount: 0,
      });
    }

    // 3. Save the actual message
    const newMessage = await Message.create({
      conversationId: conversation._id,
      senderId,
      receiverId,
      text: messageText,
    });

    // 4. Update the conversation with the latest message snippet
    conversation.lastMessage = {
      text: messageText,
      senderId,
      createdAt: newMessage.createdAt,
    };
    conversation.unreadCount += 1;
    await conversation.save();

    return {
      data: newMessage,
    };
  }

  static async markMessagesAsRead(conversationId, currentUserId) {
    // Mark all messages as read where current user is the receiver
    await Message.updateMany(
      { conversationId, receiverId: currentUserId, isRead: false },
      { $set: { isRead: true } }
    );

    // Reset unread count for the conversation
    // In a two-person chat, unreadCount usually applies to the person who hasn't read it,
    // but a simple approach is to just reset it when the receiver opens the chat.
    await Conversation.findByIdAndUpdate(conversationId, { unreadCount: 0 });

    return { success: true };
  }
}

export default MessageService;
