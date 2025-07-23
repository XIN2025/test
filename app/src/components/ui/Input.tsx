import React from "react";
import {
  TextInput,
  TextInputProps,
  View,
  Text,
  TouchableOpacity,
} from "react-native";
import { twMerge } from "tailwind-merge";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  secureTextEntry?: boolean;
  showPasswordToggle?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  className,
  secureTextEntry,
  showPasswordToggle,
  ...props
}) => {
  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <View className="w-full mb-4">
      {label && (
        <Text className="text-gray-700 font-medium mb-1 text-sm">{label}</Text>
      )}
      <View className="relative">
        <TextInput
          className={twMerge(
            "w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900",
            error ? "border-red-500" : "focus:border-blue-500",
            className
          )}
          placeholderTextColor="#9CA3AF"
          secureTextEntry={secureTextEntry && !showPassword}
          {...props}
        />
        {showPasswordToggle && (
          <TouchableOpacity
            className="absolute right-3 top-3"
            onPress={() => setShowPassword(!showPassword)}
          >
            <Text className="text-gray-600 text-sm">
              {showPassword ? "Hide" : "Show"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      {error && <Text className="text-red-500 text-sm mt-1">{error}</Text>}
    </View>
  );
};
