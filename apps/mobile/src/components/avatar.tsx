import { useLiveQuery } from '@/db/live';
import { File, Paths } from 'expo-file-system';
import { Image, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/text';
import { userQuery } from '@/db/queries';
import { fonts } from '@/theme';

/** The avatar file is stored by name; the document folder's path can change between installs. */
export function avatarFileUri(name: string) {
  return new File(Paths.document, name).uri;
}

/** A person's photo, or the first letter of their name in a gold ring. */
export function Avatar({ userId, name, size = 46, ring = '#B98D45' }: { userId: string; name: string; size?: number; ring?: string }) {
  const { data } = useLiveQuery(userQuery(userId), [userId]);
  const file = data?.[0]?.avatarUri;
  return (
    <View style={[styles.base, { width: size, height: size, borderRadius: size / 2, borderColor: ring }]}>
      {file ? (
        <Image source={{ uri: avatarFileUri(file) }} style={{ width: size - 3, height: size - 3, borderRadius: (size - 3) / 2 }} />
      ) : (
        <AppText style={{ fontFamily: fonts.display, fontSize: size * 0.46, lineHeight: size * 0.72, color: ring }}>
          {(name || '؟').trim().charAt(0)}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
});
