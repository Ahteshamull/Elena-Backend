class MessageService {
  static async findBySpecificConversationInDb(conversationId, query) {
    return { data: [] };
  }
  
  static async single_new_message_IntoDb(senderData, data) {
    return { data: null };
  }
}

export default MessageService;
