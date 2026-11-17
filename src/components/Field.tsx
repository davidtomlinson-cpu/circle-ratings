import { TextInput, type TextInputProps } from 'react-native';
import { c, color, font } from '../theme';

/** 52px pill input from the sign-up design. */
export function Field(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={color.n500}
      {...props}
      style={[
        {
          height: 52, borderRadius: 26, borderWidth: 2, borderColor: color.n700, backgroundColor: color.n800,
          paddingHorizontal: 18, color: c.text, fontFamily: font.regular, fontSize: 15,
        },
        { outlineWidth: 0 } as object,
        props.style,
      ]}
    />
  );
}
