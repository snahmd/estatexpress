import { View, Text, ScrollView , Image, TouchableOpacity, Alert} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import React from 'react'
import images from '@/constants/images'
import icons from '@/constants/icons'
import { login } from '@/lib/supabaseClient'
import { useAuth } from '@/lib/auth-context'




const SignIn = () => {
    const {user, isLoading, error, signIn} = useAuth()

    const handleLogin = async () => {
        const result = await signIn()
        if(result){
            console.log("Login successful")
        }else {
            Alert.alert("Login failed")
        }
    }
  return (
    <SafeAreaView className="bg-white h-full">
        <ScrollView contentContainerClassName="h-full">
            <Image source={images.onboarding} className="w-full h-4/6" resizeMode="contain"  />
            <View className="px-10">
                <Text className="text-black-300 text-2xl font-rubik-bold text-center">Welcome to EstateXpress {"\n"}
                    <Text className="text-primary-300">Your Ideal Home</Text>
                </Text>
                
                <Text className="text-black-200  text-lg mt-12 font-rubik-medium text-center">Login to  EstateXpress  with Google </Text>
                <TouchableOpacity className="bg-primary-300 shadow-md shadow-zinc-300 rounded-full p-4 mt-10" onPress={handleLogin}>
                    <View className="flex-row items-center justify-center gap-2">
                        <Image source={icons.google} className="w-6 h-6" resizeMode="contain" />
                        <Text className="text-white text-lg font-rubik-medium text-center">Login with Google</Text>
                    </View>
                </TouchableOpacity>
                   
              
                
            </View>
        </ScrollView>
    </SafeAreaView>
  )
}

export default SignIn 