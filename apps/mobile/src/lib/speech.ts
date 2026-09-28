/**
 * Speech-to-text runs on Android's own recognizer (free; offline when the Arabic language pack
 * is downloaded). The native module exists only in the installed app, not in Expo Go.
 */
import Constants, { ExecutionEnvironment } from 'expo-constants';

export const speechAvailable = Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
