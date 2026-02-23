import { Platform } from 'react-native';

// Storage wrapper that works on both web and mobile
class Storage {
  private webStorage: typeof localStorage | null = null;
  private nativeStorage: any = null;
  private initialized = false;

  private async init() {
    if (this.initialized) return;
    
    if (Platform.OS === 'web') {
      // Use localStorage on web
      if (typeof window !== 'undefined' && window.localStorage) {
        this.webStorage = window.localStorage;
      }
    } else {
      // Use AsyncStorage on native
      try {
        const AsyncStorage = await import('@react-native-async-storage/async-storage');
        this.nativeStorage = AsyncStorage.default;
      } catch (e) {
        console.warn('AsyncStorage not available:', e);
      }
    }
    this.initialized = true;
  }

  async getItem(key: string): Promise<string | null> {
    await this.init();
    
    if (Platform.OS === 'web') {
      try {
        return this.webStorage?.getItem(key) ?? null;
      } catch (e) {
        console.error('Web storage getItem error:', e);
        return null;
      }
    } else {
      try {
        return this.nativeStorage ? await this.nativeStorage.getItem(key) : null;
      } catch (e) {
        console.error('Native storage getItem error:', e);
        return null;
      }
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    await this.init();
    
    if (Platform.OS === 'web') {
      try {
        this.webStorage?.setItem(key, value);
      } catch (e) {
        console.error('Web storage setItem error:', e);
      }
    } else {
      try {
        if (this.nativeStorage) {
          await this.nativeStorage.setItem(key, value);
        }
      } catch (e) {
        console.error('Native storage setItem error:', e);
      }
    }
  }

  async removeItem(key: string): Promise<void> {
    await this.init();
    
    if (Platform.OS === 'web') {
      try {
        this.webStorage?.removeItem(key);
      } catch (e) {
        console.error('Web storage removeItem error:', e);
      }
    } else {
      try {
        if (this.nativeStorage) {
          await this.nativeStorage.removeItem(key);
        }
      } catch (e) {
        console.error('Native storage removeItem error:', e);
      }
    }
  }
}

const storage = new Storage();
export default storage;
