import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { AuthProvider } from '../src/context/AuthContext';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false, presentation: 'modal' }} />
          <Stack.Screen name="register" options={{ headerShown: false, presentation: 'modal' }} />
          <Stack.Screen name="CreateListing" options={{ title: 'Post Free Ad' }} />
          <Stack.Screen name="ListingDetails" options={{ title: 'Vehicle Details' }} />
          <Stack.Screen name="ManageAds" options={{ title: 'Seller Dashboard' }} />
          <Stack.Screen name="SellerProfile" options={{ title: 'Seller Profile' }} />
          <Stack.Screen name="EditListing" options={{ title: 'Edit Listing' }} />
          <Stack.Screen name="CompanyDetails" options={{ title: 'Company Profile' }} />
          <Stack.Screen name="BookInspection" options={{ title: 'Book Inspection' }} />
          <Stack.Screen name="MyBookings" options={{ title: 'My Bookings' }} />
          <Stack.Screen name="BookingDetails" options={{ title: 'Booking Details' }} />
          <Stack.Screen name="CompanyDashboard" options={{ title: 'Company Dashboard' }} />
          <Stack.Screen name="ManagePackages" options={{ title: 'Manage Packages' }} />
          <Stack.Screen name="RecordInspection" options={{ title: 'Record Inspection' }} />
          <Stack.Screen name="CompanyRegister" options={{ title: 'Company Registration' }} />
          {/* Service & Repair Module Screens */}
          <Stack.Screen name="GarageDetails" options={{ headerShown: false, title: 'Garage Profile' }} />
          <Stack.Screen name="BookService" options={{ headerShown: false, title: 'Book Repair Service' }} />
          <Stack.Screen name="MyRepairs" options={{ title: 'My Repairs' }} />
          <Stack.Screen name="RepairDetail" options={{ headerShown: false, title: 'Repair Details' }} />
          <Stack.Screen name="LeaveReview" options={{ headerShown: false, title: 'Leave Review' }} />
          <Stack.Screen name="GarageRegister" options={{ headerShown: false, title: 'Register Garage' }} />
          <Stack.Screen name="BookingQueue" options={{ headerShown: false, title: 'Booking Queue' }} />
          <Stack.Screen name="ManageOfferings" options={{ title: 'Manage Services' }} />
          <Stack.Screen name="ManageMechanics" options={{ title: 'Manage Mechanics' }} />
          <Stack.Screen name="GarageProfile"   options={{ title: 'Garage Profile' }} />
          <Stack.Screen name="MechanicDashboard" options={{ headerShown: false, title: 'Mechanic Dashboard' }} />
          <Stack.Screen name="JobDetail" options={{ headerShown: false, title: 'Job Details' }} />
          <Stack.Screen name="RecordWork" options={{ headerShown: false, title: 'Record Work' }} />
          <Stack.Screen name="MechanicProfile" options={{ headerShown: false, title: 'My Profile' }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  );
}
