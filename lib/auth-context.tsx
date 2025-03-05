import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, getCurrentUser, login, logout, checkSupabaseConfig, setupURLListener } from './supabaseClient';
import { useSupabase } from './useSupabase';
import { Alert, Platform } from 'react-native';

interface User {
    $id: string;
    email: string;
    name: string;
    avatar: string;
}

// Auth context için tip tanımlamaları
interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    error: string | null;
    signIn: () => Promise<boolean>;
    signOut: () => Promise<boolean>;
    refreshUser: () => Promise<void>;
}

// Context'i oluştur
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider bileşeni
export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [configChecked, setConfigChecked] = useState<boolean>(false);
    
    // URL yönlendirmelerini dinle
    useEffect(() => {
        console.log("URL dinleyicisi başlatılıyor...");
        const unsubscribe = setupURLListener();
        
        return () => {
            console.log("URL dinleyicisi durduruluyor...");
            unsubscribe();
        };
    }, []);
    
    // Supabase yapılandırmasını kontrol et
    useEffect(() => {
        const checkConfig = async () => {
            try {
                const isValid = checkSupabaseConfig();
                setConfigChecked(isValid);
                
                if (!isValid) {
                    setError('Supabase yapılandırması eksik veya hatalı');
                    Alert.alert(
                        'Yapılandırma Hatası',
                        'Supabase yapılandırması eksik veya hatalı. Lütfen .env dosyasını kontrol edin.'
                    );
                }
            } catch (err) {
                console.error('Yapılandırma kontrolü hatası:', err);
                setError('Yapılandırma kontrolü sırasında hata oluştu');
            }
        };
        
        checkConfig();
    }, []);
    
    // Kullanıcı oturumunu kontrol et
    const checkUser = async () => {
        console.log("*******")
        try {
            setIsLoading(true);
            setError(null);

            const { data: session } = await supabase.auth.getSession();
            
            if (!session || !session.session) {
                console.log("Oturum bulunamadı");
                setUser(null);
                setIsLoading(false);
                return;
            }
            
            const currentUser = await getCurrentUser();

            if (currentUser) {
                console.log("Kullanıcı bulundu:", currentUser.email);
                setUser({
                    $id: currentUser.id,
                    email: currentUser.email || '',
                    name: currentUser.user_metadata?.full_name || currentUser.email || '',
                    avatar: currentUser.avatar || '',
                });
            } else {
                console.log("Kullanıcı bulunamadı");
                setUser(null);
            }
        } catch (err) {
            console.error("Kullanıcı kontrolü hatası:", err);
            setError(err instanceof Error ? err.message : 'Kullanıcı bilgisi alınamadı');
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    };

    // Oturum değişikliklerini dinle
    useEffect(() => {
        checkUser();

        // Supabase auth değişikliklerini dinle
        const { data: authListener } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                    await checkUser();
                }
                if (event === 'SIGNED_OUT') {
                    setUser(null);
                }
            }
        );

        return () => {
            authListener?.subscription.unsubscribe();
        };
    }, []);

    // Giriş yapma fonksiyonu
    const signIn = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const success = await login();
            if (success) {
                await checkUser();
            }
            return success;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Giriş yapılamadı');
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    // Çıkış yapma fonksiyonu
    const signOut = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const success = await logout();
            if (success) {
                setUser(null);
            }
            return success;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Çıkış yapılamadı');
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    // Kullanıcı bilgilerini yenileme fonksiyonu
    const refreshUser = async () => {
        await checkUser();
    };

    // Context değerini oluştur
    const value = {
        user,
        isLoading,
        error,
        signIn,
        signOut,
        refreshUser,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

// useSupabase hook'unu kullanarak veri çekme örneği
export function useUserData() {
    const { user } = useAuth();

    const fetchUserData = async (params: { userId: string }) => {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', params.userId)
            .single();

        if (error) throw error;
        return data;
    };

    const {
        data: userData,
        loading,
        error,
        refetch
    } = useSupabase({
        fn: fetchUserData,
        params: { userId: user?.$id || '' },
        skip: !user
    });

    return { userData, loading, error, refetch };
}



