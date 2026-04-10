/**
 * Seed Script — Sri Lankan Garage Service Providers
 * Run: node seedServiceProviders.js
 * Uses robust MongoDB connection with DNS fallback for Windows/network issues
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { setServers, resolveSrv, resolveTxt } = require('node:dns/promises');
const dotenv = require('dotenv');
dotenv.config();

const User = require('./models/User');
const ServiceOffering = require('./models/ServiceOffering');

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

const garages = [
    {
        user: {
            name: 'Rohan Silva',
            email: 'rohan@cityauto.lk',
            password: 'Garage123',
            phone: '0112345678',
            role: 'GarageOwner',
        },
        profile: {
            garageName: 'City Auto Works',
            city: 'Colombo',
            description: 'Full-service garage specializing in Japanese vehicles',
            address: '12 Union Place, Colombo 02',
            operatingHours: 'Mon-Sat 8:00 AM - 6:00 PM',
            isVerified: true,
            isActive: true,
        },
        offerings: [
            { name: 'Engine Oil Change', description: 'Complete engine oil change with filter replacement and fluid top-up', category: 'Oil Change', estimatedPrice: 3500, estimatedDuration: 45, vehicleTypes: ['Car', 'SUV', 'Van'] },
            { name: 'Full Brake Service', description: 'Complete brake pad replacement, rotor inspection, and brake fluid top-up', category: 'Brakes', estimatedPrice: 9500, estimatedDuration: 90, vehicleTypes: ['Car', 'SUV'] },
            { name: 'AC Regas & Service', description: 'Air conditioning system regas, leak check, and full AC service', category: 'AC', estimatedPrice: 5500, estimatedDuration: 60, vehicleTypes: ['Car', 'SUV', 'Van'] },
        ],
        mechanics: [
            { name: 'Kasun Bandara', email: 'kasun@cityauto.lk', password: 'Mech123', phone: '0771234567', role: 'Mechanic' },
            { name: 'Pradeep Jayawardena', email: 'pradeep@cityauto.lk', password: 'Mech123', phone: '0772345678', role: 'Mechanic' },
        ],
    },
    {
        user: {
            name: 'Suresh Mendis',
            email: 'suresh@kandy.lk',
            password: 'Garage123',
            phone: '0812345678',
            role: 'GarageOwner',
        },
        profile: {
            garageName: 'Kandy Motors',
            city: 'Kandy',
            description: 'Trusted brake and suspension specialists since 2010',
            address: '78 Peradeniya Road, Kandy',
            operatingHours: 'Mon-Fri 8:30 AM - 5:30 PM, Sat 9:00 AM - 2:00 PM',
            isVerified: true,
            isActive: true,
        },
        offerings: [
            { name: 'Brake Pad Replacement', description: 'Professional brake pad replacement with high-quality parts', category: 'Brakes', estimatedPrice: 7500, estimatedDuration: 75, vehicleTypes: ['Car', 'SUV', 'Van', 'Truck'] },
            { name: 'Wheel Alignment', description: 'Precision wheel alignment using computerized equipment', category: 'Wheels', estimatedPrice: 2500, estimatedDuration: 30, vehicleTypes: ['Car', 'SUV'] },
            { name: 'Engine Diagnostics', description: 'Computerized engine diagnostics with fault code reading', category: 'Diagnostics', estimatedPrice: 2000, estimatedDuration: 60, vehicleTypes: ['Car', 'SUV', 'Van', 'Motorcycle'] },
        ],
        mechanics: [
            { name: 'Thilak Rajapaksa', email: 'thilak@kandy.lk', password: 'Mech123', phone: '0773456789', role: 'Mechanic' },
        ],
    },
    {
        user: {
            name: 'Amila Fernando',
            email: 'amila@galle.lk',
            password: 'Garage123',
            phone: '0912345678',
            role: 'GarageOwner',
        },
        profile: {
            garageName: 'Southern Auto Care',
            city: 'Galle',
            description: 'Multi-brand specialist for electrical and AC systems',
            address: '33 Lighthouse Street, Galle',
            operatingHours: 'Mon-Sat 7:30 AM - 5:00 PM',
            isVerified: true,
            isActive: true,
        },
        offerings: [
            { name: 'Electrical System Check', description: 'Complete electrical system diagnosis and repair', category: 'Electrical', estimatedPrice: 3000, estimatedDuration: 90, vehicleTypes: ['Car', 'SUV', 'Van'] },
            { name: 'Battery Replacement', description: 'Battery testing and replacement with genuine parts', category: 'Electrical', estimatedPrice: 8000, estimatedDuration: 30, vehicleTypes: ['Car', 'SUV', 'Van', 'Motorcycle'] },
            { name: 'Full Service Package', description: 'Comprehensive engine service including oil, filters, and tune-up', category: 'Engine', estimatedPrice: 15000, estimatedDuration: 180, vehicleTypes: ['Car', 'SUV'] },
        ],
        mechanics: [
            { name: 'Nuwan Wickramasinghe', email: 'nuwan@galle.lk', password: 'Mech123', phone: '0774567890', role: 'Mechanic' },
            { name: 'Dinesh Kumara', email: 'dinesh@galle.lk', password: 'Mech123', phone: '0775678901', role: 'Mechanic' },
        ],
    },
];

async function seed() {
    try {
        await connectDBRobust(process.env.MONGO_URI);
        console.log('🌱 Starting seed process...');

        // Collect all emails for cleanup
        const allEmails = [];
        garages.forEach((g) => {
            allEmails.push(g.user.email);
            g.mechanics.forEach((m) => allEmails.push(m.email));
        });

        // Delete existing seed data
        const existingGarages = await User.find({ email: { $in: allEmails }, role: 'GarageOwner' });
        const garageIds = existingGarages.map((g) => g._id);

        if (existingGarages.length > 0) {
            await User.deleteMany({ email: { $in: allEmails } });
            console.log(`🗑️  Deleted ${existingGarages.length} existing garage owners and their mechanics`);
        }

        if (garageIds.length > 0) {
            await ServiceOffering.deleteMany({ garageId: { $in: garageIds } });
            console.log(`🗑️  Deleted existing service offerings`);
        }

        let totalOfferings = 0;
        let totalMechanics = 0;
        const results = [];

        for (const garage of garages) {
            // Hash password for garage owner
            const hashedPassword = await bcrypt.hash(garage.user.password, 10);

            // Create garage owner
            const owner = await User.create({
                ...garage.user,
                password: hashedPassword,
                serviceProviderProfile: garage.profile,
            });

            console.log(`✅ Created: ${garage.profile.garageName} (${owner._id})`);

            // Create mechanics with hashed passwords and garageId
            for (const mech of garage.mechanics) {
                const hashedMechPassword = await bcrypt.hash(mech.password, 10);
                await User.create({
                    ...mech,
                    password: hashedMechPassword,
                    garageId: owner._id,
                });
                totalMechanics++;
                console.log(`   🔧 Mechanic: ${mech.name}`);
            }

            // Create service offerings with garageId
            for (const offering of garage.offerings) {
                await ServiceOffering.create({
                    garageId: owner._id,
                    ...offering,
                    isActive: true,
                });
                totalOfferings++;
                console.log(`   📦 Offering: ${offering.name} — Rs. ${offering.estimatedPrice}`);
            }

            results.push({
                garage: garage.profile.garageName,
                city: garage.profile.city,
                email: garage.user.email,
                password: garage.user.password,
                offerings: garage.offerings.length,
                mechanics: garage.mechanics.length,
            });
        }

        console.log('\n' + '='.repeat(80));
        console.log('📋 GARAGE CREDENTIALS (for testing)');
        console.log('='.repeat(80));
        console.log('');
        results.forEach((r, i) => {
            console.log(`${i + 1}. ${r.garage} (${r.city})`);
            console.log(`   📧 Email:    ${r.email}`);
            console.log(`   🔑 Password: ${r.password}`);
            console.log(`   📦 Offerings: ${r.offerings} | 🔧 Mechanics: ${r.mechanics}`);
            console.log('');
        });

        console.log(`✅ Seeded ${garages.length} garages, ${totalOfferings} offerings, ${totalMechanics} mechanics`);

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Seed Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

seed();
