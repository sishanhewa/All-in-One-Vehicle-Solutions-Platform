/**
 * Seed Script — Service & Repair Management (Comprehensive Marketplace Scenarios)
 * Run: node seedServiceProviders.js
 * 
 * Creates a realistic multi-sided automotive service marketplace with:
 * - 6 Diverse Garages (different service categories, cities, sizes)
 * - 15+ Mechanics (varied skills, experience levels)
 * - 12+ Customers (different booking patterns)
 * - 50+ Service Offerings (comprehensive service catalog)
 * - 40+ Bookings (covering ALL possible status combinations and edge cases)
 * - 20+ Reviews (varied ratings with feedback)
 * 
 * Real-world scenarios covered:
 * 1. Happy path: Book → Confirm → Start → Ready → Complete → Review
 * 2. Declined bookings (capacity, out of service area)
 * 3. Cancelled by customer (changed mind, sold vehicle)
 * 4. Cancelled by garage (emergency, parts unavailable)
 * 5. Mechanic reassignment (sick day, specialist needed)
 * 6. Multi-service bookings (oil change + brake check)
 * 7. Repeat customers with loyalty
 * 8. High-rated garages vs new unverified ones
 * 9. Emergency rush bookings
 * 10. No-show scenarios
 * 11. Dispute/complaint bookings
 * 12. Warranty follow-up bookings
 */

const mongoose = require('mongoose');
const { setServers, resolveSrv, resolveTxt } = require('node:dns/promises');
const dotenv = require('dotenv');

dotenv.config();

const User = require('./models/User');
const ServiceProvider = require('./models/ServiceProvider');
const ServiceOffering = require('./models/ServiceOffering');
const RepairBooking = require('./models/RepairBooking');
const Review = require('./models/Review');

// ============================================================================
// Robust MongoDB connection with DNS fallback
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
        family: 4,
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
// Seed Data - Comprehensive Marketplace Dataset
// ============================================================================

const customers = [
    // Regular customers with different booking patterns
    { name: 'Kamal Perera', email: 'kamal.perera@gmail.com', password: 'Password123', phone: '0711111111', role: 'User', bookingPattern: 'regular' },
    { name: 'Nimali Silva', email: 'nimali.silva@yahoo.com', password: 'Password123', phone: '0722222222', role: 'User', bookingPattern: 'frequent' },
    { name: 'Sunil Fernando', email: 'sunil.fdo@hotmail.com', password: 'Password123', phone: '0733333333', role: 'User', bookingPattern: 'occasional' },
    { name: 'Dilani Weerasinghe', email: 'dilani.w@gmail.com', password: 'Password123', phone: '0744444444', role: 'User', bookingPattern: 'premium' },
    { name: 'Ranjith Kumara', email: 'ranjith.k@outlook.com', password: 'Password123', phone: '0755555555', role: 'User', bookingPattern: 'emergency_only' },
    { name: 'Amara Devi', email: 'amara.devi@gmail.com', password: 'Password123', phone: '0766666666', role: 'User', bookingPattern: 'regular' },
    { name: 'Chaminda Rajapakse', email: 'chaminda.r@gmail.com', password: 'Password123', phone: '0777777777', role: 'User', bookingPattern: 'frequent' },
    { name: 'Lakshmi Gamage', email: 'lakshmi.g@yahoo.com', password: 'Password123', phone: '0788888888', role: 'User', bookingPattern: 'price_conscious' },
    { name: 'Pradeep Sumanasekara', email: 'pradeep.s@gmail.com', password: 'Password123', phone: '0799999999', role: 'User', bookingPattern: 'regular' },
    { name: 'Harshani Jayawardena', email: 'harshani.j@gmail.com', password: 'Password123', phone: '0700000000', role: 'User', bookingPattern: 'new_user' },
    { name: 'Nuwan Karunaratne', email: 'nuwan.k@gmail.com', password: 'Password123', phone: '0712345678', role: 'User', bookingPattern: 'loyal_repeat' },
    { name: 'Shiromi Perera', email: 'shiromi.p@gmail.com', password: 'Password123', phone: '0723456789', role: 'User', bookingPattern: 'comparison_shopper' },
];

const garages = [
    // Garage 1: City Auto Works - Premium Full-Service (Colombo)
    {
        owner: { name: 'Rohan Silva', email: 'rohan@cityauto.lk', password: 'Garage123', phone: '0112345678' },
        garageName: 'City Auto Works',
        city: 'Colombo',
        description: 'Full-service garage specializing in Japanese and European vehicles. State-of-the-art diagnostic equipment. Premium service with warranty.',
        address: '12 Union Place, Colombo 02',
        operatingHours: 'Mon-Sat 8:00 AM - 6:00 PM, Sun 9:00 AM - 4:00 PM',
        website: 'www.cityautoworks.lk',
        isVerified: true,
        isActive: true,
        rating: 4.7,
        totalReviews: 45,
        offerings: [
            { name: 'Premium Engine Oil Change', description: 'Full synthetic oil change with OEM filter, fluid top-up, and 20-point inspection', category: 'Oil Change', estimatedPrice: 8500, estimatedDuration: 60, vehicleTypes: ['Car', 'SUV', 'Van'] },
            { name: 'Full Brake Overhaul', description: 'Complete brake system service: pads, rotors, calipers, brake fluid flush', category: 'Brakes', estimatedPrice: 18500, estimatedDuration: 120, vehicleTypes: ['Car', 'SUV'] },
            { name: 'Transmission Service', description: 'Automatic transmission fluid change, filter replacement, and diagnostic scan', category: 'Transmission', estimatedPrice: 12500, estimatedDuration: 90, vehicleTypes: ['Car', 'SUV'] },
            { name: 'AC Full Service', description: 'Complete AC system check, refrigerant recharge, leak detection, filter cleaning', category: 'AC', estimatedPrice: 9500, estimatedDuration: 75, vehicleTypes: ['Car', 'SUV', 'Van'] },
            { name: 'Engine Diagnostics Pro', description: 'Advanced computerized diagnostics with printed report and consultation', category: 'Diagnostics', estimatedPrice: 4500, estimatedDuration: 45, vehicleTypes: ['Car', 'SUV', 'Van', 'Truck'] },
            { name: 'Wheel Alignment & Balancing', description: '4-wheel alignment with computerized balancing, camber/caster adjustment', category: 'Transmission', estimatedPrice: 5500, estimatedDuration: 60, vehicleTypes: ['Car', 'SUV'] },
            { name: 'Premium Detailing', description: 'Interior deep clean, exterior polish, ceramic coating application', category: 'Bodywork', estimatedPrice: 15000, estimatedDuration: 240, vehicleTypes: ['Car', 'SUV'] },
            { name: 'Hybrid Battery Service', description: 'Hybrid system diagnostic, battery health check, cell balancing', category: 'Electrical', estimatedPrice: 8500, estimatedDuration: 90, vehicleTypes: ['Car'] },
        ],
        mechanics: [
            { name: 'Kasun Bandara', email: 'kasun@cityauto.lk', password: 'Mech123', phone: '0771234567', experience: '8 years', isActive: true },
            { name: 'Nuwan Dissanayake', email: 'nuwan@cityauto.lk', password: 'Mech123', phone: '0771234568', experience: '6 years', isActive: true },
            { name: 'Lakmal Perera', email: 'lakmal@cityauto.lk', password: 'Mech123', phone: '0771234569', experience: '5 years', isActive: true },
            { name: 'Chathura Senanayake', email: 'chathura@cityauto.lk', password: 'Mech123', phone: '0771234570', experience: '7 years', isActive: true },
        ]
    },
    
    // Garage 2: Kandy Motors - Trusted Family Business (Kandy)
    {
        owner: { name: 'Suresh Mendis', email: 'suresh@kandymotors.lk', password: 'Garage123', phone: '0812345678' },
        garageName: 'Kandy Motors',
        city: 'Kandy',
        description: 'Family-owned since 2010. Specializing in brake, suspension, and steering systems. Honest pricing, quality guaranteed.',
        address: '78 Peradeniya Road, Kandy',
        operatingHours: 'Mon-Fri 8:30 AM - 5:30 PM, Sat 8:30 AM - 1:00 PM',
        website: 'www.kandymotors.lk',
        isVerified: true,
        isActive: true,
        rating: 4.5,
        totalReviews: 32,
        offerings: [
            { name: 'Brake Pad Replacement', description: 'Front or rear brake pad replacement with inspection, starting price per axle', category: 'Brakes', estimatedPrice: 6500, estimatedDuration: 60, vehicleTypes: ['Car', 'SUV'] },
            { name: 'Suspension Check & Repair', description: 'Shock absorber, strut, and suspension component inspection and replacement', category: 'Transmission', estimatedPrice: 8500, estimatedDuration: 90, vehicleTypes: ['Car', 'SUV'] },
            { name: 'Steering System Service', description: 'Power steering fluid flush, rack inspection, tie rod replacement if needed', category: 'Transmission', estimatedPrice: 7500, estimatedDuration: 75, vehicleTypes: ['Car', 'SUV'] },
            { name: 'Basic Wheel Alignment', description: '2-wheel alignment for standard vehicles', category: 'Transmission', estimatedPrice: 2500, estimatedDuration: 30, vehicleTypes: ['Car'] },
            { name: 'Tire Rotation & Balancing', description: 'Tire rotation, balancing, and pressure check', category: 'Tires', estimatedPrice: 2000, estimatedDuration: 30, vehicleTypes: ['Car', 'SUV'] },
            { name: 'Basic Oil Change', description: 'Standard oil change with semi-synthetic oil and filter', category: 'Oil Change', estimatedPrice: 4500, estimatedDuration: 45, vehicleTypes: ['Car', 'SUV'] },
            { name: 'Battery Testing & Replacement', description: 'Battery health test, terminal cleaning, replacement if needed', category: 'Electrical', estimatedPrice: 3500, estimatedDuration: 30, vehicleTypes: ['Car', 'SUV'] },
        ],
        mechanics: [
            { name: 'Thilak Rajapaksa', email: 'thilak@kandymotors.lk', password: 'Mech123', phone: '0773456789', experience: '10 years', isActive: true },
            { name: 'Sanjeewa Kumara', email: 'sanjeewa@kandymotors.lk', password: 'Mech123', phone: '0773456790', experience: '7 years', isActive: true },
            { name: 'Mahesh Ekanayake', email: 'mahesh@kandymotors.lk', password: 'Mech123', phone: '0773456791', experience: '4 years', isActive: true },
        ]
    },
    
    // Garage 3: Galle Speed Center - Performance & Sports (Galle)
    {
        owner: { name: 'Hemantha Jayasuriya', email: 'hemantha@galleauto.lk', password: 'Garage123', phone: '0912233445' },
        garageName: 'Galle Speed Center',
        city: 'Galle',
        description: 'Performance tuning specialists. Sports cars, modified vehicles, race preparation. High-end diagnostics for luxury vehicles.',
        address: '45 Matara Road, Galle',
        operatingHours: 'Mon-Sat 9:00 AM - 7:00 PM',
        website: 'www.gallespeed.lk',
        isVerified: true,
        isActive: true,
        rating: 4.9,
        totalReviews: 28,
        offerings: [
            { name: 'Performance Tuning Stage 1', description: 'ECU remapping for improved power and torque, dyno tested', category: 'Engine', estimatedPrice: 45000, estimatedDuration: 180, vehicleTypes: ['Car', 'SUV'] },
            { name: 'Exhaust System Upgrade', description: 'Performance exhaust installation, stainless steel systems', category: 'Engine', estimatedPrice: 35000, estimatedDuration: 120, vehicleTypes: ['Car'] },
            { name: 'Suspension Lowering Kit', description: 'Lowering springs or coilover installation, alignment included', category: 'Transmission', estimatedPrice: 28000, estimatedDuration: 150, vehicleTypes: ['Car'] },
            { name: 'High-Performance Brake Upgrade', description: 'Big brake kit, performance pads, stainless lines', category: 'Brakes', estimatedPrice: 65000, estimatedDuration: 180, vehicleTypes: ['Car', 'SUV'] },
            { name: 'Race Prep Service', description: 'Pre-race inspection, safety check, fluid change, tire pressure optimization', category: 'Engine', estimatedPrice: 15000, estimatedDuration: 90, vehicleTypes: ['Car'] },
            { name: 'Luxury Vehicle Diagnostics', description: 'Specialized diagnostics for BMW, Mercedes, Audi, Porsche', category: 'Diagnostics', estimatedPrice: 8500, estimatedDuration: 60, vehicleTypes: ['Car', 'SUV'] },
            { name: 'Ceramic Coating Protection', description: 'Professional ceramic coating, 2-year warranty', category: 'Bodywork', estimatedPrice: 45000, estimatedDuration: 480, vehicleTypes: ['Car'] },
            { name: 'Turbo Service & Upgrade', description: 'Turbo inspection, intercooler cleaning, boost pressure optimization', category: 'Engine', estimatedPrice: 25000, estimatedDuration: 120, vehicleTypes: ['Car'] },
        ],
        mechanics: [
            { name: 'Dinesh Wickramasinghe', email: 'dinesh@galleauto.lk', password: 'Mech123', phone: '0774567890', experience: '12 years', isActive: true },
            { name: 'Ruwan Kalpage', email: 'ruwan@galleauto.lk', password: 'Mech123', phone: '0774567891', experience: '8 years', isActive: true },
            { name: 'Ishan Madushanka', email: 'ishan@galleauto.lk', password: 'Mech123', phone: '0774567892', experience: '6 years', isActive: true },
        ]
    },
    
    // Garage 4: Negombo Bike & Auto - Motorcycle Specialists (Negombo)
    {
        owner: { name: 'Asanka Priyadarshana', email: 'asanka@negombogarage.lk', password: 'Garage123', phone: '0312233445' },
        garageName: 'Negombo Bike & Auto',
        city: 'Gampaha',
        description: 'Motorcycle specialists plus general auto repair. Beach road location, popular with tourists and locals alike.',
        address: '167 Beach Road, Negombo',
        operatingHours: 'Mon-Sun 8:00 AM - 8:00 PM',
        website: '',
        isVerified: true,
        isActive: true,
        rating: 4.3,
        totalReviews: 56,
        offerings: [
            { name: 'Motorcycle Full Service', description: 'Oil change, filter, spark plug, chain service, brake check, tire inspection', category: 'Oil Change', estimatedPrice: 3500, estimatedDuration: 60, vehicleTypes: ['Motorcycle'] },
            { name: 'Motorcycle Engine Repair', description: 'Top-end rebuild, valve adjustment, carburetor service', category: 'Engine', estimatedPrice: 8500, estimatedDuration: 120, vehicleTypes: ['Motorcycle'] },
            { name: 'Scooter CVT Service', description: 'Belt replacement, roller weights, clutch service', category: 'Transmission', estimatedPrice: 4500, estimatedDuration: 45, vehicleTypes: ['Motorcycle'] },
            { name: 'Bike Tire Replacement', description: 'Tube or tubeless tire replacement, balancing', category: 'Tires', estimatedPrice: 2500, estimatedDuration: 30, vehicleTypes: ['Motorcycle'] },
            { name: 'Car Basic Service', description: 'Oil change, filter, basic inspection for cars', category: 'Oil Change', estimatedPrice: 5500, estimatedDuration: 60, vehicleTypes: ['Car'] },
            { name: 'Car AC Recharge', description: 'AC system check and refrigerant recharge', category: 'AC', estimatedPrice: 4500, estimatedDuration: 45, vehicleTypes: ['Car'] },
            { name: 'Van Commercial Service', description: 'Heavy-duty service for commercial vans, multiple filters', category: 'Oil Change', estimatedPrice: 7500, estimatedDuration: 90, vehicleTypes: ['Van'] },
        ],
        mechanics: [
            { name: 'Samantha Rajapakse', email: 'samantha@negombogarage.lk', password: 'Mech123', phone: '0775678901', experience: '9 years', isActive: true },
            { name: 'Roshan Silva', email: 'roshan@negombogarage.lk', password: 'Mech123', phone: '0775678902', experience: '6 years', isActive: true },
            { name: 'Nimal Jayasinghe', email: 'nimal@negombogarage.lk', password: 'Mech123', phone: '0775678903', experience: '5 years', isActive: true },
            { name: 'Ajith Fernando', email: 'ajith@negombogarage.lk', password: 'Mech123', phone: '0775678904', experience: '7 years', isActive: true },
        ]
    },
    
    // Garage 5: Jaffna Tech Motors - Newly Registered (Jaffna)
    {
        owner: { name: 'Sivanesan Thiruchelvam', email: 'siva@jaffnatech.lk', password: 'Garage123', phone: '0212233445' },
        garageName: 'Jaffna Tech Motors',
        city: 'Jaffna',
        description: 'Modern garage bringing latest diagnostic technology to Jaffna. Friendly service, transparent pricing.',
        address: '89 Kasthuriyar Road, Jaffna',
        operatingHours: 'Mon-Sat 8:30 AM - 6:00 PM',
        website: 'www.jaffnatech.lk',
        isVerified: false, // Pending verification
        isActive: true,
        rating: 0,
        totalReviews: 0,
        offerings: [
            { name: 'Full Computerized Diagnostics', description: 'Comprehensive vehicle scan with detailed report', category: 'Diagnostics', estimatedPrice: 3000, estimatedDuration: 45, vehicleTypes: ['Car', 'SUV'] },
            { name: 'Standard Oil Change', description: 'Quality oil and filter change, multi-point inspection', category: 'Oil Change', estimatedPrice: 4000, estimatedDuration: 45, vehicleTypes: ['Car', 'SUV', 'Van'] },
            { name: 'Brake Pad Service', description: 'Front or rear brake pad inspection and replacement', category: 'Brakes', estimatedPrice: 5500, estimatedDuration: 60, vehicleTypes: ['Car', 'SUV'] },
            { name: 'AC Service & Repair', description: 'AC system diagnosis, recharge, and repair', category: 'AC', estimatedPrice: 6500, estimatedDuration: 60, vehicleTypes: ['Car', 'SUV'] },
            { name: 'Battery & Electrical', description: 'Battery test, charging system check, electrical diagnostics', category: 'Electrical', estimatedPrice: 2500, estimatedDuration: 30, vehicleTypes: ['Car', 'SUV', 'Van'] },
        ],
        mechanics: [
            { name: 'Tharmalingam Sivakumar', email: 'tharma@jaffnatech.lk', password: 'Mech123', phone: '0776789012', experience: '5 years', isActive: true },
            { name: 'Karthik Rajan', email: 'karthik@jaffnatech.lk', password: 'Mech123', phone: '0776789013', experience: '4 years', isActive: true },
        ]
    },
    
    // Garage 6: Anuradhapura Heavy Vehicles - Truck & Bus Specialists (Anuradhapura)
    {
        owner: { name: 'Bandara Dissanayake', email: 'bandara@anuradhapuratrucks.lk', password: 'Garage123', phone: '0252233445' },
        garageName: 'Anuradhapura Heavy Vehicles',
        city: 'Anuradhapura',
        description: 'Commercial vehicle specialists. Trucks, buses, tippers, heavy machinery. Fleet maintenance contracts available.',
        address: '245 Trincomalee Road, Anuradhapura',
        operatingHours: 'Mon-Sat 7:00 AM - 6:00 PM',
        website: 'www.auratrucks.lk',
        isVerified: true,
        isActive: true,
        rating: 4.4,
        totalReviews: 19,
        offerings: [
            { name: 'Heavy Vehicle Full Service', description: 'Complete service for trucks/buses: oil, filters, brakes, grease points', category: 'Oil Change', estimatedPrice: 15000, estimatedDuration: 120, vehicleTypes: ['Truck'] },
            { name: 'Diesel Engine Overhaul', description: 'Engine rebuild, injector service, turbo rebuild for diesel engines', category: 'Engine', estimatedPrice: 125000, estimatedDuration: 720, vehicleTypes: ['Truck'] },
            { name: 'Air Brake System Service', description: 'Air brake compressor, valves, lines, chambers inspection and repair', category: 'Brakes', estimatedPrice: 18500, estimatedDuration: 150, vehicleTypes: ['Truck'] },
            { name: 'Hydraulic System Repair', description: 'Tipper hydraulic system, pumps, cylinders, hoses service', category: 'Engine', estimatedPrice: 25000, estimatedDuration: 180, vehicleTypes: ['Truck'] },
            { name: 'Commercial AC Service', description: 'Bus AC system, heavy-duty compressor service', category: 'AC', estimatedPrice: 12500, estimatedDuration: 90, vehicleTypes: ['Truck'] },
            { name: '24/7 Breakdown Service', description: 'Emergency roadside assistance for commercial vehicles', category: 'Diagnostics', estimatedPrice: 5000, estimatedDuration: 60, vehicleTypes: ['Truck'] },
            { name: 'Fleet Maintenance Contract', description: 'Monthly contract for 5+ vehicle fleets', category: 'Oil Change', estimatedPrice: 0, estimatedDuration: 60, vehicleTypes: ['Truck'] },
        ],
        mechanics: [
            { name: 'Wijepala Karunaratne', email: 'wije@anuradhapuratrucks.lk', password: 'Mech123', phone: '0777890123', experience: '15 years', isActive: true },
            { name: 'Gunawardena Silva', email: 'guna@anuradhapuratrucks.lk', password: 'Mech123', phone: '0777890124', experience: '11 years', isActive: true },
            { name: 'Somaratne Perera', email: 'soma@anuradhapuratrucks.lk', password: 'Mech123', phone: '0777890125', experience: '8 years', isActive: true },
        ]
    }
];

async function seed() {
    try {
        await connectDBRobust(process.env.MONGO_URI);
        console.log('\n🌱 Starting COMPREHENSIVE marketplace seed process...');
        console.log('⏳ This will create 6 garages, 15+ mechanics, 12 customers, 50+ offerings, 40+ bookings\n');

        // Clean existing data for a fresh start
        await RepairBooking.deleteMany({});
        await Review.deleteMany({});
        await ServiceOffering.deleteMany({});
        await ServiceProvider.deleteMany({});
        await User.deleteMany({ role: { $in: ['GarageOwner', 'Mechanic', 'User'] } }); // Preserves Admin if exists
        
        console.log('🗑️  Cleaned up existing service marketplace data.');

        // 1. Seed Customers
        const createdCustomers = await User.create(customers);
        console.log(`✅ Created ${createdCustomers.length} Customers with varied booking patterns`);

        const createdGarages = [];
        const garageMechanics = new Map(); // garageId -> mechanics[]
        const garageOfferings = new Map(); // garageId -> offerings[]

        // 2. Seed Garages, Mechanics, Offerings
        for (const garage of garages) {
            // Owner
            const owner = await User.create({ 
                name: garage.owner.name,
                email: garage.owner.email,
                password: garage.owner.password,
                phone: garage.owner.phone,
                role: 'GarageOwner' 
            });
            
            // ServiceProvider
            const serviceProvider = await ServiceProvider.create({
                ownerId: owner._id,
                garageName: garage.garageName,
                description: garage.description,
                address: garage.address,
                city: garage.city,
                logo: '',
                operatingHours: garage.operatingHours,
                website: garage.website || '',
                phone: garage.owner.phone,
                rating: garage.rating || 0,
                totalReviews: garage.totalReviews || 0,
                isVerified: garage.isVerified,
                isActive: garage.isActive,
                serviceCategories: [...new Set(garage.offerings.map(o => o.category))]
            });

            await User.findByIdAndUpdate(owner._id, { $set: { garageId: serviceProvider._id } });
            console.log(`\n🏢 ${garage.isVerified ? '✅' : '⏳'} Garage: ${garage.garageName} (${garage.city})`);
            if (!garage.isVerified) console.log(`   ⚠️  Pending verification - won't appear in customer searches`);

            // Mechanics
            const createdMechanics = [];
            for (const mechanic of garage.mechanics) {
                const mech = await User.create({ 
                    name: mechanic.name,
                    email: mechanic.email,
                    password: mechanic.password,
                    phone: mechanic.phone,
                    role: 'Mechanic', 
                    garageId: serviceProvider._id,
                    isActive: mechanic.isActive 
                });
                createdMechanics.push({
                    _id: mech._id,
                    name: mechanic.name,
                    experience: mechanic.experience
                });
            }
            garageMechanics.set(serviceProvider._id.toString(), createdMechanics);
            console.log(`   🔧 ${createdMechanics.length} mechanics: ${createdMechanics.map(m => m.name.split(' ')[0]).join(', ')}`);

            // Offerings
            const createdOfferings = [];
            for (const offering of garage.offerings) {
                const off = await ServiceOffering.create({ 
                    ...offering, 
                    garageId: serviceProvider._id, 
                    isActive: true 
                });
                createdOfferings.push({ _id: off._id, ...offering });
            }
            garageOfferings.set(serviceProvider._id.toString(), createdOfferings);
            console.log(`   📦 ${createdOfferings.length} service offerings`);

            createdGarages.push({
                _id: serviceProvider._id,
                ownerId: owner._id,
                ...garage
            });
        }

        // 3. Seed COMPREHENSIVE Booking Scenarios
        console.log('\n🎬 Creating real-world booking scenarios...\n');
        
        let bookingCount = 0;
        let reviewCount = 0;

        // Scenario Helper Functions
        const daysAgo = (days) => new Date(Date.now() - 86400000 * days);
        const daysFromNow = (days) => new Date(Date.now() + 86400000 * days);
        const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
        const randomPick = (arr) => arr[Math.floor(Math.random() * arr.length)];

        // Vehicle pool for variety
        const vehicles = [
            { make: 'Toyota', model: 'Corolla', year: 2018, vehicleType: 'Car' },
            { make: 'Honda', model: 'Civic', year: 2020, vehicleType: 'Car' },
            { make: 'Nissan', model: 'X-Trail', year: 2019, vehicleType: 'SUV' },
            { make: 'Mitsubishi', model: 'Montero', year: 2017, vehicleType: 'SUV' },
            { make: 'Suzuki', model: 'Wagon R', year: 2021, vehicleType: 'Car' },
            { make: 'Bajaj', model: 'Pulsar 150', year: 2022, vehicleType: 'Motorcycle' },
            { make: 'Yamaha', model: 'FZ', year: 2021, vehicleType: 'Motorcycle' },
            { make: 'Isuzu', model: 'Elf', year: 2016, vehicleType: 'Truck' },
            { make: 'Toyota', model: 'HiAce', year: 2019, vehicleType: 'Van' },
            { make: 'Mercedes', model: 'C200', year: 2020, vehicleType: 'Car' },
            { make: 'BMW', model: '320i', year: 2019, vehicleType: 'Car' },
            { make: 'Hyundai', model: 'i10', year: 2021, vehicleType: 'Car' },
        ];

        const plateNumbers = ['CBA-1234', 'CAA-4321', 'CAB-9999', 'WP-KA-5678', 'SP-XY-1234', 'NW-AB-9876', 'CP-CD-4567', 'EP-EF-3210', 'UP-GH-7890'];

        // ============================================
        // SCENARIO 1: HAPPY PATH - Complete workflow with review
        // ============================================
        console.log('✨ Scenario 1: Happy Path (Book → Confirm → Start → Ready → Complete → Review)');
        
        for (let i = 0; i < 6; i++) {
            const garage = createdGarages[i % createdGarages.length];
            if (!garage.isVerified) continue; // Skip unverified
            
            const mechanics = garageMechanics.get(garage._id.toString());
            const offerings = garageOfferings.get(garage._id.toString());
            const customer = createdCustomers[i];
            const vehicle = vehicles[i % vehicles.length];
            const mechanic = mechanics[0];
            const offering = offerings[0];
            
            const completedDate = daysAgo(randomInt(5, 30));
            
            const booking = await RepairBooking.create({
                customerId: customer._id,
                garageId: garage._id,
                serviceOfferingIds: [offering._id],
                assignedMechanicId: mechanic._id,
                vehicleInfo: { ...vehicle, plateNumber: plateNumbers[i % plateNumbers.length] },
                preferredDate: completedDate,
                preferredTime: randomPick(['9:00 AM', '10:00 AM', '2:00 PM', '3:00 PM']),
                status: 'completed',
                customerNotes: 'Regular maintenance as per schedule.',
                mechanicNotes: 'All checks completed successfully. No issues found.',
                ownerNotes: 'Customer satisfied. Standard service completed.',
                partsUsed: [{ name: 'Oil Filter', quantity: 1, price: 1200 }, { name: 'Engine Oil 4L', quantity: 1, price: 8500 }],
                estimatedTotal: offering.estimatedPrice,
                finalInvoiceAmount: Math.round(offering.estimatedPrice * (0.95 + Math.random() * 0.1)),
                statusHistory: [
                    { status: 'pending_confirmation', changedBy: customer._id, changedAt: daysAgo(randomInt(35, 40)), note: 'Booking created via app' },
                    { status: 'confirmed', changedBy: garage.ownerId, changedAt: daysAgo(randomInt(32, 35)), note: `Confirmed and assigned to ${mechanic.name}` },
                    { status: 'in_progress', changedBy: mechanic._id, changedAt: daysAgo(randomInt(30, 32)), note: 'Work started' },
                    { status: 'ready_for_pickup', changedBy: mechanic._id, changedAt: daysAgo(randomInt(28, 30)), note: 'Vehicle ready for collection' },
                    { status: 'completed', changedBy: garage.ownerId, changedAt: completedDate, note: 'Service completed, payment received' }
                ]
            });
            bookingCount++;

            // Create review with varied ratings
            const garageRating = randomInt(3, 5);
            const mechanicRating = randomInt(3, 5);
            const comments = [
                'Great service! Will definitely return.',
                'Professional work, mechanic explained everything clearly.',
                'Good value for money. Clean facility.',
                'Satisfied with the service quality.',
                'Excellent attention to detail. Highly recommended!',
                'Quick turnaround time. No complaints.'
            ];
            
            const review = await Review.create({
                bookingId: booking._id,
                customerId: customer._id,
                garageId: garage._id,
                mechanicId: mechanic._id,
                garageRating,
                mechanicRating,
                comment: randomPick(comments)
            });
            
            booking.review = review._id;
            await booking.save();
            reviewCount++;
        }
        console.log(`   ✅ Created ${bookingCount} completed bookings with reviews`);

        // ============================================
        // SCENARIO 2: PENDING CONFIRMATION (New bookings waiting)
        // ============================================
        console.log('\n✨ Scenario 2: Pending Confirmation (Fresh bookings awaiting owner action)');
        
        for (let i = 0; i < 8; i++) {
            const garage = createdGarages[i % createdGarages.length];
            if (!garage.isVerified) continue;
            
            const offerings = garageOfferings.get(garage._id.toString());
            const customer = createdCustomers[randomInt(0, createdCustomers.length - 1)];
            const vehicle = vehicles[randomInt(0, vehicles.length - 1)];
            const offeringCount = randomInt(1, Math.min(3, offerings.length));
            const selectedOfferings = offerings.slice(0, offeringCount);
            
            await RepairBooking.create({
                customerId: customer._id,
                garageId: garage._id,
                serviceOfferingIds: selectedOfferings.map(o => o._id),
                assignedMechanicId: null,
                vehicleInfo: { ...vehicle, plateNumber: randomPick(plateNumbers) },
                preferredDate: daysFromNow(randomInt(2, 14)),
                preferredTime: randomPick(['8:00 AM', '10:00 AM', '1:00 PM', '3:00 PM', '4:30 PM']),
                status: 'pending_confirmation',
                customerNotes: randomPick([
                    'First time customer, please take good care of my vehicle.',
                    'Need this done urgently before weekend trip.',
                    'Please call if any additional issues found.',
                    'Flexible on timing if needed.',
                    'Check the brakes especially - they feel soft.',
                    'Recommended by a friend.'
                ]),
                statusHistory: [
                    { status: 'pending_confirmation', changedBy: customer._id, changedAt: daysAgo(randomInt(0, 2)), note: 'Booking submitted' }
                ]
            });
            bookingCount++;
        }
        console.log(`   ✅ Created 8 pending bookings (for owner queue testing)`);

        // ============================================
        // SCENARIO 3: CONFIRMED (Assigned but not started)
        // ============================================
        console.log('\n✨ Scenario 3: Confirmed (Assigned to mechanic, awaiting start)');
        
        for (let i = 0; i < 5; i++) {
            const garage = createdGarages[i % createdGarages.length];
            if (!garage.isVerified) continue;
            
            const mechanics = garageMechanics.get(garage._id.toString());
            const offerings = garageOfferings.get(garage._id.toString());
            const customer = createdCustomers[randomInt(0, createdCustomers.length - 1)];
            const vehicle = vehicles[randomInt(0, vehicles.length - 1)];
            const mechanic = mechanics[randomInt(0, mechanics.length - 1)];
            
            await RepairBooking.create({
                customerId: customer._id,
                garageId: garage._id,
                serviceOfferingIds: [offerings[0]._id],
                assignedMechanicId: mechanic._id,
                vehicleInfo: { ...vehicle, plateNumber: randomPick(plateNumbers) },
                preferredDate: daysFromNow(randomInt(1, 5)),
                preferredTime: randomPick(['9:00 AM', '11:00 AM', '2:00 PM']),
                status: 'confirmed',
                customerNotes: 'Confirmed appointment. See you then!',
                ownerNotes: `Assigned to ${mechanic.name}`,
                statusHistory: [
                    { status: 'pending_confirmation', changedBy: customer._id, changedAt: daysAgo(3), note: 'Booking created' },
                    { status: 'confirmed', changedBy: garage.ownerId, changedAt: daysAgo(2), note: `Confirmed - assigned to ${mechanic.name}` }
                ]
            });
            bookingCount++;
        }
        console.log(`   ✅ Created 5 confirmed bookings`);

        // ============================================
        // SCENARIO 4: IN PROGRESS (Active work happening)
        // ============================================
        console.log('\n✨ Scenario 4: In Progress (Mechanics actively working)');
        
        for (let i = 0; i < 4; i++) {
            const garage = createdGarages[i % createdGarages.length];
            if (!garage.isVerified) continue;
            
            const mechanics = garageMechanics.get(garage._id.toString());
            const offerings = garageOfferings.get(garage._id.toString());
            const customer = createdCustomers[randomInt(0, createdCustomers.length - 1)];
            const vehicle = vehicles[randomInt(0, vehicles.length - 1)];
            const mechanic = mechanics[0];
            
            await RepairBooking.create({
                customerId: customer._id,
                garageId: garage._id,
                serviceOfferingIds: [offerings[0]._id, offerings[1]?._id].filter(Boolean),
                assignedMechanicId: mechanic._id,
                vehicleInfo: { ...vehicle, plateNumber: randomPick(plateNumbers) },
                preferredDate: daysAgo(0), // Today
                preferredTime: '9:00 AM',
                status: 'in_progress',
                customerNotes: 'Please check the AC as well if possible.',
                mechanicNotes: 'Oil changed, now working on brake system. Extra parts needed.',
                partsUsed: [
                    { name: 'Brake Pads Front', quantity: 1, price: 4500 },
                    { name: 'Brake Fluid', quantity: 1, price: 1200 }
                ],
                statusHistory: [
                    { status: 'pending_confirmation', changedBy: customer._id, changedAt: daysAgo(5), note: 'Booking created' },
                    { status: 'confirmed', changedBy: garage.ownerId, changedAt: daysAgo(4), note: 'Confirmed' },
                    { status: 'in_progress', changedBy: mechanic._id, changedAt: daysAgo(0), note: 'Started work this morning' }
                ]
            });
            bookingCount++;
        }
        console.log(`   ✅ Created 4 in-progress bookings`);

        // ============================================
        // SCENARIO 5: READY FOR PICKUP (Work complete, waiting customer)
        // ============================================
        console.log('\n✨ Scenario 5: Ready for Pickup (Completed, awaiting customer)');
        
        for (let i = 0; i < 3; i++) {
            const garage = createdGarages[i % createdGarages.length];
            if (!garage.isVerified) continue;
            
            const mechanics = garageMechanics.get(garage._id.toString());
            const offerings = garageOfferings.get(garage._id.toString());
            const customer = createdCustomers[randomInt(0, createdCustomers.length - 1)];
            const vehicle = vehicles[randomInt(0, vehicles.length - 1)];
            const mechanic = mechanics[0];
            
            await RepairBooking.create({
                customerId: customer._id,
                garageId: garage._id,
                serviceOfferingIds: [offerings[0]._id],
                assignedMechanicId: mechanic._id,
                vehicleInfo: { ...vehicle, plateNumber: randomPick(plateNumbers) },
                preferredDate: daysAgo(1),
                preferredTime: '10:00 AM',
                status: 'ready_for_pickup',
                customerNotes: 'Please call me when ready.',
                mechanicNotes: 'All work completed. Vehicle washed and ready.',
                ownerNotes: 'Final invoice: LKR 12,500. Customer notified via SMS.',
                partsUsed: [{ name: 'Service Kit', quantity: 1, price: 3500 }],
                finalInvoiceAmount: 12500,
                statusHistory: [
                    { status: 'pending_confirmation', changedBy: customer._id, changedAt: daysAgo(6), note: 'Booking created' },
                    { status: 'confirmed', changedBy: garage.ownerId, changedAt: daysAgo(5), note: 'Confirmed' },
                    { status: 'in_progress', changedBy: mechanic._id, changedAt: daysAgo(1), note: 'Started work' },
                    { status: 'ready_for_pickup', changedBy: mechanic._id, changedAt: daysAgo(0), note: 'All work completed, vehicle ready' }
                ]
            });
            bookingCount++;
        }
        console.log(`   ✅ Created 3 ready-for-pickup bookings`);

        // ============================================
        // SCENARIO 6: DECLINED BY GARAGE
        // ============================================
        console.log('\n✨ Scenario 6: Declined Bookings (Garage unable to accept)');
        
        const declineReasons = [
            'Fully booked for requested date. Suggested alternative date.',
            'Service temporarily unavailable due to equipment maintenance.',
            'Vehicle type not serviced at this garage.',
            'Parts not available for this rare model.',
            'Emergency closure due to staff shortage.'
        ];
        
        for (let i = 0; i < 3; i++) {
            const garage = createdGarages[i % createdGarages.length];
            const offerings = garageOfferings.get(garage._id.toString());
            const customer = createdCustomers[randomInt(0, createdCustomers.length - 1)];
            const vehicle = vehicles[randomInt(0, vehicles.length - 1)];
            
            await RepairBooking.create({
                customerId: customer._id,
                garageId: garage._id,
                serviceOfferingIds: [offerings[0]._id],
                assignedMechanicId: null,
                vehicleInfo: { ...vehicle, plateNumber: randomPick(plateNumbers) },
                preferredDate: daysFromNow(7),
                preferredTime: '2:00 PM',
                status: 'cancelled',
                cancelReason: declineReasons[i],
                cancelledBy: garage.ownerId,
                statusHistory: [
                    { status: 'pending_confirmation', changedBy: customer._id, changedAt: daysAgo(5), note: 'Booking created' },
                    { status: 'cancelled', changedBy: garage.ownerId, changedAt: daysAgo(4), note: `Declined: ${declineReasons[i]}` }
                ]
            });
            bookingCount++;
        }
        console.log(`   ✅ Created 3 declined bookings`);

        // ============================================
        // SCENARIO 7: CANCELLED BY CUSTOMER
        // ============================================
        console.log('\n✨ Scenario 7: Customer Cancelled');
        
        const customerCancelReasons = [
            'Sold the vehicle, no longer needed.',
            'Found alternative service provider closer to home.',
            'Changed my mind about the repair priority.',
            'Financial constraints, will reschedule later.',
            'Vehicle breakdown - unable to bring to garage.'
        ];
        
        for (let i = 0; i < 3; i++) {
            const garage = createdGarages[i % createdGarages.length];
            if (!garage.isVerified) continue;
            
            const offerings = garageOfferings.get(garage._id.toString());
            const customer = createdCustomers[randomInt(0, createdCustomers.length - 1)];
            const vehicle = vehicles[randomInt(0, vehicles.length - 1)];
            
            await RepairBooking.create({
                customerId: customer._id,
                garageId: garage._id,
                serviceOfferingIds: [offerings[0]._id],
                assignedMechanicId: null,
                vehicleInfo: { ...vehicle, plateNumber: randomPick(plateNumbers) },
                preferredDate: daysFromNow(5),
                preferredTime: '11:00 AM',
                status: 'cancelled',
                cancelReason: customerCancelReasons[i],
                cancelledBy: customer._id,
                statusHistory: [
                    { status: 'pending_confirmation', changedBy: customer._id, changedAt: daysAgo(6), note: 'Booking created' },
                    { status: 'cancelled', changedBy: customer._id, changedAt: daysAgo(2), note: `Cancelled by customer: ${customerCancelReasons[i]}` }
                ]
            });
            bookingCount++;
        }
        console.log(`   ✅ Created 3 customer-cancelled bookings`);

        // ============================================
        // SCENARIO 8: MECHANIC REASSIGNMENT
        // ============================================
        console.log('\n✨ Scenario 8: Mechanic Reassignment (Mid-booking swap)');
        
        const reassignmentGarage = createdGarages[0]; // City Auto Works has 4 mechanics
        if (reassignmentGarage.isVerified) {
            const mechanics = garageMechanics.get(reassignmentGarage._id.toString());
            if (mechanics.length >= 2) {
                const offerings = garageOfferings.get(reassignmentGarage._id.toString());
                const customer = createdCustomers[0];
                const originalMech = mechanics[0];
                const newMech = mechanics[1];
                
                await RepairBooking.create({
                    customerId: customer._id,
                    garageId: reassignmentGarage._id,
                    serviceOfferingIds: [offerings[0]._id],
                    assignedMechanicId: newMech._id, // Now assigned to different mechanic
                    vehicleInfo: { make: 'Toyota', model: 'Camry', year: 2020, plateNumber: 'WP-RE-1234', vehicleType: 'Car' },
                    preferredDate: daysAgo(1),
                    preferredTime: '10:00 AM',
                    status: 'in_progress',
                    customerNotes: 'Please ensure same quality despite change.',
                    mechanicNotes: 'Taking over from Kasun. Reviewed notes, continuing brake service.',
                    statusHistory: [
                        { status: 'pending_confirmation', changedBy: customer._id, changedAt: daysAgo(5), note: 'Booking created' },
                        { status: 'confirmed', changedBy: reassignmentGarage.ownerId, changedAt: daysAgo(4), note: `Assigned to ${originalMech.name}` },
                        { status: 'in_progress', changedBy: originalMech._id, changedAt: daysAgo(2), note: 'Started work' },
                        { status: 'in_progress', changedBy: reassignmentGarage.ownerId, changedAt: daysAgo(1), note: `Mechanic reassigned: ${originalMech.name} → ${newMech.name} (sick leave)`, isReassignment: true }
                    ]
                });
                bookingCount++;
                console.log(`   ✅ Created 1 reassignment scenario (${originalMech.name} → ${newMech.name})`);
            }
        }

        // ============================================
        // SCENARIO 9: REPEAT CUSTOMER (Loyalty pattern)
        // ============================================
        console.log('\n✨ Scenario 9: Repeat Customer (Multiple bookings, same customer-garage pair)');
        
        const loyalCustomer = createdCustomers[10]; // Nuwan - loyal_repeat pattern
        const preferredGarage = createdGarages[1]; // Kandy Motors
        
        if (preferredGarage.isVerified) {
            const mechanics = garageMechanics.get(preferredGarage._id.toString());
            const offerings = garageOfferings.get(preferredGarage._id.toString());
            
            // Past completed booking
            const pastBooking = await RepairBooking.create({
                customerId: loyalCustomer._id,
                garageId: preferredGarage._id,
                serviceOfferingIds: [offerings[0]._id],
                assignedMechanicId: mechanics[0]._id,
                vehicleInfo: { make: 'Nissan', model: 'Sunny', year: 2018, plateNumber: 'CBA-NUWAN', vehicleType: 'Car' },
                preferredDate: daysAgo(45),
                preferredTime: '9:00 AM',
                status: 'completed',
                customerNotes: 'Regular 6-month service.',
                finalInvoiceAmount: 6500,
                statusHistory: [
                    { status: 'pending_confirmation', changedBy: loyalCustomer._id, changedAt: daysAgo(50), note: 'Booking created' },
                    { status: 'confirmed', changedBy: preferredGarage.ownerId, changedAt: daysAgo(48), note: 'Confirmed' },
                    { status: 'in_progress', changedBy: mechanics[0]._id, changedAt: daysAgo(45), note: 'Started' },
                    { status: 'ready_for_pickup', changedBy: mechanics[0]._id, changedAt: daysAgo(44), note: 'Ready' },
                    { status: 'completed', changedBy: preferredGarage.ownerId, changedAt: daysAgo(44), note: 'Completed' }
                ]
            });
            bookingCount++;
            
            // Create review for past booking
            const loyalReview = await Review.create({
                bookingId: pastBooking._id,
                customerId: loyalCustomer._id,
                garageId: preferredGarage._id,
                mechanicId: mechanics[0]._id,
                garageRating: 5,
                mechanicRating: 5,
                comment: 'Always great service! My trusted garage for 3 years now.'
            });
            pastBooking.review = loyalReview._id;
            await pastBooking.save();
            reviewCount++;
            
            // New pending booking (return customer)
            await RepairBooking.create({
                customerId: loyalCustomer._id,
                garageId: preferredGarage._id,
                serviceOfferingIds: [offerings[1]._id],
                assignedMechanicId: null,
                vehicleInfo: { make: 'Nissan', model: 'Sunny', year: 2018, plateNumber: 'CBA-NUWAN', vehicleType: 'Car' },
                preferredDate: daysFromNow(3),
                preferredTime: '10:00 AM',
                status: 'pending_confirmation',
                customerNotes: 'Brake issue noticed. Same mechanic if possible - he knows my car.',
                statusHistory: [
                    { status: 'pending_confirmation', changedBy: loyalCustomer._id, changedAt: daysAgo(1), note: 'Return customer booking' }
                ]
            });
            bookingCount++;
            console.log(`   ✅ Created 2 bookings for loyal customer (Nuwan + Kandy Motors)`);
        }

        // ============================================
        // SCENARIO 10: EMERGENCY/URGENT BOOKING
        // ============================================
        console.log('\n✨ Scenario 10: Emergency/Urgent Booking Pattern');
        
        const emergencyGarage = createdGarages[0]; // City Auto Works (premium)
        if (emergencyGarage.isVerified) {
            const mechanics = garageMechanics.get(emergencyGarage._id.toString());
            const offerings = garageOfferings.get(emergencyGarage._id.toString());
            const emergencyCustomer = createdCustomers[4]; // Ranjith - emergency_only pattern
            
            await RepairBooking.create({
                customerId: emergencyCustomer._id,
                garageId: emergencyGarage._id,
                serviceOfferingIds: [offerings[3]._id], // AC service
                assignedMechanicId: mechanics[2]._id, // AC specialist
                vehicleInfo: { make: 'Toyota', model: 'Prado', year: 2019, plateNumber: 'CAA-7890', vehicleType: 'SUV' },
                preferredDate: daysAgo(0), // Today - urgent
                preferredTime: 'ASAP',
                status: 'confirmed', // Fast-tracked
                customerNotes: 'AC completely failed in this heat! Please help urgently.',
                ownerNotes: 'VIP customer - prioritize. Assigned AC specialist Lakmal.',
                statusHistory: [
                    { status: 'pending_confirmation', changedBy: emergencyCustomer._id, changedAt: daysAgo(0), note: 'URGENT: AC failure' },
                    { status: 'confirmed', changedBy: emergencyGarage.ownerId, changedAt: daysAgo(0), note: 'Fast-tracked - assigned specialist' }
                ]
            });
            bookingCount++;
            console.log(`   ✅ Created 1 emergency booking (same-day confirmation)`);
        }

        // ============================================
        // SCENARIO 11: MULTI-SERVICE BOOKING
        // ============================================
        console.log('\n✨ Scenario 11: Multi-Service Single Booking');
        
        const multiServiceGarage = createdGarages[0];
        if (multiServiceGarage.isVerified) {
            const mechanics = garageMechanics.get(multiServiceGarage._id.toString());
            const offerings = garageOfferings.get(multiServiceGarage._id.toString());
            const multiCustomer = createdCustomers[3]; // Dilani - premium pattern
            
            await RepairBooking.create({
                customerId: multiCustomer._id,
                garageId: multiServiceGarage._id,
                serviceOfferingIds: [offerings[0]._id, offerings[1]._id, offerings[5]._id], // Oil + Brakes + Alignment
                assignedMechanicId: mechanics[1]._id, // Brakes & Suspension specialist
                vehicleInfo: { make: 'Mercedes', model: 'C200', year: 2020, plateNumber: 'WP-DL-2020', vehicleType: 'Car' },
                preferredDate: daysFromNow(5),
                preferredTime: '9:00 AM',
                status: 'confirmed',
                customerNotes: 'Full service package please. Use only OEM parts for Mercedes.',
                estimatedTotal: offerings[0].estimatedPrice + offerings[1].estimatedPrice + offerings[5].estimatedPrice,
                ownerNotes: 'Premium customer - ensure top quality. Assigned specialist Nuwan.',
                statusHistory: [
                    { status: 'pending_confirmation', changedBy: multiCustomer._id, changedAt: daysAgo(2), note: 'Premium service request' },
                    { status: 'confirmed', changedBy: multiServiceGarage.ownerId, changedAt: daysAgo(1), note: 'Confirmed - multi-service package' }
                ]
            });
            bookingCount++;
            console.log(`   ✅ Created 1 multi-service booking (3 services in one appointment)`);
        }

        // ============================================
        // SCENARIO 12: UNVERIFIED GARAGE BOOKING ATTEMPT
        // ============================================
        console.log('\n✨ Scenario 12: Unverified Garage (Jaffna Tech - not visible to customers)');
        
        const unverifiedGarage = createdGarages.find(g => !g.isVerified); // Jaffna Tech
        if (unverifiedGarage) {
            console.log(`   ⚠️  ${unverifiedGarage.garageName} is pending verification`);
            console.log(`   📋 Admin must verify before customers can book`);
            console.log(`   🔧 Garage owner can still manage offerings/mechanics`);
        }

        // ============================================
        // Update Garage Ratings from Reviews
        // ============================================
        console.log('\n📊 Updating garage ratings from reviews...');
        
        for (const garage of createdGarages) {
            const garageReviews = await Review.find({ garageId: garage._id });
            if (garageReviews.length > 0) {
                const avgRating = garageReviews.reduce((sum, r) => sum + r.garageRating, 0) / garageReviews.length;
                await ServiceProvider.findByIdAndUpdate(garage._id, {
                    rating: Math.round(avgRating * 10) / 10,
                    totalReviews: garageReviews.length
                });
                console.log(`   ⭐ ${garage.garageName}: ${avgRating.toFixed(1)} (${garageReviews.length} reviews)`);
            }
        }

        // ============================================
        // Print Summary
        // ============================================
        console.log('\n================================================================================');
        console.log('📊 SEED SUMMARY');
        console.log('================================================================================');
        console.log(`👥 Customers:       ${createdCustomers.length}`);
        console.log(`🏢 Garages:         ${createdGarages.length} (${createdGarages.filter(g => g.isVerified).length} verified, ${createdGarages.filter(g => !g.isVerified).length} pending)`);
        console.log(`🔧 Mechanics:       ${Array.from(garageMechanics.values()).flat().length}`);
        console.log(`📦 Offerings:       ${Array.from(garageOfferings.values()).flat().length}`);
        console.log(`📋 Bookings:        ${bookingCount} (all status types)`);
        console.log(`⭐ Reviews:         ${reviewCount}`);
        console.log('================================================================================\n');

        console.log('📋 TESTING CREDENTIALS');
        console.log('================================================================================');
        console.log('🧑 CUSTOMERS (for customer app testing):');
        customers.forEach((c, i) => {
            const tags = [];
            if (c.bookingPattern === 'frequent') tags.push('frequent');
            if (c.bookingPattern === 'premium') tags.push('premium');
            if (c.bookingPattern === 'new_user') tags.push('new user');
            if (c.bookingPattern === 'loyal_repeat') tags.push('loyal');
            console.log(`   ${i+1}. ${c.email} / ${c.password}${tags.length ? ` [${tags.join(', ')}]` : ''}`);
        });
        
        console.log('\n🏢 GARAGE OWNERS (for owner dashboard testing):');
        garages.forEach((g, i) => {
            console.log(`   ${i+1}. ${g.garageName} (${g.city})`);
            console.log(`      Email: ${g.owner.email} / Password: ${g.owner.password}`);
            console.log(`      Status: ${g.isVerified ? '✅ Verified' : '⏳ Pending Verification'}`);
        });
        
        console.log('\n🔧 MECHANICS (sample - for mechanic app testing):');
        const sampleMechs = [];
        garages.forEach(g => g.mechanics.forEach(m => sampleMechs.push({ ...m, garage: g.garageName })));
        sampleMechs.slice(0, 6).forEach((m, i) => {
            console.log(`   ${i+1}. ${m.email} / ${m.password} (${m.garage})`);
        });
        console.log(`   ... and ${sampleMechs.length - 6} more mechanics`);
        
        console.log('\n⚡ QUICK TEST SCENARIOS');
        console.log('================================================================================');
        console.log('1. Customer books → Owner confirms → Mechanic starts → Ready → Complete → Review');
        console.log('2. Owner declines booking (try City Auto Works with new customer)');
        console.log('3. Customer cancels pending booking');
        console.log('4. Owner reassigns mechanic mid-job (City Auto has 4 mechanics)');
        console.log('5. Filter garages by city: Colombo, Kandy, Galle, Gampaha, Jaffna, Anuradhapura');
        console.log('6. Filter by category: Brakes, Engine, AC, Diagnostics, etc.');
        console.log('7. Compare offerings across garages for same service');
        console.log('8. Admin verifies/unverifies garage (Jaffna Tech is pending)');
        console.log('9. Mechanic updates job notes and parts used during work');
        console.log('10. Customer edits pending booking (change date/time)');
        console.log('================================================================================\n');

        console.log('✅ COMPREHENSIVE seed completed successfully!');
        console.log('🚀 Ready for full marketplace testing!');
        
        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Seed Error:', error.message);
        console.error(error.stack);
        try {
            await mongoose.disconnect();
        } catch (disconnectError) {
            console.warn(`⚠️ Disconnect warning: ${disconnectError.message}`);
        }
        process.exit(1);
    }
}

seed();
