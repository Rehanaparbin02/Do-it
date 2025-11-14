import { createNativeStackNavigator } from "@react-navigation/native-stack";

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

const Stack = createNativeStackNavigator();

export default function App() {
  return (
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
          </Stack.Navigator>
  );
}

