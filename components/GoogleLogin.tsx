// components/GoogleLogin.tsx
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect } from "react";
import { Button } from "react-native";

WebBrowser.maybeCompleteAuthSession();

interface GoogleLoginProps {
  onLoginSuccess: (user: any) => void;
}

export default function GoogleLogin({ onLoginSuccess }: GoogleLoginProps) {
  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: "<YOUR_EXPO_CLIENT_ID>",
    iosClientId: "<YOUR_IOS_CLIENT_ID>",
    androidClientId: "<YOUR_ANDROID_CLIENT_ID>",
    webClientId: "<YOUR_WEB_CLIENT_ID>",
  });

  useEffect(() => {
    if (response?.type === "success") {
      onLoginSuccess(response.authentication);
    }
  }, [response]);

  return (
    <Button
      title="Sign in with Google"
      onPress={() => promptAsync()}
      disabled={!request}
    />
  );
}
