import { useRouter, type Href } from 'expo-router';
import { Pressable, type PressableProps } from 'react-native';

/**
 * A Pressable that navigates. Used instead of `<Link asChild>`: Link's slot merges `style` into an
 * array, which silently drops a Pressable's `({ pressed }) => …` style function (no background, no
 * row layout). Here the style function reaches Pressable untouched.
 */
export function PressLink({ href, onPress, ...props }: PressableProps & { href: Href }) {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="link"
      {...props}
      onPress={(e) => {
        onPress?.(e);
        router.push(href);
      }}
    />
  );
}
