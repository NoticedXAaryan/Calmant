import { proxy } from "./proxy";

// Export the proxy function as the default middleware
export default proxy;

// Configure matcher to run on all paths except static assets
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
