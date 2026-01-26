import { useState, useEffect, useRef } from "react";
import { updateDoc, doc, arrayUnion, onSnapshot, getDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";

const TaskChat = ({ taskId, onClose, taskName }) => {
  const { currentUser, userRole } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [currentUserName, setCurrentUserName] = useState("");
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const inputRef = useRef(null);
  const previousMessagesLengthRef = useRef(0);

  // Fetch current user's name from Firestore
  useEffect(() => {
    const fetchUserName = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setCurrentUserName(userData.name || userData.displayName || currentUser.email);
        } else {
          setCurrentUserName(currentUser.displayName || currentUser.email || "User");
        }
      } catch (error) {
        console.error("Error fetching user name:", error);
        setCurrentUserName(currentUser.displayName || currentUser.email || "User");
      }
    };

    if (currentUser) {
      fetchUserName();
    }
  }, [currentUser]);

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
    const unsubscribe = onSnapshot(doc(db, "tasks", taskId), (docSnapshot) => {
      if (docSnapshot.exists()) {
        const taskData = docSnapshot.data();
        setMessages(taskData.taskChat || []);
        
        setTimeout(() => {
          markMessagesAsRead();
        }, 500);
      }
    });

    return () => unsubscribe();
  }, [taskId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const markMessagesAsRead = async () => {
    try {
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

  const handleReply = (message) => {
    setReplyingTo(message);
    inputRef.current?.focus();
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;

    const messageText = newMessage.trim();
    const currentReply = replyingTo;
    
    // Clear input and reply immediately
    setNewMessage("");
    setReplyingTo(null);
    setLoading(true);

    try {
      const message = {
        id: Date.now().toString(),
        text: messageText,
        senderId: currentUser.uid,
        senderRole: userRole,
        senderName: currentUserName || currentUser.email,
        sentAt: new Date().toISOString(),
        adminRead: userRole === "admin",
        employeeRead: userRole === "employee",
        replyTo: currentReply ? {
          id: currentReply.id,
          text: currentReply.text,
          senderName: currentReply.senderName
        } : null,
      };

      await updateDoc(doc(db, "tasks", taskId), {
        taskChat: arrayUnion(message),
        chatNotification: {
          hasUnread: true,
          lastMessageFrom: userRole,
          lastMessageAt: new Date().toISOString(),
        },
      });

      inputRef.current?.focus();
    } catch (error) {
      console.error("Error sending message:", error);
      setNewMessage(messageText);
      setReplyingTo(currentReply);
      alert("Failed to send message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
      });
    }
  };

  const groupMessagesByDate = (messages) => {
    const groups = {};
    messages.forEach((message) => {
      const dateKey = formatDate(message.sentAt);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(message);
    });
    return groups;
  };

  const getInitials = (name) => {
    if (!name) return "U";
    // Remove email domain if present
    const cleanName = name.includes('@') ? name.split('@')[0] : name;
    const parts = cleanName.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return cleanName.substring(0, 2).toUpperCase();
  };

  const getAvatarColor = (senderId) => {
    const colors = [
      "bg-blue-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-indigo-500",
      "bg-teal-500",
      "bg-orange-500",
    ];
    const index = senderId.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const groupedMessages = groupMessagesByDate(messages);

  // Check if this is a new message (for animation)
  const shouldAnimate = (messageIndex, dateMessagesLength) => {
    const totalCurrentMessages = messages.length;
    const isNewMessage = totalCurrentMessages > previousMessagesLengthRef.current;
    
    // Only animate the last message if it's new
    if (isNewMessage && messageIndex === dateMessagesLength - 1) {
      previousMessagesLengthRef.current = totalCurrentMessages;
      return true;
    }
    return false;
  };

  // Initialize previous messages count
  useEffect(() => {
    previousMessagesLengthRef.current = messages.length;
  }, []);

  return (
    <>
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes slideIn {
          from {
            transform: translateX(-10px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }

        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }

        .animate-slideIn {
          animation: slideIn 0.3s ease-out forwards;
        }
      `}</style>

      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn"
        onClick={onClose}
      >
        <div 
          className="bg-white rounded-xl w-full max-w-2xl h-[600px] max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-slideUp"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-[#1e3a8a] to-[#1e40af] text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <button
                onClick={onClose}
                className="text-white/90 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-all duration-200"
                aria-label="Close chat"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold truncate">{taskName}</h2>
                <p className="text-xs text-white/80">Task Updates</p>
              </div>
              <div className="flex items-center space-x-1.5 text-xs text-white/90 bg-white/10 px-2.5 py-1 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                <span className="font-medium">{messages.length}</span>
              </div>
            </div>
          </div>

          {/* Messages Container */}
          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto bg-gray-50 px-4 py-3 scroll-smooth"
            style={{ scrollBehavior: 'smooth' }}
          >
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 animate-fadeIn">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-8 w-8 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-600">No messages yet</p>
                <p className="text-xs text-gray-400 mt-1">Start the conversation</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedMessages).map(([date, dateMessages]) => (
                  <div key={date} className="animate-fadeIn">
                    {/* Date Divider */}
                    <div className="flex items-center justify-center mb-3 sticky top-0 z-10">
                      <div className="bg-white shadow-sm rounded-full px-3 py-1 border border-gray-200">
                        <p className="text-[10px] font-semibold text-gray-600">{date}</p>
                      </div>
                    </div>
                    
                    {/* Messages */}
                    <div className="space-y-2">
                      {dateMessages.map((message, index) => {
                        const isCurrentUser = message.senderId === currentUser.uid;
                        const animate = shouldAnimate(index, dateMessages.length);
                        
                        return (
                          <div
                            key={message.id}
                            className={`flex ${isCurrentUser ? "justify-end" : "justify-start"} group ${animate ? 'animate-slideIn' : ''}`}
                          >
                            <div className={`flex items-end space-x-1.5 max-w-[80%] ${isCurrentUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
                              {/* Avatar */}
                              {!isCurrentUser && (
                                <div className={`${getAvatarColor(message.senderId)} w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-white text-[10px] font-bold shadow-md transition-transform hover:scale-110`}>
                                  {getInitials(message.senderName)}
                                </div>
                              )}
                              
                              <div className="flex flex-col space-y-0.5">
                                {/* Message Bubble */}
                                <div
                                  className={`rounded-lg px-3 py-2 shadow-sm transition-all duration-200 hover:shadow-md ${
                                    isCurrentUser
                                      ? "bg-blue-600 text-white rounded-br-none"
                                      : "bg-white text-gray-800 border border-gray-200 rounded-bl-none"
                                  }`}
                                >
                                  {/* Reply Preview */}
                                  {message.replyTo && (
                                    <div className={`border-l-2 pl-2 pr-1 py-1 mb-1.5 rounded-r cursor-pointer ${
                                      isCurrentUser 
                                        ? "bg-white/10 border-white/30 hover:bg-white/20" 
                                        : "bg-gray-50 border-blue-500 hover:bg-gray-100"
                                    } transition-colors`}>
                                      <p className={`text-[10px] font-semibold mb-0.5 ${
                                        isCurrentUser ? "text-white/90" : "text-blue-600"
                                      }`}>
                                        {message.replyTo.senderName}
                                      </p>
                                      <p className={`text-[10px] line-clamp-1 ${
                                        isCurrentUser ? "text-white/70" : "text-gray-500"
                                      }`}>
                                        {message.replyTo.text}
                                      </p>
                                    </div>
                                  )}
                                  
                                  {/* Message Text */}
                                  <p className="text-[13px] leading-relaxed break-words whitespace-pre-wrap select-text">
                                    {message.text}
                                  </p>
                                  
                                  {/* Time */}
                                  <div className="flex items-center justify-end mt-0.5 space-x-1">
                                    <p className={`text-[9px] ${
                                      isCurrentUser ? "text-white/70" : "text-gray-400"
                                    }`}>
                                      {formatTime(message.sentAt)}
                                    </p>
                                    {isCurrentUser && (
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className={`h-3 w-3 transition-colors ${
                                          (userRole === "admin" && message.employeeRead) || 
                                          (userRole === "employee" && message.adminRead)
                                            ? "text-blue-400"
                                            : "text-white/70"
                                        }`}
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                      >
                                        <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                                        <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                      </svg>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Reply Button */}
                                <button
                                  onClick={() => handleReply(message)}
                                  className={`text-[10px] text-gray-400 hover:text-blue-600 font-medium opacity-0 group-hover:opacity-100 transition-all duration-200 ${
                                    isCurrentUser ? 'text-right' : 'text-left'
                                  } px-1 hover:underline`}
                                >
                                  Reply
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Reply Preview Bar */}
          {replyingTo && (
            <div className="bg-gray-100 border-t border-gray-200 px-4 py-2 flex items-center justify-between flex-shrink-0 animate-slideUp">
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                <div className="w-0.5 h-8 bg-blue-600 rounded-full"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold text-blue-600">
                    Replying to {replyingTo.senderName}
                  </p>
                  <p className="text-[11px] text-gray-600 truncate">{replyingTo.text}</p>
                </div>
              </div>
              <button
                onClick={() => setReplyingTo(null)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-200 p-1 rounded transition-all duration-200 ml-2"
                aria-label="Cancel reply"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
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
          )}

          {/* Message Input */}
          <form
            onSubmit={handleSendMessage}
            className="px-4 py-3 bg-white border-t border-gray-200 flex-shrink-0"
          >
            <div className="flex space-x-2 items-end">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                  placeholder="Type a message..."
                  rows={1}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm resize-none transition-all duration-200"
                  disabled={loading}
                  style={{
                    minHeight: '38px',
                    maxHeight: '100px',
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={loading || !newMessage.trim()}
                className="w-10 h-10 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow hover:shadow-md flex-shrink-0"
                aria-label="Send message"
              >
                {loading ? (
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
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
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default TaskChat;