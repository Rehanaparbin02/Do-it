import { createNativeStackNavigator } from "@react-navigation/native-stack";

// Screens
import Login from "./components/Login";
import SignupScreen from "./components/SignupScreen";
import ForgotPassword from "./components/ForgotPassword";
import ResetPassword from "./components/ResetPassword";
import Home from "./components/Home";
import Profile from "./components/Profile";
import PomodoroTimer from "./components/PomodoroTimer";

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
            <Stack.Screen name="Profile" component={Profile} />
            <Stack.Screen name="PomodoroTimer" component={PomodoroTimer} />
          </Stack.Navigator>
  );
}

