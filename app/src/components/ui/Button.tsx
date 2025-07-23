import React from "react";
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  TouchableOpacityProps,
} from "react-native";
import { twMerge } from "tailwind-merge";

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  loading?: boolean;
  variant?: "primary" | "secondary" | "outline";
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  loading = false,
  variant = "primary",
  fullWidth = false,
  className,
  disabled,
  ...props
}) => {
  const baseStyles =
    "py-3 px-6 rounded-lg flex-row items-center justify-center";
  const variantStyles = {
    primary: "bg-blue-500 active:bg-blue-600",
    secondary: "bg-gray-500 active:bg-gray-600",
    outline: "border border-blue-500",
  };
  const textStyles = {
    primary: "text-white font-semibold",
    secondary: "text-white font-semibold",
    outline: "text-blue-500 font-semibold",
  };

  return (
    <TouchableOpacity
      className={twMerge(
        baseStyles,
        variantStyles[variant],
        fullWidth ? "w-full" : "w-auto",
        disabled ? "opacity-50" : "opacity-100",
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "outline" ? "#3B82F6" : "white"}
        />
      ) : (
        <Text className={textStyles[variant]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};
