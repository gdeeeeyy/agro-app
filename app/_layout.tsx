// app/_layout.tsx
import { Tabs } from "expo-router";
import { UserProvider } from "../context/UserContext";

export default function TabLayout() {
  return (
    <UserProvider>
      <Tabs>
        <Tabs.Screen name="index" />
      </Tabs>
    </UserProvider>
  );
}
