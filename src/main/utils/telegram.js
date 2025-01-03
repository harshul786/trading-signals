require("dotenv").config();
const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

const sendTelegramNotification = (message) => {
  // Use fetch to send the notification
  fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: "Markdown", // Use Markdown for formatting
    }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(
          `Telegram API responded with status ${response.status}`
        );
      }
      return response.json();
    })
    .then((data) => {
      console.log("Telegram notification sent successfully:", message);
    })
    .catch((error) => {
      console.error("Failed to send Telegram notification:", error.message);
    });
};

module.exports = { sendTelegramNotification };
