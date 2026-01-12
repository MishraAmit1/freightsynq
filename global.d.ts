// src/global.d.ts
export {};

declare global {
  interface Window {
    recaptchaVerifier: any;
    confirmationResult: any;
    firebaseAuth: any;
    grecaptcha: any;
  }
}