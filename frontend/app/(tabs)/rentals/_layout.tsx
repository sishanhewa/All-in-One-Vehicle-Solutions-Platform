import { Stack } from 'expo-router';

export default function RentalsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Rental Vehicles' }} />
      <Stack.Screen name="[id]" options={{ title: 'Vehicle Details', headerBackTitle: 'Back' }} />
      <Stack.Screen name="book" options={{ title: 'Book Vehicle', presentation: 'form' }} />
    </Stack>
  );
}
