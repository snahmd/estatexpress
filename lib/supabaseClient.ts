// supabase.ts

import { createClient } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { openAuthSessionAsync } from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native';

import * as AuthSession from 'expo-auth-session';
// Redirect URI'yi Expo üzerinden almak için:
const redirectUri = AuthSession.makeRedirectUri({
  useProxy: true,
  // Eğer standalone bir uygulama oluşturuyorsanız useProxy: false olarak ayarlayın ve kendi URI'nizi belirtin.
});

console.log("asff::::", redirectUri)

export const config = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  galleriesTable: process.env.EXPO_PUBLIC_SUPABASE_GALLERIES_TABLE,
  reviewsTable: process.env.EXPO_PUBLIC_SUPABASE_REVIEWS_TABLE,
  agentsTable: process.env.EXPO_PUBLIC_SUPABASE_AGENTS_TABLE,
  propertiesTable: process.env.EXPO_PUBLIC_SUPABASE_PROPERTIES_TABLE,
  bucketName: process.env.EXPO_PUBLIC_SUPABASE_BUCKET_NAME,
};

// Supabase yapılandırmasını kontrol et
export function checkSupabaseConfig() {
  console.log("Supabase Yapılandırma Kontrolü:");
  console.log("- EXPO_PUBLIC_SUPABASE_URL:", config.supabaseUrl || "Tanımlanmamış");
  console.log("- EXPO_PUBLIC_SUPABASE_ANON_KEY:", config.supabaseAnonKey ? "Tanımlanmış" : "Tanımlanmamış");
  
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    console.error("HATA: Supabase yapılandırması eksik. .env dosyasını kontrol edin.");
    return false;
  }
  
  return true;
}

// Supabase istemcisini oluştur
export const supabase = createClient(config.supabaseUrl!, config.supabaseAnonKey!, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  })

// Kullanıcının adından basit avatar (baş harfler) oluşturmak için yardımcı fonksiyon
export function getInitials(name: string): string {
  if (!name) return '';
  const names = name.split(' ');
  const initials = names.map((n) => n[0]).join('');
  return initials.toUpperCase();
}

/**
 * Google OAuth ile giriş yapma
 */
export async function login(): Promise<boolean> {
  try {
    console.log("Login işlemi başlatılıyor...");
    
    // Yapılandırmayı kontrol et
    if (!checkSupabaseConfig()) {
      return false;
    }
    
    // Redirect URL'i oluştur. (Expo için Linking.createURL kullanılır)
    const redirectUri = Linking.createURL('/');
    console.log("Redirect URI:", redirectUri);

    // OAuth ile giriş isteği: Bu adım, doğrulama URL'sini içerir.
    console.log("OAuth isteği gönderiliyor...");
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { 
        redirectTo: redirectUri,
        skipBrowserRedirect: true, // Tarayıcı yönlendirmesini atla
      },
    });

    if (error) {
      console.error("OAuth isteği hatası:", error);
      throw error;
    }
    
    if (!data.url) {
      console.error("OAuth URL oluşturulamadı");
      throw new Error('OAuth URL oluşturulamadı');
    }

    
    console.log("OAuth URL oluşturuldu:", data.url);

    // Alternatif 1: Expo WebBrowser kullan
    try {
      console.log("Tarayıcı oturumu açılıyor (Expo WebBrowser)...");
      const result = await openAuthSessionAsync(
        data.url,
        redirectUri,
        {
          showInRecents: true,
          preferEphemeralSession: true,
        }
      );
      console.log("Tarayıcı sonucu:", result.type);
      console.log("++++", result)
      
      if (result.type === 'success') {
        console.log("OAuth başarılı, oturum kontrol ediliyor...");
      } else {
        console.log("OAuth işlemi tamamlanmadı, yine de oturum kontrol ediliyor...");
      }
    } catch (browserError) {
      console.error("Expo WebBrowser hatası:", browserError);
      
      // Alternatif 2: Doğrudan cihazın tarayıcısını aç
      try {
        console.log("Cihazın varsayılan tarayıcısı açılıyor...");
        await Linking.openURL(data.url);
      } catch (linkingError) {
        console.error("URL açma hatası:", linkingError);
        throw linkingError;
      }
    }

    // Kısa bir bekleme süresi ekle
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Oturum bilgisini kontrol et
    console.log("Oturum bilgisi alınıyor...");
    const { data: session, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error("Oturum alma hatası:", sessionError);
      throw sessionError;
    }
    
    const hasSession = !!session.session;
    console.log("Oturum durumu:", hasSession ? "Oturum var" : "Oturum yok");
    
    return hasSession;
  } catch (error) {
    console.error("Login işlemi hatası:", error);
    return false;
  }
}

/**
 * Çıkış yapma işlemi
 */
export async function logout(): Promise<boolean> {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

/**
 * Geçerli kullanıcı bilgisini alma
 */
export async function getCurrentUser(): Promise<any | null> {
  try {
    // Önce oturumu kontrol et
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error("Oturum hatası:", sessionError);
      throw sessionError;
    }
    
    if (!sessionData.session) {
      console.log("Aktif oturum yok");
      return null;
    }
    
    // Oturum varsa kullanıcı bilgilerini al
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error("Kullanıcı bilgisi alma hatası:", error);
      throw error;
    }

    if (user) {
      // Kullanıcı metadata'sından (örneğin full_name) isim alınabiliyorsa avatar oluştur
      const fullName = user.user_metadata.full_name || user.email || '';
      const avatar = getInitials(fullName);
      console.log("Kullanıcı bilgileri alındı:", user.email);
      return { ...user, avatar };
    }
    
    console.log("Kullanıcı bulunamadı");
    return null;
  } catch (error) {
    console.error("getCurrentUser hatası:", error);
    return null;
  }
}

// URL yönlendirmelerini dinle
export function setupURLListener() {
  // URL yönlendirmelerini dinle
  const handleURL = async (event: { url: string }) => {
    console.log("URL yönlendirmesi alındı:", event.url);
    
    // Supabase'e URL'i işlemesi için gönder
    if (event.url) {
      try {
        // URL'den hash parametrelerini al
        const url = new URL(event.url);
        const hashParams = url.hash.substring(1).split('&').reduce((acc, param) => {
          const [key, value] = param.split('=');
          if (key && value) acc[key] = decodeURIComponent(value);
          return acc;
        }, {} as Record<string, string>);
        
        console.log("URL hash parametreleri:", hashParams);
        
        // Oturum bilgisini kontrol et
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error("Oturum alma hatası:", error);
        } else {
          console.log("Oturum durumu:", data.session ? "Oturum var" : "Oturum yok");
        }
      } catch (error) {
        console.error("URL işleme hatası:", error);
      }
    }
  };

  // Uygulama açıkken gelen URL'leri dinle
  const subscription = Linking.addEventListener('url', handleURL);

  // Uygulama kapalıyken açılan URL'i kontrol et
  Linking.getInitialURL().then((url) => {
    if (url) {
      console.log("Başlangıç URL'i:", url);
      handleURL({ url });
    }
  });

  return () => {
    subscription.remove();
  };
}