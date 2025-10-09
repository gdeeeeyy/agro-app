import { Redirect } from 'expo-router';
import React, { useContext } from 'react';
import { UserContext } from '../context/UserContext';

export default function Index() {
  const { user } = useContext(UserContext);

  if (user) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/auth/login" />;
}
