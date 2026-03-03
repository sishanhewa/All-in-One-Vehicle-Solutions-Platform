/**
 * Seed Script — Authentic Sri Lankan Inspection Companies
 * Run: node seedInspectionCompanies.js
 * Uses robust MongoDB connection with DNS fallback for Windows/network issues
 */

const mongoose = require('mongoose');
const {setServers, resolveSrv, resolveTxt} = require('node:dns/promises');
const dotenv = require('dotenv');
dotenv.config();

const User = require('./models/User');
const InspectionPackage = require('./models/InspectionPackage');

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

const companies = [
    {
        name: 'Rajitha Perera',
        email: 'info@ceylonautocare.lk',
        password: 'ceylon123',
        phone: '+94112456789',
        companyProfile: {
            companyName: 'Ceylon AutoCare Inspections',
            description: 'Leading vehicle inspection service in Colombo with over 15 years of experience. We specialize in pre-purchase inspections, annual safety checks, and comprehensive vehicle health assessments. Our team of certified mechanics uses state-of-the-art diagnostic equipment to ensure your vehicle meets the highest safety and performance standards.',
            address: 'No. 127, Baseline Road, Borella, Colombo 08',
            city: 'Colombo',
            logo: '',
            operatingHours: 'Mon-Sat 8:00 AM - 6:00 PM',
            website: 'https://ceylonautocare.lk',
            rating: 4.7,
            totalReviews: 142,
            isVerified: true,
        },
        packages: [
            {
                name: 'Full Vehicle Inspection',
                description: 'Comprehensive 80-point inspection covering engine, transmission, brakes, suspension, electrical systems, body condition, and undercarriage. Includes detailed digital report with photos.',
                price: 12500,
                duration: 90,
                vehicleTypes: ['Car', 'SUV', 'Van'],
                checklistItems: ['Engine Performance', 'Transmission & Clutch', 'Brake System', 'Suspension & Steering', 'Electrical Systems', 'Battery & Charging', 'Exhaust System', 'Cooling System', 'AC & Heating', 'Exterior Body', 'Interior Condition', 'Tire Condition', 'Lights & Signals', 'Fluid Levels', 'Undercarriage'],
            },
            {
                name: 'Pre-Purchase Check',
                description: 'Essential inspection for buyers looking to purchase a used vehicle. Covers critical mechanical components, accident damage detection, and odometer verification.',
                price: 8500,
                duration: 60,
                vehicleTypes: ['Car', 'SUV', 'Van', 'Motorcycle'],
                checklistItems: ['Engine Health', 'Accident Damage Check', 'Odometer Verification', 'Brake Inspection', 'Tire & Wheel Check', 'Fluid Leaks', 'Electrical Basics', 'Body & Paint', 'Frame & Chassis', 'Test Drive Assessment'],
            },
            {
                name: 'Quick Safety Inspection',
                description: 'Fast 30-minute safety-focused inspection covering brakes, lights, tires, and essential safety components. Perfect for annual checks.',
                price: 3500,
                duration: 30,
                vehicleTypes: ['Car', 'SUV', 'Van', 'Motorcycle', 'Truck'],
                checklistItems: ['Brake Pads & Discs', 'Tire Tread & Pressure', 'All Lights & Signals', 'Horn', 'Windshield & Wipers', 'Mirrors', 'Seatbelts'],
            },
        ],
    },
    {
        name: 'Kamal Jayawardena',
        email: 'kamal@kandymotors.lk',
        password: 'kandy123',
        phone: '+94812234567',
        companyProfile: {
            companyName: 'Kandy Motors Inspection Centre',
            description: 'Trusted vehicle inspection centre serving the Central Province since 2012. Specializing in Japanese and European vehicle inspections with factory-trained technicians. RMV-approved inspection facility.',
            address: 'No. 45, Peradeniya Road, Kandy',
            city: 'Kandy',
            logo: '',
            operatingHours: 'Mon-Fri 8:30 AM - 5:30 PM, Sat 8:30 AM - 1:00 PM',
            website: '',
            rating: 4.5,
            totalReviews: 89,
            isVerified: true,
        },
        packages: [
            {
                name: 'Standard Vehicle Inspection',
                description: 'Complete 60-point vehicle inspection suitable for all makes and models. Covers mechanical, electrical, and safety systems with a detailed condition report.',
                price: 9500,
                duration: 75,
                vehicleTypes: ['Car', 'SUV', 'Van'],
                checklistItems: ['Engine & Motor', 'Gearbox & Clutch', 'Brake System', 'Suspension', 'Electrical Wiring', 'AC System', 'Radiator & Cooling', 'Exhaust', 'Body Panels', 'Interior', 'Tyres', 'Lights'],
            },
            {
                name: 'Motorcycle Inspection',
                description: 'Specialized inspection for motorcycles and scooters. Covers engine, chain/sprocket, brakes, electrical, and frame integrity.',
                price: 4000,
                duration: 40,
                vehicleTypes: ['Motorcycle'],
                checklistItems: ['Engine & Performance', 'Chain & Sprocket', 'Brake Pads & Discs', 'Wheel Bearings', 'Electrical System', 'Frame & Fork', 'Tire Condition', 'Lights & Horn'],
            },
            {
                name: 'Commercial Vehicle Check',
                description: 'Heavy-duty inspection for trucks, vans, and commercial vehicles. Includes load-bearing capacity assessment and regulatory compliance check.',
                price: 18000,
                duration: 120,
                vehicleTypes: ['Van', 'Truck'],
                checklistItems: ['Engine & Drivetrain', 'Brake System (Air/Hydraulic)', 'Suspension & Load Springs', 'Steering System', 'Electrical & Lighting', 'Exhaust Emissions', 'Chassis & Frame', 'Tire & Wheel Hubs', 'Safety Equipment', 'Cargo Area Condition'],
            },
        ],
    },
    {
        name: 'Nuwan Bandara',
        email: 'nuwan@autoexpertgampaha.lk',
        password: 'gampaha123',
        phone: '+94332267890',
        companyProfile: {
            companyName: 'AutoExpert Vehicle Diagnostics',
            description: 'Modern vehicle diagnostic and inspection centre equipped with the latest OBD-II scanning technology. Our computerized inspection process ensures accurate and unbiased vehicle assessments. Conveniently located near Gampaha town center.',
            address: 'No. 78, Colombo Road, Gampaha',
            city: 'Gampaha',
            logo: '',
            operatingHours: 'Mon-Sat 7:30 AM - 6:30 PM',
            website: 'https://autoexpertgampaha.lk',
            rating: 4.8,
            totalReviews: 203,
            isVerified: true,
        },
        packages: [
            {
                name: 'Premium Diagnostic Inspection',
                description: 'Our flagship service: comprehensive computerized diagnostic scan combined with physical inspection. Includes OBD-II fault code reading, live data analysis, and 100-point manual checklist. Best choice for high-value vehicles.',
                price: 15000,
                duration: 120,
                vehicleTypes: ['Car', 'SUV'],
                checklistItems: ['OBD-II Diagnostic Scan', 'Engine Performance Data', 'Transmission Diagnostics', 'ABS & Traction Control', 'Airbag System Check', 'Emission Levels', 'Brake System', 'Suspension & Steering', 'AC Performance Test', 'Battery Health Test', 'Alternator Output', 'Fluid Analysis', 'Body & Paint Meter', 'Undercarriage', 'Road Test'],
            },
            {
                name: 'Basic Health Check',
                description: 'Affordable basic vehicle health assessment covering essential mechanical and safety components. Ideal for regular maintenance checks.',
                price: 5000,
                duration: 45,
                vehicleTypes: ['Car', 'SUV', 'Van', 'Motorcycle'],
                checklistItems: ['Engine Condition', 'Brake Check', 'Tire Inspection', 'Fluid Levels', 'Battery Test', 'Lights & Signals', 'Wiper & Washer', 'AC Check'],
            },
            {
                name: 'Hybrid & Electric Vehicle Inspection',
                description: 'Specialized inspection for hybrid and electric vehicles including battery health assessment, regenerative braking check, and high-voltage system safety evaluation.',
                price: 20000,
                duration: 90,
                vehicleTypes: ['Car', 'SUV'],
                checklistItems: ['HV Battery Health & Capacity', 'Regenerative Braking', 'Electric Motor Performance', 'Inverter & Controller', 'Charging System', 'HV Cable Insulation', '12V Auxiliary Battery', 'Cooling System (HV)', 'Standard Brake System', 'Suspension', 'Tire Condition', 'Body & Safety'],
            },
        ],
    },
    {
        name: 'Dinesh Fernando',
        email: 'dinesh@galleautocheck.lk',
        password: 'galle123',
        phone: '+94912245678',
        companyProfile: {
            companyName: 'Galle AutoCheck Centre',
            description: 'Southern Province\'s premier vehicle inspection facility located on the Galle-Matara main road. Family-owned business with experienced mechanics who understand local driving conditions. Walk-in appointments welcome.',
            address: 'No. 210, Matara Road, Galle',
            city: 'Galle',
            logo: '',
            operatingHours: 'Mon-Sat 8:00 AM - 5:00 PM',
            website: '',
            rating: 4.3,
            totalReviews: 67,
            isVerified: true,
        },
        packages: [
            {
                name: 'Comprehensive Vehicle Inspection',
                description: 'Thorough 70-point inspection covering all major vehicle systems. Suitable for pre-purchase evaluation, insurance purposes, or annual safety verification.',
                price: 10000,
                duration: 80,
                vehicleTypes: ['Car', 'SUV', 'Van'],
                checklistItems: ['Engine & Performance', 'Transmission', 'Clutch System', 'Brake System', 'Suspension & Shocks', 'Steering', 'Exhaust System', 'Cooling System', 'AC System', 'Electrical', 'Body Condition', 'Interior', 'Tyres & Wheels', 'Undercarriage'],
            },
            {
                name: 'Three-Wheeler Inspection',
                description: 'Specialized inspection service for three-wheelers (tuk-tuks). Covers engine, brakes, body, lights, and passenger safety features.',
                price: 3000,
                duration: 30,
                vehicleTypes: ['Motorcycle'],
                checklistItems: ['Engine & 2-Stroke/4-Stroke System', 'Brake Inspection', 'Tire & Wheel', 'Lights & Horn', 'Meter & Wiring', 'Body & Passenger Safety', 'Exhaust & Emissions'],
            },
        ],
    },
    {
        name: 'Suresh Wijesinghe',
        email: 'suresh@lankaautoinspect.lk',
        password: 'kurunegala123',
        phone: '+94372234567',
        companyProfile: {
            companyName: 'Lanka Auto Inspect (Pvt) Ltd',
            description: 'ISO-certified vehicle inspection company serving the North Western Province. We offer insurance claim inspections, fleet maintenance assessments, and individual vehicle checks. Corporate partnerships available for dealerships and leasing companies.',
            address: 'No. 15, Negombo Road, Kurunegala',
            city: 'Kurunegala',
            logo: '',
            operatingHours: 'Mon-Fri 8:00 AM - 5:00 PM, Sat 8:00 AM - 12:00 PM',
            website: 'https://lankaautoinspect.lk',
            rating: 4.6,
            totalReviews: 118,
            isVerified: true,
        },
        packages: [
            {
                name: 'Insurance Claim Inspection',
                description: 'Detailed inspection report suitable for insurance claims. Includes damage assessment, estimated repair costs, and photographic evidence documentation.',
                price: 8000,
                duration: 60,
                vehicleTypes: ['Car', 'SUV', 'Van', 'Truck'],
                checklistItems: ['Damage Assessment', 'Structural Integrity', 'Paint & Body Analysis', 'Mechanical Impact', 'Electrical Damage', 'Safety System Status', 'Photo Documentation', 'Repair Cost Estimate'],
            },
            {
                name: 'Fleet Vehicle Inspection',
                description: 'Bulk inspection service for corporate fleets. Standardized inspection report for each vehicle with fleet-wide summary and maintenance recommendations.',
                price: 7500,
                duration: 50,
                vehicleTypes: ['Car', 'SUV', 'Van', 'Truck'],
                checklistItems: ['Engine Health', 'Transmission', 'Brake System', 'Tire Condition', 'Electrical Systems', 'Body & Paint', 'Interior Cleanliness', 'Safety Equipment', 'Fluid Levels', 'Overall Rating'],
            },
            {
                name: 'RMV Emission Test',
                description: 'Department of Motor Traffic approved emission testing for vehicle registration renewal. Quick and hassle-free process with certificate issuance.',
                price: 2500,
                duration: 20,
                vehicleTypes: ['Car', 'SUV', 'Van', 'Motorcycle', 'Truck'],
                checklistItems: ['CO Level Test', 'HC Level Test', 'Smoke Opacity Test', 'Idle Speed Check', 'Visual Exhaust Check'],
            },
        ],
    },
];

async function seed() {
    try {
        // ✅ Use robust connection with DNS fallback
        await connectDBRobust(process.env.MONGO_URI);
        console.log('🌱 Starting seed process...');

        const results = [];

        for (const company of companies) {
            // Check if already exists (skip duplicates)
            const existing = await User.findOne({email: company.email});
            if (existing) {
                console.log(`⏭️  Skipping ${company.companyProfile.companyName} — already exists`);
                results.push({
                    company: company.companyProfile.companyName,
                    email: company.email,
                    password: company.password,
                    status: 'ALREADY EXISTS'
                });
                continue;
            }

            // Create the company user (password will be hashed by User model pre-save hook)
            const user = await User.create({
                name: company.name,
                email: company.email,
                password: company.password,
                phone: company.phone,
                role: 'InspectionCompany',
                companyProfile: company.companyProfile,
            });

            console.log(`✅ Created: ${company.companyProfile.companyName} (${user._id})`);

            // Create their packages
            for (const pkg of company.packages) {
                await InspectionPackage.create({
                    companyId: user._id,
                    ...pkg,
                    isActive: true,
                });
                console.log(`   📦 Package: ${pkg.name} — Rs. ${pkg.price}`);
            }

            results.push({
                company: company.companyProfile.companyName,
                email: company.email,
                password: company.password,
                city: company.companyProfile.city,
                packages: company.packages.length,
                status: 'CREATED',
            });
        }

        console.log('\n' + '='.repeat(80));
        console.log('📋 INSPECTION COMPANY CREDENTIALS (for testing)');
        console.log('='.repeat(80));
        console.log('');
        results.forEach((r, i) => {
            console.log(`${i + 1}. ${r.company} (${r.city || ''})`);
            console.log(`   📧 Email:    ${r.email}`);
            console.log(`   🔑 Password: ${r.password}`);
            console.log(`   📦 Packages: ${r.packages || 'N/A'}`);
            console.log(`   Status:     ${r.status}`);
            console.log('');
        });

        await mongoose.disconnect();
        console.log('✅ Done! Database seeded successfully.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seed Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

seed();