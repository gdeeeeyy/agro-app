import { Redirect } from 'expo-router';
import React, { useContext } from 'react';
import { UserContext } from '../context/UserContext';

export default function Index() {
  const { user } = useContext(UserContext);
  return <Redirect href={user ? '/(tabs)' : '/auth/login'} />;
}
