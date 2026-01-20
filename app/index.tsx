import { Redirect } from 'expo-router';
import React, { useContext } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { UserContext } from '../context/UserContext';

export default function Index() {
  const { user, isLoading } = useContext(UserContext);

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#4caf50" />
      </View>
    );
  }

  return <Redirect href={user ? '/(tabs)' : '/auth/login'} />;
}
