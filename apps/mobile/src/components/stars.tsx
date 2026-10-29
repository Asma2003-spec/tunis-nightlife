import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

/** Note affichée en étoiles (arrondie à l'étoile la plus proche ; la valeur exacte est écrite à côté). */
export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  const rounded = Math.round(value);
  return (
    <View style={styles.row} accessibilityLabel={`${value} sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Text
          key={i}
          style={{ fontSize: size, color: rounded >= i ? colors.star : colors.surface2 }}
        >
          ★
        </Text>
      ))}
    </View>
  );
}

const LABELS = ['Touche une étoile', 'Décevant', 'Moyen', 'Bien', 'Très bien', 'Exceptionnel'];

/** Sélecteur de note : grandes zones tactiles, accessible au lecteur d'écran. */
export function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View>
      <View style={styles.row} accessibilityRole="radiogroup">
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable
            key={n}
            onPress={() => onChange(n)}
            hitSlop={6}
            accessibilityRole="radio"
            accessibilityState={{ checked: value === n }}
            accessibilityLabel={`${n} étoile${n > 1 ? 's' : ''}`}
            style={({ pressed }) => ({ transform: [{ scale: pressed ? 1.15 : 1 }], padding: 2 })}
          >
            <Text style={{ fontSize: 40, color: value >= n ? colors.star : colors.surface2 }}>
              ★
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.label}>{LABELS[value]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  label: { color: colors.muted, marginTop: 4 },
});
