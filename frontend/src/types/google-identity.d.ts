// Minimal surface of Google Identity Services (loaded at runtime from
// https://accounts.google.com/gsi/client) that this app actually calls.
// No official @types package exists for this script.
export {};

declare global {
  interface GoogleCredentialResponse {
    credential: string;
    select_by?: string;
  }

  interface GoogleIdConfiguration {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
  }

  interface GoogleButtonConfiguration {
    type?: "standard" | "icon";
    theme?: "outline" | "filled_blue" | "filled_black";
    size?: "large" | "medium" | "small";
    shape?: "rectangular" | "pill" | "circle" | "square";
    text?: "signin_with" | "signup_with" | "continue_with" | "signin";
    logo_alignment?: "left" | "center";
    width?: number;
  }

  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: GoogleIdConfiguration) => void;
          renderButton: (parent: HTMLElement, options: GoogleButtonConfiguration) => void;
          disableAutoSelect: () => void;
          prompt: () => void;
        };
      };
    };
  }
}
