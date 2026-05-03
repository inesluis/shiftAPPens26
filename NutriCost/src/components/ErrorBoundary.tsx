import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { C, R } from '../theme';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // You could log the error to an error reporting service here
    console.error('ErrorBoundary caught an error', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={s.container}>
          <Text style={s.title}>Algo correu mal.</Text>
          <Text style={s.subtitle}>Tenta reiniciar a app.</Text>
          <TouchableOpacity 
            style={s.button}
            onPress={() => this.setState({ hasError: false })}
          >
            <Text style={s.buttonText}>Tentar Novamente</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

// Simple TouchableOpacity mock or import if needed
import { TouchableOpacity } from 'react-native';

const s = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: C.bg,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: C.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: C.textSub,
    marginBottom: 24,
    textAlign: 'center',
  },
  button: {
    backgroundColor: C.accent,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: R.md,
  },
  buttonText: {
    color: '#000',
    fontWeight: '600',
  },
});
