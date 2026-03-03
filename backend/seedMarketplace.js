const mongoose = require('mongoose');
const {setServers, resolveSrv, resolveTxt} = require('node:dns/promises');
const dotenv = require('dotenv');
const Listing = require('./models/Listing');
const User = require('./models/User');

dotenv.config();

// ============================================================================
// 🔧 ROBUST MONGODB CONNECTION WITH DNS FALLBACK (for querySrv ECONNREFUSED)
// ============================================================================
const parseDnsServers = () => {
    const value = process.env.MONGO_DNS_SERVERS || '1.1.1.1,8.8.8.8';
    return value.split(',').map((item) => item.trim()).filter(Boolean);
};

const applyDnsServers = async () => {
    const servers = parseDnsServers();
    if (!servers.length) return;
    setServers(servers);
    console.log(`Using DNS servers: ${servers.join(', ')}`);
};

const buildStandardUriFromSrv = async (srvUri) => {
    const parsed = new URL(srvUri);
    const serviceHost = `_mongodb._tcp.${parsed.hostname}`;

    const srvRecords = await resolveSrv(serviceHost);
    if (!srvRecords.length) {
        throw new Error(`No SRV records found for ${serviceHost}`);
    }

    const hosts = srvRecords.map((record) => `${record.name}:${record.port}`).join(',');
    const username = parsed.username ? encodeURIComponent(parsed.username) : '';
    const password = parsed.password ? encodeURIComponent(parsed.password) : '';
    const auth = username ? `${username}${password ? `:${password}` : ''}@` : '';
    const dbName = parsed.pathname && parsed.pathname !== '/' ? parsed.pathname.slice(1) : 'vehicle_management';

    const params = new URLSearchParams(parsed.search);

    try {
        const txtRecords = await resolveTxt(serviceHost);
        for (const recordSet of txtRecords) {
            const joined = recordSet.join('');
            for (const pair of joined.split('&')) {
                const [rawKey, rawValue] = pair.split('=');
                if (!rawKey) continue;
                if (!params.has(rawKey)) {
                    params.set(rawKey, rawValue || '');
                }
            }
        }
    } catch (error) {
        console.warn(`TXT lookup skipped: ${error.message}`);
    }

    if (!params.has('tls') && !params.has('ssl')) {
        params.set('tls', 'true');
    }

    const query = params.toString();
    return `mongodb://${auth}${hosts}/${dbName}${query ? `?${query}` : ''}`;
};

const connectWithUri = async (uri) => {
    return mongoose.connect(uri, {
        serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 10000),
        family: 4 // Force IPv4 to avoid IPv6 issues on some networks
    });
};

const connectDBRobust = async (uri) => {
    const primaryUri = uri;

    try {
        const conn = await connectWithUri(primaryUri);
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        return conn;
    } catch (error) {
        const isSrvDnsError = /querySrv|ENOTFOUND|ECONNREFUSED/i.test(error.message || '');
        const isSrvUri = primaryUri.startsWith('mongodb+srv://');

        if (!isSrvDnsError || !isSrvUri) {
            console.error(`❌ MongoDB connection failed: ${error.message}`);
            throw error;
        }

        console.warn(`⚠️ SRV lookup failed (${error.message}). Retrying with DNS override...`);

        try {
            await applyDnsServers();
            const retryConn = await connectWithUri(primaryUri);
            console.log(`✅ MongoDB Connected after DNS override: ${retryConn.connection.host}`);
            return retryConn;
        } catch (dnsRetryError) {
            console.warn(`⚠️ SRV retry failed: ${dnsRetryError.message}`);
        }

        try {
            const fallbackUri = process.env.MONGO_URI_FALLBACK || await buildStandardUriFromSrv(primaryUri);
            const fallbackConn = await connectWithUri(fallbackUri);
            console.log(`✅ MongoDB Connected using fallback URI: ${fallbackConn.connection.host}`);
            return fallbackConn;
        } catch (fallbackError) {
            console.error(`❌ MongoDB fallback connection failed: ${fallbackError.message}`);
            throw fallbackError;
        }
    }
};
// ============================================================================

const marketplaceSeed = async () => {
    try {
        // ✅ Use robust connection with DNS fallback
        await connectDBRobust(process.env.MONGO_URI);
        console.log('🌱 Starting marketplace seed process...');

        // Find any regular user to be the seller (not InspectionCompany)
        let seller = await User.findOne({role: 'User'});

        if (!seller) {
            console.log('⚠️ No regular User found! Creating a test seller...');
            seller = await User.create({
                name: 'Test Seller',
                email: 'seller@example.com',
                password: 'seller123',
                phone: '+94771234567',
                role: 'User',
            });
            console.log(`✅ Created test seller: ${seller.email} (password: seller123)`);
        }

        // Clear existing Active listings (safe to re-run)
        await Listing.deleteMany({status: 'Active'});
        console.log('🗑️  Cleared existing Active listings');

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
        console.log('✅ Successfully seeded 3 marketplace listings!');

        console.log('\n📋 MARKETPLACE TEST DATA');
        console.log('='.repeat(60));
        dummyListings.forEach((listing, i) => {
            console.log(`${i + 1}. ${listing.year} ${listing.make} ${listing.model}`);
            console.log(`   💰 Price: Rs. ${listing.price.toLocaleString()}`);
            console.log(`   📍 Location: ${listing.location}`);
            console.log(`   ⚙️  ${listing.fuelType} • ${listing.transmission} • ${listing.mileage.toLocaleString()} km`);
            console.log('');
        });

        console.log(`🔑 Seller login: seller@example.com / seller123`);

        await mongoose.disconnect();
        console.log('✅ Done! Marketplace seeded successfully.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding listings:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
};

marketplaceSeed();