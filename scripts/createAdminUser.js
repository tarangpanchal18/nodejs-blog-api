/**
 * Script to create an admin user
 * Run with: node scripts/createAdminUser.js
 * 
 * This script creates a user with admin privileges
 */

require('dotenv').config();
const mongoose = require('mongoose');
const readline = require('readline');

// Import User model
const User = require('../models/User');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function to prompt user for input
const prompt = (question) => {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
};

/**
 * Connect to MongoDB
 */
const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in .env file');
    }

    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};

/**
 * Create admin user
 */
const createAdminUser = async () => {
  try {
    console.log('\n📝 Create Admin User\n');
    console.log('This script will create a new user with admin privileges.\n');

    // Get user input
    const name = await prompt('Enter name: ');
    const email = await prompt('Enter email: ');
    const password = await prompt('Enter password (min 6 characters): ');

    // Validate input
    if (!name || !email || !password) {
      throw new Error('All fields are required');
    }

    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      const updateExisting = await prompt(
        `\n⚠️  User with email ${email} already exists.\nDo you want to make this user an admin? (yes/no): `
      );

      if (updateExisting.toLowerCase() === 'yes' || updateExisting.toLowerCase() === 'y') {
        existingUser.isAdmin = true;
        await existingUser.save();
        console.log('\n✅ User updated to admin successfully!');
        console.log(`\n📋 User Details:`);
        console.log(`   Name: ${existingUser.name}`);
        console.log(`   Email: ${existingUser.email}`);
        console.log(`   Admin: ${existingUser.isAdmin}`);
        console.log(`   Active: ${existingUser.isActive}`);
      } else {
        console.log('\n❌ Operation cancelled.');
      }
      return;
    }

    // Create new admin user
    const user = await User.create({
      name,
      email,
      password,
      isAdmin: true,
      isActive: true
    });

    console.log('\n✅ Admin user created successfully!');
    console.log(`\n📋 User Details:`);
    console.log(`   ID: ${user._id}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Admin: ${user.isAdmin}`);
    console.log(`   Active: ${user.isActive}`);
    console.log(`\n🔐 You can now login to the admin panel at: http://localhost:${process.env.PORT || 3000}/admin`);
    console.log(`   Note: You'll need to implement a login mechanism that sets the JWT token.`);

  } catch (error) {
    console.error('\n❌ Error creating admin user:', error.message);
  }
};

/**
 * Main function
 */
const main = async () => {
  try {
    // Connect to database
    await connectDB();

    // Create admin user
    await createAdminUser();

    // Close readline interface and database connection
    rl.close();
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    rl.close();
    process.exit(1);
  }
};

// Run the script
main();
