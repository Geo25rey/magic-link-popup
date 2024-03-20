import { Magic } from "magic-sdk";
import {
  OAuthProvider,
  OAuthExtension,
  OAuthRedirectResult,
} from "@magic-ext/oauth";

export const NOT_INITIALIZED_ERROR = new Error("Magic SDK not initialized.");

const LOCAL_STORAGE_PREFIX = "magic-link-improved-";
const LOGIN_COMPLETE_KEY = `${LOCAL_STORAGE_PREFIX}login-complete`;
const LOGIN_RESULT_KEY = `${LOCAL_STORAGE_PREFIX}login-result`;
const LOGIN_OPTIONS_KEY = `${LOCAL_STORAGE_PREFIX}login-options`;

export type LoginOptions =
  | { type: "email-OTP" | "magic-link"; email: string }
  | { type: "sms"; phoneNumber: string }
  | { type: "oauth"; provider: OAuthProvider };

export type LoginResult =
  | { success: false; error: string }
  | { success: true; extra?: OAuthRedirectResult | string };

export type InitOptions = {
  loginPopup: {
    width(loginOptions: LoginOptions): number;
    height(loginOptions: LoginOptions): number;
    left(loginOptions: LoginOptions, width: number): number;
    top(loginOptions: LoginOptions, height: number): number;
  };
};

const {
  init: realInit,
  getMagic,
  getLoadingRoute,
  getLoginPopupOptions,
} = (() => {
  let magic: Magic<[OAuthExtension]>;
  let cLoadingRoute: string;
  let loginPopupOptions: InitOptions["loginPopup"];
  return {
    init(
      magicApiKey: string,
      loadingRoute: string,
      { loginPopup }: InitOptions
    ) {
      magic = new Magic(magicApiKey, {
        extensions: [new OAuthExtension()],
      });
      cLoadingRoute = loadingRoute;
      loginPopupOptions = loginPopup;
    },
    getMagic() {
      if (!magic) {
        throw NOT_INITIALIZED_ERROR;
      }
      return magic;
    },
    getLoadingRoute() {
      if (!cLoadingRoute) {
        throw NOT_INITIALIZED_ERROR;
      }
      return cLoadingRoute;
    },
    getLoginPopupOptions() {
      if (!loginPopupOptions) {
        throw NOT_INITIALIZED_ERROR;
      }
      return loginPopupOptions;
    },
  };
})();

function close() {
  console.log("should close");
  window.close();
}

async function handleLoginRouteLoaded() {
  if (window.location.pathname !== getLoadingRoute()) {
    return;
  }
  const provider = new URLSearchParams(window.location.search).get("provider");
  if (provider) {
    const magic = getMagic();
    const result = await magic.oauth.getRedirectResult();
    const loginResult: LoginResult = { success: true, extra: result };
    localStorage.setItem(LOGIN_RESULT_KEY, JSON.stringify(loginResult));
    localStorage.setItem(LOGIN_COMPLETE_KEY, "true");
    close();
  } else {
    try {
      const magic = getMagic();
      const rawLoginOptions = localStorage.getItem(LOGIN_OPTIONS_KEY);
      if (!rawLoginOptions) {
        throw new Error("No login options found.");
      }
      const loginOptions: LoginOptions = JSON.parse(rawLoginOptions);
      switch (loginOptions.type) {
        case "magic-link":
          const magicRes = await magic.auth.loginWithMagicLink({
            email: loginOptions.email,
          });
          const magicLoginResult: LoginResult = magicRes
            ? { success: true, extra: magicRes }
            : { success: false, error: "Login failed" };
          localStorage.setItem(
            LOGIN_RESULT_KEY,
            JSON.stringify(magicLoginResult)
          );
          localStorage.setItem(LOGIN_COMPLETE_KEY, "true");
          close();
          break;
        case "email-OTP":
          const emailRes = await magic.auth.loginWithEmailOTP({
            email: loginOptions.email,
          });
          const emailLoginResult: LoginResult = emailRes
            ? { success: true, extra: emailRes }
            : { success: false, error: "Login failed" };
          localStorage.setItem(
            LOGIN_RESULT_KEY,
            JSON.stringify(emailLoginResult)
          );
          localStorage.setItem(LOGIN_COMPLETE_KEY, "true");
          close();
          break;
        case "sms":
          const smsRes = await magic.auth.loginWithSMS({
            phoneNumber: loginOptions.phoneNumber,
          });
          const smsLoginResult: LoginResult = smsRes
            ? { success: true, extra: smsRes }
            : { success: false, error: "Login failed" };
          localStorage.setItem(
            LOGIN_RESULT_KEY,
            JSON.stringify(smsLoginResult)
          );
          localStorage.setItem(LOGIN_COMPLETE_KEY, "true");
          close();
          break;
        case "oauth":
          await magic.oauth.loginWithRedirect({
            provider: loginOptions.provider,
            redirectURI: window.location.href,
          });
          break;
      }
    } catch (e) {
      const err = e as Error;
      const loginResult: LoginResult = { success: false, error: err.stack! };
      localStorage.setItem(LOGIN_RESULT_KEY, JSON.stringify(loginResult));
      localStorage.setItem(LOGIN_COMPLETE_KEY, "true");
      close();
    }
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("load", handleLoginRouteLoaded);
}

const loginPopupDefaultOptions: InitOptions["loginPopup"] = {
  width: (_loginOptions: LoginOptions) => 600,
  height: (_loginOptions: LoginOptions) => 600,
  left: (_loginOptions: LoginOptions, width: number) =>
    window.innerWidth / 2 - width / 2,
  top: (_loginOptions: LoginOptions, height: number) =>
    window.innerHeight / 2 - height / 2,
};

export { getMagic };

export function init(
  magicApiKey: string,
  loadingRoute: string,
  {
    loginPopup: {
      width = loginPopupDefaultOptions.width,
      height = loginPopupDefaultOptions.height,
      left = loginPopupDefaultOptions.left,
      top = loginPopupDefaultOptions.top,
    } = loginPopupDefaultOptions,
  }: InitOptions = { loginPopup: loginPopupDefaultOptions }
) {
  return realInit(magicApiKey, loadingRoute, {
    loginPopup: { width, height, left, top },
  });
}

/**
 * Initiates the Magic SDK login flow.
 *
 * Note: This function MUST be run from a user-interaction event handler AND the event handler MUST be synchronous.
 *
 * @returns the login result
 */
export function login(loginOptions: LoginOptions) {
  localStorage.setItem(LOGIN_OPTIONS_KEY, JSON.stringify(loginOptions));
  openLoginPopup(loginOptions); // must not be in a promise
  return (async () => {
    await loginToComplete();
    localStorage.removeItem(LOGIN_OPTIONS_KEY);
    const results = generateLoginResult();
    console.log("results", results);
    return results;
  })();
}

export async function logout() {
  const magic = getMagic();
  await magic.user.logout();
}

function openLoginPopup(loginOptions: LoginOptions) {
  const loginRoute = getLoadingRoute();
  const loginPopupOptions = getLoginPopupOptions();
  const width = loginPopupOptions.width(loginOptions);
  const height = loginPopupOptions.height(loginOptions);
  const left = loginPopupOptions.left(loginOptions, width);
  const top = loginPopupOptions.top(loginOptions, height);
  const handle = window.open(
    loginRoute,
    "magic-login",
    `popup=yes,top=${top},left=${left},width=${width},height=${height}`
  );
  if (!handle) {
    throw new Error(
      "Login popup blocked. Please run this function from a synchronous user-interaction event handler."
    );
  }
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function loginToComplete() {
  while (true) {
    const loginComplete = localStorage.getItem(LOGIN_COMPLETE_KEY);
    if (loginComplete === "true") {
      localStorage.removeItem(LOGIN_COMPLETE_KEY);
      return;
    }
    await sleep(50);
  }
}

function generateLoginResult(): LoginResult {
  const rawLoginResult = localStorage.getItem(LOGIN_RESULT_KEY);
  if (!rawLoginResult) {
    throw new Error("Login result not found.");
  }
  const loginResult = JSON.parse(rawLoginResult);
  localStorage.removeItem(LOGIN_RESULT_KEY);
  return loginResult;
}
