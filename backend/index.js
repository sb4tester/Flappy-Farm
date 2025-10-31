const express = require('express');
const cors = require('cors');
const cron = require('node-cron');

const chickenService = require('./services/chickenService');

const app = express();

app.use(cors());
app.use(express.json());


// Cron jobs
// ตรวจสอบไก่ที่อยู่ในตลาดทุก 1 ชั่วโมง
cron.schedule('0 * * * *', async () => {
  try {
    await chickenService.checkListedChickens();
    console.log('Checked listed chickens at:', new Date().toISOString());
  } catch (error) {
    console.error('Error in checkListedChickens cron job:', error);
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 