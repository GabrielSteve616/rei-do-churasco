const admin = require("firebase-admin");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { logger } = require("firebase-functions");
const nodemailer = require("nodemailer");

admin.initializeApp();

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT || 587),
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

exports.sendEventReminders = onSchedule("every 30 minutes", async () => {
  const now = new Date();
  const dayBefore = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dayOf = new Date(now.getTime());

  const groupsSnapshot = await admin.firestore().collection("groups").get();

  for (const groupDoc of groupsSnapshot.docs) {
    const groupId = groupDoc.id;
    const eventsSnapshot = await admin.firestore().collection("groups").doc(groupId).collection("events").get();

    for (const eventDoc of eventsSnapshot.docs) {
      const event = eventDoc.data();
      if (!event.reminderEnabled) continue;

      const eventDate = new Date(`${event.date}T${event.time}:00`);
      const shouldSendDayBefore = Math.abs(eventDate.getTime() - dayBefore.getTime()) < 60 * 60 * 1000;
      const shouldSendDayOf = Math.abs(eventDate.getTime() - dayOf.getTime()) < 60 * 60 * 1000;

      if (!shouldSendDayBefore && !shouldSendDayOf) continue;

      const userIds = groupDoc.data().memberIds || [];
      for (const userId of userIds) {
        const userDoc = await admin.firestore().collection("users").doc(userId).get();
        const user = userDoc.data() || {};

        if (!user.notificationEnabled) continue;
        if (!user.email) continue;

        const message = {
          from: process.env.MAIL_FROM || "noreply@reidochurrasco.com",
          to: user.email,
          subject: `Lembrete: ${event.title}`,
          html: `
            <h2>Rei do Churrasco</h2>
            <p>Olá, ${user.fullName || user.nickName || "amigo(a)"}.</p>
            <p>Seu churrasco está chegando:</p>
            <ul>
              <li><strong>Evento:</strong> ${event.title}</li>
              <li><strong>Data:</strong> ${event.date}</li>
              <li><strong>Horário:</strong> ${event.time}</li>
              <li><strong>Local:</strong> ${event.location}</li>
            </ul>
          `,
        };

        await transporter.sendMail(message);
        logger.log(`E-mail enviado para ${user.email} sobre ${event.title}`);
      }
    }
  }
});
