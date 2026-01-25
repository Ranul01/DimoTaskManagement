import { useState, useEffect, useRef } from "react";
import { updateDoc, doc, arrayUnion, onSnapshot, getDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";

const TaskChat = ({ taskId, onClose, taskName }) => {
  const { currentUser, userRole } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Prevent body scroll when modal is open (iOS fix)
  useEffect(() => {
    const scrollY = window.scrollY;

    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      document.body.style.overflow = "";
      window.scrollTo(0, scrollY);
    };
  }, []);

  useEffect(() => {
    // Listen to task updates for real-time chat
    const unsubscribe = onSnapshot(doc(db, "tasks", taskId), (docSnapshot) => {
      if (docSnapshot.exists()) {
        const taskData = docSnapshot.data();
        setMessages(taskData.taskChat || []);
        
        // Mark messages as read based on user role
        setTimeout(() => {
          markMessagesAsRead();
        }, 500);
      }
    });

    return () => unsubscribe();
  }, [taskId]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const markMessagesAsRead = async () => {
    try {
      // Use v9 modular syntax
      const taskDocRef = doc(db, "tasks", taskId);
      const taskDoc = await getDoc(taskDocRef);
      
      if (!taskDoc.exists()) {
        console.error("Task not found");
        return;
      }
      
      const taskData = taskDoc.data();
      const taskChat = taskData.taskChat || [];

      const updatedChat = taskChat.map((msg) => {
        if (userRole === "admin" && msg.senderRole === "employee" && !msg.adminRead) {
          return { ...msg, adminRead: true };
        } else if (userRole === "employee" && msg.senderRole === "admin" && !msg.employeeRead) {
          return { ...msg, employeeRead: true };
        }
        return msg;
      });

      // Only update if there are changes
      const hasChanges = updatedChat.some((msg, index) => 
        msg.adminRead !== taskChat[index].adminRead || 
        msg.employeeRead !== taskChat[index].employeeRead
      );

      if (hasChanges) {
        await updateDoc(taskDocRef, {
          taskChat: updatedChat,
        });
      }
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;

    setLoading(true);

    try {
      const message = {
        id: Date.now().toString(),
        text: newMessage.trim(),
        senderId: currentUser.uid,
        senderRole: userRole,
        senderName: currentUser.displayName || currentUser.email,
        sentAt: new Date().toISOString(),
        adminRead: userRole === "admin",
        employeeRead: userRole === "employee",
      };

      await updateDoc(doc(db, "tasks", taskId), {
        taskChat: arrayUnion(message),
        // Add notification field for the receiver
        chatNotification: {
          hasUnread: true,
          lastMessageFrom: userRole,
          lastMessageAt: new Date().toISOString(),
        },
      });

      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl h-[600px] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-dimo-blue text-white p-4 rounded-t-lg flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <div>
              <h2 className="text-lg font-bold">Task Chat</h2>
              <p className="text-xs text-blue-100 truncate max-w-xs">{taskName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 p-1"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Messages Container */}
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50"
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-16 w-16 mb-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <p className="text-sm">No messages yet</p>
              <p className="text-xs">Start the conversation!</p>
            </div>
          ) : (
            messages.map((message) => {
              const isCurrentUser = message.senderId === currentUser.uid;
              return (
                <div
                  key={message.id}
                  className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md ${
                      isCurrentUser
                        ? "bg-dimo-blue text-white"
                        : "bg-white text-gray-800 border border-gray-200"
                    } rounded-lg p-3 shadow-sm`}
                  >
                    <div className="flex items-center space-x-2 mb-1">
                      <p
                        className={`text-xs font-semibold ${
                          isCurrentUser ? "text-blue-100" : "text-gray-600"
                        }`}
                      >
                        {message.senderName}
                      </p>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          message.senderRole === "admin"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {message.senderRole === "admin" ? "Admin" : "Employee"}
                      </span>
                    </div>
                    <p className="text-sm break-words">{message.text}</p>
                    <p
                      className={`text-xs mt-1 ${
                        isCurrentUser ? "text-blue-100" : "text-gray-400"
                      }`}
                    >
                      {formatTime(message.sentAt)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <form
          onSubmit={handleSendMessage}
          className="p-4 border-t border-gray-200 bg-white rounded-b-lg flex-shrink-0"
        >
          <div className="flex space-x-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dimo-blue focus:border-transparent outline-none"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !newMessage.trim()}
              className="px-6 py-2 bg-dimo-blue text-white rounded-lg hover:bg-dimo-dark transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
              <span className="hidden sm:inline">Send</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskChat;