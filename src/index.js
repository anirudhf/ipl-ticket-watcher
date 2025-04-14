const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const axios = require('axios');
const cheerio = require('cheerio');
const { Webhook, MessageBuilder } = require('discord-webhook-node');

dotenv.config();


const WATCH_INTERVAL = parseInt(process.env.WATCH_INTERVAL_MIN || '5') * 60 * 1000;
const MATCH_DATES = process.env.MATCH_DATES?.split(',') || [];
const RCB_TICKET_URL = 'https://shop.royalchallengers.com/ticket'; // you can customise it for your own team
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const hook = DISCORD_WEBHOOK_URL ? new Webhook(DISCORD_WEBHOOK_URL) : null;

async function sendEmail(subject, text) {
  await transporter.sendMail({
    from: `RCB Ticket Notifier <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_RECEIVER,
    subject,
    text,
  });
}

async function sendDiscordNotification(message) {
  if (!hook) return;
  
  const embed = new MessageBuilder()
    .setTitle('🚨 RCB Tickets Alert!')
    .setDescription(message)
    .setURL(RCB_TICKET_URL)
    .setColor('#FF0000')
    .setTimestamp();
  
  await hook.send(embed);
}

async function checkForTickets() {
  try {
    const { data: html } = await axios.get(RCB_TICKET_URL);
    const $ = cheerio.load(html);
    const dateElements = $('p.css-1nm99ps');

    const availableDates = [];
    dateElements.each((_, elem) => {
      availableDates.push($(elem).text().trim());
    });

    const matched = availableDates.filter(date => {
      return MATCH_DATES.some(match => 
        date.toLowerCase().includes(match.toLowerCase())
    });

    if (matched.length > 0) {
      const msg = `🚨 Tickets available for: ${matched.join(', ')}\n\nBook here: ${RCB_TICKET_URL}`;
      console.log(msg);
      
      await Promise.all([
        sendEmail('🚨 RCB Tickets LIVE!', msg),
        sendDiscordNotification(msg)
      ]);
    } else {
      console.log(`[${new Date().toLocaleTimeString()}] Tickets not yet available.`);
    }
  } catch (error) {
    console.error('Error checking tickets:', error);
  }
}

function startWatcher() {
  console.log('🔁 Starting RCB ticket watch...');
  checkForTickets();
  setInterval(checkForTickets, WATCH_INTERVAL);
}

startWatcher();