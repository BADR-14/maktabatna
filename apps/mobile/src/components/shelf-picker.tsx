/** "Where is it?": pick a room, then a bookcase, then a shelf. Used when adding and moving books. */
import { toArabicDigits } from '@maktabatna/shared';
import { useLiveQuery } from '@/db/live';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Chip } from '@/components/book-browser';
import { AppText } from '@/components/text';
import { allShelvesQuery } from '@/db/queries';
import { scanForShelf } from '@/lib/scan';
import { fonts, radius, space, useColors } from '@/theme';

export function shelfLabel(kind: string, n: number) {
  return kind === 'top' ? 'أعلى المكتبة' : `الرف ${toArabicDigits(n)}`;
}

export function ShelfPicker({ value, onChange, allowScan }: { value: string | null; onChange: (shelfId: string) => void; /** Not inside a modal: the scanner opens as a screen. */ allowScan?: boolean }) {
  const c = useColors();
  const router = useRouter();
  const { data } = useLiveQuery(allShelvesQuery);
  const all = data ?? [];
  const current = all.find((s) => s.shelfId === value);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [bookcaseId, setBookcaseId] = useState<string | null>(null);
  const room = roomId ?? current?.roomId ?? null;
  const bookcase = bookcaseId ?? current?.bookcaseId ?? null;

  const rooms = [...new Map(all.map((s) => [s.roomId, s.roomName])).entries()];
  const bookcases = [...new Map(all.filter((s) => s.roomId === room).map((s) => [s.bookcaseId, s])).values()];
  // Real shelves from the top, then the surface on top of the bookcase.
  const shelves = all
    .filter((s) => s.bookcaseId === bookcase)
    .sort((a, b) => (a.kind === 'top' ? 1 : 0) - (b.kind === 'top' ? 1 : 0) || a.shelfNumber - b.shelfNumber);

  return (
    <View style={{ gap: space.md }}>
      {allowScan ? (
        <Pressable
          onPress={async () => {
            const id = await scanForShelf(router);
            if (!id) return;
            const s = all.find((x) => x.shelfId === id);
            setRoomId(s?.roomId ?? null);
            setBookcaseId(s?.bookcaseId ?? null);
            onChange(id);
          }}
          style={[styles.scan, { borderColor: c.accent }]}>
          <Ionicons name="qr-code-outline" size={18} color={c.accentText} />
          <AppText style={{ color: c.accentText, fontFamily: fonts.semibold }}>مسح رمز الرف</AppText>
        </Pressable>
      ) : null}
      <Step title="الغرفة">
        {rooms.map(([id, name]) => (
          <Chip
            key={id}
            label={name}
            on={room === id}
            onPress={() => {
              setRoomId(id);
              setBookcaseId(null);
            }}
          />
        ))}
      </Step>
      {room ? (
        <Step title="المكتبة">
          {bookcases.map((b) => (
            <Chip
              key={b.bookcaseId}
              label={`${b.bookcaseName} (${toArabicDigits(b.bookcaseNumber)})`}
              on={bookcase === b.bookcaseId}
              onPress={() => setBookcaseId(b.bookcaseId)}
            />
          ))}
        </Step>
      ) : null}
      {bookcase && bookcases.some((b) => b.bookcaseId === bookcase) ? (
        <Step title="الرف (من الأعلى)">
          {shelves.map((s) => (
            <Chip key={s.shelfId} label={shelfLabel(s.kind, s.shelfNumber)} on={value === s.shelfId} onPress={() => onChange(s.shelfId)} />
          ))}
        </Step>
      ) : null}
    </View>
  );
}

function Step({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <AppText variant="muted">{title}</AppText>
      <View style={styles.wrap}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  scan: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', borderWidth: 1, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: 8 },
});
