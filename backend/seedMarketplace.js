const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Listing = require('./models/Listing');
const User = require('./models/User');

dotenv.config();

const marketplaceSeed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected for Seed...');

    // Find any user to be the seller
    const seller = await User.findOne({ role: 'User' });
    if (!seller) {
      console.log('No user found! Please register a user first.');
      process.exit(1);
    }

    // Clear existing (it's already 0 but safety first)
    await Listing.deleteMany({ status: 'Active' });

    const dummyListings = [
      {
        sellerId: seller._id,
        make: 'Toyota',
        model: 'Corolla 121',
        year: 2005,
        price: 4500000,
        mileage: 180000,
        fuelType: 'Petrol',
        transmission: 'Automatic',
        bodyType: 'Sedan',
        location: 'Colombo',
        description: 'Well-maintained car. Engine in perfect condition. New tires.',
        images: ['/uploads/sample-car-1.jpg'],
        status: 'Active'
      },
      {
        sellerId: seller._id,
        make: 'Honda',
        model: 'Vezel',
        year: 2018,
        price: 9800000,
        mileage: 45000,
        fuelType: 'Hybrid',
        transmission: 'Automatic',
        bodyType: 'SUV',
        location: 'Kandy',
        description: 'Single owner. Very economical. Z-Grade highest option.',
        images: ['/uploads/sample-car-2.jpg'],
        status: 'Active'
      },
      {
        sellerId: seller._id,
        make: 'Suzuki',
        model: 'Alto',
        year: 2015,
        price: 2800000,
        mileage: 65000,
        fuelType: 'Petrol',
        transmission: 'Manual',
        bodyType: 'Hatchback',
        location: 'Gampaha',
        description: 'LXI model. Good fuel efficiency. Perfect for a first car.',
        status: 'Active'
      }
    ];

    await Listing.insertMany(dummyListings);
    console.log('Successfully seeded 3 marketplace listings!');
    
    process.exit();
  } catch (error) {
    console.error('Error seeding listings:', error);
    process.exit(1);
  }
};

marketplaceSeed();
