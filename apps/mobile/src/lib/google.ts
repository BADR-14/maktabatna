/**
 * "Sign in with Google". The native module exists only in the installed app (the APK), not in
 * Expo Go, so it is loaded lazily and the button is hidden in Expo Go. The server tells us the
 * OAuth client id (GET /auth/config), so enabling Google needs no new build (docs/GOOGLE_SIGN_IN.md).
 */
import Constants, { ExecutionEnvironment } from 'expo-constants';

import { api, ApiError } from '@/lib/api';

export const googleAvailable = Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

/** Opens Google's account picker; returns the ID token for the server, or null if cancelled. */
export async function pickGoogleAccount(): Promise<string | null> {
  const { googleWebClientId } = await api<{ googleWebClientId: string | null }>('/auth/config');
  if (!googleWebClientId) throw new ApiError('الدخول بحساب Google غير مفعّل على الخادم بعد.', 503);
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } = require('@react-native-google-signin/google-signin') as typeof import('@react-native-google-signin/google-signin');
  GoogleSignin.configure({ webClientId: googleWebClientId });
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    // Always show the account picker, so a shared phone can choose who signs in.
    await GoogleSignin.signOut().catch(() => {});
    const res = await GoogleSignin.signIn();
    if (!isSuccessResponse(res) || !res.data.idToken) return null;
    return res.data.idToken;
  } catch (e) {
    if (isErrorWithCode(e) && (e.code === statusCodes.SIGN_IN_CANCELLED || e.code === statusCodes.IN_PROGRESS)) return null;
    if (isErrorWithCode(e) && e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) throw new ApiError('خدمات Google Play غير متوفرة على هذا الهاتف.', 0);
    throw new ApiError('تعذّر الدخول بحساب Google. تأكد من الإعداد في docs/GOOGLE_SIGN_IN.md.', 0);
  }
}
