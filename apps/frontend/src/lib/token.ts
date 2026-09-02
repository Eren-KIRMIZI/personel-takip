// JWT erişim anahtarını auth store'dan bağımsız taşır (döngüsel bağımlılığı önler)
let accessToken: string | null = null;

export const tokenStore = {
  get(): string | null {
    return accessToken;
  },
  set(token: string | null) {
    accessToken = token;
  },
};