import { init, login, logout } from "./index";

function addGlobalFunction(func: Function) {
  (window as any)[func.name] = func;
}

addGlobalFunction(init);
addGlobalFunction(login);
addGlobalFunction(logout);

const apiKey = "pk_live_AE5AC961967ABB4F";
const loadingRoute = "/loading";
init(apiKey, loadingRoute);
