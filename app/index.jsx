import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";

// Screens
import Login from "./components/Login";
import SignupScreen from "./components/SignupScreen";
import ForgotPassword from "./components/ForgotPassword";
import ResetPassword from "./components/ResetPassword";
import Home from "../app/screens/Home";
import Spaces from "./components/Spaces";
import Profile from "./components/Profile";
import PomodoroTimer from "./components/PomodoroTimer";
import TimeTracking from "./components/TimeTracking";
import CalendarView from "./components/CalendarView";
import Completed from "./components/Completed";
import Reminders from "./components/Reminders";
import Archived from "./components/Archived";
import Favorites from "./components/Favorites";
import Settings from "./components/Settings";
import HelpAndSupport from "./components/HelpAndSupport";

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
        <Stack.Screen name="ResetPassword" component={ResetPassword} />
        <Stack.Screen name="Home" component={Home} />
        <Stack.Screen name="Spaces" component={Spaces} />
        <Stack.Screen name="Profile" component={Profile} />
        <Stack.Screen name="PomodoroTimer" component={PomodoroTimer} />
        <Stack.Screen name="TimeTracking" component={TimeTracking} />
        <Stack.Screen name="CalendarView" component={CalendarView} />
        <Stack.Screen name="Completed" component={Completed} />
        <Stack.Screen name="Reminders" component={Reminders} />
        <Stack.Screen name="Archive" component={Archived} />
        <Stack.Screen name="Favorites" component={Favorites} />
        <Stack.Screen name="Settings" component={Settings} />
        <Stack.Screen name="Help&Support" component={HelpAndSupport} />
      </Stack.Navigator>
    </GestureHandlerRootView>
  );
}
