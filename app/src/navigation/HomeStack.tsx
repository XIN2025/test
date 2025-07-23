import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import HomeScreen from "../screens/app/HomeScreen";
import DetailsScreen from "../screens/app/DetailsScreen";

const Stack = createStackNavigator();

const HomeStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="home"
        component={HomeScreen}
        options={{
          title: "Home",
        }}
      />
      <Stack.Screen
        name="details"
        component={DetailsScreen}
        options={{
          title: "Details",
        }}
      />
    </Stack.Navigator>
  );
};

export default HomeStack;
