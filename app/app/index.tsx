import { Text, View, Button } from "react-native";
import { useRouter } from "expo-router";

export default function Index() {
  const router = useRouter();
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text>Edit app/index.tsx to edit this screen.</Text>
      <Button
        title="Login"
        onPress={() => router.push({ pathname: "./login" })}
      />
      <Button
        title="Register"
        onPress={() => router.push({ pathname: "./register" })}
      />
      <Button
        title="References"
        onPress={() => router.push({ pathname: "./references" })}
      />
    </View>
  );
}
