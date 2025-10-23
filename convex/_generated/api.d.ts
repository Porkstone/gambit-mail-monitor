/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as cancellations from "../cancellations.js";
import type * as crons from "../crons.js";
import type * as gemini from "../gemini.js";
import type * as gmail from "../gmail.js";
import type * as gmailHelpers from "../gmailHelpers.js";
import type * as myFunctions from "../myFunctions.js";
import type * as users from "../users.js";
import type * as watchers from "../watchers.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  cancellations: typeof cancellations;
  crons: typeof crons;
  gemini: typeof gemini;
  gmail: typeof gmail;
  gmailHelpers: typeof gmailHelpers;
  myFunctions: typeof myFunctions;
  users: typeof users;
  watchers: typeof watchers;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
