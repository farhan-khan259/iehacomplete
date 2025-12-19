const mongoose = require('mongoose');
const app = require('./app');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log("MongoDB Connected ✔"))
    .catch(err => console.error("MongoDB Error ❌:", err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
