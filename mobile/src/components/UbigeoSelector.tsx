import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { useTheme } from '../theme';

interface Props {
  label: string;
  placeholder: string;
  value: string;
  onChange: (val: string) => void;
  opciones: string[];
  disabled?: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
}

export default function UbigeoSelector({
  label,
  placeholder,
  value,
  onChange,
  opciones,
  disabled = false,
  colors,
}: Props) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);

  const filtradas = query.length > 0
    ? opciones.filter((o) => {
        const q = query.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
        return o.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(q);
      })
    : opciones;

  const handleSelect = (opcion: string) => {
    setQuery(opcion);
    onChange(opcion);
    setOpen(false);
  };

  const handleChangeText = (text: string) => {
    setQuery(text);
    if (text !== value) onChange('');
    setOpen(true);
  };

  // Sincroniza el texto visible cuando value cambia desde afuera (e.g. reset)
  React.useEffect(() => {
    if (!value && query) setQuery('');
  }, [value]);

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>

      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: disabled ? colors.surfaceVariant : colors.surface,
            borderColor: open ? colors.primary : colors.border,
          },
        ]}
      >
        <TextInput
          style={[styles.input, { color: disabled ? colors.textDisabled : colors.text }]}
          value={query}
          onChangeText={handleChangeText}
          placeholder={disabled ? 'Selecciona el campo anterior primero' : placeholder}
          placeholderTextColor={colors.textDisabled}
          editable={!disabled}
          onFocus={() => { if (!disabled) setOpen(true); }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          autoCorrect={false}
          autoCapitalize="words"
        />
        {query.length > 0 && !disabled && (
          <TouchableOpacity
            onPress={() => { setQuery(''); onChange(''); setOpen(true); }}
            style={styles.clearBtn}
          >
            <Ionicons name="close-circle" size={16} color={colors.textDisabled} />
          </TouchableOpacity>
        )}
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={disabled ? colors.textDisabled : colors.textSecondary}
          style={{ marginRight: 10 }}
        />
      </View>

      {open && !disabled && filtradas.length > 0 && (
        <View
          style={[
            styles.dropdown,
            { backgroundColor: colors.surface, borderColor: colors.primary },
          ]}
        >
          <ScrollView
            keyboardShouldPersistTaps="always"
            nestedScrollEnabled
            style={{ maxHeight: 200 }}
          >
            {filtradas.slice(0, 8).map((item) => (
              <TouchableOpacity
                key={item}
                style={[
                  styles.option,
                  item === value && { backgroundColor: colors.primarySubtle },
                ]}
                onPress={() => handleSelect(item)}
              >
                <Text
                  style={[
                    styles.optionText,
                    { color: item === value ? colors.primary : colors.text },
                    item === value && { fontFamily: 'Montserrat-ExtraBold' },
                  ]}
                >
                  {item}
                </Text>
                {item === value && (
                  <Ionicons name="checkmark" size={14} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 4,
    zIndex: 10,
  },
  label: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    marginBottom: 6,
    marginTop: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  clearBtn: {
    padding: 6,
  },
  dropdown: {
    position: 'absolute',
    top: 78,
    left: 0,
    right: 0,
    borderWidth: 1.5,
    borderRadius: 10,
    zIndex: 999,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  optionText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
});
