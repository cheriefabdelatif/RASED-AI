document.addEventListener("DOMContentLoaded", () => {
    const chatInput = document.getElementById("chat-input");
    const sendBtn = document.getElementById("send-btn");
    const chatContainer = document.getElementById("chat-container");

    function addMessage(message, isUser) {
        const div = document.createElement("div");
        div.className = `chat-message ${isUser ? 'user' : 'ai'} mb-4`;
        div.innerHTML = `
            <div class="flex ${isUser ? 'justify-end' : 'items-start'}">
                ${!isUser ? `<div class="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mr-3"><i class="fas fa-robot"></i></div>` : ''}
                <div class="bg-${isUser ? 'indigo-100' : 'gray-100'} text-${isUser ? 'indigo-600' : 'gray-800'} rounded-lg p-3 max-w-md">
                    <p class="text-sm">${message}</p>
                </div>
            </div>
        `;
        chatContainer.appendChild(div);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    async function sendMessage() {
        const message = chatInput.value.trim();
        if (!message) return;

        addMessage(message, true);
        chatInput.value = "";

        try {
            const currentUser = JSON.parse(localStorage.getItem('currentUser'));

            // تحديد اللغة بناءً على محتوى الرسالة
            const isEnglishRequest = message.toLowerCase().includes('english') || 
                                   message.toLowerCase().includes('translate') ||
                                   /^[a-zA-Z\s\d\.,!?]+$/.test(message);

            const res = await fetch(`${window.location.origin}/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    message: message,
                    userId: currentUser?.id,
                    language: isEnglishRequest ? 'en' : 'ar'
                })
            });
            const data = await res.json();

            if (data.requiresUpgrade) {
                addMessage(data.reply + "\n\n🔄 للترقية للخطة المدفوعة، تواصل معنا على واتساب", false);
                // إضافة رابط الترقية
                setTimeout(() => {
                    window.open('https://wa.me/213665028481?text=أريد الترقية للخطة المدفوعة', '_blank');
                }, 2000);
            } else {
                addMessage(data.reply, false);
            }
        } catch (err) {
            addMessage("⚠️ فشل الاتصال بـ Rased AI. تحقق من الخادم.", false);
        }
    }

    sendBtn.addEventListener("click", sendMessage);
    chatInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") sendMessage();
    });
});
// تم نقل كود التسجيل والدخول إلى index.html لتجنب التضارب