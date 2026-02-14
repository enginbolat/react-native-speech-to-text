import { useMemo } from 'react'
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  ViewStyle,
} from 'react-native'

type ButtonWithTextProps = {
  text: string
  onPress: () => void
  type: 'text' | 'primary' | 'locale'
  isActive?: boolean
}

type ButtonStyle = {
  container: StyleProp<ViewStyle>
  text: StyleProp<TextStyle>
}

const ButtonWithText = ({
  text,
  onPress,
  type,
  isActive = true,
}: ButtonWithTextProps) => {
  const calculatedButtonStyle: ButtonStyle = useMemo(() => {
    let textStyle: StyleProp<TextStyle> = [buttonWithTextStyle.buttonText]
    let viewStyle: StyleProp<ViewStyle> = [buttonWithTextStyle.button]

    if (type === 'primary') {
      viewStyle.push(buttonWithTextStyle.primaryButton)
      textStyle.push(buttonWithTextStyle.primaryButtonText)
    }

    if (type === 'locale') {
      viewStyle.push([
        buttonWithTextStyle.localeButton,
        isActive && buttonWithTextStyle.localeButtonActive,
      ])
      textStyle.push([
        buttonWithTextStyle.localeButtonText,
        isActive && buttonWithTextStyle.localeButtonTextActive,
      ])
    }

    return {
      container: viewStyle,
      text: textStyle,
    }
  }, [type, isActive])

  return (
    <Pressable style={calculatedButtonStyle.container} onPress={onPress}>
      <Text style={calculatedButtonStyle.text}>{text}</Text>
    </Pressable>
  )
}

export default ButtonWithText

const buttonWithTextStyle = StyleSheet.create({
  button: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#e0e0e0',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  primaryButton: {
    backgroundColor: '#0a7ea4',
  },
  primaryButtonText: {
    color: '#fff',
  },
  localeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
  },
  localeButtonActive: {
    backgroundColor: '#0a7ea4',
  },
  localeButtonText: {
    fontSize: 14,
    color: '#333',
  },
  localeButtonTextActive: {
    color: '#fff',
  },
})
