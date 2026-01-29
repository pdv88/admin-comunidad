import { Drawer } from 'expo-router/drawer';
import { useColorScheme, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CustomDrawerContent from '../../components/CustomDrawerContent';
import { useNavigation } from 'expo-router';
import { useApp } from '../../context/AppContext';

export default function AppLayout() {
    const { isDarkMode } = useApp();

    return (
        <Drawer
            drawerContent={(props) => <CustomDrawerContent {...props} />}
            screenOptions={({ navigation }) => ({
                headerShown: true,
                headerStyle: {
                    backgroundColor: isDarkMode ? '#1e3a5f' : '#ffffff', // Dark gradient start color vs White
                    shadowColor: '#000',
                    shadowOpacity: 0.1,
                    shadowRadius: 3,
                    elevation: 3,
                },
                headerTintColor: isDarkMode ? '#ffffff' : '#111827',
                headerTitleStyle: {
                    fontWeight: 'bold',
                    fontSize: 20,
                },
                headerTransparent: false,
                drawerType: 'front',
                headerLeft: () => (
                    <TouchableOpacity
                        onPress={() => navigation.toggleDrawer()}
                        style={{ marginLeft: 16, marginRight: 16 }}
                    >
                        <Ionicons name="menu" size={28} color={isDarkMode ? '#ffffff' : '#111827'} />
                    </TouchableOpacity>
                ),
                drawerStyle: {
                    backgroundColor: 'transparent',
                    width: '80%',
                },
                overlayColor: 'rgba(0,0,0,0.5)',
            })}
        >
            <Drawer.Screen
                name="dashboard/index"
                options={{
                    drawerLabel: 'Dashboard',
                    title: 'Dashboard',
                }}
            />
            <Drawer.Screen
                name="notices/index"
                options={{
                    drawerLabel: 'Notices',
                    title: 'Notices',
                }}
            />
            <Drawer.Screen
                name="community/index"
                options={{
                    drawerLabel: 'Community',
                    title: 'Community',
                }}
            />
            {/* Other screens don't need explicit definitions if they are just routes, but Drawer will pick them up if existing files match. 
                For specific navigation, we rely on the CustomDrawer logic. 
                We can hide the 'menu' screen since it's now the drawer itself.
            */}
            <Drawer.Screen
                name="menu/index"
                options={{
                    drawerItemStyle: { display: 'none' }
                }}
            />
            <Drawer.Screen
                name="reports/index"
                options={{
                    drawerItemStyle: { display: 'none' },
                    headerShown: false
                }}
            />
            <Drawer.Screen
                name="voting/index"
                options={{
                    drawerLabel: 'Voting',
                    title: 'Voting',
                    headerShown: false
                }}
            />
            <Drawer.Screen
                name="reservations/index"
                options={{
                    drawerLabel: 'Reservations',
                    title: 'Reservations',
                    headerShown: false
                }}
            />
            <Drawer.Screen
                name="visitors/index"
                options={{
                    drawerItemStyle: { display: 'none' }
                }}
            />
        </Drawer>
    );
}
