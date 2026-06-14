import Conversation from "../schema/conversition.modal.js";

class ConversationService {
  static async getConversation(userId, query) {
    const page = parseInt(query?.page, 10) || 1;
    const limit = parseInt(query?.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const conversations = await Conversation.find({ participants: userId })
      .populate("participants", "userName email image role status") // Select only necessary fields
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Conversation.countDocuments({ participants: userId });

    return {
      data: conversations,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async createConversation(senderId, receiverId) {
    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, receiverId] },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [senderId, receiverId],
        unreadCount: 0,
      });
    }

    return conversation;
  }
}

export default ConversationService;
