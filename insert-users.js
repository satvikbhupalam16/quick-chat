// insert-users.js
const mongoose = require('mongoose');
const User = require('./models/User');

// Connect to MongoDB
mongoose.connect('mongodb+srv://sf_admin:Rss%401234567890@cluster0.vs2ktwe.mongodb.net/chatDB?retryWrites=true&w=majority&appName=Cluster0', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  // Optional: clear existing users
  await User.deleteMany();

  // Insert new users
  await User.create([
    { username: 'Dog', password: 'Dog@143' },
    { username: 'Pig', password: 'Pig@143' }
  ]);

  console.log('✅ New users inserted');
  process.exit();
}).catch(err => {
  console.error('❌ Error inserting users:', err);
});
