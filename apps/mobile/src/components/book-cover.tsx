/**
 * A book's front cover, drawn rather than photographed: cloth in the book's colour (the same one
 * its spine has in 3D), a gold-stamped frame, title and author, the way heritage editions look.
 * Arabic books bind on the right, so the spine strip is on the right edge. Once the family
 * photographs their own covers, a photo will take this one's place.
 */
import { LinearGradient } from 'expo-linear-gradient';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { coverLook } from '@/lib/spine';
import { fonts } from '@/theme';
import { formatArabicNumber } from '@maktabatna/shared';

export const COVER_RATIO = 1.42;

export const BookCover = memo(function BookCover({
  bookId,
  title,
  author,
  width,
  volumes,
}: {
  bookId: string;
  title: string;
  author?: string | null;
  width: number;
  volumes?: number;
}) {
  const look = coverLook(bookId);
  const height = Math.round(width * COVER_RATIO);
  const spine = Math.max(3, Math.round(width * 0.07));
  const pad = Math.max(3, Math.round(width * 0.085));
  const withText = width >= 70;
  const titleSize = Math.min(22, Math.max(11, width * 0.14));
  const ink = look.ink;
  // On the cartouche layout the text sits inside the gold plate, so it takes the cloth colour.
  const textInk = look.layout === 1 ? look.cloth : ink;

  const text = withText ? (
    <>
      <Text style={[styles.orn, { color: textInk, fontSize: titleSize * 0.8 }]}>۞</Text>
      <Text
        numberOfLines={3}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        style={[styles.title, { color: textInk, fontSize: titleSize, lineHeight: titleSize * 1.55 }]}>
        {title}
      </Text>
      {author ? (
        <Text numberOfLines={1} style={[styles.author, { color: textInk, fontSize: Math.max(8, titleSize * 0.52) }]}>
          {author}
        </Text>
      ) : null}
    </>
  ) : null;

  return (
    <View
      style={[
        styles.cover,
        {
          width,
          height,
          backgroundColor: look.cloth,
          borderRadius: Math.max(2, width * 0.03),
        },
      ]}>
      {/* Frame lines and ornaments are drawn left-to-right: physical sides, whatever the app direction. */}
      <View style={[StyleSheet.absoluteFill, { direction: 'ltr' }]}>
        {look.layout === 0 ? (
          <>
            <View
              style={[
                styles.frame,
                {
                  left: pad,
                  right: pad + spine,
                  top: pad,
                  bottom: pad,
                  borderColor: ink,
                },
              ]}
            />
            <View
              style={[
                styles.frame,
                {
                  left: pad + 3,
                  right: pad + spine + 3,
                  top: pad + 3,
                  bottom: pad + 3,
                  borderColor: ink,
                  borderWidth: 0.6,
                  opacity: 0.7,
                },
              ]}
            />
            {withText ? <Corners inset={pad} spine={spine} ink={ink} /> : null}
          </>
        ) : look.layout === 1 ? (
          <>
            <View
              style={[
                styles.frame,
                {
                  left: pad * 0.6,
                  right: pad * 0.6 + spine,
                  top: pad * 0.6,
                  bottom: pad * 0.6,
                  borderColor: ink,
                  borderWidth: 0.8,
                  opacity: 0.8,
                },
              ]}
            />
            <View
              style={[
                styles.cartouche,
                {
                  left: pad * 1.6,
                  right: pad * 1.6 + spine,
                  top: height * 0.16,
                  height: height * 0.68,
                  backgroundColor: ink,
                  borderRadius: width * 0.08,
                },
              ]}
            />
          </>
        ) : (
          <>
            {[0.13, 0.87].map((y) => (
              <View
                key={y}
                style={{
                  position: 'absolute',
                  left: 0,
                  right: spine,
                  top: height * y - 3,
                }}>
                <View style={[styles.band, { backgroundColor: ink }]} />
                <View
                  style={[
                    styles.band,
                    {
                      backgroundColor: ink,
                      marginTop: 2,
                      height: 0.8,
                      opacity: 0.8,
                    },
                  ]}
                />
              </View>
            ))}
          </>
        )}
        <View style={[styles.spine, { width: spine, backgroundColor: look.spine }]} />
        <View style={[styles.hinge, { right: spine }]} />
      </View>
      <LinearGradient
        colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0)', 'rgba(0,0,0,0.25)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {text ? (
        <View
          style={[
            styles.text,
            {
              paddingHorizontal: pad * 2.1,
              paddingRight: pad * 2.1 + spine / 2,
            },
          ]}>
          {text}
        </View>
      ) : null}
      {volumes && volumes > 1 && width >= 56 ? (
        <View style={[styles.vols, { backgroundColor: ink }]}>
          <Text style={[styles.volsText, { color: look.cloth }]}>{formatArabicNumber(volumes)} مج</Text>
        </View>
      ) : null}
    </View>
  );
});

function Corners({ inset, spine, ink }: { inset: number; spine: number; ink: string }) {
  const d = 7;
  const at = [
    { left: inset - d / 2, top: inset - d / 2 },
    { right: inset + spine - d / 2, top: inset - d / 2 },
    { left: inset - d / 2, bottom: inset - d / 2 },
    { right: inset + spine - d / 2, bottom: inset - d / 2 },
  ];
  return at.map((pos, i) => <View key={i} style={[styles.diamond, pos, { width: d, height: d, backgroundColor: ink }]} />);
}

const styles = StyleSheet.create({
  cover: {
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  frame: { position: 'absolute', borderWidth: 1.2, borderRadius: 2 },
  cartouche: { position: 'absolute' },
  band: { height: 2 },
  spine: { position: 'absolute', right: 0, top: 0, bottom: 0 },
  hinge: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  diamond: { position: 'absolute', transform: [{ rotate: '45deg' }] },
  text: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  orn: { fontFamily: fonts.display, opacity: 0.9 },
  title: { fontFamily: fonts.display, textAlign: 'center' },
  author: { fontFamily: fonts.medium, textAlign: 'center', opacity: 0.9 },
  vols: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    paddingHorizontal: 5,
    borderRadius: 4,
  },
  volsText: { fontFamily: fonts.semibold, fontSize: 9, lineHeight: 15 },
});
