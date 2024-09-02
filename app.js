require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path'); // Added to resolve the path issue
const flash = require('connect-flash');

const app = express();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error(err));

// User Schema
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});
const User = mongoose.model('User', userSchema);

// Comment Schema
const commentSchema = new mongoose.Schema({
    username: { type: String, required: true },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const Comment = mongoose.model('Comment', commentSchema);

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
}));

app.use(flash());

app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success');
    res.locals.error_msg = req.flash('error');
    res.locals.info_msg = req.flash('info');
    next();
});

// Set EJS as templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); // Ensure views directory is set correctly

// Serve static files
app.use('/static', express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => res.render('login'));

app.get('/login', (req, res) => res.render('login'));

app.get('/register', (req, res) => {
    res.render('register', { error: null }); // Pass an initial null value for error
});

app.get('/dashboard', (req, res) => {
    if (req.session.user) {
        res.render('dashboard', { user: req.session.user });
    } else {
        res.redirect('/');
    }
});

app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    
    try {
        // Check if the username already exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            // Username already exists, set flash message and redirect to register page
            req.flash('error', 'Username already exists. Please choose a different username.');
            return res.redirect('/register');
        }

        // Hash the password and create a new user
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword });

        // Save the new user to the database
        await newUser.save();

        // Log the user in by saving their information in the session
        req.session.user = newUser;

        // Set a success message and redirect to the dashboard
        req.flash('success', 'Registration successful! You are now logged in.');
        res.redirect('/dashboard');
    } catch (error) {
        // Catch any errors during registration and redirect to register page with an error message
        req.flash('error', 'An error occurred during registration. Please try again.');
        res.redirect('/register');
    }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (user) {
        // User exists, verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (isPasswordValid) {
            req.session.user = user;
            req.flash('success', 'Successfully logged in!');
            return res.redirect('/dashboard');
        } else {
            // Password is incorrect
            req.flash('error', 'Invalid password');
            return res.redirect('/');
        }
    } else {
        // User does not exist, prompt to register
        req.flash('info', 'Would you like to register your account?');
        return res.redirect('/register');
    }
});


app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.redirect('/dashboard'); // Redirect back if there was an error logging out
        }

        res.clearCookie('connect.sid'); // Optional: clear the session cookie
        res.redirect('/login'); // Redirect to the login page after logging out
    });
});

app.post('/comment', async (req, res) => {
    if (req.session.user) {
        const { text } = req.body;
        const newComment = new Comment({
            username: req.session.user.username,
            text
        });

        await newComment.save();
        res.redirect('/dashboard');
    } else {
        res.redirect('/');
    }
});

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Route to render the main 3Rs page
app.get('/3Rs', (req, res) => {
    res.render('3Rs');
});

app.get('/header', (req, res) => {
    res.render('header');
});

app.get('/reduce', (req, res) => {
    res.render('reduce');
});

app.get('/reuse', (req, res) => {
    res.render('reuse');
});

app.get('/recycle', (req, res) => {
    res.render('recycle');
});

app.get('/conservation', (req, res) => {
    res.render('conservation');
});

app.get('/sustainable', (req, res) => {
    res.render('sustainable');
});

app.get('/renewable', (req, res) => {
    res.render('renewable');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
